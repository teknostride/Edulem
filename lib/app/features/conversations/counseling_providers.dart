import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'conversations_providers.dart';

// Counseling filters
final counselingFilterProvider = StateProvider<Map<String, String>>((ref) {
  return {
    'campus_id': '',
    'education_level_id': '',
    'classroom_id': '',
    'search': '',
    'start_date': '',
    'end_date': '',
    'teacher_id': '',
  };
});

// Counseling records provider
final counselingRecordsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final filters = ref.watch(counselingFilterProvider);
  final repo = ref.watch(conversationsRepositoryProvider);
  
  final records = await repo.getMeetingsRecords(filters);
  return records;
});
