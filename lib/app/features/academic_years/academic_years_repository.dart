import '../../core/network/api_client.dart';

class AcademicYearsRepository {
  AcademicYearsRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list() async {
    final data = await _api.getJson('/academic-years');
    final List<dynamic> items = data['data'] ?? data['academic_years'] ?? [];
    return items
        .map((e) => _normalizeAcademicYear(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/academic-years/$id');
    return _normalizeAcademicYear(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> create({
    required String name,
    required String startDate,
    required String endDate,
    bool? isActive,
  }) async {
    final data = await _api.postJson(
      '/academic-years',
      data: {
        'name': name,
        'start_date': startDate,
        'end_date': endDate,
        'is_active': isActive,
      },
    );
    return _normalizeAcademicYear(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> update({
    required int id,
    String? name,
    String? startDate,
    String? endDate,
    bool? isActive,
  }) async {
    final data = await _api.putJson(
      '/academic-years/$id',
      data: {
        ...?((name != null) ? {'name': name} : null),
        ...?((startDate != null) ? {'start_date': startDate} : null),
        ...?((endDate != null) ? {'end_date': endDate} : null),
        ...?((isActive != null) ? {'is_active': isActive} : null),
      },
    );
    return _normalizeAcademicYear(data['data'] ?? data);
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/academic-years/$id');
  }

  Map<String, dynamic> _normalizeAcademicYear(Map<String, dynamic> ay) {
    return {
      'id': ay['id'],
      'name': ay['name'] ?? '',
      'start_date': ay['start_date'] ?? ay['startDate'],
      'end_date': ay['end_date'] ?? ay['endDate'],
      'is_active': ay['is_active'] ?? ay['isActive'] ?? false,
      'classrooms_count': ay['classrooms_count'] ?? ay['classroomsCount'] ?? 0,
    };
  }
}
