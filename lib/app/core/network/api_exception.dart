import 'package:dio/dio.dart';

class ApiException implements Exception {
  ApiException({
    required this.message,
    this.statusCode,
    this.uri,
    this.response,
  });

  final String message;
  final int? statusCode;
  final Uri? uri;
  final Response<dynamic>? response;

  /// Kullanıcıya gösterilmeye uygun, anlaşılır ve Türkçe hata mesajı.
  String get userFriendlyMessage {
    // 1. Sunucudan dönen yanıt verisi (response data) içindeki mesajı kontrol et
    if (response?.data != null) {
      final dynamic data = response!.data;
      if (data is Map) {
        // 'message' veya 'error' alanı
        final dynamic msg = data['message'] ?? data['error'];
        if (msg is String && msg.trim().isNotEmpty) {
          final trimmed = msg.trim();
          // Eğer Laravel varsayılan doğrulama başlığıysa, detaylı doğrulama hatalarına bak
          if ((trimmed == 'The given data was invalid.' ||
                  trimmed == 'Validation error') &&
              data['errors'] is Map) {
            final errors = data['errors'] as Map;
            for (final val in errors.values) {
              if (val is List && val.isNotEmpty) {
                return val.first.toString();
              } else if (val is String && val.isNotEmpty) {
                return val;
              }
            }
          }
          // Bilinen genel İngilizce mesajları Türkçeleştir
          if (trimmed == 'Unauthenticated.' || trimmed == 'Unauthenticated') {
            return 'Oturum süreniz dolmuş veya yetkiniz bulunmuyor.';
          }
          if (trimmed == 'The given data was invalid.') {
            return 'Girdiğiniz bilgiler geçersiz. Lütfen kontrol edin.';
          }
          return trimmed;
        }

        // 'errors' map'i varsa ilk hatayı al
        if (data['errors'] is Map) {
          final errors = data['errors'] as Map;
          for (final val in errors.values) {
            if (val is List && val.isNotEmpty) {
              return val.first.toString();
            } else if (val is String && val.isNotEmpty) {
              return val;
            }
          }
        }
      } else if (data is String && data.trim().isNotEmpty) {
        final trimmed = data.trim();
        if (!trimmed.startsWith('<') && trimmed.length < 200) {
          return trimmed;
        }
      }
    }

    // 2. HTTP Durum Kodlarına göre Türkçe açıklamalar
    if (statusCode != null) {
      switch (statusCode) {
        case 400:
          return 'Geçersiz istek. Lütfen girdiğiniz bilgileri kontrol edin.';
        case 401:
          return 'TC Kimlik No veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
        case 403:
          return 'Bu hesaba erişim yetkiniz bulunmuyor veya portal erişimi kapalı.';
        case 404:
          return 'Kullanıcı hesabı veya istenen sayfa bulunamadı.';
        case 419:
          return 'Oturum zaman aşımına uğradı. Lütfen tekrar deneyin.';
        case 422:
          return 'Eksik veya hatalı bilgi girdiniz. Lütfen alanları kontrol edin.';
        case 429:
          return 'Çok fazla hatalı deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.';
        case 500:
          return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
        case 502:
        case 503:
        case 504:
          return 'Sunucu şu anda hizmet veremiyor. Lütfen daha sonra tekrar deneyin.';
      }
    }

    // 3. Ağ / Zaman aşımı kontrolleri
    final lower = message.toLowerCase();
    if (lower.contains('timeout') || lower.contains('timed out')) {
      return 'Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edin.';
    }
    if (lower.contains('socketexception') ||
        lower.contains('connection refused') ||
        lower.contains('network is unreachable') ||
        lower.contains('failed host lookup') ||
        lower.contains('connection error')) {
      return 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.';
    }

    return 'İşlem gerçekleştirilemedi. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
  }

  @override
  String toString() {
    // Kullanıcıya gösterilmeye uygun mesaj döndür.
    // Teknik detaylar (URL, status code) loglanabilir ama
    // kullanıcıya gösterilmemeli.
    return userFriendlyMessage;
  }

  /// Geliştirici / hata ayıklama amaçlı detaylı bilgi
  String toDebugString() {
    final code = statusCode != null ? ' ($statusCode)' : '';
    final url = uri != null ? ' ${uri.toString()}' : '';
    return 'ApiException$code:$url $message';
  }
}
