import 'package:flutter/foundation.dart';
import '../../core/network/api_client.dart';

class HomeworkRepository {
  HomeworkRepository(this._api);

  final ApiClient _api;

  Future<Map<String, dynamic>> createOptions() {
    return _api.getJson('/homework/create-options');
  }

  Future<List<Map<String, dynamic>>> classroomStudents(int classroomId) async {
    final data = await _api.getJson(
      '/homework/classrooms/$classroomId/students',
    );
    final v =
        data['students'] ??
        (data['data'] is Map ? data['data']['students'] : null);
    if (v is! List) return const [];
    return v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<Map<String, dynamic>> create({
    required int lessonId,
    required int classroomId,
    required String title,
    String? description,
    required String dueDate,
    String assignmentMode = 'all_class',
    List<int>? assignedStudentIds,
    bool isActive = true,
  }) async {
    final data = await _api.postJson(
      '/homework',
      data: {
        'lesson_id': lessonId,
        'classroom_id': classroomId,
        'assignment_mode': assignmentMode,
        ...?((assignedStudentIds != null && assignedStudentIds.isNotEmpty)
            ? {'assigned_student_ids': assignedStudentIds}
            : null),
        'title': title,
        'description': description,
        'due_date': dueDate,
        'is_active': isActive,
      },
    );
    return data;
  }

  Future<Map<String, dynamic>> update({
    required int homeworkId,
    required int lessonId,
    required int classroomId,
    required String title,
    String? description,
    required String dueDate,
    String assignmentMode = 'all_class',
    List<int>? assignedStudentIds,
    bool isActive = true,
  }) async {
    final data = await _api.putJson(
      '/homework/$homeworkId',
      data: {
        'lesson_id': lessonId,
        'classroom_id': classroomId,
        'assignment_mode': assignmentMode,
        ...?((assignedStudentIds != null && assignedStudentIds.isNotEmpty)
            ? {'assigned_student_ids': assignedStudentIds}
            : null),
        'title': title,
        'description': description,
        'due_date': dueDate,
        'is_active': isActive,
      },
    );
    return data;
  }

  Future<Map<String, dynamic>> control(int homeworkId) {
    return _api.getJson('/homework/$homeworkId/control');
  }

  Future<void> saveControl({
    required int homeworkId,
    required List<Map<String, dynamic>> entries,
  }) async {
    await _api.putJson(
      '/homework/$homeworkId/control',
      data: {'entries': entries},
    );
  }

  Future<Map<String, dynamic>> list({
    required int page,
    required int perPage,
    int? campusId,
    int? educationLevelId,
    int? classroomId,
    int? teacherId,
    String? studentName,
    String? status,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'per_page': perPage.toString(),
      if (campusId != null && campusId > 0) 'campus_id': campusId.toString(),
      if (educationLevelId != null && educationLevelId > 0)
        'education_level_id': educationLevelId.toString(),
      if (classroomId != null && classroomId > 0)
        'classroom_id': classroomId.toString(),
      if (teacherId != null && teacherId > 0)
        'teacher_id': teacherId.toString(),
      if (studentName != null && studentName.trim().isNotEmpty)
        'student_name': studentName.trim(),
      if (status != null && status != 'all') 'status': status,
    };

    final data = await _api.getJson(
      '/homework',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    // Parse homeworks
    dynamic v;
    if (data['homeworks'] is List) {
      v = data['homeworks'];
    } else if (data['data'] is Map && (data['data']['homeworks'] is List)) {
      v = data['data']['homeworks'];
    } else if (data['data'] is List) {
      v = data['data'];
    } else if (data['value'] is List) {
      v = data['value'];
    }

    final List<Map<String, dynamic>> homeworks = v is List
        ? v
              .whereType<Map>()
              .map((e) => _normalizeHomework(Map<String, dynamic>.from(e)))
              .toList()
        : [];

    // Parse statistics
    Map<String, dynamic>? stats;
    if (data['stats'] is Map) {
      stats = Map<String, dynamic>.from(data['stats']);
    } else if (data['data'] is Map && data['data']['stats'] is Map) {
      stats = Map<String, dynamic>.from(data['data']['stats']);
    }

    // Parse pagination
    Map<String, dynamic>? pagination;
    if (data['pagination'] is Map) {
      pagination = Map<String, dynamic>.from(data['pagination']);
    } else if (data['data'] is Map && data['data']['pagination'] is Map) {
      pagination = Map<String, dynamic>.from(data['data']['pagination']);
    }

    return {'homeworks': homeworks, 'stats': stats, 'pagination': pagination};
  }

  /// Öğrenci ödevleri (portal)
  /// GET /portal/student/homework
  Future<List<Map<String, dynamic>>> listForStudentPortal({int? studentId}) async {
    final query = studentId != null && studentId > 0 ? {'student_id': studentId} : null;
    final data = await _api.getJson('/portal/student/homework', queryParameters: query);
    final List<dynamic> items =
        data['data']?['homeworks'] ?? data['homeworks'] ?? data['value'] ?? [];
    return items
        .whereType<Map>()
        .map((e) => _normalizeHomework(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    try {
      final data = await _api.getJson('/homework/$id');
      if (data['data'] is Map && (data['data'] as Map)['homework'] is Map) {
        return _normalizeHomework(
          Map<String, dynamic>.from((data['data'] as Map)['homework'] as Map),
        );
      }
      if (data['homework'] is Map) {
        return _normalizeHomework(Map<String, dynamic>.from(data['homework']));
      }
      if (data['data'] is Map) {
        return _normalizeHomework(Map<String, dynamic>.from(data['data']));
      }
      return _normalizeHomework(data);
    } catch (e) {
      debugPrint('HomeworkRepository.getById ERROR: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getByIdForStudentPortal(
    int id, {
    int? studentId,
  }) async {
    try {
      final query =
          studentId != null && studentId > 0 ? {'student_id': studentId} : null;
      final data = await _api.getJson(
        '/portal/student/homework/$id',
        queryParameters: query,
      );
      if (data['data'] is Map && (data['data'] as Map)['homework'] is Map) {
        return _normalizeHomework(
          Map<String, dynamic>.from((data['data'] as Map)['homework'] as Map),
        );
      }
      if (data['homework'] is Map) {
        return _normalizeHomework(Map<String, dynamic>.from(data['homework']));
      }
      if (data['data'] is Map) {
        return _normalizeHomework(Map<String, dynamic>.from(data['data']));
      }
      return _normalizeHomework(data);
    } catch (e) {
      debugPrint('HomeworkRepository.getByIdForStudentPortal ERROR: $e');
      rethrow;
    }
  }

  Future<void> submit({
    required int homeworkId,
    required int studentId,
    required String homeworkType,
    Map<String, dynamic>? answers,
    int? fileId,
    int? projectTopicId,
  }) async {
    await _api.postJson(
      '/homework/submit',
      data: {
        'homework_id': homeworkId,
        'student_id': studentId,
        'homework_type': homeworkType,
        ...?((answers != null) ? {'answers': answers} : null),
        ...?((fileId != null) ? {'file_id': fileId} : null),
        ...?((projectTopicId != null)
            ? {'project_topic_id': projectTopicId}
            : null),
      },
    );
  }

  Future<void> delete(int homeworkId) async {
    await _api.deleteJson('/homework/$homeworkId');
  }

  Map<String, dynamic> _normalizeHomework(Map<String, dynamic> h) {
    final normalized = <String, dynamic>{};
    normalized['id'] = h['id'];
    normalized['title'] = h['title'] ?? '';
    normalized['description'] = h['description'] ?? '';
    normalized['due_date'] = h['due_date'] ?? '';
    normalized['created_at'] = h['created_at'] ?? '';
    normalized['is_active'] = h['is_active'] ?? true;

    final review = h['review'] is Map ? Map<String, dynamic>.from(h['review'] as Map) : null;
    final hasReview = review != null &&
        review['status'] != null &&
        review['status'].toString().isNotEmpty;

    final int gradedCount = (h['graded_count'] as num?)?.toInt() ?? 0;
    final int checkedCount = (h['checked_assignments_count'] as num?)?.toInt() ?? 0;

    final bool isChecked = h['is_checked'] == true ||
        hasReview ||
        gradedCount > 0 ||
        checkedCount > 0 ||
        (h['review_status'] != null && h['review_status'].toString().isNotEmpty);

    normalized['is_checked'] = isChecked;

    final String? reviewStatus = review?['status']?.toString() ??
        (h['review_status'] != null && h['review_status'].toString().isNotEmpty
            ? h['review_status'].toString()
            : null);

    normalized['review_status'] = reviewStatus;

    if (isChecked) {
      normalized['status'] = (reviewStatus != null && reviewStatus.isNotEmpty)
          ? reviewStatus
          : (h['status'] ?? 'submitted');
    } else {
      normalized['status'] = h['status'] ?? 'pending';
    }

    if (review != null) {
      normalized['review'] = review;
      normalized['teacher_note'] = review['teacher_note'];
      normalized['reviewed_at'] = review['reviewed_at'];
      normalized['status_label'] = review['status_label'];
    } else if (h['status_label'] != null) {
      normalized['status_label'] = h['status_label'];
    }

    normalized['lesson'] = h['lesson'];
    normalized['classroom'] = h['classroom'];
    normalized['teacher'] = h['teacher'];
    normalized['file'] = h['file'];

    for (final entry in h.entries) {
      normalized.putIfAbsent(entry.key, () => entry.value);
    }

    return normalized;
  }
}
