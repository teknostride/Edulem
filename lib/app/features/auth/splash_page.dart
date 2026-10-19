import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'auth_providers.dart';
import '../../core/storage/secure_storage_provider.dart';
import '../../core/version/app_version_service.dart';
import '../../core/version/update_dialog.dart';
import '../notifications/push/notification_router.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    _checkAppAndAuth();
  }

  Future<void> _checkAppAndAuth() async {
    // 1. Sürüm kontrolü (Force / Optional update)
    try {
      final versionResult = await AppVersionService.checkVersion();
      if (versionResult != null && versionResult.hasUpdate) {
        if (!mounted) return;
        if (versionResult.isForceUpdate) {
          // Zorunlu güncelleme: Kullanıcı güncelleyene kadar ekranda kalır, ilerlemez
          await UpdateDialog.show(context, versionResult);
          return;
        } else if (versionResult.isOptionalUpdate) {
          // İsteğe bağlı güncelleme: Kullanıcı "Daha Sonra" derse devam eder
          await UpdateDialog.show(context, versionResult);
        }
      }
    } catch (e) {
      debugPrint('SplashPage version check error: $e');
    }

    if (!mounted) return;

    // 2. Auth ve token kontrolü
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;

    String? token;
    String? role;
    try {
      final storage = ref.read(secureStorageProvider);
      token = await storage.read(key: 'ACCESS_TOKEN');
      role = await storage.read(key: 'USER_ROLE');
    } catch (e) {
      debugPrint('SplashPage storage read error: $e');
      try {
        final storage = ref.read(secureStorageProvider);
        await storage.deleteAll();
      } catch (_) {}
    }

    if (!mounted) return;

    if (token != null && token.isNotEmpty && role != null) {
      final pendingRoute = NotificationRouter.consumePendingRoute();
      if (pendingRoute != null && pendingRoute.trim().isNotEmpty) {
        context.go(pendingRoute);
      } else {
        context.go(dashboardRouteForRole(role));
      }
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Yükleniyor...'),
            ],
          ),
        ),
      ),
    );
  }
}
