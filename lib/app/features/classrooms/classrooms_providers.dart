import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'classrooms_repository.dart';

final classroomsRepositoryProvider = Provider<ClassroomsRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return ClassroomsRepository(api);
});

final classroomsListProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) {
  final repo = ref.read(classroomsRepositoryProvider);
  return repo.list();
});

final classroomDetailProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, id) async {
      final repo = ref.read(classroomsRepositoryProvider);
      return repo.getById(id);
    });
