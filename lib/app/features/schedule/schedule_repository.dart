import '../../core/network/api_client.dart';
import 'package:flutter/foundation.dart';

class ScheduleRepository {
  ScheduleRepository(this._api);
  final ApiClient _api;

  Map<String, dynamic> _normalizeSchedule(Map<String, dynamic> s) {
    final lesson = s['lesson'] is Map
        ? Map<String, dynamic>.from(s['lesson'])
        : null;
    final classroom = s['classroom'] is Map
        ? Map<String, dynamic>.from(s['classroom'])
        : null;
    final teacher = s['teacher'] is Map
        ? Map<String, dynamic>.from(s['teacher'])
        : null;

    String teacherNameFrom(Map<String, dynamic>? t) {
      if (t == null) return '';
      final name = t['name']?.toString();
      if (name != null && name.trim().isNotEmpty) return name;
      final first = t['first_name']?.toString() ?? '';
      final last = t['last_name']?.toString() ?? '';
      return ('$first $last').trim();
    }

    return {
      ...s,
      'lesson_name':
          s['lesson_name']?.toString() ?? lesson?['name']?.toString() ?? '',
      'classroom_name':
          s['classroom_name']?.toString() ??
          classroom?['name']?.toString() ??
          '',
      'teacher_name': s['teacher_name']?.toString() ?? teacherNameFrom(teacher),
    };
  }

  // Tüm programları getir (yönetim için)
  Future<List<Map<String, dynamic>>> listAll({
    int? classroomId,
    int? teacherId,
    String? dayOfWeek,
    int? academicYearId,
  }) async {
    final queryParams = <String, String>{
      if (classroomId != null) 'classroom_id': '$classroomId',
      if (teacherId != null) 'teacher_id': '$teacherId',
      if (dayOfWeek != null && dayOfWeek.trim().isNotEmpty)
        'day_of_week': dayOfWeek.trim(),
      if (academicYearId != null) 'academic_year_id': '$academicYearId',
    };

    debugPrint('ScheduleRepository.listAll -> /schedules params=$queryParams');

    final data = await _api.getJson(
      '/schedules',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    final List<dynamic> items =
        data['data'] ?? data['value'] ?? data['schedules'] ?? [];
    debugPrint('ScheduleRepository.listAll <- items=${items.length}');
    if (items.isEmpty) {
      debugPrint('ScheduleRepository.listAll <- rawResponse=$data');
    }
    return items
        .map((e) => _normalizeSchedule(Map<String, dynamic>.from(e)))
        .toList();
  }

  // Öğretmenin kendi programını getir
  Future<List<Map<String, dynamic>>> listForTeacher(int teacherId) async {
    debugPrint(
      'ScheduleRepository.listForTeacher -> /schedules teacher_id=$teacherId',
    );
    final data = await _api.getJson(
      '/schedules',
      queryParameters: {'teacher_id': '$teacherId'},
    );
    final List<dynamic> items =
        data['data'] ?? data['value'] ?? data['schedules'] ?? [];
    debugPrint('ScheduleRepository.listForTeacher <- items=${items.length}');
    if (items.isEmpty) {
      debugPrint('ScheduleRepository.listForTeacher <- rawResponse=$data');
    }
    return items
        .map((e) => _normalizeSchedule(Map<String, dynamic>.from(e)))
        .toList();
  }

  // Öğrencinin kendi sınıfının programını getir
  Future<List<Map<String, dynamic>>> listForStudent(int classroomId) async {
    debugPrint(
      'ScheduleRepository.listForStudent -> /schedules classroom_id=$classroomId',
    );
    final data = await _api.getJson(
      '/schedules',
      queryParameters: {'classroom_id': '$classroomId'},
    );
    final List<dynamic> items =
        data['data'] ?? data['value'] ?? data['schedules'] ?? [];
    debugPrint('ScheduleRepository.listForStudent <- items=${items.length}');
    if (items.isEmpty) {
      debugPrint('ScheduleRepository.listForStudent <- rawResponse=$data');
    }
    return items
        .map((e) => _normalizeSchedule(Map<String, dynamic>.from(e)))
        .toList();
  }

  // Öğrenci portal programı (web sitesiyle aynı endpoint)
  Future<List<Map<String, dynamic>>> listForStudentPortal() async {
    debugPrint(
      'ScheduleRepository.listForStudentPortal -> /portal/student/schedule',
    );
    final data = await _api.getJson('/portal/student/schedule');
    final List<dynamic> items =
        data['data']?['schedules'] ??
        data['value']?['schedules'] ??
        data['schedules'] ??
        [];
    debugPrint(
      'ScheduleRepository.listForStudentPortal <- items=${items.length}',
    );
    if (items.isEmpty) {
      debugPrint(
        'ScheduleRepository.listForStudentPortal <- rawResponse=$data',
      );
    }
    return items
        .map((e) => _normalizeSchedule(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/schedules/$id');
    return data['data'] ?? data;
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/schedules/$id');
  }
}
