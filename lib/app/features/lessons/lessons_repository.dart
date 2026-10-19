import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';

class LessonsRepository {
  LessonsRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list() async {
    final data = await _api.getJson('/lessons');
    final List<dynamic> items = data['data'] ?? data['lessons'] ?? [];
    return items
        .map((e) => _normalizeLesson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    try {
      debugPrint('Fetching lesson with ID: $id');
      final data = await _api.getJson('/lessons/$id');
      debugPrint('Lesson API response: $data');
      return _normalizeLesson(data['data'] ?? data);
    } catch (e) {
      debugPrint('Error fetching lesson $id: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> create({
    required String name,
    String? code,
    String? description,
    int? weeklyHours,
    int? educationLevelId,
    int? campusId,
    List<int>? teacherIds,
  }) async {
    // education_level_ids array olarak gönder
    final levelIds = educationLevelId != null ? [educationLevelId] : null;
    final data = await _api.postJson(
      '/lessons',
      data: {
        'name': name,
        'code': code,
        'description': description,
        'weekly_hours': weeklyHours,
        'education_level_ids': levelIds,
        'campus_id': campusId,
        'teacher_ids': teacherIds,
      }..removeWhere((key, value) => value == null),
    );
    return _normalizeLesson(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> update({
    required int id,
    String? name,
    String? code,
    String? description,
    int? weeklyHours,
    int? educationLevelId,
    int? campusId,
    List<int>? teacherIds,
  }) async {
    // education_level_ids array olarak gönder
    final levelIds = educationLevelId != null ? [educationLevelId] : null;
    final payload = <String, dynamic>{
      'name': name,
      'code': code,
      'description': description,
      'weekly_hours': weeklyHours,
      'education_level_ids': levelIds,
      'campus_id': campusId,
      'teacher_ids': teacherIds,
    }..removeWhere((k, v) => v == null);
    final data = await _api.putJson('/lessons/$id', data: payload);
    return _normalizeLesson(data['data'] ?? data);
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/lessons/$id');
  }

  Map<String, dynamic> _normalizeLesson(Map<String, dynamic> l) {
    final teachersRaw = l['teachers'];
    final teachersList = teachersRaw is List ? teachersRaw : [];
    final teachersCount = l['teachers_count'] ?? (teachersRaw is List ? teachersRaw.length : 0);

    return {
      'id': l['id'],
      'name': l['name'] ?? '',
      'code': l['code'],
      'description': l['description'],
      'weekly_hours': l['weekly_hours'] ?? l['weeklyHours'],
      'teachers': teachersList,
      'teachers_count': teachersCount,
      'education_level': l['education_level'] ?? l['educationLevel'],
      'education_level_id': l['education_level_id'] ?? l['educationLevelId'],
      'campus': l['campus'],
      'campus_id': l['campus_id'] ?? l['campusId'],
    };
  }
}
