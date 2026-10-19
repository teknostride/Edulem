import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'lessons_repository.dart';

final lessonsRepositoryProvider = Provider<LessonsRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return LessonsRepository(api);
});

final lessonsListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final repo = ref.read(lessonsRepositoryProvider);
  return repo.list();
});

final lessonDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(lessonsRepositoryProvider);
  return repo.getById(id);
});
