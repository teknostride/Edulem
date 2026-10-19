import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'users_providers.dart';

class UsersPagingState {
  final List<dynamic> items;
  final int currentPage;
  final int lastPage;
  final int perPage;
  final int total;
  final bool isLoading;
  final bool hasError;
  final String? error;
  final String? search;
  final String? role;

  const UsersPagingState({
    this.items = const [],
    this.currentPage = 1,
    this.lastPage = 1,
    this.perPage = 15,
    this.total = 0,
    this.isLoading = false,
    this.hasError = false,
    this.error,
    this.search,
    this.role,
  });

  UsersPagingState copyWith({
    List<dynamic>? items,
    int? currentPage,
    int? lastPage,
    int? perPage,
    int? total,
    bool? isLoading,
    bool? hasError,
    String? error,
    String? search,
    String? role,
    bool clearError = false,
  }) {
    return UsersPagingState(
      items: items ?? this.items,
      currentPage: currentPage ?? this.currentPage,
      lastPage: lastPage ?? this.lastPage,
      perPage: perPage ?? this.perPage,
      total: total ?? this.total,
      isLoading: isLoading ?? this.isLoading,
      hasError: hasError ?? this.hasError,
      error: clearError ? null : (error ?? this.error),
      search: search ?? this.search,
      role: role ?? this.role,
    );
  }

  bool get hasMore => currentPage < lastPage;
}

class UsersPagingController extends StateNotifier<UsersPagingState> {
  UsersPagingController(this._ref) : super(const UsersPagingState()) {
    loadInitial();
  }

  final Ref _ref;

  Future<void> loadInitial() async {
    state = state.copyWith(isLoading: true, clearError: true);
    await _fetch(page: 1, append: false);
  }

  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore) return;
    await _fetch(page: state.currentPage + 1, append: true);
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, clearError: true);
    await _fetch(page: 1, append: false);
  }

  void setSearch(String? value) {
    if (state.search == value) return;
    state = state.copyWith(search: value, currentPage: 1);
    _fetch(page: 1, append: false);
  }

  void setRole(String? value) {
    if (state.role == value) return;
    state = state.copyWith(role: value, currentPage: 1);
    _fetch(page: 1, append: false);
  }

  void clearFilters() {
    state = state.copyWith(search: null, role: null, currentPage: 1);
    _fetch(page: 1, append: false);
  }

  Future<void> _fetch({required int page, required bool append}) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final repo = _ref.read(usersRepositoryProvider);
      final data = await repo.list(
        search: state.search,
        role: state.role,
        page: page,
        perPage: state.perPage,
      );

      final pagination = data['pagination'] as Map<String, dynamic>? ?? {};
      final users = data['users'] as List<dynamic>? ?? [];

      final newItems = append ? [...state.items, ...users] : users;

      state = state.copyWith(
        items: newItems,
        currentPage: pagination['current_page'] as int? ?? page,
        lastPage: pagination['last_page'] as int? ?? page,
        perPage: pagination['per_page'] as int? ?? state.perPage,
        total: pagination['total'] as int? ?? newItems.length,
        isLoading: false,
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        hasError: true,
        error: e.toString(),
      );
    }
  }
}

final usersPagingControllerProvider =
    StateNotifierProvider<UsersPagingController, UsersPagingState>((ref) {
      return UsersPagingController(ref);
    });

final usersVisibleItemsProvider = Provider<List<dynamic>>((ref) {
  return ref.watch(usersPagingControllerProvider).items;
});
