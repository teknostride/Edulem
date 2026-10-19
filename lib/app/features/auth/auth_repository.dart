import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/utils/role_utils.dart';
import '../notifications/push/fcm_service.dart';

class AuthRepository {
  AuthRepository(this._api, this._storage);

  final ApiClient _api;
  final FlutterSecureStorage _storage;

  Future<void> _clearAuthSession() async {
    final activeToken = await _storage.read(key: 'ACCESS_TOKEN');
    final activeTc = await _storage.read(key: 'SESSION_TC_NO');
    final activeIsStudent = (await _storage.read(key: 'SESSION_IS_STUDENT')) == '1';

    // Aktif hesabı kayıtlı profiller listesinden kaldır (diğer kayıtlı profilleri koru)
    try {
      final raw = await _storage.read(key: 'SAVED_PROFILES_LIST');
      if (raw != null && raw.trim().isNotEmpty) {
        final List<dynamic> list = jsonDecode(raw) as List<dynamic>;
        final updated = list.where((item) {
          if (item is! Map) return false;
          final token = item['token']?.toString() ?? '';
          final tcNo = item['tcNo']?.toString() ?? '';
          final isStudent = item['isStudent'] == true;

          if (activeToken != null && activeToken.isNotEmpty && token == activeToken) {
            return false;
          }
          if (activeTc != null && activeTc.isNotEmpty && tcNo == activeTc && isStudent == activeIsStudent) {
            return false;
          }
          return true;
        }).toList();

        if (updated.isEmpty) {
          await _storage.delete(key: 'SAVED_PROFILES_LIST');
        } else {
          await _storage.write(key: 'SAVED_PROFILES_LIST', value: jsonEncode(updated));
        }
      }
    } catch (_) {}

    await _storage.delete(key: 'ACCESS_TOKEN');
    await _storage.delete(key: 'USER_DATA');
    await _storage.delete(key: 'USER_ROLE');
    await _storage.delete(key: 'SESSION_TC_NO');
    await _storage.delete(key: 'SESSION_PASSWORD');
    await _storage.delete(key: 'SESSION_IS_STUDENT');
    await _storage.delete(key: 'active_config_season');
    await _storage.delete(key: 'ACTIVE_STUDENT_ID');
  }

  Future<Map<String, dynamic>> getProfile() {
    return _api.getJson('/user/profile');
  }

  Future<void> logout() async {
    try {
      await FcmService().deleteToken();
      await _api.postJson('/auth/logout');
    } catch (_) {
      // Ignore logout API errors
    } finally {
      await _clearAuthSession();
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
    required String confirmPassword,
  }) async {
    final role =
        (await _storage.read(key: 'USER_ROLE'))?.trim() ?? '';
    final isStudent =
        (await _storage.read(key: 'SESSION_IS_STUDENT')) == '1' ||
        isStudentRole(role);

    if (isStudent) {
      try {
        await _api.postJson(
          '/portal/student/change-password',
          data: {
            'current_password': currentPassword,
            'new_password': newPassword,
            'new_password_confirmation': confirmPassword,
          },
        );
        return;
      } on ApiException catch (e) {
        if (e.statusCode == 400 || e.statusCode == 422) {
          rethrow;
        }
        // Fallback to /user/profile if endpoint not found or general failure
      } catch (_) {
        // Fallback to /user/profile
      }
    }

    await _api.putJson(
      '/user/profile',
      data: {
        'current_password': currentPassword,
        'password': newPassword,
        'password_confirmation': confirmPassword,
      },
    );
  }

  Future<bool> isAuthenticated() async {
    final token = await _storage.read(key: 'ACCESS_TOKEN');
    return token != null && token.isNotEmpty;
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
    required String passwordConfirmation,
    String? phone,
    String? role,
  }) async {
    await _api.postJson(
      '/auth/register',
      data: {
        'name': name,
        'email': email,
        'password': password,
        'password_confirmation': passwordConfirmation,
        'phone': phone,
        'role': role,
      },
    );
  }

  Future<void> clearSession() async {
    await _clearAuthSession();
  }
}
