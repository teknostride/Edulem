import '../../core/network/api_client.dart';

class NotificationsRepository {
  NotificationsRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list({
    required int page,
    required int perPage,
  }) async {
    final data = await _api.getJson(
      '/notifications',
      queryParameters: {
        'page': page.toString(),
        'per_page': perPage.toString(),
      },
    );

    dynamic v;
    if (data['notifications'] is List) {
      v = data['notifications'];
    } else if (data['data'] is Map && (data['data']['notifications'] is List)) {
      v = data['data']['notifications'];
    } else if (data['value'] is List) {
      v = data['value'];
    }

    if (v is! List) return const [];

    return v
        .whereType<Map>()
        .map((e) => _normalizeNotification(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<void> markAsRead(int id) async {
    await _api.putJson('/notifications/$id/read');
  }

  Map<String, dynamic> _normalizeNotification(Map<String, dynamic> n) {
    final normalized = <String, dynamic>{};
    normalized['id'] = n['id'];
    normalized['title'] = n['title'] ?? '';
    normalized['message'] = n['message'] ?? n['body'] ?? '';
    normalized['is_read'] = n['is_read'] ?? n['read'] ?? false;
    normalized['created_at'] = n['created_at'] ?? n['sent_at'];
    return normalized;
  }
}
