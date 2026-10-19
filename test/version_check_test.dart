import 'package:flutter_test/flutter_test.dart';
import 'package:edulem/app/core/version/app_version_service.dart';

void main() {
  group('AppVersionService Version Comparison Tests', () {
    test('isVersionLower compares major versions correctly', () {
      expect(AppVersionService.isVersionLower('1.0.0', '2.0.0'), isTrue);
      expect(AppVersionService.isVersionLower('2.0.0', '1.0.0'), isFalse);
    });

    test('isVersionLower compares minor versions correctly', () {
      expect(AppVersionService.isVersionLower('1.3.0', '1.4.0'), isTrue);
      expect(AppVersionService.isVersionLower('1.4.0', '1.3.0'), isFalse);
    });

    test('isVersionLower compares patch versions correctly', () {
      expect(AppVersionService.isVersionLower('1.3.1', '1.3.2'), isTrue);
      expect(AppVersionService.isVersionLower('1.3.2', '1.3.1'), isFalse);
      expect(AppVersionService.isVersionLower('1.3.1', '1.3.1'), isFalse);
    });

    test('isVersionLower handles build numbers and prefixes', () {
      expect(AppVersionService.isVersionLower('1.3.1+29', '1.4.0'), isTrue);
      expect(AppVersionService.isVersionLower('v1.3.1', '1.3.2'), isTrue);
      expect(AppVersionService.isVersionLower('1.3.1', 'v1.3.0'), isFalse);
    });

    test('isVersionLower handles different part lengths', () {
      expect(AppVersionService.isVersionLower('1.3', '1.3.1'), isTrue);
      expect(AppVersionService.isVersionLower('1.3.0', '1.3'), isFalse);
    });
  });
}
