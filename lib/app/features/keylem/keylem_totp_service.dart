import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;

/// KeyLem TOTP (Zamana Dayalı Tek Kullanımlık Şifre) Servisi
/// RFC 6238 standardına uygun 6 haneli dinamik kod üretir.
/// Hem çevrimdışı (saf matematiksel) hem de çevrimiçi (sunucu senkronize) çalışır.
class KeylemTotpService {
  static const String defaultSecret = 'JBSWY3DPEHPK3PXP';
  static const String apiEndpoint = 'https://edulem.com/keylem/api/generate_key.php';

  /// Base32 Çözücü
  static Uint8List base32Decode(String input) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    final clean = input.toUpperCase().replaceAll(RegExp(r'[^A-Z2-7]'), '');
    var buffer = 0;
    var bitsLeft = 0;
    final bytes = <int>[];

    for (var i = 0; i < clean.length; i++) {
      final val = alphabet.indexOf(clean[i]);
      if (val == -1) continue;
      buffer = (buffer << 5) | val;
      bitsLeft += 5;
      if (bitsLeft >= 8) {
        bitsLeft -= 8;
        bytes.add((buffer >> bitsLeft) & 0xFF);
      }
    }
    return Uint8List.fromList(bytes);
  }

  /// Saf Dart SHA-1
  static Uint8List sha1(Uint8List message) {
    final ml = message.length;
    final bitLength = ml * 8;

    final padLength = ((ml + 8) ~/ 64 + 1) * 64;
    final padded = Uint8List(padLength);
    padded.setRange(0, ml, message);
    padded[ml] = 0x80;

    final bd = ByteData.sublistView(padded);
    bd.setUint32(padLength - 4, bitLength & 0xFFFFFFFF, Endian.big);
    bd.setUint32(padLength - 8, (bitLength >> 32) & 0xFFFFFFFF, Endian.big);

    var h0 = 0x67452301;
    var h1 = 0xEFCDAB89;
    var h2 = 0x98BADCFE;
    var h3 = 0x10325476;
    var h4 = 0xC3D2E1F0;

    final w = Uint32List(80);

    for (var chunk = 0; chunk < padLength; chunk += 64) {
      for (var i = 0; i < 16; i++) {
        w[i] = bd.getUint32(chunk + (i * 4), Endian.big);
      }
      for (var i = 16; i < 80; i++) {
        final x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
        w[i] = ((x << 1) | (x >>> 31)) & 0xFFFFFFFF;
      }

      var a = h0;
      var b = h1;
      var c = h2;
      var d = h3;
      var e = h4;

      for (var i = 0; i < 80; i++) {
        int f;
        int k;
        if (i < 20) {
          f = (b & c) | ((~b) & d);
          k = 0x5A827999;
        } else if (i < 40) {
          f = b ^ c ^ d;
          k = 0x6ED9EBA1;
        } else if (i < 60) {
          f = (b & c) | (b & d) | (c & d);
          k = 0x8F1BBCDC;
        } else {
          f = b ^ c ^ d;
          k = 0xCA62C1D6;
        }

        final temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) & 0xFFFFFFFF;
        e = d;
        d = c;
        c = ((b << 30) | (b >>> 2)) & 0xFFFFFFFF;
        b = a;
        a = temp;
      }

      h0 = (h0 + a) & 0xFFFFFFFF;
      h1 = (h1 + b) & 0xFFFFFFFF;
      h2 = (h2 + c) & 0xFFFFFFFF;
      h3 = (h3 + d) & 0xFFFFFFFF;
      h4 = (h4 + e) & 0xFFFFFFFF;
    }

    final out = Uint8List(20);
    final outBd = ByteData.sublistView(out);
    outBd.setUint32(0, h0, Endian.big);
    outBd.setUint32(4, h1, Endian.big);
    outBd.setUint32(8, h2, Endian.big);
    outBd.setUint32(12, h3, Endian.big);
    outBd.setUint32(16, h4, Endian.big);
    return out;
  }

  /// Saf Dart HMAC-SHA1
  static Uint8List hmacSha1(Uint8List key, Uint8List message) {
    const blockSize = 64;
    Uint8List k = key;
    if (k.length > blockSize) {
      k = sha1(k);
    }
    if (k.length < blockSize) {
      final paddedKey = Uint8List(blockSize);
      paddedKey.setRange(0, k.length, k);
      k = paddedKey;
    }

    final oKeyPad = Uint8List(blockSize);
    final iKeyPad = Uint8List(blockSize);
    for (var i = 0; i < blockSize; i++) {
      oKeyPad[i] = k[i] ^ 0x5c;
      iKeyPad[i] = k[i] ^ 0x36;
    }

    final innerMsg = Uint8List(blockSize + message.length);
    innerMsg.setRange(0, blockSize, iKeyPad);
    innerMsg.setRange(blockSize, innerMsg.length, message);
    final innerHash = sha1(innerMsg);

    final outerMsg = Uint8List(blockSize + innerHash.length);
    outerMsg.setRange(0, blockSize, oKeyPad);
    outerMsg.setRange(blockSize, outerMsg.length, innerHash);
    return sha1(outerMsg);
  }

  /// Yerel (Çevrimdışı) 6 Haneli TOTP Kodu ve Kalan Süre Üretimi
  static KeylemKeyResult getLocalKey({String secret = defaultSecret, int? timestampMs}) {
    final nowMs = timestampMs ?? DateTime.now().millisecondsSinceEpoch;
    final nowSeconds = nowMs ~/ 1000;
    const timeStep = 30;
    final timeSlice = nowSeconds ~/ timeStep;
    final secondsRemaining = timeStep - (nowSeconds % timeStep);

    final keyBytes = base32Decode(secret);

    final data = Uint8List(8);
    final bd = ByteData.sublistView(data);
    bd.setUint32(4, timeSlice, Endian.big);

    final hash = hmacSha1(keyBytes, data);
    final hashOffset = hash[hash.length - 1] & 0x0F;

    final hashBd = ByteData.sublistView(hash);
    final binary = hashBd.getUint32(hashOffset, Endian.big) & 0x7FFFFFFF;

    final code = (binary % 1000000).toString().padLeft(6, '0');
    return KeylemKeyResult(
      key: code,
      secondsRemaining: secondsRemaining,
      isOnline: false,
    );
  }

  /// Sunucudan Canlı Senkronize Key Al (Ağ yoksa otomatik yerel hesaplamaya döner)
  static Future<KeylemKeyResult> fetchServerOrLocalKey({String secret = defaultSecret}) async {
    try {
      final response = await http.get(
        Uri.parse(apiEndpoint),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is Map && data['success'] == true && data['key'] != null) {
          final serverKey = data['key'].toString();
          final remaining = (data['seconds_remaining'] as num?)?.toInt() ?? 30;
          return KeylemKeyResult(
            key: serverKey,
            secondsRemaining: remaining,
            isOnline: true,
          );
        }
      }
    } catch (_) {
      // Çevrimdışı durum veya zaman aşımında sessizce yerel TOTP motoruna geç
    }

    return getLocalKey(secret: secret);
  }
}

class KeylemKeyResult {
  final String key;
  final int secondsRemaining;
  final bool isOnline;

  const KeylemKeyResult({
    required this.key,
    required this.secondsRemaining,
    required this.isOnline,
  });
}
