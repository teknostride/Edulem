import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import '../../core/storage/secure_storage_provider.dart';
import '../../core/constants.dart';
import '../../core/utils/role_utils.dart';
import 'profile_repository.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return ProfileRepository(api);
});

final profileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final storage = ref.read(secureStorageProvider);
  final repo = ref.read(profileRepositoryProvider);

  // Load cached USER_DATA (used as fallback and role detector)
  Map<String, dynamic>? userMap;
  try {
    final userData = await storage.read(key: 'USER_DATA');
    if (userData != null && userData.trim().isNotEmpty) {
      userMap = jsonDecode(userData) as Map<String, dynamic>;
    }
  } catch (_) {}

  // Determine role from storage and cache to pick the right endpoint
  final isStudentSession = (await storage.read(key: 'SESSION_IS_STUDENT')) == '1';
  final storedRole = (await storage.read(key: 'USER_ROLE'))?.toLowerCase() ?? '';
  final cachedRole =
      (userMap?['role'] ?? userMap?['role_name'] ?? '').toString().toLowerCase();

  final isStudent = isStudentSession ||
      isStudentRole(storedRole) ||
      isStudentRole(cachedRole);

  // Always try to fetch fresh profile from network
  try {
    Map<String, dynamic> apiResult;
    if (isStudent) {
      try {
        final raw = await repo.getStudentProfile();
        // /portal/student/profile may wrap data under 'data' key
        apiResult = (raw['data'] is Map ? Map<String, dynamic>.from(raw['data'] as Map) : raw);
      } catch (_) {
        // Fall back to /user/profile for edge cases
        final raw = await repo.getProfile();
        apiResult = (raw['data'] is Map ? Map<String, dynamic>.from(raw['data'] as Map) : raw);
      }
    } else {
      final raw = await repo.getProfile();
      // /user/profile wraps under 'data'
      apiResult = (raw['data'] is Map ? Map<String, dynamic>.from(raw['data'] as Map) : raw);
    }

    // Merge fresh API result into cached map (API wins for non-null values)
    final merged = <String, dynamic>{
      if (userMap != null) ...userMap,
      ...{
        for (final entry in apiResult.entries)
          if (entry.value != null) entry.key: entry.value,
      },
    };

    // Persist merged data back to secure storage
    await storage.write(key: 'USER_DATA', value: jsonEncode(merged));

    // Persist active season
    final seasonId =
        merged['active_season_id'] ??
        merged['current_season_id'] ??
        merged['season_id'] ??
        merged['config_season_id'];
    if (seasonId != null) {
      await storage.write(key: 'active_config_season', value: seasonId.toString());
    }

    // For guardians, also try to fetch students if missing
    if (merged['role'] == 'guardian' &&
        (merged['students'] == null || (merged['students'] as List?)?.isEmpty == true)) {
      try {
        final dashboardData = await repo.getGuardianDashboard();
        if (dashboardData['status'] == true && dashboardData['data'] != null) {
          final students = dashboardData['data']['students'];
          if (students != null) {
            merged['students'] = students;
            await storage.write(key: 'USER_DATA', value: jsonEncode(merged));
          }
        }
      } catch (_) {}
    }

    return merged;
  } catch (_) {
    // Network failed — fall back to cache
    if (userMap != null) {
      final seasonId =
          userMap['active_season_id'] ??
          userMap['current_season_id'] ??
          userMap['season_id'] ??
          userMap['config_season_id'];
      if (seasonId != null) {
        await storage.write(key: 'active_config_season', value: seasonId.toString());
      }
      return userMap;
    }
    rethrow;
  }
});

final layoutInitProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  try {
    final repo = ref.read(profileRepositoryProvider);
    return await repo.getLayoutInit();
  } catch (e) {
    // If layout init fails (e.g. 401 for parents), return empty map to not break UI
    return <String, dynamic>{};
  }
});

final tenantLogoInfoProvider = FutureProvider<Map<String, dynamic>>((
  ref,
) async {
  final storage = ref.read(secureStorageProvider);
  final token = (await storage.read(key: 'ACCESS_TOKEN'))?.trim() ?? '';
  final url = '${AppConstants.apiBaseUrl}/tenant/logo';
  final headers = <String, String>{
    if (token.isNotEmpty) 'Authorization': 'Bearer $token',
  };
  return {'url': url, 'headers': headers};
});
