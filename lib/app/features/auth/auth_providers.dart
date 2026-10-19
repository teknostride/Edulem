import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import '../../core/storage/secure_storage_provider.dart';
import '../../core/utils/role_utils.dart';
import 'auth_repository.dart';
import 'auth_session.dart';

String extractRole(Map<String, dynamic> profile) {
  // 1. Öğrenci göstergeleri
  if (profile['is_student'] == true ||
      profile['is_student'] == 1 ||
      profile['is_student'] == '1' ||
      profile['student_name'] != null ||
      profile['school_no'] != null) {
    return 'student';
  }

  // 2. Olası alanlar: role.name, role, role_name, user.role.name, data.user.role
  dynamic v =
      profile['role'] ??
      profile['role_name'] ??
      profile['user']?['role'] ??
      profile['user']?['role_name'] ??
      profile['data']?['role'] ??
      profile['data']?['user']?['role'] ??
      profile['role']?['name'] ??
      profile['user_role'] ??
      profile['type'];

  if (v is Map) {
    final m = Map<String, dynamic>.from(v);
    final name = m['name'] ?? m['title'] ?? m['key'] ?? m['slug'];
    if (name != null) return name.toString();
  }

  if (v != null && v is! Map) {
    final str = v.toString().trim();
    if (str.isNotEmpty && str != 'default') return str;
  }

  return 'default';
}

String dashboardRouteForRole(String role) {
  return getDashboardRouteForRole(role);
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final api = ref.read(apiClientProvider);
  final storage = ref.read(secureStorageProvider);
  return AuthRepository(api, storage);
});

final authSessionProvider = FutureProvider<AuthSession?>((ref) async {
  final storage = ref.read(secureStorageProvider);
  final token = (await storage.read(key: 'ACCESS_TOKEN'))?.trim() ?? '';
  if (token.isEmpty) return null;

  final storedRole = (await storage.read(key: 'USER_ROLE'))?.trim();
  final isStudentSession = (await storage.read(key: 'SESSION_IS_STUDENT')) == '1';

  Map<String, dynamic>? profile;
  try {
    final userData = await storage.read(key: 'USER_DATA');
    if (userData != null && userData.trim().isNotEmpty) {
      profile = jsonDecode(userData) as Map<String, dynamic>;
    }
  } catch (_) {
    // Cache load failed, will fetch from API
  }

  if (profile == null) {
    try {
      final repo = ref.read(authRepositoryProvider);
      profile = await repo.getProfile();
    } catch (e) {
      rethrow;
    }
  }

  final bool isStudent = isStudentSession ||
      isStudentRole(storedRole) ||
      profile['is_student'] == true ||
      profile['student_name'] != null ||
      profile['school_no'] != null;

  String role = isStudent ? 'student' : 'default';
  if (!isStudent) {
    final extracted = extractRole(profile);
    if (extracted.isNotEmpty && extracted != 'default') {
      role = extracted;
    } else if (storedRole != null && storedRole.isNotEmpty && storedRole != 'default') {
      role = storedRole;
    }
  }

  return AuthSession(
    token: token,
    profile: profile,
    role: role,
    isStudent: isStudent,
  );
});
