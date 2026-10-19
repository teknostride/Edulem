import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'calendar_events_repository.dart';

final calendarEventsRepositoryProvider = Provider<CalendarEventsRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return CalendarEventsRepository(api);
});

final calendarEventsListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final repo = ref.read(calendarEventsRepositoryProvider);
  return repo.list();
});

final calendarEventDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(calendarEventsRepositoryProvider);
  return repo.getById(id);
});

final userCalendarProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final repo = ref.read(calendarEventsRepositoryProvider);
  return repo.getUserCalendar();
});
