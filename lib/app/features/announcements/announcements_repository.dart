import 'package:flutter/foundation.dart';
import '../../core/network/api_client.dart';

class AnnouncementsRepository {
  AnnouncementsRepository(this._api);

  final ApiClient _api;

  /// Duyuruları listele (mailbox filtresi ile)
  /// GET /announcements?mailbox=inbox&page=1&search=...
  Future<Map<String, dynamic>> list({
    String mailbox = 'inbox',
    int page = 1,
    int perPage = 100,
    String? search,
    String? type,
    String? role,
  }) async {
    final r = role?.toLowerCase() ?? '';
    final isStudent = r.contains('student') || r.contains('ogrenci') || r.contains('öğrenci');

    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': perPage.toString(),
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      if (type != null && type != 'all') 'type': type,
    };

    if (mailbox != 'all') {
      queryParams['mailbox'] = mailbox;
    }

    Map<String, dynamic> data = {};

    if (isStudent) {
      try {
        debugPrint('AnnouncementsRepository: Portal deniniyor...');
        data = await _api.getJson('/portal/student/announcements', queryParameters: queryParams);
      } catch (e) {
        debugPrint('AnnouncementsRepository: Portal hatası veya yok, standarta geçiliyor: $e');
        data = await _api.getJson('/announcements', queryParameters: queryParams);
      }
    } else {
      data = await _api.getJson('/announcements', queryParameters: queryParams);
    }

    debugPrint('AnnouncementsRepository: Ham Veri: $data');

    // Fallback: If trash is empty, try 'deleted' as mailbox name
    if (mailbox == 'trash' && 
        !(data['value'] is List && (data['value'] as List).isNotEmpty) &&
        !(data['data'] is List && (data['data'] as List).isNotEmpty) &&
        !(data['announcements'] is List && (data['announcements'] as List).isNotEmpty)) {
      final deletedData = await _api.getJson(
        '/announcements',
        queryParameters: {...queryParams, 'mailbox': 'deleted'},
      );
      if ((deletedData['value'] is List && (deletedData['value'] as List).isNotEmpty) ||
          (deletedData['data'] is List && (deletedData['data'] as List).isNotEmpty)) {
        return _parseListResponse(deletedData);
      }
    }

    return _parseListResponse(data);
  }

  Map<String, dynamic> _parseListResponse(Map<String, dynamic> data) {
    dynamic announcements;
    if (data['value'] is List) {
      announcements = data['value'];
    } else if (data['data'] is List) {
      announcements = data['data'];
    } else if (data['announcements'] is List) {
      announcements = data['announcements'];
    } else if (data['items'] is List) {
      announcements = data['items'];
    } else if (data['trash'] is List) {
      announcements = data['trash'];
    } else if (data['data'] is Map && data['data']['items'] is List) {
      announcements = data['data']['items'];
    }

    return {
      'announcements': announcements is List ? announcements : [],
      'pagination': data['pagination'] ?? data['meta'],
    };
  }

  /// Okunmamış duyuru sayısı ve mailbox istatistikleri
  /// GET /announcements/unread-count
  Future<Map<String, dynamic>> getUnreadCount() async {
    final data = await _api.getJson('/announcements/unread-count');
    return data['data'] ?? data;
  }

  Future<Map<String, dynamic>> getById(int id) async {
    return _api.getJson('/announcements/$id');
  }

  /// Yeni duyuru oluştur
  /// POST /announcements
  Future<Map<String, dynamic>> create({
    required String title,
    required String message,
    String type = 'info',
    List<int>? roleIds,
    String status = 'published',
    String? scheduledAt,
  }) async {
    final data = await _api.postJson(
      '/announcements',
      data: {
        'title': title,
        'message': message,
        'type': type,
        'roles': roleIds,
        'role_ids': roleIds,
        'status': status,
        'is_active': status == 'published' ? 1 : 0,
        'published': status == 'published' ? 1 : 0,
        'scheduled_at': scheduledAt,
      },
    );
    return data['data'] ?? data;
  }

  /// Duyuru güncelle
  /// PUT /announcements/{id}
  Future<Map<String, dynamic>> update({
    required int id,
    required String title,
    required String message,
    String? type,
    List<int>? roleIds,
  }) async {
    final data = await _api.putJson(
      '/announcements/$id',
      data: {
        'title': title,
        'message': message,
        'type': type,
        'roles': roleIds,
      },
    );
    return data['data'] ?? data;
  }

  /// Duyuru sil (kalıcı)
  /// DELETE /announcements/{id}
  Future<void> delete(int id) async {
    await _api.deleteJson('/announcements/$id');
  }

  /// Duyuru çöpe taşı (tekli)
  Future<void> trash(int id) async {
    try {
      // 1. Yöntem: Kişisel mailbox güncelleme (En güvenli yöntem)
      await _api.putJson('/announcements/$id/mailbox', data: {'mailbox': 'trash'});
    } catch (e) {
      try {
        // 2. Yöntem: POST /trash
        await _api.postJson('/announcements/$id/trash');
      } catch (e2) {
        try {
          // 3. Yöntem: PUT /trash
          await _api.putJson('/announcements/$id/trash');
        } catch (e3) {
          // 4. Yöntem: Bulk trash (Hem ids hem announcement_ids gönderelim)
          await bulkTrash([id]);
        }
      }
    }
  }

  /// Toplu çöpe taşıma
  /// POST /announcements/bulk-trash
  Future<void> bulkTrash(List<int> ids) async {
    await _api.postJson(
      '/announcements/bulk-trash', 
      data: {
        'ids': ids,
        'announcement_ids': ids,
      },
    );
  }

  /// Okundu olarak işaretle
  /// PUT /announcements/{id}/read
  Future<void> markRead(int id) async {
    await _api.putJson('/announcements/$id/read');
  }

  /// Tümünü okundu işaretle
  /// PUT /announcements/read-all
  Future<void> markAllRead() async {
    await _api.putJson('/announcements/read-all');
  }

  /// Yıldızla/ Yıldızı kaldır
  /// PUT /announcements/{id}/star
  Future<void> toggleStar(int id, {required bool value}) async {
    await _api.putJson('/announcements/$id/star', data: {'value': value});
  }

  /// Önemli işaretle/ Kaldır
  /// PUT /announcements/{id}/important
  Future<void> toggleImportant(int id, {required bool value}) async {
    await _api.putJson('/announcements/$id/important', data: {'value': value});
  }

  /// Rolleri listele
  /// GET /roles
  Future<Map<String, dynamic>> getRoles() async {
    return _api.getJson('/roles');
  }
}
