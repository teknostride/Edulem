import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'students_repository.dart';

final studentsRepositoryProvider = Provider<StudentsRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return StudentsRepository(api);
});

final studentsListProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final repository = ref.read(studentsRepositoryProvider);
  try {
    final data = await repository.list(page: 1, perPage: 1000);
    return data['data'] as List<Map<String, dynamic>>? ?? [];
  } catch (e) {
    return [];
  }
});
