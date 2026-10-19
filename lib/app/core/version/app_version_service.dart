import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

class AppVersionCheckResult {
  final String currentVersion;
  final String latestVersion;
  final String minRequiredVersion;
  final bool isForceUpdate;
  final bool isOptionalUpdate;
  final String storeUrl;

  const AppVersionCheckResult({
    required this.currentVersion,
    required this.latestVersion,
    required this.minRequiredVersion,
    required this.isForceUpdate,
    required this.isOptionalUpdate,
    required this.storeUrl,
  });

  bool get hasUpdate => isForceUpdate || isOptionalUpdate;
}

class AppVersionService {
  static const String playStoreUrl =
      'https://play.google.com/store/apps/details?id=com.teknostride.edulem&hl=tr';
  static const String playStoreMarketUri =
      'market://details?id=com.teknostride.edulem';
  static const String appStoreUrl =
      'https://apps.apple.com/tr/app/edulem/id6803273754?l=tr';

  static String get platformStoreUrl {
    if (kIsWeb) return playStoreUrl;
    if (Platform.isIOS || Platform.isMacOS) {
      return appStoreUrl;
    }
    return playStoreUrl;
  }

  /// Checks the app version against the backend /api/app/version endpoint.
  /// If check fails (e.g. offline or server error), returns null so app startup continues.
  static Future<AppVersionCheckResult?> checkVersion({Dio? customDio}) async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version; // e.g. "1.3.2"
      final currentBuildNumber = packageInfo.buildNumber; // e.g. "33"
      final fullCurrentVersion = currentBuildNumber.isNotEmpty
          ? '$currentVersion+$currentBuildNumber'
          : currentVersion;

      final dio = customDio ??
          Dio(
            BaseOptions(
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 10),
              headers: const {
                'Accept': 'application/json',
                'User-Agent': 'Flutter-Edulem/1.0',
              },
            ),
          );

      Response<dynamic>? response;
      // Backend registers the route at /api/app/version
      try {
        response = await dio.get('https://api.akirfan.edulem.com/api/app/version');
      } catch (e1) {
        debugPrint('AppVersion primary route error: $e1');
        try {
          response = await dio.get('https://api.akirfan.edulem.com/api/v1/app/version');
        } catch (e2) {
          debugPrint('AppVersion fallback route error: $e2');
          return null;
        }
      }

      if (response.data is! Map) return null;
      final data = response.data as Map;

      final latestVersion = (data['latest_version'] ?? '1.0.0').toString().trim();
      final minRequiredVersion =
          (data['min_required_version'] ?? '1.0.0').toString().trim();

      final isForceUpdate = isVersionLower(fullCurrentVersion, minRequiredVersion);
      final isOptionalUpdate = !isForceUpdate &&
          isVersionLower(fullCurrentVersion, latestVersion);

      return AppVersionCheckResult(
        currentVersion: currentVersion,
        latestVersion: latestVersion,
        minRequiredVersion: minRequiredVersion,
        isForceUpdate: isForceUpdate,
        isOptionalUpdate: isOptionalUpdate,
        storeUrl: platformStoreUrl,
      );
    } catch (e) {
      debugPrint('AppVersionService check failed: $e');
      return null;
    }
  }

  /// Compares two semver strings: returns true if [v1] is strictly less than [v2].
  /// Handles "1.3.1", "1.3.2+30", "1.3.2+33", "v1.4.0", etc.
  static bool isVersionLower(String v1, String v2) {
    try {
      final cleanV1 = _cleanVersion(v1);
      final cleanV2 = _cleanVersion(v2);

      final parts1 = cleanV1.split('.').map((p) => int.tryParse(p) ?? 0).toList();
      final parts2 = cleanV2.split('.').map((p) => int.tryParse(p) ?? 0).toList();

      final maxLength = parts1.length > parts2.length ? parts1.length : parts2.length;
      while (parts1.length < maxLength) {
        parts1.add(0);
      }
      while (parts2.length < maxLength) {
        parts2.add(0);
      }

      for (int i = 0; i < maxLength; i++) {
        if (parts1[i] < parts2[i]) return true;
        if (parts1[i] > parts2[i]) return false;
      }

      // Semver eşitse (örn 1.3.2 == 1.3.2) build number varsa karşılaştır
      final b1 = _extractBuildNumber(v1);
      final b2 = _extractBuildNumber(v2);
      if (b1 != null && b2 != null) {
        return b1 < b2;
      }

      return false;
    } catch (_) {
      return false;
    }
  }

  static int? _extractBuildNumber(String v) {
    if (v.contains('+')) {
      final part = v.split('+').last.trim();
      return int.tryParse(part);
    }
    return null;
  }

  static String _cleanVersion(String v) {
    var s = v.trim().toLowerCase();
    if (s.startsWith('v')) s = s.substring(1);
    if (s.contains('+')) s = s.split('+').first;
    if (s.contains('-')) s = s.split('-').first;
    return s;
  }
}
