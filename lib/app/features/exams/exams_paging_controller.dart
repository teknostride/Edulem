import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/role_utils.dart';
import '../auth/auth_providers.dart';
import '../profile/profile_providers.dart';
import 'exams_providers.dart';
import 'exams_repository.dart';

class ExamsPagingState {
  const ExamsPagingState({
    required this.items,
    required this.page,
    required this.perPage,
    required this.isLoadingMore,
    required this.hasMore,
    required this.initialLoading,
    this.statistics,
    this.pagination,
    this.error,
  });

  final List<Map<String, dynamic>> items;
  final int page;
  final int perPage;
  final bool isLoadingMore;
  final bool hasMore;
  final bool initialLoading;
  final ExamStatistics? statistics;
  final Pagination? pagination;
  final Object? error;

  ExamsPagingState copyWith({
    List<Map<String, dynamic>>? items,
    int? page,
    int? perPage,
    bool? isLoadingMore,
    bool? hasMore,
    bool? initialLoading,
    ExamStatistics? statistics,
    Pagination? pagination,
    Object? error,
  }) {
    return ExamsPagingState(
      items: items ?? this.items,
      page: page ?? this.page,
      perPage: perPage ?? this.perPage,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      initialLoading: initialLoading ?? this.initialLoading,
      statistics: statistics ?? this.statistics,
      pagination: pagination ?? this.pagination,
      error: error,
    );
  }

  static ExamsPagingState initial() {
    return const ExamsPagingState(
      items: [],
      page: 1,
      perPage: 15,
      isLoadingMore: false,
      hasMore: true,
      initialLoading: true,
      statistics: null,
      pagination: null,
      error: null,
    );
  }
}

int? _asInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString().trim());
}

class ExamsPagingController extends StateNotifier<ExamsPagingState> {
  ExamsPagingController(this._ref) : super(ExamsPagingState.initial()) {
    loadInitial();
  }

  final Ref _ref;

  Future<void> loadInitial() async {
    state = ExamsPagingState.initial();

    final session = _ref.read(authSessionProvider);
    final profile = _ref.read(profileProvider);
    final userRole = session.valueOrNull?.role.toLowerCase() ?? '';
    
    int? teacherId;
    if (userRole.contains('teacher') ||
        userRole.contains('ogretmen') ||
        userRole.contains('öğretmen') ||
        userRole.contains('rehber')) {
      teacherId = int.tryParse(profile.valueOrNull?['id']?.toString() ?? '');
    }

    int? classroomId;
    if (isStudentRole(userRole)) {
      final p = profile.valueOrNull;
      classroomId =
          _asInt(p?['classroom_id']) ??
          _asInt(p?['student']?['classroom_id']) ??
          _asInt(p?['classroom']?['id']);
    }

    try {
      final repo = _ref.read(examsRepositoryProvider);

      final response = await repo.list(
        page: 1,
        perPage: state.perPage,
        teacherId: teacherId,
        classroomId: classroomId,
      );
      state = state.copyWith(
        items: response.exams,
        page: 1,
        initialLoading: false,
        hasMore: response.pagination.lastPage > 1,
        statistics: response.statistics,
        pagination: response.pagination,
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
      final repo = _ref.read(examsRepositoryProvider);
      final session = _ref.read(authSessionProvider);
      final profile = _ref.read(profileProvider);
      final userRole = session.valueOrNull?.role.toLowerCase() ?? '';

      int? teacherId;
      if (userRole.contains('teacher') ||
          userRole.contains('ogretmen') ||
          userRole.contains('öğretmen') ||
          userRole.contains('rehber')) {
        teacherId = int.tryParse(profile.valueOrNull?['id']?.toString() ?? '');
      }

      int? classroomId;
      if (isStudentRole(userRole)) {
        final p = profile.valueOrNull;
        classroomId =
            _asInt(p?['classroom_id']) ??
            _asInt(p?['student']?['classroom_id']) ??
            _asInt(p?['classroom']?['id']);
      }

      final response = await repo.list(
        page: nextPage,
        perPage: state.perPage,
        teacherId: teacherId,
        classroomId: classroomId,
      );

      state = state.copyWith(
        items: [...state.items, ...response.exams],
        page: nextPage,
        isLoadingMore: false,
        hasMore: response.pagination.lastPage > nextPage,
        pagination: response.pagination,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e);
    }
  }

  Future<void> deleteExam(int id) async {
    try {
      final repo = _ref.read(examsRepositoryProvider);
      await repo.delete(id);
      // Reload after delete
      await loadInitial();
    } catch (e) {
      state = state.copyWith(error: e);
      rethrow;
    }
  }
}

final examsPagingProvider =
    StateNotifierProvider<ExamsPagingController, ExamsPagingState>((ref) {
      return ExamsPagingController(ref);
    });
