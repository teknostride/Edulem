import 'package:flutter_test/flutter_test.dart';
import 'package:edulem/app/features/keylem/keylem_totp_service.dart';

void main() {
  group('KeylemTotpService RFC 6238 Tests', () {
    const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

    test('validates RFC 6238 test vector at 59 seconds', () {
      final res = KeylemTotpService.getLocalKey(
        secret: rfcSecret,
        timestampMs: 59 * 1000,
      );
      expect(res.key, equals('287082'));
    });

    test('validates RFC 6238 test vector at 1111111109 seconds', () {
      final res = KeylemTotpService.getLocalKey(
        secret: rfcSecret,
        timestampMs: 1111111109 * 1000,
      );
      expect(res.key, equals('081804'));
    });

    test('validates RFC 6238 test vector at 1111111111 seconds', () {
      final res = KeylemTotpService.getLocalKey(
        secret: rfcSecret,
        timestampMs: 1111111111 * 1000,
      );
      expect(res.key, equals('050471'));
    });

    test('validates RFC 6238 test vector at 1234567890 seconds', () {
      final res = KeylemTotpService.getLocalKey(
        secret: rfcSecret,
        timestampMs: 1234567890 * 1000,
      );
      expect(res.key, equals('005924'));
    });

    test('validates RFC 6238 test vector at 2000000000 seconds', () {
      final res = KeylemTotpService.getLocalKey(
        secret: rfcSecret,
        timestampMs: 2000000000 * 1000,
      );
      expect(res.key, equals('279037'));
    });

    test('generates valid 6-digit key with default secret', () {
      final res = KeylemTotpService.getLocalKey();
      expect(res.key.length, equals(6));
      expect(int.tryParse(res.key), isNotNull);
      expect(res.secondsRemaining, inInclusiveRange(1, 30));
    });
  });
}
