import '../../core/network/api_client.dart';

class ScholarshipRepository {
  ScholarshipRepository(this._api);

  final ApiClient _api;

  /// Bursluluk sınavları listesi
  /// GET /scholarship-exams
  Future<Map<String, dynamic>> listExams({
    int page = 1,
    int perPage = 50,
    String? search,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': perPage.toString(),
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
    };

    final data = await _api.getJson(
      '/scholarship-exams',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    dynamic exams;
    if (data['exams'] is Map && data['exams']['data'] is List) {
      exams = data['exams']['data'];
    } else if (data['exams'] is List) {
      exams = data['exams'];
    } else if (data['data'] is Map && data['data']['exams'] is List) {
      exams = data['data']['exams'];
    } else if (data['data'] is List) {
      exams = data['data'];
    }

    return {
      'exams': (exams is List)
          ? exams
                .whereType<Map>()
                .map((e) => _normalizeExam(Map<String, dynamic>.from(e)))
                .toList()
          : <Map<String, dynamic>>[],
      'pagination': data['pagination'] ?? data['exams']?['pagination'],
    };
  }

  /// Bursluluk sınavı detayı
  /// GET /scholarship-exams/{id}
  Future<Map<String, dynamic>> getExamById(int id) async {
    final data = await _api.getJson('/scholarship-exams/$id');
    return _normalizeExam(data['data'] ?? data);
  }

  /// Bursluluk sınavı oluştur
  /// POST /scholarship-exams
  Future<Map<String, dynamic>> createExam({
    required String title,
    String? description,
    String? examDate,
    String? examTime,
    String? location,
    int? maxCapacity,
    bool isActive = true,
  }) async {
    final data = await _api.postJson(
      '/scholarship-exams',
      data: {
        'title': title,
        'description': description,
        'exam_date': examDate,
        'exam_time': examTime,
        'location': location,
        'max_capacity': maxCapacity,
        'is_active': isActive,
      },
    );
    return _normalizeExam(data['data'] ?? data);
  }

  /// Bursluluk sınavı güncelle
  /// PUT /scholarship-exams/{id}
  Future<Map<String, dynamic>> updateExam({
    required int id,
    required String title,
    String? description,
    String? examDate,
    String? examTime,
    String? location,
    int? maxCapacity,
    bool? isActive,
  }) async {
    final data = await _api.putJson(
      '/scholarship-exams/$id',
      data: {
        'title': title,
        'description': description,
        'exam_date': examDate,
        'exam_time': examTime,
        'location': location,
        'max_capacity': maxCapacity,
        'is_active': isActive,
      },
    );
    return _normalizeExam(data['data'] ?? data);
  }

  /// Bursluluk sınavı sil
  /// DELETE /scholarship-exams/{id}
  Future<void> deleteExam(int id) async {
    await _api.deleteJson('/scholarship-exams/$id');
  }

  /// Sınav başvuruları
  /// GET /scholarship-exams/{id}/applications
  Future<List<Map<String, dynamic>>> getApplications(int examId) async {
    final data = await _api.getJson('/scholarship-exams/$examId/applications');

    dynamic applications;
    if (data['applications'] is List) {
      applications = data['applications'];
    } else if (data['data'] is Map && data['data']['applications'] is List) {
      applications = data['data']['applications'];
    } else if (data['data'] is List) {
      applications = data['data'];
    }

    if (applications is! List) return const [];

    return applications
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  /// Sınav istatistikleri
  /// GET /scholarship-exams/{id}/statistics
  Future<Map<String, dynamic>> getStatistics(int examId) async {
    final data = await _api.getJson('/scholarship-exams/$examId/statistics');
    return data['data'] ?? data;
  }

  /// Yeni başvuru oluştur
  /// POST /scholarship-exams/applications
  Future<Map<String, dynamic>> createApplication({
    required int examId,
    required String name,
    required String phone,
    String? email,
    String? tcIdentity,
    String? schoolName,
    String? parentName,
    String? parentPhone,
  }) async {
    final data = await _api.postJson(
      '/scholarship-exams/applications',
      data: {
        'scholarship_exam_id': examId,
        'name': name,
        'phone': phone,
        'email': email,
        'tc_identity_number': tcIdentity,
        'school_name': schoolName,
        'parent_name': parentName,
        'parent_phone': parentPhone,
      },
    );
    return data['data'] ?? data;
  }

  /// Başvuru durumunu güncelle
  /// POST /scholarship-exams/applications/{id}/process
  Future<void> processApplication({
    required int applicationId,
    required String status,
  }) async {
    await _api.postJson(
      '/scholarship-exams/applications/$applicationId/process',
      data: {'status': status},
    );
  }

  /// Giriş belgesi oluştur
  /// POST /scholarship-exams/{id}/generate-entry-document
  Future<void> generateEntryDocument(int examId) async {
    await _api.postJson('/scholarship-exams/$examId/generate-entry-document');
  }

  Map<String, dynamic> _normalizeExam(Map<String, dynamic> e) {
    return {
      'id': e['id'],
      'title': e['title']?.toString() ?? '',
      'description': e['description']?.toString(),
      'exam_date': e['exam_date']?.toString(),
      'exam_time': e['exam_time']?.toString(),
      'location': e['location']?.toString(),
      'max_capacity': e['max_capacity'],
      'is_active': e['is_active'] ?? true,
      'application_count': e['application_count'] ?? 0,
      'created_at': e['created_at']?.toString(),
      'updated_at': e['updated_at']?.toString(),
      ...e,
    };
  }
}
