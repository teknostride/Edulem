import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/role_utils.dart';
import '../auth/auth_providers.dart';
import '../dashboard/portal_dashboard_provider.dart';
import '../profile/profile_providers.dart';
import 'homework_providers.dart';

// Filtre provider'ları
final homeworkCampusFilterProvider = StateProvider<int?>((ref) => null);
final homeworkEducationLevelFilterProvider = StateProvider<int?>((ref) => null);
final homeworkClassroomFilterProvider = StateProvider<int?>((ref) => null);
final homeworkTeacherFilterProvider = StateProvider<int?>((ref) => null);
final homeworkStudentNameFilterProvider = StateProvider<String?>((ref) => null);
final homeworkStatusFilterProvider = StateProvider<String>((ref) => 'all');

class HomeworkPagingState {
  const HomeworkPagingState({
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

  HomeworkPagingState copyWith({
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
    return HomeworkPagingState(
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

  static HomeworkPagingState initial() {
    return const HomeworkPagingState(
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

class HomeworkPagingController extends StateNotifier<HomeworkPagingState> {
  HomeworkPagingController(this._ref) : super(HomeworkPagingState.initial()) {
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
    state = HomeworkPagingState.initial();

    try {
      final repo = _ref.read(homeworkRepositoryProvider);
      final session = _ref.read(authSessionProvider);
      final role = session.valueOrNull?.role.toLowerCase() ?? '';
      final isStudentOrGuardian =
          role.contains('student') ||
          role.contains('ogrenci') ||
          role.contains('öğrenci') ||
          role.contains('guardian') ||
          role.contains('parent') ||
          role.contains('veli');

      if (isStudentOrGuardian) {
        final currentStudentId = _ref.read(selectedPortalStudentIdProvider);
        final items = await repo.listForStudentPortal(studentId: currentStudentId);
        if (_mounted) {
          state = state.copyWith(
            items: items,
            page: 1,
            initialLoading: false,
            hasMore: false,
            error: null,
          );
        }
        return;
      }

      final filters = _getFilters();
      final result = await repo.list(
        page: 1,
        perPage: state.perPage,
        campusId: filters['campusId'] as int?,
        educationLevelId: filters['educationLevelId'] as int?,
        classroomId: filters['classroomId'] as int?,
        teacherId: filters['teacherId'] as int?,
        studentName: filters['studentName'] as String?,
        status: filters['status'] as String?,
      );

      final items = result['homeworks'] as List<Map<String, dynamic>>;
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
      final session = _ref.read(authSessionProvider);
      final role = session.valueOrNull?.role.toLowerCase() ?? '';
      final isStudentOrGuardian =
          role.contains('student') ||
          role.contains('ogrenci') ||
          role.contains('öğrenci') ||
          role.contains('guardian') ||
          role.contains('parent') ||
          role.contains('veli');

      if (isStudentOrGuardian) {
        if (_mounted) {
          state = state.copyWith(isLoadingMore: false, hasMore: false);
        }
        return;
      }

      final nextPage = state.page + 1;
      final repo = _ref.read(homeworkRepositoryProvider);
      final filters = _getFilters();

      final result = await repo.list(
        page: nextPage,
        perPage: state.perPage,
        campusId: filters['campusId'] as int?,
        educationLevelId: filters['educationLevelId'] as int?,
        classroomId: filters['classroomId'] as int?,
        teacherId: filters['teacherId'] as int?,
        studentName: filters['studentName'] as String?,
        status: filters['status'] as String?,
      );

      final items = result['homeworks'] as List<Map<String, dynamic>>;

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

  Map<String, dynamic> _getFilters() {
    final session = _ref.read(authSessionProvider);
    final profile = _ref.read(profileProvider);
    final userRole = session.valueOrNull?.role.toLowerCase() ?? '';

    final isStudent = isStudentRole(userRole);

    final teacherId = _ref.read(homeworkTeacherFilterProvider);

    int? asInt(dynamic v) {
      if (v == null) return null;
      if (v is int) return v;
      if (v is num) return v.toInt();
      return int.tryParse(v.toString().trim());
    }

    int? classroomId = _ref.read(homeworkClassroomFilterProvider);
    if (classroomId == null) {
      final p = profile.valueOrNull;
      if (isStudent) {
        classroomId =
            asInt(p?['classroom_id']) ??
            asInt(p?['student']?['classroom_id']) ??
            asInt(p?['classroom']?['id']);
      }
    }

    return {
      'campusId': _ref.read(homeworkCampusFilterProvider),
      'educationLevelId': _ref.read(homeworkEducationLevelFilterProvider),
      'classroomId': classroomId,
      'teacherId': teacherId,
      'studentName': _ref.read(homeworkStudentNameFilterProvider),
      'status': _ref.read(homeworkStatusFilterProvider),
    };
  }
}

final homeworkPagingProvider =
    StateNotifierProvider<HomeworkPagingController, HomeworkPagingState>((ref) {
      return HomeworkPagingController(ref);
    });
