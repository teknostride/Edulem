import '../../core/network/api_client.dart';

class EducationLevelsRepository {
  EducationLevelsRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list({
    int? campusId,
    List<int>? ids,
    int? perPage,
  }) async {
    final data = await _api.getJson(
      '/education-levels',
      queryParameters: {
        ...?((campusId != null) ? {'campus_id': campusId.toString()} : null),
        ...?((ids != null && ids.isNotEmpty) ? {'ids': ids} : null),
        ...?((perPage != null) ? {'per_page': perPage.toString()} : null),
      },
    );
    final List<dynamic> items =
        data['data'] ?? data['education_levels'] ?? data['value'] ?? [];
    return items
        .map((e) => _normalizeEducationLevel(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/education-levels/$id');
    return _normalizeEducationLevel(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> create({
    required String name,
    String? code,
    int? order,
    int? years,
  }) async {
    final data = await _api.postJson(
      '/education-levels',
      data: {'name': name, 'code': code, 'order': order, 'years': years},
    );
    return _normalizeEducationLevel(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> update({
    required int id,
    String? name,
    String? code,
    int? order,
    int? years,
  }) async {
    final data = await _api.putJson(
      '/education-levels/$id',
      data: {
        ...?((name != null) ? {'name': name} : null),
        ...?((code != null) ? {'code': code} : null),
        ...?((order != null) ? {'order': order} : null),
        ...?((years != null) ? {'years': years} : null),
      },
    );
    return _normalizeEducationLevel(data['data'] ?? data);
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/education-levels/$id');
  }

  Map<String, dynamic> _normalizeEducationLevel(Map<String, dynamic> el) {
    return {
      'id': el['id'],
      'name': el['name'] ?? '',
      'code': el['code'],
      'order': el['order'] ?? 0,
      'years': el['years'],
      'classrooms_count': el['classrooms_count'] ?? el['classroomsCount'] ?? 0,
      'campus_id': el['campus_id'] ?? el['campusId'],
      'campus_name': el['campus_name'] ?? el['campusName'],
    };
  }
}
