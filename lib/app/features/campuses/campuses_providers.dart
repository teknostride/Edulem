import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'campuses_repository.dart';

final campusesRepositoryProvider = Provider<CampusesRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return CampusesRepository(api);
});

final campusesListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final repo = ref.read(campusesRepositoryProvider);
  return repo.list();
});

final campusDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(campusesRepositoryProvider);
  return repo.getById(id);
});
