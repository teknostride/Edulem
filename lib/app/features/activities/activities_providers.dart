import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'activities_repository.dart';

final activitiesRepositoryProvider = Provider<ActivitiesRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return ActivitiesRepository(api);
});

final activitiesListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final repo = ref.read(activitiesRepositoryProvider);
  return repo.list();
});

final activityDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(activitiesRepositoryProvider);
  return repo.getById(id);
});
