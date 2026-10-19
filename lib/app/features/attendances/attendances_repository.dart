import '../../core/network/api_client.dart';

class AttendancesRepository {
  AttendancesRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list({
    required int page,
    required int perPage,
    int? scheduleId,
    String? dateFrom,
    String? dateTo,
  }) async {
    final data = await _api.getJson(
      '/attendances',
      queryParameters: {
        'page': page.toString(),
        'per_page': perPage.toString(),
        ...?((scheduleId != null)
            ? {'schedule_id': scheduleId.toString()}
            : null),
        ...?((dateFrom != null) ? {'date_from': dateFrom} : null),
        ...?((dateTo != null) ? {'date_to': dateTo} : null),
      },
    );

    dynamic v;
    if (data['attendances'] is List) {
      v = data['attendances'];
    } else if (data['data'] is Map && (data['data']['attendances'] is List)) {
      v = data['data']['attendances'];
    } else if (data['value'] is List) {
      v = data['value'];
    }

    if (v is! List) return const [];

    return v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<List<Map<String, dynamic>>> listForScheduleAndDate({
    required int scheduleId,
    required String date,
  }) {
    return list(
      page: 1,
      perPage: 500,
      scheduleId: scheduleId,
      dateFrom: date,
      dateTo: date,
    );
  }

  Future<void> bulkStore({
    required int scheduleId,
    required String date,
    required List<Map<String, dynamic>> attendances,
  }) async {
    await _api.postJson(
      '/attendances/bulk',
      data: {
        'schedule_id': scheduleId,
        'date': date,
        'attendances': attendances,
      },
    );
  }

  Future<Map<String, dynamic>> daily({
    required String date,
    int? educationLevelId,
  }) {
    return _api
        .getJson(
          '/attendances/daily',
          queryParameters: {
            'date': date,
            ...?((educationLevelId != null)
                ? {'education_level_id': educationLevelId.toString()}
                : null),
          },
        )
        .then((res) {
          if (res['data'] is Map) {
            return Map<String, dynamic>.from(res['data'] as Map);
          }
          return res;
        });
  }

  Future<Map<String, dynamic>> studentStatistics({
    required int studentId,
    String? dateFrom,
    String? dateTo,
  }) {
    return _api.getJson(
      '/attendances/statistics/student/$studentId',
      queryParameters: {
        ...?((dateFrom != null) ? {'date_from': dateFrom} : null),
        ...?((dateTo != null) ? {'date_to': dateTo} : null),
      },
    );
  }

  Future<Map<String, dynamic>> teacherStatistics({
    required int teacherId,
    String? dateFrom,
    String? dateTo,
  }) {
    return _api.getJson(
      '/attendances/statistics/teacher/$teacherId',
      queryParameters: {
        ...?((dateFrom != null) ? {'date_from': dateFrom} : null),
        ...?((dateTo != null) ? {'date_to': dateTo} : null),
      },
    );
  }
}
