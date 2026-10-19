import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'conversations_providers.dart';

// Admin view filters
final adminMeetingsFilterProvider = StateProvider<Map<String, String>>((ref) {
  return {
    'teacher_id': '',
    'type': '',
    'with': '',
    'search': '',
  };
});

// Stats provider
final adminMeetingsStatsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final filters = ref.watch(adminMeetingsFilterProvider);
  final repo = ref.watch(conversationsRepositoryProvider);
  return repo.getMeetingsStats(filters);
});

// Meetings provider
final adminMeetingsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final filters = ref.watch(adminMeetingsFilterProvider);
  final repo = ref.watch(conversationsRepositoryProvider);
  final meetings = await repo.getAdminMeetings(filters);

  final search = filters['search']?.toLowerCase().trim() ?? '';
  if (search.isEmpty) return meetings;

  // Local filtering as a fallback/improvement
  return meetings.where((m) {
    final title = (m['title'] ?? '').toString().toLowerCase();
    final content = (m['content'] ?? '').toString().toLowerCase();
    final teacher = (m['teacher']?['name'] ?? '').toString().toLowerCase();
    final student = (m['student']?['name'] ?? '').toString().toLowerCase();

    return title.contains(search) ||
        content.contains(search) ||
        teacher.contains(search) ||
        student.contains(search);
  }).toList();
});
