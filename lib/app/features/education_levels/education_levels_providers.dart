import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'education_levels_repository.dart';

final educationLevelsRepositoryProvider = Provider<EducationLevelsRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return EducationLevelsRepository(api);
});

final educationLevelsListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final repo = ref.read(educationLevelsRepositoryProvider);
  return repo.list();
});

final educationLevelDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(educationLevelsRepositoryProvider);
  return repo.getById(id);
});
