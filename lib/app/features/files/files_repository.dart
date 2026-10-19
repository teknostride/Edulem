import '../../core/network/api_client.dart';

class FilesRepository {
  FilesRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list({
    required int page,
    required int perPage,
  }) async {
    final data = await _api.getJson(
      '/files',
      queryParameters: {
        'page': page.toString(),
        'per_page': perPage.toString(),
      },
    );

    dynamic v;
    if (data['files'] is List) {
      v = data['files'];
    } else if (data['data'] is Map && (data['data']['files'] is List)) {
      v = data['data']['files'];
    } else if (data['value'] is List) {
      v = data['value'];
    }

    if (v is! List) return const [];

    return v
        .whereType<Map>()
        .map((e) => _normalizeFile(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/files/$id');
    if (data['file'] is Map) {
      return _normalizeFile(Map<String, dynamic>.from(data['file']));
    }
    return _normalizeFile(data);
  }

  Future<Map<String, dynamic>> upload({
    required String filePath,
    required String fileName,
  }) async {
    final data = await _api.postMultipartJson(
      '/files/upload',
      fields: {},
      files: {'file': filePath},
    );
    if (data['file'] is Map) {
      return _normalizeFile(Map<String, dynamic>.from(data['file']));
    }
    return _normalizeFile(data);
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/files/$id');
  }

  Map<String, dynamic> _normalizeFile(Map<String, dynamic> f) {
    final normalized = <String, dynamic>{};
    normalized['id'] = f['id'];
    normalized['name'] = f['name'] ?? f['original_name'] ?? f['filename'] ?? '';
    normalized['path'] = f['path'] ?? f['url'] ?? f['download_url'] ?? '';
    normalized['size'] = f['size'] ?? 0;
    normalized['mime_type'] = f['mime_type'] ?? f['type'] ?? '';
    normalized['created_at'] = f['created_at'] ?? f['uploaded_at'];
    return normalized;
  }
}
