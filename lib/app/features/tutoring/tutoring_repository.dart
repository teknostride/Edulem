import '../../core/network/api_client.dart';

class TutoringRepository {
  TutoringRepository(this._api);

  final ApiClient _api;

  Future<Map<String, dynamic>> createOptions() {
    return _api.getJson('/tutoring/create-options');
  }

  Future<Map<String, dynamic>> list({
    required int page,
    required int perPage,
    int? teacherId,
    String? status,
    String? dateFrom,
    String? dateTo,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': perPage.toString(),
      if (teacherId != null && teacherId > 0)
        'teacher_id': teacherId.toString(),
      if (status != null && status != 'all') 'status': status,
      ...?(dateFrom != null ? {'date_from': dateFrom} : null),
      ...?(dateTo != null ? {'date_to': dateTo} : null),
    };

    final data = await _api.getJson(
      '/tutoring',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    dynamic v;
    if (data['sessions'] is List) {
      v = data['sessions'];
    } else if (data['data'] is Map && (data['data']['sessions'] is List)) {
      v = data['data']['sessions'];
    } else if (data['tutorings'] is List) {
      v = data['tutorings'];
    } else if (data['data'] is Map && (data['data']['tutorings'] is List)) {
      v = data['data']['tutorings'];
    } else if (data['data'] is List) {
      v = data['data'];
    } else if (data['value'] is List) {
      v = data['value'];
    }

    final List<Map<String, dynamic>> tutorings = v is List
        ? v
              .whereType<Map>()
              .map((e) => _normalizeTutoring(Map<String, dynamic>.from(e)))
              .toList()
        : [];

    Map<String, dynamic>? stats;
    if (data['stats'] is Map) {
      stats = Map<String, dynamic>.from(data['stats']);
    } else if (data['data'] is Map && data['data']['stats'] is Map) {
      stats = Map<String, dynamic>.from(data['data']['stats']);
    }

    Map<String, dynamic>? pagination;
    if (data['pagination'] is Map) {
      pagination = Map<String, dynamic>.from(data['pagination']);
    } else if (data['data'] is Map && data['data']['pagination'] is Map) {
      pagination = Map<String, dynamic>.from(data['data']['pagination']);
    }

    return {'tutorings': tutorings, 'stats': stats, 'pagination': pagination};
  }

  Future<Map<String, dynamic>> create({
    required int lessonId,
    required int classroomId,
    required String title,
    String? description,
    required String date,
    required String startTime,
    required String endTime,
    int? teacherId,
    int? maxStudents,
    String tutoringType = 'etut',
    List<int>? studentIds,
    bool isActive = true,
  }) async {
    final data = await _api.postJson(
      '/tutoring',
      data: {
        'lesson_id': lessonId,
        'classroom_id': classroomId,
        'title': title,
        'description': description,
        'date': date,
        'start_time': startTime,
        'end_time': endTime,
        'teacher_id': teacherId,
        'max_students': maxStudents,
        'tutoring_type': tutoringType,
        'student_ids': studentIds,
        'is_active': isActive,
      },
    );
    return data;
  }

  Future<Map<String, dynamic>> update({
    required int id,
    required int lessonId,
    required int classroomId,
    required String title,
    String? description,
    required String date,
    required String startTime,
    required String endTime,
    int? teacherId,
    int? maxStudents,
    String tutoringType = 'etut',
    List<int>? studentIds,
    bool isActive = true,
  }) async {
    final data = await _api.putJson(
      '/tutoring/$id',
      data: {
        'lesson_id': lessonId,
        'classroom_id': classroomId,
        'title': title,
        'description': description,
        'date': date,
        'start_time': startTime,
        'end_time': endTime,
        'teacher_id': teacherId,
        'max_students': maxStudents,
        'tutoring_type': tutoringType,
        'student_ids': studentIds,
        'is_active': isActive,
      },
    );
    return data;
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/tutoring/$id');
    if (data['session'] is Map) {
      return _normalizeTutoring(Map<String, dynamic>.from(data['session']));
    }
    if (data['tutoring'] is Map) {
      return _normalizeTutoring(Map<String, dynamic>.from(data['tutoring']));
    }
    if (data['data'] is Map) {
      final inner = data['data'] as Map;
      if (inner['session'] is Map) {
        return _normalizeTutoring(Map<String, dynamic>.from(inner['session']));
      }
      if (inner['tutoring'] is Map) {
        return _normalizeTutoring(Map<String, dynamic>.from(inner['tutoring']));
      }
      return _normalizeTutoring(Map<String, dynamic>.from(inner));
    }
    return _normalizeTutoring(data);
  }

  Future<Map<String, dynamic>> bulkAttendance(
    int sessionId,
    List<Map<String, dynamic>> attendances,
  ) async {
    return _api.postJson(
      '/tutoring/$sessionId/bulk-attendance',
      data: {'attendances': attendances},
    );
  }

  Future<Map<String, dynamic>> takeAttendance(
    int sessionId, {
    required int studentId,
    required String status,
    String? notes,
  }) async {
    return _api.postJson(
      '/tutoring/$sessionId/attendance',
      data: {
        'student_id': studentId,
        'status': status,
        if (notes != null) 'notes': notes,
      },
    );
  }

  Future<Map<String, dynamic>> getStatistics({
    String? startDate,
    String? endDate,
  }) async {
    final queryParams = <String, String>{
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
    };
    return _api.getJson(
      '/tutoring/statistics',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
  }

  Future<Map<String, dynamic>> sendSms({
    required String title,
    required String message,
    required List<int> studentIds,
    String targetAudience = 'guardians',
  }) async {
    return _api.postJson(
      '/sms/scheduled',
      data: {
        'title': title,
        'message': message,
        'recipient_type': 'students',
        'recipient_ids': studentIds,
        'target_audience': targetAudience,
      },
    );
  }

  Future<void> delete(int id) async {
    await _api.deleteJson('/tutoring/$id');
  }

  Map<String, dynamic> _normalizeTutoring(Map<String, dynamic> t) {
    final normalized = <String, dynamic>{};
    normalized['id'] = t['id'];
    normalized['title'] = t['title'] ?? '';
    normalized['description'] = t['description'] ?? '';
    normalized['date'] = t['date'] ?? '';
    normalized['start_time'] = t['start_time'] ?? '';
    normalized['end_time'] = t['end_time'] ?? '';
    normalized['tutoring_type'] = t['tutoring_type'] ?? 'etut';
    normalized['is_active'] = t['is_active'] ?? true;
    normalized['status'] = t['status'] ?? 'pending';

    normalized['lesson'] = t['lesson'];
    normalized['classroom'] = t['classroom'];
    normalized['teacher'] = t['teacher'];
    normalized['students'] = t['students'];
    normalized['attendances'] = t['attendances'];
    normalized['attendance_summary'] = t['attendance_summary'];

    for (final entry in t.entries) {
      normalized.putIfAbsent(entry.key, () => entry.value);
    }

    return normalized;
  }
}
