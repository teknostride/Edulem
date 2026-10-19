import '../../core/network/api_client.dart';

class ActivitiesRepository {
  ActivitiesRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list() async {
    final data = await _api.getJson('/activities');
    final List<dynamic> items = data['data'] ?? data['activities'] ?? [];
    return items
        .map((e) => _normalizeActivity(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/activities/$id');
    return _normalizeActivity(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> create({
    required String title,
    required String description,
    required String startDate,
    required String endDate,
    String? location,
    int? maxParticipants,
    List<int>? participantIds,
  }) async {
    final data = await _api.postJson(
      '/activities',
      data: {
        'title': title,
        'description': description,
        'start_date': startDate,
        'end_date': endDate,
        'location': location,
        'max_participants': maxParticipants,
        'participant_ids': participantIds,
      },
    );
    return _normalizeActivity(data['data'] ?? data);
  }

  Future<void> approve(int id) async {
    await _api.postJson('/activities/$id/approve', data: {});
  }

  Future<void> like(int id) async {
    await _api.postJson('/activities/$id/like', data: {});
  }

  Future<void> addParticipant(int activityId, int userId) async {
    await _api.postJson(
      '/activities/participants',
      data: {'activity_id': activityId, 'user_id': userId},
    );
  }

  Future<void> removeParticipant(int participantId) async {
    await _api.deleteJson('/activities/participants/$participantId');
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/activities/$id');
  }

  Map<String, dynamic> _normalizeActivity(Map<String, dynamic> a) {
    return {
      'id': a['id'],
      'title': a['title'] ?? '',
      'description': a['description'] ?? '',
      'start_date': a['start_date'] ?? a['startDate'],
      'end_date': a['end_date'] ?? a['endDate'],
      'location': a['location'],
      'max_participants': a['max_participants'] ?? a['maxParticipants'],
      'participants_count':
          a['participants_count'] ?? a['participantsCount'] ?? 0,
      'is_approved': a['is_approved'] ?? a['isApproved'] ?? false,
      'likes_count': a['likes_count'] ?? a['likesCount'] ?? 0,
      'creator': a['creator'],
    };
  }
}
