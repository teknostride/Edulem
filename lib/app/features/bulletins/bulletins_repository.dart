import '../../core/network/api_client.dart';

class BulletinsRepository {
  BulletinsRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list() async {
    final data = await _api.getJson('/bulletins');
    final List<dynamic> items = data['data'] ?? data['bulletins'] ?? [];
    return items
        .map((e) => _normalizeBulletin(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/bulletins/$id');
    return _normalizeBulletin(data['data'] ?? data);
  }

  Future<List<Map<String, dynamic>>> getStudentPortfolio(int studentId) async {
    final data = await _api.getJson('/bulletins/portfolio/$studentId');
    final List<dynamic> items = data['data'] ?? data['bulletins'] ?? [];
    return items
        .map((e) => _normalizeBulletin(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> create({
    required String title,
    required String content,
    int? studentId,
    List<int>? attachmentIds,
  }) async {
    final data = await _api.postJson(
      '/bulletins',
      data: {
        'title': title,
        'content': content,
        'student_id': studentId,
        'attachment_ids': attachmentIds,
      },
    );
    return _normalizeBulletin(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> createBulletin(Map<String, dynamic> data) async {
    final response = await _api.postJson('/bulletins', data: data);
    return _normalizeBulletin(response['data'] ?? response);
  }

  Future<Map<String, dynamic>> updateBulletin(
    int id,
    Map<String, dynamic> data,
  ) async {
    final response = await _api.putJson('/bulletins/$id', data: data);
    return _normalizeBulletin(response['data'] ?? response);
  }

  Future<void> publish(int id) async {
    await _api.postJson('/bulletins/$id/publish', data: {});
  }

  Future<void> addToPortfolio(int bulletinId, int studentId) async {
    await _api.postJson(
      '/bulletins/$bulletinId/portfolio',
      data: {'student_id': studentId},
    );
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/bulletins/$id');
  }

  Map<String, dynamic> _normalizeBulletin(Map<String, dynamic> b) {
    return {
      'id': b['id'],
      'title': b['title'] ?? '',
      'content': b['content'] ?? '',
      'student': b['student'],
      'author': b['author'],
      'is_published': b['is_published'] ?? b['isPublished'] ?? false,
      'published_at': b['published_at'] ?? b['publishedAt'],
      'attachments': b['attachments'] ?? [],
    };
  }
}
