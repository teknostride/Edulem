import '../../core/network/api_client.dart';

class MeasurementRepository {
  MeasurementRepository(this._api);

  final ApiClient _api;

  /// OMR Sessions listesi
  /// GET /omr/sessions
  Future<List<Map<String, dynamic>>> getSessions() async {
    final data = await _api.getJson('/omr/sessions');
    
    dynamic v;
    if (data['sessions'] is List) {
      v = data['sessions'];
    } else if (data['data'] is Map && data['data']['sessions'] is List) {
      v = data['data']['sessions'];
    } else if (data['data'] is List) {
      v = data['data'];
    } else if (data['value'] is List) {
      v = data['value'];
    }

    if (v is! List) return const [];

    return v
        .whereType<Map>()
        .map((e) => _normalizeSession(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Session detayı
  /// GET /omr/sessions/{id}
  Future<Map<String, dynamic>> getSessionById(int id) async {
    final data = await _api.getJson('/omr/sessions/$id');
    return _normalizeSession(data['data'] ?? data);
  }

  /// Toplu karne indirme URL'i
  /// GET /omr/sessions/{id}/report-card/bulk
  Future<String> getBulkReportCardUrl(int sessionId) async {
    return '/omr/sessions/$sessionId/report-card/bulk';
  }

  /// Sınav bazlı toplu karne indirme URL'i
  /// GET /omr/exams/{id}/report-card/bulk
  Future<String> getExamBulkReportCardUrl(int examId) async {
    return '/omr/exams/$examId/report-card/bulk';
  }

  /// Sınav sonuçları
  /// GET /omr/exams/{id}/results
  Future<List<Map<String, dynamic>>> getExamResults(int examId) async {
    final data = await _api.getJson('/omr/exams/$examId/results');
    
    dynamic v;
    if (data['results'] is List) {
      v = data['results'];
    } else if (data['data'] is Map && data['data']['results'] is List) {
      v = data['data']['results'];
    } else if (data['data'] is List) {
      v = data['data'];
    }

    if (v is! List) return const [];

    return v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  /// Sınav analitikleri
  /// GET /omr/exams/{id}/analytics
  Future<Map<String, dynamic>> getExamAnalytics(int examId) async {
    final data = await _api.getJson('/omr/exams/$examId/analytics');
    return data['data'] ?? data;
  }

  Map<String, dynamic> _normalizeSession(Map<String, dynamic> s) {
    return {
      'id': s['id'],
      'name': s['name']?.toString() ?? '',
      'exam_type': s['exam_type']?.toString() ?? '',
      'exam_date': s['exam_date']?.toString() ?? '',
      'exam_ids': s['exam_ids'] is List ? s['exam_ids'] : [],
      'created_at': s['created_at']?.toString() ?? '',
      'updated_at': s['updated_at']?.toString() ?? '',
      ...s,
    };
  }
}
