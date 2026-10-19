import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:app_settings/app_settings.dart';

class NotificationPermission {
  static Future<bool> checkAndRequest({BuildContext? context}) async {
    final settings = await FirebaseMessaging.instance.getNotificationSettings();

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      return true;
    }

    if (settings.authorizationStatus == AuthorizationStatus.notDetermined) {
      // İlk defa izin isteniyor
      final requestResult = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        announcement: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
      );

      if (requestResult.authorizationStatus == AuthorizationStatus.authorized) {
        return true;
      }

      // İzin verilmedi
      if (context != null && context.mounted) {
        _showPermissionDialog(context);
      }
      return false;
    }

    // İzin daha önce reddedilmiş - ayarlara yönlendir
    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      if (context != null && context.mounted) {
        _showPermissionDialog(context);
      }
      return false;
    }

    return false;
  }

  static void _showPermissionDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Bildirim İzni Gerekli'),
        content: const Text(
          'Mesaj bildirimlerini alabilmeniz için bildirim iznini açmanız gerekiyor. '
          'Ayarlar bölümünden bildirimleri aktif edebilirsiniz.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Daha Sonra'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              AppSettings.openAppSettings(type: AppSettingsType.notification);
            },
            child: const Text('Ayarları Aç'),
          ),
        ],
      ),
    );
  }

  static Future<bool> isGranted() async {
    final settings = await FirebaseMessaging.instance.getNotificationSettings();
    return settings.authorizationStatus == AuthorizationStatus.authorized;
  }
}
