import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'students_filter_providers.dart';
import 'students_providers.dart';

class StudentsPagingState {
  const StudentsPagingState({
    required this.items,
    required this.page,
    required this.perPage,
    required this.isLoadingMore,
    required this.hasMore,
    required this.initialLoading,
    required this.total,
    required this.lastPage,
    this.error,
  });

  final List<Map<String, dynamic>> items;
  final int page;
  final int perPage;
  final bool isLoadingMore;
  final bool hasMore;
  final bool initialLoading;
  final int total;
  final int lastPage;
  final Object? error;

  StudentsPagingState copyWith({
    List<Map<String, dynamic>>? items,
    int? page,
    int? perPage,
    bool? isLoadingMore,
    bool? hasMore,
    bool? initialLoading,
    int? total,
    int? lastPage,
    Object? error,
  }) {
    return StudentsPagingState(
      items: items ?? this.items,
      page: page ?? this.page,
      perPage: perPage ?? this.perPage,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      initialLoading: initialLoading ?? this.initialLoading,
      total: total ?? this.total,
      lastPage: lastPage ?? this.lastPage,
      error: error,
    );
  }

  static StudentsPagingState initial() {
    return const StudentsPagingState(
      items: [],
      page: 1,
      perPage: 50,
      isLoadingMore: false,
      hasMore: true,
      initialLoading: true,
      total: 0,
      lastPage: 1,
      error: null,
    );
  }
}

class StudentsPagingController extends StateNotifier<StudentsPagingState> {
  StudentsPagingController(this._ref) : super(StudentsPagingState.initial()) {
    _bindFilterListeners();
    loadInitial();
  }

  final Ref _ref;

  void _bindFilterListeners() {
    void reload() {
      // Filtre değişince sayfayı sıfırla
      loadInitial();
    }

    _ref.listen<String>(studentsSearchQueryProvider, (_, _) => reload());
    _ref.listen<int?>(studentsCampusIdFilterProvider, (_, _) => reload());
    _ref.listen<int?>(
      studentsEducationLevelIdFilterProvider,
      (_, _) => reload(),
    );
    _ref.listen<int?>(studentsClassroomIdFilterProvider, (_, _) => reload());
    _ref.listen<bool?>(studentsIsActiveFilterProvider, (_, _) => reload());
    _ref.listen<String>(studentsSortByProvider, (_, _) => reload());
    _ref.listen<String>(studentsSortDirProvider, (_, _) => reload());
    _ref.listen<int>(studentsPerPageProvider, (_, _) => reload());
  }

  Future<void> loadInitial() async {
    final perPage = _ref.read(studentsPerPageProvider);
    state = StudentsPagingState.initial().copyWith(perPage: perPage);

    try {
      final repo = _ref.read(studentsRepositoryProvider);
      final res = await repo.list(
        page: 1,
        perPage: state.perPage,
        search: _ref.read(studentsSearchQueryProvider),
        campusId: _ref.read(studentsCampusIdFilterProvider),
        educationLevelId: _ref.read(studentsEducationLevelIdFilterProvider),
        classroomId: _ref.read(studentsClassroomIdFilterProvider),
        isActive: _ref.read(studentsIsActiveFilterProvider),
        sortBy: _ref.read(studentsSortByProvider),
        sortDir: _ref.read(studentsSortDirProvider),
      );

      final items = (res['items'] is List)
          ? (res['items'] as List)
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList()
          : const <Map<String, dynamic>>[];

      final p = (res['pagination'] is Map)
          ? Map<String, dynamic>.from(res['pagination'] as Map)
          : const <String, dynamic>{};

      final lastPage = int.tryParse('${p['last_page'] ?? ''}') ?? 1;
      final total = int.tryParse('${p['total'] ?? ''}') ?? items.length;
      final hasMore = 1 < lastPage;
      state = state.copyWith(
        items: items,
        page: 1,
        initialLoading: false,
        hasMore: hasMore,
        lastPage: lastPage,
        total: total,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(initialLoading: false, error: e);
    }
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore) return;

    state = state.copyWith(isLoadingMore: true, error: null);

    try {
      final nextPage = state.page + 1;
      final repo = _ref.read(studentsRepositoryProvider);
      final res = await repo.list(
        page: nextPage,
        perPage: state.perPage,
        search: _ref.read(studentsSearchQueryProvider),
        campusId: _ref.read(studentsCampusIdFilterProvider),
        educationLevelId: _ref.read(studentsEducationLevelIdFilterProvider),
        classroomId: _ref.read(studentsClassroomIdFilterProvider),
        isActive: _ref.read(studentsIsActiveFilterProvider),
        sortBy: _ref.read(studentsSortByProvider),
        sortDir: _ref.read(studentsSortDirProvider),
      );

      final items = (res['items'] is List)
          ? (res['items'] as List)
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList()
          : const <Map<String, dynamic>>[];

      final p = (res['pagination'] is Map)
          ? Map<String, dynamic>.from(res['pagination'] as Map)
          : const <String, dynamic>{};

      final lastPage =
          int.tryParse('${p['last_page'] ?? ''}') ?? state.lastPage;
      final total = int.tryParse('${p['total'] ?? ''}') ?? state.total;
      final hasMore = nextPage < lastPage;

      state = state.copyWith(
        items: [...state.items, ...items],
        page: nextPage,
        isLoadingMore: false,
        hasMore: hasMore,
        lastPage: lastPage,
        total: total,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e);
    }
  }
}

final studentsPagingProvider =
    StateNotifierProvider<StudentsPagingController, StudentsPagingState>((ref) {
      return StudentsPagingController(ref);
    });
