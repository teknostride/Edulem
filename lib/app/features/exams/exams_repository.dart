import '../../core/network/api_client.dart';

class ExamStatistics {
  final int total;
  final int active;
  final int upcoming;
  final int past;

  const ExamStatistics({
    required this.total,
    required this.active,
    required this.upcoming,
    required this.past,
  });

  factory ExamStatistics.fromJson(Map<String, dynamic> json) {
    return ExamStatistics(
      total: json['total'] ?? 0,
      active: json['active'] ?? 0,
      upcoming: json['upcoming'] ?? 0,
      past: json['past'] ?? 0,
    );
  }
}

class Pagination {
  final int currentPage;
  final int lastPage;
  final int perPage;
  final int total;

  const Pagination({
    required this.currentPage,
    required this.lastPage,
    required this.perPage,
    required this.total,
  });

  factory Pagination.fromJson(Map<String, dynamic> json) {
    return Pagination(
      currentPage: json['current_page'] ?? 1,
      lastPage: json['last_page'] ?? 1,
      perPage: json['per_page'] ?? 15,
      total: json['total'] ?? 0,
    );
  }
}

class ExamsListResponse {
  final List<Map<String, dynamic>> exams;
  final ExamStatistics statistics;
  final Pagination pagination;

  const ExamsListResponse({
    required this.exams,
    required this.statistics,
    required this.pagination,
  });
}

class ExamsRepository {
  ExamsRepository(this._api);

  final ApiClient _api;

  Future<ExamsListResponse> list({
    required int page,
    required int perPage,
    int? teacherId,
    int? classroomId,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': perPage.toString(),
    };
    if (teacherId != null) {
      queryParams['teacher_id'] = teacherId.toString();
    }
    if (classroomId != null) {
      queryParams['classroom_id'] = classroomId.toString();
    }

    final data = await _api.getJson('/omr/exams', queryParameters: queryParams);

    final responseData = data['data'] is Map ? data['data'] : data;

    dynamic examsData;
    if (responseData['exams'] is List) {
      examsData = responseData['exams'];
    } else if (responseData['data'] is Map &&
        (responseData['data']['exams'] is List)) {
      examsData = responseData['data']['exams'];
    } else if (responseData['value'] is List) {
      examsData = responseData['value'];
    }

    final exams = examsData is List
        ? examsData.whereType<Map>().map((e) {
            final exam = Map<String, dynamic>.from(e);
            // Nested lesson ve classroom objelerinden isimleri çıkar
            final lesson = exam['lesson'];
            if (lesson is Map) {
              exam['lesson_name'] = lesson['name']?.toString() ?? '';
            }
            final classroom = exam['classroom'];
            if (classroom is Map) {
              exam['classroom_name'] = classroom['name']?.toString() ?? '';
            }
            // Birleştirilmiş sınav bilgisi
            if (exam['is_merged'] == true || exam['parent_exam_id'] != null) {
              exam['is_merged'] = true;
            }
            return exam;
          }).toList()
        : <Map<String, dynamic>>[];

    final statsData = responseData['statistics'] is Map
        ? responseData['statistics'] as Map<String, dynamic>
        : <String, dynamic>{};

    final paginationData = responseData['pagination'] is Map
        ? responseData['pagination'] as Map<String, dynamic>
        : <String, dynamic>{};

    return ExamsListResponse(
      exams: exams,
      statistics: ExamStatistics.fromJson(statsData),
      pagination: Pagination.fromJson(paginationData),
    );
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/exams/$id');
    if (data['exam'] is Map) {
      return Map<String, dynamic>.from(data['exam']);
    }
    return data;
  }

  // OMR Sınav Detayları
  Future<Map<String, dynamic>> getOmrExamById(int id) async {
    final data = await _api.getJson('/omr/exams/$id');
    if (data['exam'] is Map) {
      return Map<String, dynamic>.from(data['exam']);
    }
    return data;
  }

  // Sınav Analitikleri
  Future<Map<String, dynamic>> getAnalytics(int examId) async {
    final data = await _api.getJson(
      '/omr/exams/$examId/analytics',
      queryParameters: {'bin_size': '5'},
    );
    // Backend direkt veriyi dönebilir veya data içinde dönebilir
    if (data.containsKey('summary')) {
      return Map<String, dynamic>.from(data);
    }
    if (data['data'] is Map) {
      return Map<String, dynamic>.from(data['data']);
    }
    return data;
  }

  // Sınıf Bazlı Analitikler
  Future<Map<String, dynamic>> getClassAnalytics(
    int examId,
    int classroomId,
  ) async {
    final data = await _api.getJson(
      '/omr/exams/$examId/analytics/class',
      queryParameters: {'classroom_id': classroomId.toString()},
    );
    if (data.containsKey('data') && data['data'] is Map) {
      return Map<String, dynamic>.from(data['data']);
    }
    return data;
  }

  // Öğrenci Bazlı Analitikler
  Future<Map<String, dynamic>> getStudentAnalytics(
    int examId,
    int studentId,
  ) async {
    final data = await _api.getJson(
      '/omr/exams/$examId/analytics/student',
      queryParameters: {'student_id': studentId.toString()},
    );
    if (data.containsKey('data') && data['data'] is Map) {
      return Map<String, dynamic>.from(data['data']);
    }
    return data;
  }

  // Sınav Sonuçları
  Future<List<Map<String, dynamic>>> getResults(int examId) async {
    final data = await _api.getJson(
      '/omr/exams/$examId/results',
      queryParameters: {'per_page': '200'},
    );
    final results = data['data']?['results'] ??
        data['results'] ??
        (data['data'] is List ? data['data'] : null);
    if (results is List) {
      return results
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    return [];
  }

  // Sınıf Listesi
  Future<List<Map<String, dynamic>>> getClassrooms() async {
    try {
      final data = await _api.getJson(
        '/classrooms',
        queryParameters: {'per_page': '250'},
      );
      final classrooms = data['data'] is List
          ? data['data']
          : data['data']?['classrooms'] ??
              data['data']?['data'] ??
              (data['classrooms'] is List ? data['classrooms'] : null);
      if (classrooms is List) {
        return classrooms
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }
    } catch (_) {}
    return [];
  }

  Future<void> delete(int id) async {
    await _api.deleteJson('/exams/$id');
  }
}
