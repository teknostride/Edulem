import '../../core/network/api_client.dart';

class ClassroomsRepository {
  ClassroomsRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list({
    int? campusId,
    int? educationLevelId,
    int? perPage,
  }) async {
    final data = await _api.getJson(
      '/classrooms',
      queryParameters: {
        ...?((campusId != null) ? {'campus_id': campusId.toString()} : null),
        ...?((educationLevelId != null)
            ? {'education_level_id': educationLevelId.toString()}
            : null),
        'per_page': (perPage ?? 200).toString(),
      },
    );
    dynamic raw = data['classrooms'] ?? data['data'] ?? data['value'];
    if (raw is Map && raw['classrooms'] != null) {
      raw = raw['classrooms'];
    }
    List<dynamic> items = raw is List ? raw : [];
    if (items.isEmpty && data['data'] is List) {
      items = data['data'];
    }

    // Öğretmen / Rehberlik rolünde /classrooms boş geldiyse fallback olarak /teacher-meetings/classrooms çağır
    if (items.isEmpty) {
      try {
        final tmData = await _api.getJson('/teacher-meetings/classrooms');
        final tmItems = tmData['classrooms'] ??
            tmData['data']?['classrooms'] ??
            tmData['value']?['classrooms'];
        if (tmItems is List && tmItems.isNotEmpty) {
          items = tmItems;
        }
      } catch (_) {}
    }

    return items
        .whereType<Map>()
        .map((e) => _normalizeClassroom(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/classrooms/$id');
    return _normalizeClassroom(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> create({
    required String name,
    String? code,
    int? capacity,
    int? campusId,
    int? educationLevelId,
    int? academicYearId,
  }) async {
    final data = await _api.postJson(
      '/classrooms',
      data: {
        'name': name,
        'code': code,
        'capacity': capacity,
        'campus_id': campusId,
        'education_level_id': educationLevelId,
        'academic_year_id': academicYearId,
      },
    );
    return _normalizeClassroom(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> update({
    required int id,
    String? name,
    String? code,
    int? capacity,
    int? campusId,
    int? educationLevelId,
    int? academicYearId,
  }) async {
    final data = await _api.putJson(
      '/classrooms/$id',
      data: {
        ...?((name != null) ? {'name': name} : null),
        ...?((code != null) ? {'code': code} : null),
        ...?((capacity != null) ? {'capacity': capacity} : null),
        ...?((campusId != null) ? {'campus_id': campusId} : null),
        ...?((educationLevelId != null)
            ? {'education_level_id': educationLevelId}
            : null),
        ...?((academicYearId != null)
            ? {'academic_year_id': academicYearId}
            : null),
      },
    );
    return _normalizeClassroom(data['data'] ?? data);
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/classrooms/$id');
  }

  Map<String, dynamic> _normalizeClassroom(Map<String, dynamic> c) {
    int? campusId;
    if (c['campus_id'] != null) {
      campusId = int.tryParse(c['campus_id'].toString());
    } else if (c['campus'] is Map && c['campus']['id'] != null) {
      campusId = int.tryParse(c['campus']['id'].toString());
    } else if (c['education_level'] is Map && c['education_level']['campus_id'] != null) {
      campusId = int.tryParse(c['education_level']['campus_id'].toString());
    } else if (c['educationLevel'] is Map && c['educationLevel']['campus_id'] != null) {
      campusId = int.tryParse(c['educationLevel']['campus_id'].toString());
    } else if (c['branch'] is Map) {
      final b = c['branch'];
      if (b['campus_id'] != null) {
        campusId = int.tryParse(b['campus_id'].toString());
      } else if (b['campus'] is Map && b['campus']['id'] != null) {
        campusId = int.tryParse(b['campus']['id'].toString());
      }
    }

    int? educationLevelId;
    if (c['education_level_id'] != null) {
      educationLevelId = int.tryParse(c['education_level_id'].toString());
    } else if (c['education_level'] is Map && c['education_level']['id'] != null) {
      educationLevelId = int.tryParse(c['education_level']['id'].toString());
    } else if (c['educationLevel'] is Map && c['educationLevel']['id'] != null) {
      educationLevelId = int.tryParse(c['educationLevel']['id'].toString());
    } else if (c['grade_level'] != null) {
      educationLevelId = int.tryParse(c['grade_level'].toString());
    }

    return {
      'id': c['id'] is int ? c['id'] : int.tryParse(c['id']?.toString() ?? '0') ?? 0,
      'name': c['name']?.toString() ?? '',
      'code': c['code'],
      'capacity': c['capacity'],
      'campus_id': campusId,
      'education_level_id': educationLevelId,
      'campus': c['campus'],
      'education_level': c['education_level'] ?? c['educationLevel'],
      'academic_year': c['academic_year'] ?? c['academicYear'],
      'students_count': c['students_count'] ?? c['studentsCount'] ?? 0,
      'teachers_count': c['teachers_count'] ?? c['teachersCount'] ?? 0,
    };
  }
}
