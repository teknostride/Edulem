import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client_provider.dart';
import '../../core/network/dio_provider.dart';
import '../../core/storage/secure_storage_provider.dart';
import '../auth/auth_providers.dart';
import '../dashboard/portal_dashboard_provider.dart';
import '../homework/homework_paging_controller.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import 'profile_providers.dart';

final studentSwitcherServiceProvider = Provider<StudentSwitcherService>((ref) {
  return StudentSwitcherService(ref);
});

class StudentSwitcherService {
  StudentSwitcherService(this._ref);

  final Ref _ref;

  Future<bool> switchToStudent(BuildContext context, Map<String, dynamic> targetStudent) async {
    final storage = _ref.read(secureStorageProvider);
    final api = _ref.read(apiClientProvider);

    final targetId = targetStudent['id'] is int
        ? targetStudent['id'] as int
        : int.tryParse(targetStudent['id'].toString()) ?? 0;
    final targetName = (targetStudent['name'] ?? targetStudent['student_name'] ?? 'Öğrenci').toString();
    final targetTc = (targetStudent['tc_no'] ?? '').toString();

    // Show loading overlay
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Öğrenci profiline geçiliyor...', style: TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      String? newToken;
      Map<String, dynamic>? newUserData;

      // 1. Önce /portal/student/switch-sibling endpoint'ini dene
      try {
        final switchResponse = await api.postRaw(
          '/portal/student/switch-sibling',
          data: {
            'student_id': targetId,
            'device_name': 'EduLem Mobile',
          },
        );
        if (switchResponse.statusCode == 200 && switchResponse.data is Map) {
          final data = switchResponse.data['data'] ?? switchResponse.data;
          newToken = data['token']?.toString();
          if (data['student'] is Map) {
            newUserData = Map<String, dynamic>.from(data['student'] as Map);
          }
        }
      } catch (e) {
        debugPrint('switch-sibling endpoint hatası, login fallback denenecek: $e');
      }

      // 2. Fallback: Eğer switch endpoint'i yoksa veya hata verdiyse, targetTc ve SESSION_PASSWORD ile giriş yap
      if (newToken == null || newToken.isEmpty) {
        final savedPassword = await storage.read(key: 'SESSION_PASSWORD');
        if (targetTc.isNotEmpty && savedPassword != null && savedPassword.isNotEmpty) {
          final loginResponse = await api.postRaw(
            '/portal/student/login',
            data: {
              'tc_no': targetTc,
              'password': savedPassword,
              'device_name': 'EduLem Mobile',
            },
          );
          if (loginResponse.statusCode == 200 && loginResponse.data is Map) {
            final data = loginResponse.data['data'] ?? loginResponse.data;
            newToken = (data['token'] ?? data['access_token'])?.toString();
            if (data['student'] is Map) {
              newUserData = Map<String, dynamic>.from(data['student'] as Map);
            }
          }
        }
      }

      // Dialog'u kapat
      if (context.mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }

      if (newToken != null && newToken.isNotEmpty) {
        // Yeni token ve kullanıcı bilgilerini SecureStorage'a kaydet
        await storage.write(key: 'ACCESS_TOKEN', value: newToken);
        await storage.write(key: 'USER_ROLE', value: 'student');
        await storage.write(key: 'SESSION_IS_STUDENT', value: '1');
        await storage.write(key: 'ACTIVE_STUDENT_ID', value: targetId.toString());
        if (targetTc.isNotEmpty) {
          await storage.write(key: 'SESSION_TC_NO', value: targetTc);
        }
        if (newUserData != null) {
          newUserData['role'] = 'student';
          await storage.write(key: 'USER_DATA', value: jsonEncode(newUserData));
        }

        // Cache'leri temizle & güncelle
        _ref.read(selectedPortalStudentIdProvider.notifier).state = targetId;
        _ref.invalidate(authSessionProvider);
        _ref.invalidate(profileProvider);
        _ref.invalidate(portalDashboardProvider);
        _ref.invalidate(homeworkPagingProvider);
        _ref.invalidate(dioProvider);
        _ref.read(drawerSectionsCacheProvider.notifier).state = [];

        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$targetName öğrencisine geçiş yapıldı'),
              backgroundColor: Colors.green.shade700,
              duration: const Duration(seconds: 2),
            ),
          );
          // Öğrenci paneline yönlendir / yenile
          context.go('/dashboard/student');
        }
        return true;
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Öğrenciye geçiş yapılamadı. Lütfen tekrar deneyin.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return false;
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Geçiş sırasında hata oluştu: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return false;
    }
  }
}
