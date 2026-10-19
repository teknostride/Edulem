import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_providers.dart';
import '../profile/profile_providers.dart';
import 'tutoring_providers.dart';

// Filtre provider'ları
final tutoringStatusFilterProvider = StateProvider<String>((ref) => 'all');
final tutoringDateFromFilterProvider = StateProvider<String?>((ref) => null);
final tutoringDateToFilterProvider = StateProvider<String?>((ref) => null);

class TutoringPagingState {
  const TutoringPagingState({
    required this.items,
    required this.page,
    required this.perPage,
    required this.isLoadingMore,
    required this.hasMore,
    required this.initialLoading,
    this.error,
    this.stats,
    this.pagination,
  });

  final List<Map<String, dynamic>> items;
  final int page;
  final int perPage;
  final bool isLoadingMore;
  final bool hasMore;
  final bool initialLoading;
  final Object? error;
  final Map<String, dynamic>? stats;
  final Map<String, dynamic>? pagination;

  TutoringPagingState copyWith({
    List<Map<String, dynamic>>? items,
    int? page,
    int? perPage,
    bool? isLoadingMore,
    bool? hasMore,
    bool? initialLoading,
    Object? error,
    Map<String, dynamic>? stats,
    Map<String, dynamic>? pagination,
  }) {
    return TutoringPagingState(
      items: items ?? this.items,
      page: page ?? this.page,
      perPage: perPage ?? this.perPage,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      initialLoading: initialLoading ?? this.initialLoading,
      error: error,
      stats: stats ?? this.stats,
      pagination: pagination ?? this.pagination,
    );
  }

  static TutoringPagingState initial() {
    return const TutoringPagingState(
      items: [],
      page: 1,
      perPage: 50,
      isLoadingMore: false,
      hasMore: true,
      initialLoading: true,
      error: null,
      stats: null,
      pagination: null,
    );
  }
}

class TutoringPagingController extends StateNotifier<TutoringPagingState> {
  TutoringPagingController(this._ref) : super(TutoringPagingState.initial()) {
    loadInitial();
  }

  final Ref _ref;
  bool _mounted = true;

  @override
  void dispose() {
    _mounted = false;
    super.dispose();
  }

  Future<void> loadInitial() async {
    state = TutoringPagingState.initial();

    try {
      final repo = _ref.read(tutoringRepositoryProvider);
      final filters = _getFilters();

      final result = await repo.list(
        page: 1,
        perPage: state.perPage,
        teacherId: filters['teacherId'] as int?,
        status: filters['status'] as String?,
        dateFrom: filters['dateFrom'] as String?,
        dateTo: filters['dateTo'] as String?,
      );

      final items = result['tutorings'] as List<Map<String, dynamic>>;
      final stats = result['stats'] as Map<String, dynamic>?;
      final pagination = result['pagination'] as Map<String, dynamic>?;

      if (_mounted) {
        state = state.copyWith(
          items: items,
          page: 1,
          initialLoading: false,
          hasMore: items.length >= state.perPage,
          error: null,
          stats: stats,
          pagination: pagination,
        );
      }
    } catch (e) {
      if (_mounted) {
        state = state.copyWith(initialLoading: false, error: e);
      }
    }
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore) return;

    state = state.copyWith(isLoadingMore: true, error: null);

    try {
      final nextPage = state.page + 1;
      final repo = _ref.read(tutoringRepositoryProvider);
      final filters = _getFilters();

      final result = await repo.list(
        page: nextPage,
        perPage: state.perPage,
        teacherId: filters['teacherId'] as int?,
        status: filters['status'] as String?,
        dateFrom: filters['dateFrom'] as String?,
        dateTo: filters['dateTo'] as String?,
      );

      final items = result['tutorings'] as List<Map<String, dynamic>>;

      if (_mounted) {
        state = state.copyWith(
          items: [...state.items, ...items],
          page: nextPage,
          isLoadingMore: false,
          hasMore: items.length >= state.perPage,
        );
      }
    } catch (e) {
      if (_mounted) {
        state = state.copyWith(isLoadingMore: false, error: e);
      }
    }
  }

  Future<void> deleteTutoring(int id) async {
    try {
      final repo = _ref.read(tutoringRepositoryProvider);
      await repo.delete(id);
      await loadInitial();
    } catch (e) {
      state = state.copyWith(error: e);
      rethrow;
    }
  }

  Map<String, dynamic> _getFilters() {
    // Öğretmen rolü için otomatik teacher_id ekle
    final session = _ref.read(authSessionProvider);
    final profile = _ref.read(profileProvider);
    final userRole = session.valueOrNull?.role.toLowerCase() ?? '';
    final isTeacher =
        userRole.contains('teacher') ||
        userRole.contains('ogretmen') ||
        userRole.contains('öğretmen') ||
        userRole.contains('rehber');

    int? teacherId;
    if (isTeacher) {
      teacherId = int.tryParse(profile.valueOrNull?['id']?.toString() ?? '');
    }

    return {
      'teacherId': teacherId,
      'status': _ref.read(tutoringStatusFilterProvider),
      'dateFrom': _ref.read(tutoringDateFromFilterProvider),
      'dateTo': _ref.read(tutoringDateToFilterProvider),
    };
  }
}

final tutoringPagingProvider =
    StateNotifierProvider<TutoringPagingController, TutoringPagingState>((ref) {
      return TutoringPagingController(ref);
    });
