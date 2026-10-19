import 'dart:convert';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class LocalNotificationService {
  static final LocalNotificationService _instance =
      LocalNotificationService._();
  factory LocalNotificationService() => _instance;
  LocalNotificationService._();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _plugin.initialize(
      settings: settings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Android için bildirim kanallarını OS seviyesinde oluştur (Android 8.0+)
    final androidPlugin = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (androidPlugin != null) {
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'homework_channel',
          'Ödevler',
          description: 'Yeni ödev ve ödev teslim bildirimleri',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
          showBadge: true,
        ),
      );
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'messages_channel',
          'Mesajlar',
          description: 'Yeni mesaj bildirimleri',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
          showBadge: true,
        ),
      );
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'announcements_channel',
          'Duyurular',
          description: 'Yeni duyuru bildirimleri',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
          showBadge: true,
        ),
      );
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'general_channel',
          'Genel Bildirimler',
          description: 'Genel bilgilendirme ve duyurular',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
          showBadge: true,
        ),
      );
    }

    _initialized = true;
  }

  void Function(NotificationResponse)? onTap;

  void _onNotificationTapped(NotificationResponse response) {
    onTap?.call(response);
  }

  /// Genel veya türe özel bildirim göster
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    Map<String, dynamic>? data,
    String? channelId,
    String? channelName,
  }) async {
    final rawType = data?['type']?.toString().toLowerCase().trim();
    final isHomework = rawType == 'homework' ||
        rawType == 'homeworks' ||
        rawType == 'odev' ||
        rawType == 'ödev' ||
        data?.containsKey('homeworkId') == true ||
        data?.containsKey('homework_id') == true ||
        title.toLowerCase().contains('ödev') ||
        title.toLowerCase().contains('odev');

    final isMessage = rawType == 'message' || rawType == 'chat';
    final isAnnouncement = rawType == 'announcement' || rawType == 'duyuru';

    final resolvedChannelId = channelId ??
        (isHomework
            ? 'homework_channel'
            : isMessage
                ? 'messages_channel'
                : isAnnouncement
                    ? 'announcements_channel'
                    : 'general_channel');

    final resolvedChannelName = channelName ??
        (isHomework
            ? 'Ödevler'
            : isMessage
                ? 'Mesajlar'
                : isAnnouncement
                    ? 'Duyurular'
                    : 'Genel Bildirimler');

    final androidDetails = AndroidNotificationDetails(
      resolvedChannelId,
      resolvedChannelName,
      channelDescription: 'EduLem Bildirimleri',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
      category: isMessage
          ? AndroidNotificationCategory.message
          : isHomework
              ? AndroidNotificationCategory.reminder
              : AndroidNotificationCategory.event,
      styleInformation: isMessage
          ? MessagingStyleInformation(
              Person(name: '', key: 'user_key'),
              conversationTitle: null,
              groupConversation: false,
            )
          : BigTextStyleInformation(
              body,
              contentTitle: title,
              summaryText: isHomework ? 'Ödev' : isAnnouncement ? 'Duyuru' : null,
            ),
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      interruptionLevel: InterruptionLevel.timeSensitive,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    final payloadMap = Map<String, dynamic>.from(data ?? {});
    if (isHomework && !payloadMap.containsKey('type')) {
      payloadMap['type'] = 'homework';
    }
    payloadMap['title'] = title;
    payloadMap['body'] = body;

    await _plugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: details,
      payload: jsonEncode(payloadMap),
    );
  }

  /// Geriye dönük uyumluluk için mesaj bildirim helper'ı
  Future<void> showMessageNotification({
    required String title,
    required String body,
    int? conversationId,
    Map<String, dynamic>? data,
  }) async {
    final payloadData = Map<String, dynamic>.from(data ?? {});
    payloadData['type'] = 'message';
    if (conversationId != null) {
      payloadData['conversationId'] = conversationId;
    }
    await showNotification(
      id: conversationId ?? DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      data: payloadData,
      channelId: 'messages_channel',
      channelName: 'Mesajlar',
    );
  }

  Future<void> cancelAll() async {
    await _plugin.cancelAll();
  }
}

