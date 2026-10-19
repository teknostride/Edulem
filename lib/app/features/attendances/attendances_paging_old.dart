import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'attendances_providers.dart';

class AttendancesPagingState {
  const AttendancesPagingState({
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

  AttendancesPagingState copyWith({
    List<Map<String, dynamic>>? items,
    int? page,
    int? perPage,
    bool? isLoadingMore,
    bool? hasMore,
    bool? initialLoading,
    Object? error,
  }) {
    return AttendancesPagingState(
      items: items ?? this.items,
      page: page ?? this.page,
      perPage: perPage ?? this.perPage,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      initialLoading: initialLoading ?? this.initialLoading,
      error: error,
    );
  }

  static AttendancesPagingState initial() {
    return const AttendancesPagingState(
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

class AttendancesPagingController extends StateNotifier<AttendancesPagingState> {
  AttendancesPagingController(this._ref) : super(AttendancesPagingState.initial()) {
    loadInitial();
  }

  final Ref _ref;

  Future<void> loadInitial() async {
    state = AttendancesPagingState.initial();

    try {
      final repo = _ref.read(attendancesRepositoryProvider);
      final items = await repo.list(page: 1, perPage: state.perPage);
      state = state.copyWith(
        items: items,
        page: 1,
        initialLoading: false,
        hasMore: items.length >= state.perPage,
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
      final repo = _ref.read(attendancesRepositoryProvider);
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

final attendancesPagingProvider =
    StateNotifierProvider<AttendancesPagingController, AttendancesPagingState>((ref) {
  return AttendancesPagingController(ref);
});
