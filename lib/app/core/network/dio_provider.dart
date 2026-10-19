import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../router.dart';
import '../constants.dart';
import '../storage/secure_storage_provider.dart';

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.read(secureStorageProvider);

  final baseUrl = AppConstants.apiBaseUrl.endsWith('/')
      ? AppConstants.apiBaseUrl
      : '${AppConstants.apiBaseUrl}/';

  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 15),
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Flutter-Edulem/1.0',
      },
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final path = options.path;
        final isAuthEndpoint =
            path.contains('auth/login') ||
            path.contains('portal/student/login') ||
            path.contains('auth/register') ||
            path.contains('auth/forgot') ||
            path.contains('auth/reset');

        if (isAuthEndpoint) {
          options.headers.remove('Authorization');
          handler.next(options);
          return;
        }

        try {
          final seasonId = await storage.read(key: 'active_config_season');
          if (seasonId != null && seasonId.trim().isNotEmpty) {
            options.headers['X-Season-Id'] = seasonId;
          }
        } catch (_) {}

        try {
          final studentId = await storage.read(key: 'ACTIVE_STUDENT_ID');
          if (studentId != null && studentId.trim().isNotEmpty) {
            options.headers['X-Student-Id'] = studentId;
          }
        } catch (_) {}

        try {
          final token = await storage.read(key: 'ACCESS_TOKEN');
          if (token != null && token.trim().isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          } else {
            options.headers.remove('Authorization');
          }
        } catch (_) {
          options.headers.remove('Authorization');
        }

        handler.next(options);
      },
      onResponse: (response, handler) {
        handler.next(response);
      },
      onError: (error, handler) async {
        final statusCode = error.response?.statusCode;

        // 403 Forbidden: Yetki hatasıdır, oturumu silip login'e yönlendirme YAPMA!
        // Sadece 401 Unauthorized durumunda oturum yenileme veya login kontrolü yapılır.
        if (statusCode == 401) {
          // Login/auth endpointlerinde 401 alınırsa yönlendirme yapma —
          // login sayfası zaten hatayı kendisi gösterir (döngüyü önler)
          final requestPath = error.requestOptions.path;
          final isAuthEndpoint =
              requestPath.contains('auth/login') ||
              requestPath.contains('portal/student/login') ||
              requestPath.contains('auth/register') ||
              requestPath.contains('auth/forgot') ||
              requestPath.contains('auth/reset');

          if (!isAuthEndpoint) {
            // Sessiz yeniden kimlik doğrulama (silent re-auth) dene
            try {
              final tcNo = await storage.read(key: 'SESSION_TC_NO');
              final password = await storage.read(key: 'SESSION_PASSWORD');
              final isStudent =
                  (await storage.read(key: 'SESSION_IS_STUDENT')) == '1';

              if (tcNo != null &&
                  tcNo.isNotEmpty &&
                  password != null &&
                  password.isNotEmpty) {
                final authDio = Dio(
                  BaseOptions(
                    baseUrl: baseUrl,
                    connectTimeout: const Duration(seconds: 10),
                    receiveTimeout: const Duration(seconds: 15),
                    headers: const {
                      'Accept': 'application/json',
                      'Content-Type': 'application/json',
                    },
                  ),
                );

                final loginEndpoint =
                    isStudent ? 'portal/student/login' : 'auth/login';
                final response = await authDio.post(
                  loginEndpoint,
                  data: {
                    'tc_no': tcNo,
                    'password': password,
                    'device_name': 'EduLem Mobile',
                  },
                );

                if (response.statusCode == 200 && response.data != null) {
                  final data = response.data;
                  final token = (data is Map)
                      ? ((data['data'] is Map
                                ? data['data']['token']
                                : null) ??
                            data['token'] ??
                            data['access_token'] ??
                            (data['data'] is Map
                                ? data['data']['access_token']
                                : null) ??
                            '')
                      : '';

                  if (token is String && token.isNotEmpty) {
                    await storage.write(key: 'ACCESS_TOKEN', value: token);

                    // Başarısız olan isteği yeni token ile tekrar dene
                    final opts = error.requestOptions;
                    opts.headers['Authorization'] = 'Bearer $token';

                    final clonedResponse = await dio.fetch(opts);
                    return handler.resolve(clonedResponse);
                  }
                }
              }
            } catch (_) {
              // Sessiz login başarısız olduysa normal logout akışına geç
            }

            // Yeniden doğrulama yapılamadıysa oturumu temizle ve /login'e yönlendir
            try {
              await storage.delete(key: 'ACCESS_TOKEN');
              await storage.delete(key: 'active_config_season');
              await storage.delete(key: 'SESSION_TC_NO');
              await storage.delete(key: 'SESSION_PASSWORD');
              await storage.delete(key: 'SESSION_IS_STUDENT');
            } catch (_) {}

            // GoRouter ile /login'e yönlendir
            final ctx = AppRouter.navigatorKey.currentContext;
            if (ctx != null && ctx.mounted) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (ctx.mounted) ctx.go('/login');
              });
            }
          }
        }

        handler.next(error);
      },
    ),
  );

  return dio;
});
