import '../../core/network/api_client.dart';

class SmsRepository {
  SmsRepository(this._api);

  final ApiClient _api;

  // SMS Geçmişi
  Future<Map<String, dynamic>> getSmsHistory({
    String? status,
    String? title,
    String? scheduledFrom,
    String? scheduledTo,
  }) async {
    final queryParams = <String, String>{};
    if (status != null && status.isNotEmpty) queryParams['status'] = status;
    if (title != null && title.isNotEmpty) queryParams['title'] = title;
    if (scheduledFrom != null && scheduledFrom.isNotEmpty) {
      queryParams['scheduled_from'] = scheduledFrom;
    }
    if (scheduledTo != null && scheduledTo.isNotEmpty) {
      queryParams['scheduled_to'] = scheduledTo;
    }

    final queryString = queryParams.isNotEmpty
        ? '?${queryParams.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}'
        : '';

    return _api.getJson('/sms/scheduled$queryString');
  }

  // SMS Sil
  Future<void> deleteSms(int id) async {
    await _api.deleteJson('/sms/scheduled/$id');
  }

  // SMS Şablonları
  Future<Map<String, dynamic>> getSmsTemplates({bool? isActive}) async {
    final query = isActive != null ? '?is_active=${isActive ? 1 : 0}' : '';
    return _api.getJson('/sms/templates$query');
  }

  // SMS Şablonu Detayı
  Future<Map<String, dynamic>> getSmsTemplate(int id) async {
    return _api.getJson('/sms/templates/$id');
  }

  // SMS Şablonu Oluştur
  Future<Map<String, dynamic>> createSmsTemplate({
    required String name,
    required String content,
    bool isActive = true,
  }) async {
    return _api.postJson(
      '/sms/templates',
      data: {
        'name': name,
        'content': content,
        'is_active': isActive,
      },
    );
  }

  // SMS Şablonu Güncelle
  Future<Map<String, dynamic>> updateSmsTemplate(
    int id, {
    required String name,
    required String content,
    bool isActive = true,
  }) async {
    return _api.putJson(
      '/sms/templates/$id',
      data: {
        'name': name,
        'content': content,
        'is_active': isActive,
      },
    );
  }

  // SMS Şablonu Sil
  Future<void> deleteSmsTemplate(int id) async {
    await _api.deleteJson('/sms/templates/$id');
  }

  // Toplu SMS Gönder
  Future<Map<String, dynamic>> sendBulkSms({
    String? title,
    required String message,
    required String recipientType,
    required List<int> recipientIds,
    List<String> recipientPhones = const [],
    String? scheduledAt,
  }) async {
    final data = <String, dynamic>{
      'message': message,
      'recipient_type': recipientType,
      'recipient_ids': recipientIds,
      'recipient_phones': recipientPhones,
    };

    if (title != null && title.isNotEmpty) {
      data['title'] = title;
    }

    if (scheduledAt != null && scheduledAt.isNotEmpty) {
      data['scheduled_at'] = scheduledAt;
    } else {
      final now = DateTime.now();
      data['scheduled_at'] = now.toIso8601String().substring(0, 16);
    }

    return _api.postJson('/sms/scheduled', data: data);
  }

  // SMS API Ayarları
  Future<Map<String, dynamic>> getSettings() async {
    return _api.getJson('/sms/settings');
  }

  Future<Map<String, dynamic>> saveSettings({
    required String username,
    required String password,
    String? baseUrl,
    required String sender,
    bool enabled = true,
  }) async {
    return _api.postJson('/sms/settings', data: {
      'username': username,
      'password': password,
      'base_url': baseUrl ?? 'https://panel.iletibilgi.com.tr:9588',
      'sender': sender,
      'enabled': enabled,
    });
  }

  // Kullanıcı ve Bakiye Bilgisi (Iletibilgi Kredi/Kullanım)
  Future<Map<String, dynamic>> getUserInfo({
    String? username,
    String? password,
    String? baseUrl,
  }) async {
    final queryParams = <String, String>{};
    if (username != null && username.isNotEmpty) queryParams['username'] = username;
    if (password != null && password.isNotEmpty) queryParams['password'] = password;
    if (baseUrl != null && baseUrl.isNotEmpty) queryParams['base_url'] = baseUrl;

    final queryString = queryParams.isNotEmpty
        ? '?${queryParams.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}'
        : '';

    return _api.getJson('/sms/user-info$queryString');
  }

  // Test SMS Gönderimi (Backend proxy)
  Future<Map<String, dynamic>> testSms({
    required String username,
    required String password,
    String? baseUrl,
    required String sender,
    required String phone,
    required String message,
  }) async {
    return _api.postJson('/sms/test', data: {
      'username': username,
      'password': password,
      'base_url': baseUrl ?? 'https://panel.iletibilgi.com.tr:9588',
      'sender': sender,
      'phone': phone,
      'message': message,
    });
  }

  // Hedef Listelerini Getir
  Future<Map<String, dynamic>> getClassrooms() async {
    return _api.getJson('/classrooms?per_page=500');
  }

  Future<Map<String, dynamic>> getBranches() async {
    return _api.getJson('/branches?per_page=500');
  }

  Future<Map<String, dynamic>> getStudents() async {
    return _api.getJson('/students?per_page=1000');
  }

  Future<Map<String, dynamic>> getTeachers() async {
    return _api.getJson('/users?per_page=500');
  }
}
