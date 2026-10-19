import '../../core/network/api_client.dart';

class ConversationsRepository {
  ConversationsRepository(this._api);

  final ApiClient _api;

  /// Görüşme listesi (counseling/sessions)
  Future<Map<String, dynamic>> listSessions({
    required int page,
    required int perPage,
    String? status,
    String? search,
    int? counselorId,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': perPage.toString(),
      if (status != null && status != 'all') 'status': status,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      if (counselorId != null) 'counselor_id': counselorId.toString(),
    };

    final data = await _api.getJson(
      '/counseling/sessions',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    dynamic v;
    if (data['data'] is List) {
      v = data['data'];
    } else if (data['sessions'] is List) {
      v = data['sessions'];
    } else if (data['data'] is Map && data['data']['sessions'] is List) {
      v = data['data']['sessions'];
    } else if (data['value'] is List) {
      v = data['value'];
    }

    final List<Map<String, dynamic>> sessions = v is List
        ? v
              .whereType<Map>()
              .map((e) => _normalizeSession(Map<String, dynamic>.from(e)))
              .toList()
        : [];

    Map<String, dynamic>? pagination;
    if (data['meta'] is Map) {
      pagination = Map<String, dynamic>.from(data['meta']);
    } else if (data['pagination'] is Map) {
      pagination = Map<String, dynamic>.from(data['pagination']);
    } else if (data['data'] is Map && data['data']['meta'] is Map) {
      pagination = Map<String, dynamic>.from(data['data']['meta']);
    }

    return {'sessions': sessions, 'pagination': pagination};
  }

  /// Danışan listesi (counseling/students)
  Future<Map<String, dynamic>> listStudents({
    required int page,
    required int perPage,
    String? status,
    String? search,
    int? classroomId,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      if (status != null && status != 'all') 'status': status,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      if (classroomId != null) 'classroom_id': classroomId.toString(),
    };

    final data = await _api.getJson(
      '/counseling/students',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    dynamic v;
    if (data['data'] is List) {
      v = data['data'];
    } else if (data['students'] is List) {
      v = data['students'];
    } else if (data['data'] is Map && data['data']['students'] is List) {
      v = data['data']['students'];
    }

    final List<Map<String, dynamic>> students = v is List
        ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
        : [];

    Map<String, dynamic>? pagination;
    if (data['meta'] is Map) {
      pagination = Map<String, dynamic>.from(data['meta']);
    } else if (data['pagination'] is Map) {
      pagination = Map<String, dynamic>.from(data['pagination']);
    }

    return {'students': students, 'pagination': pagination};
  }

  /// Not listesi (counseling/notes)
  Future<Map<String, dynamic>> listNotes({
    required int page,
    required int perPage,
    String? search,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': perPage.toString(),
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
    };

    final data = await _api.getJson(
      '/counseling/notes',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    dynamic v;
    if (data['data'] is List) {
      v = data['data'];
    } else if (data['notes'] is List) {
      v = data['notes'];
    } else if (data['data'] is Map && data['data']['notes'] is List) {
      v = data['data']['notes'];
    }

    final List<Map<String, dynamic>> notes = v is List
        ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
        : [];

    Map<String, dynamic>? pagination;
    if (data['meta'] is Map) {
      pagination = Map<String, dynamic>.from(data['meta']);
    } else if (data['pagination'] is Map) {
      pagination = Map<String, dynamic>.from(data['pagination']);
    }

    return {'notes': notes, 'pagination': pagination};
  }

  Map<String, dynamic> _normalizeSession(Map<String, dynamic> s) {
    final normalized = <String, dynamic>{};
    normalized['id'] = s['id'];
    normalized['student_id'] = s['student_id'];
    normalized['student_name'] =
        s['student_name'] ?? s['student']?['name'] ?? '';
    normalized['counselor_id'] = s['counselor_id'];
    normalized['counselor_name'] =
        s['counselor_name'] ?? s['counselor']?['name'] ?? '';
    normalized['date'] = s['date'] ?? '';
    normalized['time'] = s['time'] ?? '';
    normalized['duration'] = s['duration'] ?? 0;
    normalized['type'] = s['type'] ?? 'individual';
    normalized['status'] = s['status'] ?? 'scheduled';
    normalized['notes'] = s['notes'] ?? '';
    normalized['created_at'] = s['created_at'] ?? '';

    for (final entry in s.entries) {
      normalized.putIfAbsent(entry.key, () => entry.value);
    }

    return normalized;
  }

  Future<Map<String, dynamic>> createStudent({
    required int studentId,
    required int counselorId,
    String status = 'active',
  }) async {
    final data = await _api.postJson(
      '/counseling/students',
      data: {
        'student_id': studentId,
        'counselor_id': counselorId,
        'status': status,
        'parent_name': 'Belirtilmedi',
        'parent_phone': 'Belirtilmedi',
        'issues': [],
      },
    );
    return data;
  }

  Future<Map<String, dynamic>> createSession({
    required int counselingStudentId,
    required int counselorId,
    required String date,
    required String time,
    required int duration,
    required String type,
    String status = 'scheduled',
    String notes = '',
  }) async {
    final data = await _api.postJson(
      '/counseling/sessions',
      data: {
        'counseling_student_id': counselingStudentId,
        'counselor_id': counselorId,
        'session_date': date,
        'session_time': time,
        'duration_minutes': duration,
        'type': type,
        'status': status,
        'notes': notes,
      },
    );
    return data;
  }

  Future<void> updateSession({
    required int id,
    int? studentId,
    int? counselorId,
    String? date,
    String? time,
    int? duration,
    String? type,
    String? status,
    String? notes,
  }) async {
    await _api.putJson(
      '/counseling/sessions/$id',
      data: {
        ...?(studentId != null ? {'student_id': studentId} : null),
        ...?(counselorId != null ? {'counselor_id': counselorId} : null),
        ...?(date != null ? {'date': date} : null),
        ...?(time != null ? {'time': time} : null),
        ...?(duration != null ? {'duration': duration} : null),
        ...?(type != null ? {'type': type} : null),
        ...?(status != null ? {'status': status} : null),
        ...?(notes != null ? {'notes': notes} : null),
      },
    );
  }

  Future<Map<String, dynamic>> getSessionById(int id) async {
    final data = await _api.getJson('/counseling/sessions/$id');
    if (data['data'] is Map) {
      return _normalizeSession(Map<String, dynamic>.from(data['data']));
    }
    return _normalizeSession(data);
  }

  // ==================== Teacher Meetings ====================

  /// Görüşme kayıtları (teacher-meetings/meetings)
  Future<List<Map<String, dynamic>>> getMeetings() async {
    final data = await _api.getJson('/teacher-meetings/meetings');
    final list = _extractList(data, 'meetings');
    return list;
  }

  /// Özel notlar (teacher-meetings/private-notes)
  Future<List<Map<String, dynamic>>> getPrivateNotes() async {
    final data = await _api.getJson('/teacher-meetings/private-notes');
    final list = _extractList(data, 'notes');
    return list;
  }

  /// Randevular (teacher-meetings/appointments?filter=today|upcoming|past)
  Future<List<Map<String, dynamic>>> getAppointments({
    String filter = 'today',
  }) async {
    final data = await _api.getJson(
      '/teacher-meetings/appointments',
      queryParameters: {'filter': filter},
    );
    final list = _extractList(data, 'appointments');
    return list;
  }

  /// Yeni görüşme/not/randevu oluştur (teacher-meetings store)
  Future<Map<String, dynamic>> createMeeting({
    required String type,
    required String meetingWith,
    required int classroomId,
    required int studentId,
    int? teacherId,
    String? title,
    String? content,
    required String meetingDate,
    String? meetingTime,
    String? visibility,
  }) async {
    final data = await _api.postJson(
      '/teacher-meetings',
      data: {
        'type': type,
        'meeting_with': meetingWith,
        'classroom_id': classroomId,
        'student_id': studentId,
        if (teacherId != null) 'teacher_id': teacherId,
        if (title != null) 'title': title,
        if (content != null) 'content': content,
        'meeting_date': meetingDate,
        if (meetingTime != null) 'meeting_time': meetingTime,
        if (visibility != null) 'visibility': visibility,
      },
    );
    return _extractMeeting(data);
  }

  /// Görüşme güncelle
  Future<Map<String, dynamic>> updateMeeting(
    int id,
    Map<String, dynamic> fields,
  ) async {
    final data = await _api.putJson('/teacher-meetings/$id', data: fields);
    return _extractMeeting(data);
  }

  /// Tekil görüşme/not/randevu detayı (teacher-meetings/{id})
  Future<Map<String, dynamic>> getMeetingById(int id) async {
    final data = await _api.getJson('/teacher-meetings/$id');
    return _extractMeeting(data);
  }

  /// Görüşme sil (teacher-meetings/{id})
  Future<void> deleteMeeting(int id) async {
    try {
      await _api.deleteJson('/teacher-meetings/$id');
    } catch (_) {
      await _api.deleteJson('/counseling/sessions/$id');
    }
  }

  /// Öğretmenin sınıfları (teacher-meetings/classrooms)
  Future<List<Map<String, dynamic>>> getClassrooms() async {
    final data = await _api.getJson('/teacher-meetings/classrooms');
    return _extractList(data, 'classrooms');
  }

  /// Sınıftaki öğrenciler (teacher-meetings/classrooms/{id}/students)
  Future<List<Map<String, dynamic>>> getClassroomStudents(
    int classroomId,
  ) async {
    try {
      final data = await _api.getJson(
        '/teacher-meetings/classrooms/$classroomId/students',
      );
      final list = _extractList(data, 'students');
      if (list.isNotEmpty) return list;
    } catch (_) {}

    try {
      final data = await _api.getJson(
        '/students',
        queryParameters: {
          'classroom_id': classroomId.toString(),
          'per_page': '150',
        },
      );
      final list = _extractList(data, 'students');
      if (list.isNotEmpty) return list;
    } catch (_) {}

    return [];
  }

  List<Map<String, dynamic>> _extractList(dynamic data, String key) {
    if (data is Map) {
      if (data['data'] is Map && data['data'][key] is List) {
        return (data['data'][key] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      } else if (data[key] is List) {
        return (data[key] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      } else if (data['data'] is List) {
        return (data['data'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }
    }
    return [];
  }

  /// Meetings statistics
  Future<Map<String, dynamic>> getMeetingsStats([
    Map<String, String>? filters,
  ]) async {
    final queryParams = <String, String>{};
    if (filters != null) {
      if (filters['teacher_id']?.isNotEmpty == true) {
        queryParams['teacher_id'] = filters['teacher_id']!;
      }
      if (filters['type']?.isNotEmpty == true) {
        queryParams['type'] = filters['type']!;
      }
      if (filters['with']?.isNotEmpty == true) {
        queryParams['meeting_with'] = filters['with']!;
      }
    }

    final data = await _api.getJson(
      '/meetings/stats',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    return Map<String, dynamic>.from(data);
  }

  /// Yöneticiler için tüm görüşme kayıtları (meetings)
  Future<List<Map<String, dynamic>>> getAdminMeetings(
    Map<String, String> filters,
  ) async {
    final queryParams = <String, String>{};
    if (filters['teacher_id']?.isNotEmpty == true) {
      queryParams['teacher_id'] = filters['teacher_id']!;
    }
    if (filters['type']?.isNotEmpty == true) {
      queryParams['type'] = filters['type']!;
    }
    if (filters['with']?.isNotEmpty == true) {
      queryParams['meeting_with'] = filters['with']!;
    }
    if (filters['search']?.isNotEmpty == true) {
      queryParams['search'] = filters['search']!;
    }

    final data = await _api.getJson(
      '/meetings',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    return _extractList(data, 'meetings');
  }

  /// Yeni rehberlik danışma notu / görüşme kaydı oluştur (/counseling/records)
  Future<Map<String, dynamic>> createCounselingRecord({
    required int studentId,
    required String subject,
    required String content,
    required String meetingAt,
    bool isPrivate = false,
  }) async {
    final data = await _api.postJson(
      '/counseling/records',
      data: {
        'student_id': studentId,
        'subject': subject,
        'content': content,
        'meeting_at': meetingAt,
        'is_private': isPrivate,
      },
    );
    final raw = data['record'] ?? data['data'] ?? data;
    return _normalizeCounselingRecord(Map<String, dynamic>.from(raw is Map ? raw : {}));
  }

  /// Rehberlik danışma notu güncelle (/counseling/records/{id})
  Future<Map<String, dynamic>> updateCounselingRecord(
    int id, {
    required int studentId,
    required String subject,
    required String content,
    required String meetingAt,
    bool isPrivate = false,
  }) async {
    final data = await _api.putJson(
      '/counseling/records/$id',
      data: {
        'student_id': studentId,
        'subject': subject,
        'content': content,
        'meeting_at': meetingAt,
        'is_private': isPrivate,
      },
    );
    final raw = data['record'] ?? data['data'] ?? data;
    return _normalizeCounselingRecord(Map<String, dynamic>.from(raw is Map ? raw : {}));
  }

  /// Rehberlik görüşme detayını getir (/counseling/records/{id})
  Future<Map<String, dynamic>> getCounselingRecord(int id) async {
    final data = await _api.getJson('/counseling/records/$id');
    final raw = data['record'] ?? data['data'] ?? data;
    return _normalizeCounselingRecord(Map<String, dynamic>.from(raw is Map ? raw : {}));
  }

  /// Rehberlik görüşme kaydı sil (/counseling/records/{id})
  Future<void> deleteCounselingRecord(int id) async {
    await _api.deleteJson('/counseling/records/$id');
  }

  /// Meeting records with filters
  /// Primary: /counseling/records (web'deki danışma notları ile tam entegre)
  /// Fallback: /counseling/sessions
  Future<List<Map<String, dynamic>>> getMeetingsRecords(
    Map<String, String> filters,
  ) async {
    final queryParams = <String, String>{
      'per_page': '100',
      if (filters['search']?.isNotEmpty == true)
        'student_search': filters['search']!,
      if (filters['classroom_id']?.isNotEmpty == true)
        'classroom_id': filters['classroom_id']!,
      if (filters['start_date']?.isNotEmpty == true)
        'date_from': filters['start_date']!,
      if (filters['end_date']?.isNotEmpty == true)
        'date_to': filters['end_date']!,
    };

    try {
      final data = await _api.getJson(
        '/counseling/records',
        queryParameters: queryParams,
      );

      dynamic v = data['records'] ?? data['data'] ?? data['value'];
      if (v is Map && v['records'] != null) {
        v = v['records'];
      }
      if (v is List && v.isNotEmpty) {
        return v
            .whereType<Map>()
            .map((e) => _normalizeCounselingRecord(Map<String, dynamic>.from(e)))
            .toList();
      }
    } catch (_) {}

    // Fallback: eski /counseling/sessions
    try {
      final data = await _api.getJson(
        '/counseling/sessions',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      dynamic v = data['data'] ?? data['meetings'] ?? data['records'];
      if (v is List) {
        return v
            .whereType<Map>()
            .map((e) => _normalizeMeetingRecord(Map<String, dynamic>.from(e)))
            .toList();
      }
    } catch (_) {}

    return [];
  }

  Map<String, dynamic> _normalizeCounselingRecord(Map<String, dynamic> r) {
    final student = r['student'] is Map
        ? Map<String, dynamic>.from(r['student'])
        : <String, dynamic>{};
    final classroom = student['classroom'] is Map
        ? Map<String, dynamic>.from(student['classroom'])
        : <String, dynamic>{};
    final counselor = r['counselor'] is Map
        ? Map<String, dynamic>.from(r['counselor'])
        : <String, dynamic>{};

    final studentName = (student['name'] ??
            '${student['first_name'] ?? ''} ${student['last_name'] ?? ''}')
        .toString()
        .trim();
    final counselorName = (counselor['name'] ??
            '${counselor['first_name'] ?? ''} ${counselor['last_name'] ?? ''}')
        .toString()
        .trim();

    String meetingDate = '';
    String meetingTime = '';
    if (r['meeting_at'] != null) {
      final parts = r['meeting_at'].toString().split(' ');
      meetingDate = parts.isNotEmpty ? parts[0] : '';
      if (parts.length > 1) {
        final timeParts = parts[1].split(':');
        if (timeParts.length >= 2) {
          meetingTime = '${timeParts[0]}:${timeParts[1]}';
        }
      }
    }

    return {
      'id': r['id'],
      'student_id': r['student_id'] ?? student['id'],
      'student_name': studentName.isNotEmpty ? studentName : 'İsimsiz Öğrenci',
      'counselor_id': r['counselor_id'] ?? counselor['id'],
      'counselor_name':
          counselorName.isNotEmpty ? counselorName : 'Rehber Öğretmen',
      'classroom_id': student['classroom_id'] ?? classroom['id'],
      'classroom_name': classroom['name'] ?? '',
      'date': meetingDate,
      'meeting_date': meetingDate,
      'time': meetingTime,
      'meeting_time': meetingTime,
      'subject': r['subject'] ?? '',
      'title': r['subject'] ?? 'Görüşme Tutanağı',
      'content': r['content'] ?? '',
      'notes': r['content'] ?? '',
      'is_private': r['is_private'] == true || r['is_private'] == 1,
      'type': 'student',
      'status': 'completed',
      'student': student,
      'counselor': counselor,
      'classroom': classroom,
    };
  }

  Map<String, dynamic> _normalizeMeetingRecord(Map<String, dynamic> s) {
    if (s.containsKey('meeting_date') && s.containsKey('teacher')) {
      return s;
    }

    final normalized = <String, dynamic>{};
    normalized['id'] = s['id'];

    final counselor = s['counselor'] ?? {};
    final counselorFirstName = counselor['first_name'] ?? counselor['name'] ?? '';
    final counselorLastName = counselor['last_name'] ?? '';
    normalized['teacher'] = {
      'id': counselor['id'] ?? s['counselor_id'],
      'name': '$counselorFirstName $counselorLastName'.trim(),
    };

    final counselingStudent = s['counseling_student'] ?? {};
    final student = counselingStudent['student'] ?? {};
    final studentFirstName = student['first_name'] ?? student['name'] ?? '';
    final studentLastName = student['last_name'] ?? '';
    normalized['student'] = {
      'id': student['id'] ?? counselingStudent['student_id'],
      'name': '$studentFirstName $studentLastName'.trim(),
      'school_no': student['school_no'],
    };

    normalized['meeting_date'] = s['session_date'] ?? '';
    normalized['meeting_time'] = s['session_time'] ?? '';
    normalized['content'] = s['notes'] ?? s['counselor_notes'] ?? '';
    normalized['title'] = s['type'] == 'parent' ? 'Veli Görüşmesi' : 'Öğrenci Görüşmesi';
    
    final status = s['status'] ?? 'scheduled';
    normalized['status'] = status == 'scheduled' ? 'planned' : status;

    normalized['meeting_with'] = s['type'] == 'parent' ? 'parent' : 'student';
    normalized['type'] = 'meeting';
    normalized['visibility'] = 'Sadece Ben';

    for (final entry in s.entries) {
      normalized.putIfAbsent(entry.key, () => entry.value);
    }

    return normalized;
  }

  /// Teachers breakdown data
  Future<List<Map<String, dynamic>>> getTeachersBreakdown() async {
    final data = await _api.getJson('/meetings/teachers-breakdown');

    dynamic v;
    if (data['data'] is List) {
      v = data['data'];
    } else if (data['teachers'] is List) {
      v = data['teachers'];
    } else if (data['by_teacher'] is List) {
      v = data['by_teacher'];
    }

    return v is List
        ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
        : [];
  }

  /// Top teachers last 30 days
  Future<List<Map<String, dynamic>>> getTopTeachers() async {
    final data = await _api.getJson('/meetings/top-teachers');

    dynamic v;
    if (data['data'] is List) {
      v = data['data'];
    } else if (data['teachers'] is List) {
      v = data['teachers'];
    } else if (data['top_last_30_days'] is List) {
      v = data['top_last_30_days'];
    }

    return v is List
        ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
        : [];
  }

  /// Get notes data
  Future<List<Map<String, dynamic>>> getNotes() async {
    final data = await _api.getJson('/notes');

    dynamic v;
    if (data['data'] is List) {
      v = data['data'];
    } else if (data['notes'] is List) {
      v = data['notes'];
    }

    return v is List
        ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
        : [];
  }

  Map<String, dynamic> _extractMeeting(dynamic data) {
    if (data is Map) {
      if (data['data'] is Map && data['data']['meeting'] is Map) {
        return Map<String, dynamic>.from(data['data']['meeting']);
      } else if (data['meeting'] is Map) {
        return Map<String, dynamic>.from(data['meeting']);
      } else if (data['data'] is Map) {
        return Map<String, dynamic>.from(data['data']);
      }
    }
    return Map<String, dynamic>.from(data as Map);
  }
}
