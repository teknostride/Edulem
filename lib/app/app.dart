import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/storage/secure_storage_provider.dart';
import 'features/notifications/push/fcm_service.dart';
import 'navigation/app_navigation_history.dart';
import 'router.dart';
import 'theme/app_theme.dart';

class App extends ConsumerStatefulWidget {
  const App({super.key});

  @override
  ConsumerState<App> createState() => _AppState();
}

class _AppState extends ConsumerState<App> with WidgetsBindingObserver {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = AppRouter.createRouter();
    // Register as OS-level back button observer BEFORE go_router's own handler
    // so we can intercept and implement web-like back navigation.
    WidgetsBinding.instance.addObserver(this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initPushNotifications();
    });
  }

  Future<void> _initPushNotifications() async {
    try {
      await FcmService().init(ref: ref);
      final storage = ref.read(secureStorageProvider);
      final token = await storage.read(key: 'ACCESS_TOKEN');
      if (token != null && token.isNotEmpty) {
        await FcmService().registerToken(ref);
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Called by the OS when the user presses the hardware back button (Android).
  /// Returning true means "we handled it, don't exit the app".
  @override
  Future<bool> didPopRoute() {
    return AppNavigationHistory.instance.handleBack(_router);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      routerConfig: _router,
      theme: AppTheme.light(),
      locale: const Locale('tr', 'TR'),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('tr', 'TR'),
        Locale('en', 'US'),
      ],
    );
  }
}

