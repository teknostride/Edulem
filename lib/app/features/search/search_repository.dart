import '../../core/network/api_client.dart';

class SearchRepository {
  SearchRepository(this._api);

  final ApiClient _api;

  Future<Map<String, dynamic>> globalSearch({required String query}) async {
    if (query.trim().length < 2) {
      return {
        'students': [],
        'lessons': [],
        'users': [],
      };
    }

    final data = await _api.getJson(
      '/search',
      queryParameters: {'q': query},
    );

    return {
      'students': _normalizeList(data['students']),
      'lessons': _normalizeList(data['lessons']),
      'users': _normalizeList(data['users']),
    };
  }

  List<Map<String, dynamic>> _normalizeList(dynamic value) {
    if (value is! List) return [];
    return value
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }
}
