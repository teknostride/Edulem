import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';

class AssessmentRepository {
  AssessmentRepository(this._api);
  final ApiClient _api;

  /// Öğrenci sınav sonuçları
  /// GET /portal/assessment/exams
  Future<List<Map<String, dynamic>>> getStudentExams() async {
    try {
      final data = await _api.getJson('/portal/assessment/exams');
      final List<dynamic> items =
          data['data']?['exams'] ??
          data['value']?['exams'] ??
          data['exams'] ??
          [];
      return items
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } on ApiException catch (e) {
      if (e.statusCode == 403 || e.statusCode == 404) {
        return [];
      }
      rethrow;
    } on DioException catch (e) {
      if (e.response?.statusCode == 403 || e.response?.statusCode == 404) {
        return [];
      }
      rethrow;
    }
  }

  /// Öğrenci oturum sonuçları
  /// GET /portal/assessment/sessions
  Future<List<Map<String, dynamic>>> getStudentSessions() async {
    try {
      final data = await _api.getJson('/portal/assessment/sessions');
      final List<dynamic> items =
          data['data']?['sessions'] ??
          data['value']?['sessions'] ??
          data['sessions'] ??
          [];
      return items
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } on ApiException catch (e) {
      if (e.statusCode == 403 || e.statusCode == 404) {
        return [];
      }
      rethrow;
    } on DioException catch (e) {
      if (e.response?.statusCode == 403 || e.response?.statusCode == 404) {
        return [];
      }
      rethrow;
    }
  }

  /// Sınav detaylı analizi
  /// GET /portal/assessment/exams/{id}/result
  Future<Map<String, dynamic>> getExamResult(
    int examId, {
    int? studentId,
  }) async {
    try {
      final query = studentId != null ? {'student_id': '$studentId'} : null;
      final data = await _api.getJson(
        '/portal/assessment/exams/$examId/result',
        queryParameters: query,
      );
      return data['data'] ?? data;
    } on ApiException catch (e) {
      if (e.statusCode == 403 || e.statusCode == 404) {
        return {};
      }
      rethrow;
    } on DioException catch (e) {
      if (e.response?.statusCode == 403 || e.response?.statusCode == 404) {
        return {};
      }
      rethrow;
    }
  }

  /// Oturum detaylı analizi
  /// GET /portal/assessment/sessions/{id}/result
  Future<Map<String, dynamic>> getSessionResult(
    int sessionId, {
    int? studentId,
  }) async {
    try {
      final query = studentId != null ? {'student_id': '$studentId'} : null;
      final data = await _api.getJson(
        '/portal/assessment/sessions/$sessionId/result',
        queryParameters: query,
      );
      return data['data'] ?? data;
    } on ApiException catch (e) {
      if (e.statusCode == 403 || e.statusCode == 404) {
        return {};
      }
      rethrow;
    } on DioException catch (e) {
      if (e.response?.statusCode == 403 || e.response?.statusCode == 404) {
        return {};
      }
      rethrow;
    }
  }
}
