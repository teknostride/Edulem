import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'conversations_providers.dart';

// Meeting statistics provider
final meetingsStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final repository = ref.read(conversationsRepositoryProvider);
  return await repository.getMeetingsStats();
});

// Meeting records provider with filters
// Note: Backend handles role-based filtering. Frontend only applies type filters.
final meetingsRecordsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, Map<String, String>>((
      ref,
      filters,
    ) async {
      final repository = ref.read(conversationsRepositoryProvider);
      return await repository.getMeetingsRecords(filters);
    });

// Teachers breakdown provider
final teachersBreakdownProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final repository = ref.read(conversationsRepositoryProvider);
  return await repository.getTeachersBreakdown();
});

// Top teachers provider
final topTeachersProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final repository = ref.read(conversationsRepositoryProvider);
  return await repository.getTopTeachers();
});

// Filter state provider
final meetingsFiltersProvider = StateProvider<Map<String, String>>((ref) {
  return {'teacher': '', 'type': '', 'with': '', 'search': ''};
});

// Notes provider
final notesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final repository = ref.read(conversationsRepositoryProvider);
  return await repository.getNotes();
});

// Appointments provider
final appointmentsProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final repository = ref.read(conversationsRepositoryProvider);
  return await repository.getAppointments();
});

// Notes filter provider
final notesFiltersProvider = StateProvider<Map<String, String>>((ref) {
  return {'search': '', 'visibility': ''};
});

// Appointments filter provider
final appointmentsFiltersProvider = StateProvider<Map<String, String>>((ref) {
  return {'search': '', 'status': '', 'date_range': ''};
});
