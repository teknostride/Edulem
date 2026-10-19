import 'dart:io' show Platform;

import 'package:app_badge_plus/app_badge_plus.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client_provider.dart';
import '../../../core/storage/secure_storage_provider.dart';
import 'local_notification_service.dart';
import 'notification_router.dart';

// Arka plan mesaj işleyicisi (top-level fonksiyon olmalı)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Arka planda notification payload varsa sistem zaten gösterir.
  // Ancak veri tabanlı (data-only) mesaj geldiyse yerel bildirim tetikle:
  if (message.notification == null && message.data.isNotEmpty) {
    final localNotification = LocalNotificationService();
    await localNotification.init();
    final data = Map<String, dynamic>.from(message.data);
    final title = data['title']?.toString() ?? 'Yeni Bildirim';
    final body = data['body']?.toString() ?? data['message']?.toString() ?? '';
    if (title.isNotEmpty || body.isNotEmpty) {
      final notifId = int.tryParse(data['homeworkId']?.toString() ?? '') ??
          int.tryParse(data['homework_id']?.toString() ?? '') ??
          int.tryParse(data['conversationId']?.toString() ?? '') ??
          int.tryParse(data['conversation_id']?.toString() ?? '') ??
          int.tryParse(data['id']?.toString() ?? '') ??
          (DateTime.now().millisecondsSinceEpoch ~/ 1000);

      await localNotification.showNotification(
        id: notifId,
        title: title,
        body: body,
        data: data,
      );
    }
  }
}

class FcmService {
  static final FcmService _instance = FcmService._();
  factory FcmService() => _instance;
  FcmService._();

  FirebaseMessaging? get _messaging =>
      Firebase.apps.isNotEmpty ? FirebaseMessaging.instance : null;
  final _localNotification = LocalNotificationService();

  String? _currentToken;
  String? get currentToken => _currentToken;

  Future<void> init({dynamic ref}) async {
    // Local notification servisini başlat
    try {
      await _localNotification.init();
    } catch (_) {}

    if (Firebase.apps.isEmpty) {
      return;
    }

    final messaging = _messaging;
    if (messaging == null) return;

    // iOS ve Android için ön plan bildirim sunum ayarları
    try {
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
    } catch (_) {}

    // Bildirim tıklama callback'i
    _localNotification.onTap = (response) {
      if (response.payload != null && response.payload!.isNotEmpty) {
        NotificationRouter.handlePayload(response.payload);
      }
    };

    try {
      // Arka plan mesaj işleyicisi
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      // Foreground mesaj dinleyicisi
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Arka planda bildirime tıklama
      FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

      // Uygulama kapalıyken bildirime tıklama
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        NotificationRouter.handleRemoteMessage(initialMessage);
      }

      // Token yenileme dinleyicisi
      messaging.onTokenRefresh.listen((token) {
        _currentToken = token;
        if (ref != null) {
          _sendTokenToBackend(ref, token);
        }
      });
    } catch (_) {}
  }

  /// Token al ve backend'e kaydet
  Future<String?> registerToken(dynamic ref) async {
    try {
      final messaging = _messaging;
      if (messaging == null) return null;

      if (Platform.isIOS) {
        final settings = await messaging.requestPermission(
          alert: true,
          badge: true,
          sound: true,
        );
        if (settings.authorizationStatus != AuthorizationStatus.authorized &&
            settings.authorizationStatus != AuthorizationStatus.provisional) {
          return null;
        }

        // iOS'ta APNs token hazır olmadan getToken() çağrılırsa hata fırlatır
        String? apnsToken = await messaging.getAPNSToken();
        if (apnsToken == null) {
          for (int i = 0; i < 6; i++) {
            await Future.delayed(const Duration(milliseconds: 500));
            apnsToken = await messaging.getAPNSToken();
            if (apnsToken != null) break;
          }
        }
      }

      final token = await messaging.getToken();
      if (token != null) {
        _currentToken = token;
        await _sendTokenToBackend(ref, token);
      }
      return token;
    } catch (e) {
      return null;
    }
  }

  /// Backend'e device token gönder
  Future<void> _sendTokenToBackend(dynamic ref, String token) async {
    try {
      // ref WidgetRef veya ProviderContainer olabilir
      dynamic apiClient;
      dynamic storage;
      if (ref is WidgetRef) {
        storage = ref.read(secureStorageProvider);
        apiClient = ref.read(apiClientProvider);
      } else if (ref is Ref) {
        storage = ref.read(secureStorageProvider);
        apiClient = ref.read(apiClientProvider);
      } else if (ref is ProviderContainer) {
        storage = ref.read(secureStorageProvider);
        apiClient = ref.read(apiClientProvider);
      }

      if (storage != null) {
        final accessToken = await storage.read(key: 'ACCESS_TOKEN');
        if (accessToken == null || accessToken.trim().isEmpty) return;
      }

      if (apiClient != null) {
        await apiClient.postJson(
          '/user/device-token',
          data: {
            'token': token,
            'platform': Platform.isIOS ? 'ios' : 'android',
          },
        );
      }
    } catch (_) {
      // Token kaydı backend'de henüz rota yoksa veya ağ hatasında sessizce yutulur
    }
  }

  /// Foreground mesaj işleme
  void _handleForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    final data = Map<String, dynamic>.from(message.data);

    // Rozet sayısını güncelle (varsa)
    final badgeStr = data['badge']?.toString() ?? data['unread_count']?.toString();
    if (badgeStr != null) {
      final badgeNum = int.tryParse(badgeStr);
      if (badgeNum != null) {
        updateBadge(badgeNum);
      }
    }

    final rawType = data['type']?.toString().toLowerCase().trim();
    final isHomework = rawType == 'homework' ||
        rawType == 'homeworks' ||
        rawType == 'odev' ||
        rawType == 'ödev' ||
        data.containsKey('homeworkId') ||
        data.containsKey('homework_id') ||
        (notification?.title?.toLowerCase().contains('ödev') ?? false) ||
        (data['title']?.toString().toLowerCase().contains('ödev') ?? false);

    final title = notification?.title ??
        data['title']?.toString() ??
        (isHomework ? 'Yeni Ödev' : 'Yeni Bildirim');
    final body = notification?.body ??
        data['body']?.toString() ??
        data['message']?.toString() ??
        '';

    if (title.isNotEmpty || body.isNotEmpty) {
      final notifId = int.tryParse(data['homeworkId']?.toString() ?? '') ??
          int.tryParse(data['homework_id']?.toString() ?? '') ??
          int.tryParse(data['conversationId']?.toString() ?? '') ??
          int.tryParse(data['conversation_id']?.toString() ?? '') ??
          int.tryParse(data['id']?.toString() ?? '') ??
          (DateTime.now().millisecondsSinceEpoch ~/ 1000);

      _localNotification.showNotification(
        id: notifId,
        title: title,
        body: body,
        data: data,
      );
    }
  }

  /// Arka planda bildirime tıklama
  void _handleMessageOpenedApp(RemoteMessage message) {
    NotificationRouter.handleRemoteMessage(message);
  }

  /// EduLem logosunun üzerindeki rozeti (badge) güncelle
  static Future<void> updateBadge(int count) async {
    try {
      final isSupported = await AppBadgePlus.isSupported();
      if (isSupported) {
        await AppBadgePlus.updateBadge(count < 0 ? 0 : count);
      }
    } catch (_) {}
  }

  /// Token sil (çıkış yaparken)
  Future<void> deleteToken({dynamic ref}) async {
    try {
      if (ref != null) {
        try {
          dynamic apiClient;
          if (ref is WidgetRef || ref is Ref || ref is ProviderContainer) {
            apiClient = ref.read(apiClientProvider);
          }
          if (apiClient != null && _currentToken != null) {
            await apiClient.deleteJson(
              '/user/device-token',
              data: {'token': _currentToken},
            );
          }
        } catch (_) {}
      }

      await _messaging?.deleteToken();
      _currentToken = null;
      await updateBadge(0);
    } catch (_) {}
  }
}
