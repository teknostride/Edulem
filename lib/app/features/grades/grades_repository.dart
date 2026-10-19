import '../../core/network/api_client.dart';

class GradesRepository {
  GradesRepository(this._api);

  final ApiClient _api;

  Future<Map<String, dynamic>> generateReportCard({
    required int studentId,
    required String semester,
    int? academicYearId,
    int? templateId,
    bool queue = false,
  }) async {
    final data = await _api.postJson(
      '/grades/report-card/generate',
      data: {
        'student_id': studentId,
        'semester': semester,
        ...?((academicYearId != null)
            ? {'academic_year_id': academicYearId}
            : null),
        ...?((templateId != null) ? {'template_id': templateId} : null),
        'queue': queue,
      },
    );
    return data;
  }

  Future<List<Map<String, dynamic>>> list({
    required int page,
    required int perPage,
  }) async {
    final data = await _api.getJson(
      '/grades',
      queryParameters: {
        'page': page.toString(),
        'per_page': perPage.toString(),
      },
    );

    dynamic v;
    if (data['grades'] is List) {
      v = data['grades'];
    } else if (data['data'] is Map && (data['data']['grades'] is List)) {
      v = data['data']['grades'];
    } else if (data['value'] is List) {
      v = data['value'];
    }

    if (v is! List) return const [];

    return v
        .whereType<Map>()
        .map((e) => _normalizeGrade(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Öğrenci notları (portal)
  /// GET /portal/student/grades
  Future<List<Map<String, dynamic>>> listForStudentPortal() async {
    final data = await _api.getJson('/portal/student/grades');
    final List<dynamic> items =
        data['data']?['grades'] ?? data['grades'] ?? data['value'] ?? [];
    return items
        .whereType<Map>()
        .map((e) => _normalizeGrade(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/grades/$id');
    if (data['grade'] is Map) {
      return _normalizeGrade(Map<String, dynamic>.from(data['grade']));
    }
    return _normalizeGrade(data);
  }

  Map<String, dynamic> _normalizeGrade(Map<String, dynamic> g) {
    final normalized = <String, dynamic>{};
    normalized['id'] = g['id'];
    normalized['grade'] = g['grade'] ?? g['score'] ?? '';
    normalized['grade_type'] = g['grade_type'] ?? '';
    normalized['semester'] = g['semester'] ?? '';
    normalized['created_at'] = g['created_at'] ?? '';

    normalized['student'] = g['student'];
    normalized['exam'] = g['exam'];
    normalized['teacher'] = g['teacher'];

    for (final entry in g.entries) {
      normalized.putIfAbsent(entry.key, () => entry.value);
    }

    return normalized;
  }
}
