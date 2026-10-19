import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'attendances_providers.dart';

class AttendancesPagingState {
  final List<dynamic> items;
  final int currentPage;
  final int lastPage;
  final int perPage;
  final int total;
  final bool isLoading;
  final bool isLoadingMore;
  final bool hasError;
  final String? error;
  final String? date;
  final int? educationLevelId;

  const AttendancesPagingState({
    this.items = const [],
    this.currentPage = 1,
    this.lastPage = 1,
    this.perPage = 15,
    this.total = 0,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.hasError = false,
    this.error,
    this.date,
    this.educationLevelId,
  });

  AttendancesPagingState copyWith({
    List<dynamic>? items,
    int? currentPage,
    int? lastPage,
    int? perPage,
    int? total,
    bool? isLoading,
    bool? isLoadingMore,
    bool? hasError,
    String? error,
    String? date,
    int? educationLevelId,
    bool clearError = false,
  }) {
    return AttendancesPagingState(
      items: items ?? this.items,
      currentPage: currentPage ?? this.currentPage,
      lastPage: lastPage ?? this.lastPage,
      perPage: perPage ?? this.perPage,
      total: total ?? this.total,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasError: hasError ?? this.hasError,
      error: clearError ? null : (error ?? this.error),
      date: date ?? this.date,
      educationLevelId: educationLevelId ?? this.educationLevelId,
    );
  }

  bool get hasMore => currentPage < lastPage;
}

class AttendancesPagingController
    extends StateNotifier<AttendancesPagingState> {
  AttendancesPagingController(this._ref)
    : super(const AttendancesPagingState()) {
    loadInitial();
  }

  final Ref _ref;

  Future<void> loadInitial() async {
    state = state.copyWith(
      isLoading: true,
      isLoadingMore: false,
      clearError: true,
    );
    await _fetch(page: 1, append: false);
  }

  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;
    state = state.copyWith(isLoadingMore: true);
    await _fetch(page: state.currentPage + 1, append: true);
  }

  Future<void> refresh() async {
    state = state.copyWith(
      isLoading: true,
      isLoadingMore: false,
      clearError: true,
    );
    await _fetch(page: 1, append: false);
  }

  void setDate(String? value) {
    if (state.date == value) return;
    state = state.copyWith(date: value, currentPage: 1);
    _fetch(page: 1, append: false);
  }

  void setEducationLevelId(int? value) {
    if (state.educationLevelId == value) return;
    state = state.copyWith(educationLevelId: value, currentPage: 1);
    _fetch(page: 1, append: false);
  }

  void clearFilters() {
    state = state.copyWith(date: null, educationLevelId: null, currentPage: 1);
    _fetch(page: 1, append: false);
  }

  Future<void> _fetch({required int page, required bool append}) async {
    state = state.copyWith(
      isLoading: true,
      isLoadingMore: false,
      clearError: true,
    );

    try {
      final repo = _ref.read(attendancesRepositoryProvider);
      final data = await repo.daily(
        date: state.date ?? '',
        educationLevelId: state.educationLevelId,
      );

      final pagination = data['pagination'] as Map<String, dynamic>? ?? {};
      final attendances = data['attendances'] as List<dynamic>? ?? [];

      final newItems = append ? [...state.items, ...attendances] : attendances;

      state = state.copyWith(
        items: newItems,
        currentPage: pagination['current_page'] as int? ?? page,
        lastPage: pagination['last_page'] as int? ?? page,
        perPage: pagination['per_page'] as int? ?? state.perPage,
        total: pagination['total'] as int? ?? newItems.length,
        isLoading: false,
        isLoadingMore: false,
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isLoadingMore: false,
        hasError: true,
        error: e.toString(),
      );
    }
  }
}

final attendancesPagingControllerProvider =
    StateNotifierProvider<AttendancesPagingController, AttendancesPagingState>((
      ref,
    ) {
      return AttendancesPagingController(ref);
    });

final attendancesVisibleItemsProvider = Provider<List<dynamic>>((ref) {
  return ref.watch(attendancesPagingControllerProvider).items;
});
