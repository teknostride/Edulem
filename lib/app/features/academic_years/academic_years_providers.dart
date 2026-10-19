import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'academic_years_repository.dart';

final academicYearsRepositoryProvider = Provider<AcademicYearsRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return AcademicYearsRepository(api);
});

final academicYearsListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final repo = ref.read(academicYearsRepositoryProvider);
  return repo.list();
});

final academicYearDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(academicYearsRepositoryProvider);
  return repo.getById(id);
});
