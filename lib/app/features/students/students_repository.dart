import '../../core/network/api_client.dart';

class StudentsRepository {
  StudentsRepository(this._api);

  final ApiClient _api;

  Future<Map<String, dynamic>> list({
    required int page,
    required int perPage,
    String? search,
    int? campusId,
    int? educationLevelId,
    int? classroomId,
    bool? isActive,
    String? sortBy,
    String? sortDir,
  }) async {
    final data = await _api.getJson(
      '/students',
      queryParameters: {
        'page': page.toString(),
        'per_page': perPage.toString(),
        'page_size': perPage.toString(),
        'limit': perPage.toString(),
        ...?((search != null && search.trim().isNotEmpty)
            ? {'search': search.trim()}
            : null),
        ...?((campusId != null) ? {'campus_id': campusId.toString()} : null),
        ...?((educationLevelId != null)
            ? {'education_level_id': educationLevelId.toString()}
            : null),
        ...?((classroomId != null)
            ? {'classroom_id': classroomId.toString()}
            : null),
        ...?((isActive != null)
            ? {'is_active': (isActive ? 1 : 0).toString()}
            : null),
        ...?((sortBy != null && sortBy.trim().isNotEmpty)
            ? {'sort_by': sortBy.trim()}
            : null),
        ...?((sortDir != null && sortDir.trim().isNotEmpty)
            ? {'sort_dir': sortDir.trim()}
            : null),
      },
    );

    dynamic rawStudents;
    Map<String, dynamic>? pagination;

    if (data['students'] is List) {
      rawStudents = data['students'];
    } else if (data['data'] is Map && (data['data']['students'] is List)) {
      rawStudents = data['data']['students'];
    } else if (data['value'] is List) {
      rawStudents = data['value'];
    }

    if (data['pagination'] is Map) {
      pagination = Map<String, dynamic>.from(data['pagination'] as Map);
    } else if (data['data'] is Map && (data['data']['pagination'] is Map)) {
      pagination = Map<String, dynamic>.from(data['data']['pagination'] as Map);
    }

    final items = (rawStudents is List)
        ? rawStudents
              .whereType<Map>()
              .map((e) => _normalizeStudent(Map<String, dynamic>.from(e)))
              .toList()
        : const <Map<String, dynamic>>[];

    return {'items': items, 'pagination': pagination};
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/students/$id');
    if (data['student'] is Map) {
      return _normalizeStudent(Map<String, dynamic>.from(data['student']));
    }
    return _normalizeStudent(data);
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/students/$id');
  }

  Future<Map<String, dynamic>> create(Map<String, dynamic> payload) async {
    final data = await _api.postJson('/students', data: payload);
    if (data['student'] is Map) {
      return _normalizeStudent(Map<String, dynamic>.from(data['student']));
    }
    return _normalizeStudent(data);
  }

  Future<Map<String, dynamic>> update(
    int id,
    Map<String, dynamic> payload,
  ) async {
    final data = await _api.putJson('/students/$id', data: payload);
    if (data['student'] is Map) {
      return _normalizeStudent(Map<String, dynamic>.from(data['student']));
    }
    return _normalizeStudent(data);
  }

  Map<String, dynamic> _normalizeStudent(Map<String, dynamic> s) {
    // API field mapping: student_name, school_no ... -> UI
    final normalized = <String, dynamic>{};
    normalized['id'] = s['id'];
    normalized['name'] = s['name'] ?? s['student_name'] ?? s['full_name'] ?? '';
    normalized['student_number'] = s['student_number'] ?? s['school_no'] ?? '';
    normalized['email'] = s['email'] ?? '';
    normalized['phone'] = s['phone'] ?? '';
    normalized['class_name'] = s['class_name'] ?? s['classroom']?['name'] ?? '';
    normalized['classroom'] = s['classroom'];
    normalized['is_active'] = s['is_active'] ?? s['active'] ?? true;

    for (final entry in s.entries) {
      normalized.putIfAbsent(entry.key, () => entry.value);
    }

    return normalized;
  }
}
