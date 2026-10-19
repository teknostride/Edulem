import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import '../../../router.dart';

class NotificationRouter {
  static String? _pendingRoute;

  /// SplashPage veya auth kontrolü tamamlandıktan sonra bekleyen rotayı tüketmek için
  static String? consumePendingRoute() {
    final route = _pendingRoute;
    _pendingRoute = null;
    return route;
  }

  static void setPendingRoute(String route) {
    _pendingRoute = route;
  }

  /// RemoteMessage'dan yönlendirme
  static void handleRemoteMessage(RemoteMessage message) {
    final data = Map<String, dynamic>.from(message.data);
    // Notification başlık ve mesajını da data'ya ekle
    if (message.notification != null) {
      if (!data.containsKey('title') && message.notification!.title != null) {
        data['title'] = message.notification!.title;
      }
      if (!data.containsKey('body') && message.notification!.body != null) {
        data['body'] = message.notification!.body;
      }
    }
    _navigateFromData(data);
  }

  /// Local notification payload'dan yönlendirme
  static void handlePayload(String? payload) {
    if (payload == null || payload.trim().isEmpty) return;

    try {
      final decoded = jsonDecode(payload);
      if (decoded is Map<String, dynamic>) {
        _navigateFromData(decoded);
      } else if (decoded is Map) {
        _navigateFromData(Map<String, dynamic>.from(decoded));
      }
    } catch (e) {
      debugPrint('NotificationRouter handlePayload JSON parse hatası: $e');
    }
  }

  static void _navigateFromData(Map<String, dynamic> data) {
    debugPrint('NotificationRouter _navigateFromData: $data');

    final rawType = data['type']?.toString().toLowerCase().trim();

    // Ardışık devamsızlık bildirimi: Kullanıcı isteği doğrultusunda tıklayınca yönlendirme yapılmaz
    if (rawType == 'attendance_absent_consecutive') {
      return;
    }

    // Özel bir route tanımlıysa
    final customRoute = data['route']?.toString().trim() ??
        data['target']?.toString().trim() ??
        data['url']?.toString().trim();

    // 1. Ödev bildirimi kontrolü:
    // Backend 'type' => 'homework', 'homeworkId' => '...', 'route' => '/homework/...' gönderir.
    final isHomeworkType = rawType == 'homework' ||
        rawType == 'homeworks' ||
        rawType == 'odev' ||
        rawType == 'ödev' ||
        rawType == 'homework_assigned' ||
        rawType == 'homework_reminder' ||
        rawType == 'homework_submission';

    final hasHomeworkId = data.containsKey('homeworkId') ||
        data.containsKey('homework_id') ||
        data.containsKey('homeworkID');

    final titleStr = (data['title'] ?? '').toString().toLowerCase();
    final bodyStr = (data['body'] ?? data['message'] ?? '').toString().toLowerCase();

    final titleOrBodyMentionsHomework = titleStr.contains('ödev') ||
        titleStr.contains('odev') ||
        titleStr.contains('homework') ||
        bodyStr.contains('ödev') ||
        bodyStr.contains('odev') ||
        bodyStr.contains('homework');

    final routeIsHomework = customRoute != null && customRoute.startsWith('/homework');

    if (isHomeworkType || hasHomeworkId || routeIsHomework || (titleOrBodyMentionsHomework && rawType != 'message')) {
      final homeworkId = data['homeworkId'] ??
          data['homework_id'] ??
          data['homeworkID'] ??
          (isHomeworkType ? data['id'] : null);

      if (homeworkId != null && homeworkId.toString().trim().isNotEmpty) {
        _navigate('/homework/${homeworkId.toString().trim()}');
      } else if (routeIsHomework && customRoute.isNotEmpty) {
        _navigate(customRoute);
      } else {
        _navigate('/homework');
      }
      return;
    }

    // 2. Custom route önceliği (eğer geçerli bir iç uygulama rotası ise)
    if (customRoute != null && customRoute.isNotEmpty && customRoute.startsWith('/')) {
      if (customRoute.startsWith('/messages/conversation/')) {
        final convId = customRoute.replaceFirst('/messages/conversation/', '');
        _navigate('/messages/conversations/$convId');
      } else {
        _navigate(customRoute);
      }
      return;
    }

    // 3. Mesaj bildirimi
    if (rawType == 'message' || rawType == 'chat' || rawType == 'mesaj') {
      final conversationId = data['conversationId'] ?? data['conversation_id'];
      final userId = data['userId'] ?? data['user_id'] ?? data['sender_id'];
      if (conversationId != null && conversationId.toString().trim().isNotEmpty) {
        _navigate('/messages/conversations/${conversationId.toString().trim()}');
      } else if (userId != null && userId.toString().trim().isNotEmpty) {
        _navigate('/messages/chat/${userId.toString().trim()}');
      } else {
        _navigate('/messages');
      }
      return;
    }

    // 4. Duyuru bildirimi
    if (rawType == 'announcement' || rawType == 'duyuru') {
      final id = data['announcementId'] ?? data['announcement_id'] ?? data['id'];
      if (id != null && id.toString().trim().isNotEmpty) {
        _navigate('/announcements/${id.toString().trim()}');
      } else {
        _navigate('/announcements');
      }
      return;
    }

    // 5. Devamsızlık hatırlatma
    if (rawType == 'attendance_reminder' || rawType == 'attendance') {
      _navigate('/attendances');
      return;
    }

    // 6. Nöbet hatırlatma
    if (rawType == 'duty_reminder' || rawType == 'duty') {
      _navigate('/duty-schedules');
      return;
    }

    // 7. Anket
    if (rawType == 'survey' || rawType == 'anket') {
      final surveyId = data['surveyId'] ?? data['survey_id'] ?? data['id'];
      if (surveyId != null && surveyId.toString().trim().isNotEmpty) {
        _navigate('/surveys/${surveyId.toString().trim()}');
      } else {
        _navigate('/surveys');
      }
      return;
    }

    // 8. Varsayılan bildirimler sayfası
    _navigate('/notifications');
  }

  static void _navigate(String route) {
    debugPrint('NotificationRouter yönlendiriliyor: $route');
    final context = AppRouter.navigatorKey.currentContext;
    if (context != null && context.mounted) {
      try {
        context.go(route);
        return;
      } catch (e) {
        debugPrint('NotificationRouter context.go hatası: $e');
      }
    }
    // Context henüz hazır değilse Splash sonrasına sakla
    _pendingRoute = route;
  }
}

