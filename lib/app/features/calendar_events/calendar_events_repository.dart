import '../../core/network/api_client.dart';

class CalendarEventsRepository {
  CalendarEventsRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list() async {
    final data = await _api.getJson('/calendar-events');
    final List<dynamic> items = data['data'] ?? data['events'] ?? [];
    return items
        .map((e) => _normalizeCalendarEvent(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/calendar-events/$id');
    return _normalizeCalendarEvent(data['data'] ?? data);
  }

  Future<List<Map<String, dynamic>>> getUserCalendar() async {
    final data = await _api.getJson('/calendar-events/user-calendar');
    final List<dynamic> items = data['data'] ?? data['events'] ?? [];
    return items
        .map((e) => _normalizeCalendarEvent(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> create({
    required String title,
    required String startDate,
    required String endDate,
    String? description,
    String? location,
    bool? isAllDay,
    List<int>? participantIds,
  }) async {
    final data = await _api.postJson(
      '/calendar-events',
      data: {
        'title': title,
        'start_date': startDate,
        'end_date': endDate,
        'description': description,
        'location': location,
        'is_all_day': isAllDay,
        'participant_ids': participantIds,
      },
    );
    return _normalizeCalendarEvent(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> update({
    required int id,
    String? title,
    String? startDate,
    String? endDate,
    String? description,
    String? location,
    bool? isAllDay,
    List<int>? participantIds,
  }) async {
    final data = await _api.putJson(
      '/calendar-events/$id',
      data: {
        ...?((title != null) ? {'title': title} : null),
        ...?((startDate != null) ? {'start_date': startDate} : null),
        ...?((endDate != null) ? {'end_date': endDate} : null),
        ...?((description != null) ? {'description': description} : null),
        ...?((location != null) ? {'location': location} : null),
        ...?((isAllDay != null) ? {'is_all_day': isAllDay} : null),
        ...?((participantIds != null)
            ? {'participant_ids': participantIds}
            : null),
      },
    );
    return _normalizeCalendarEvent(data['data'] ?? data);
  }

  Future<void> updateParticipantStatus(int participantId, String status) async {
    await _api.putJson(
      '/calendar-events/participants/$participantId/status',
      data: {'status': status},
    );
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/calendar-events/$id');
  }

  Map<String, dynamic> _normalizeCalendarEvent(Map<String, dynamic> e) {
    return {
      'id': e['id'],
      'title': e['title'] ?? '',
      'description': e['description'],
      'start_date': e['start_date'] ?? e['startDate'],
      'end_date': e['end_date'] ?? e['endDate'],
      'location': e['location'],
      'is_all_day': e['is_all_day'] ?? e['isAllDay'] ?? false,
      'creator': e['creator'],
      'participants': e['participants'] ?? [],
    };
  }
}
