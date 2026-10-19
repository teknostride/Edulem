import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_providers.dart';
import 'grades_providers.dart';

class GradesPagingState {
  const GradesPagingState({
    required this.items,
    required this.page,
    required this.perPage,
    required this.isLoadingMore,
    required this.hasMore,
    required this.initialLoading,
    this.error,
  });

  final List<Map<String, dynamic>> items;
  final int page;
  final int perPage;
  final bool isLoadingMore;
  final bool hasMore;
  final bool initialLoading;
  final Object? error;

  GradesPagingState copyWith({
    List<Map<String, dynamic>>? items,
    int? page,
    int? perPage,
    bool? isLoadingMore,
    bool? hasMore,
    bool? initialLoading,
    Object? error,
  }) {
    return GradesPagingState(
      items: items ?? this.items,
      page: page ?? this.page,
      perPage: perPage ?? this.perPage,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      initialLoading: initialLoading ?? this.initialLoading,
      error: error,
    );
  }

  static GradesPagingState initial() {
    return const GradesPagingState(
      items: [],
      page: 1,
      perPage: 50,
      isLoadingMore: false,
      hasMore: true,
      initialLoading: true,
      error: null,
    );
  }
}

class GradesPagingController extends StateNotifier<GradesPagingState> {
  GradesPagingController(this._ref) : super(GradesPagingState.initial()) {
    loadInitial();
  }

  final Ref _ref;

  Future<void> loadInitial() async {
    state = GradesPagingState.initial();

    try {
      final repo = _ref.read(gradesRepositoryProvider);
      final session = _ref.read(authSessionProvider);
      final role = session.valueOrNull?.role.toLowerCase() ?? '';
      final isStudent =
          role.contains('student') ||
          role.contains('ogrenci') ||
          role.contains('öğrenci');

      final items = isStudent
          ? await repo.listForStudentPortal()
          : await repo.list(page: 1, perPage: state.perPage);
      state = state.copyWith(
        items: items,
        page: 1,
        initialLoading: false,
        hasMore: isStudent ? false : items.length >= state.perPage,
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
      final repo = _ref.read(gradesRepositoryProvider);
      final session = _ref.read(authSessionProvider);
      final role = session.valueOrNull?.role.toLowerCase() ?? '';
      final isStudent =
          role.contains('student') ||
          role.contains('ogrenci') ||
          role.contains('öğrenci');

      if (isStudent) {
        state = state.copyWith(isLoadingMore: false, hasMore: false);
        return;
      }

      final items = await repo.list(page: nextPage, perPage: state.perPage);

      state = state.copyWith(
        items: [...state.items, ...items],
        page: nextPage,
        isLoadingMore: false,
        hasMore: items.length >= state.perPage,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e);
    }
  }
}

final gradesPagingProvider =
    StateNotifierProvider<GradesPagingController, GradesPagingState>((ref) {
      return GradesPagingController(ref);
    });
