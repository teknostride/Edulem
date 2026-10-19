import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../campuses/campuses_providers.dart';
import '../education_levels/education_levels_providers.dart'
    as education_levels_providers;
import '../classrooms/classrooms_providers.dart' as classrooms_providers;
import 'students_paging_controller.dart';

final studentsSearchQueryProvider = StateProvider<String>((ref) => '');

final studentsCampusIdFilterProvider = StateProvider<int?>((ref) => null);
final studentsEducationLevelIdFilterProvider = StateProvider<int?>(
  (ref) => null,
);
final studentsClassroomIdFilterProvider = StateProvider<int?>((ref) => null);
final studentsIsActiveFilterProvider = StateProvider<bool?>((ref) => null);

final studentsSortByProvider = StateProvider<String>((ref) => 'student_name');
final studentsSortDirProvider = StateProvider<String>((ref) => 'asc');
final studentsPerPageProvider = StateProvider<int>((ref) => 15);

final studentsCampusesProvider = FutureProvider<List<Map<String, dynamic>>>(
  (ref) => ref.watch(campusesListProvider.future),
);

final studentsEducationLevelsProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final campusId = ref.watch(studentsCampusIdFilterProvider);

  // provider signature in education levels module may vary; call repository directly.
  final repo = ref.read(
    education_levels_providers.educationLevelsRepositoryProvider,
  );
  return repo.list(campusId: campusId, perPage: 200);
});

final studentsClassroomsProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final campusId = ref.watch(studentsCampusIdFilterProvider);
  final educationLevelId = ref.watch(studentsEducationLevelIdFilterProvider);
  if (educationLevelId == null) return const [];

  final repo = ref.read(classrooms_providers.classroomsRepositoryProvider);
  return repo.list(
    campusId: campusId,
    educationLevelId: educationLevelId,
    perPage: 200,
  );
});

final studentsVisibleItemsProvider = Provider<List<Map<String, dynamic>>>(
  (ref) => ref.watch(studentsPagingProvider).items,
);
