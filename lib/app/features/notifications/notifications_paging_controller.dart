import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'notifications_providers.dart';

class NotificationsPagingState {
  const NotificationsPagingState({
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

  NotificationsPagingState copyWith({
    List<Map<String, dynamic>>? items,
    int? page,
    int? perPage,
    bool? isLoadingMore,
    bool? hasMore,
    bool? initialLoading,
    Object? error,
  }) {
    return NotificationsPagingState(
      items: items ?? this.items,
      page: page ?? this.page,
      perPage: perPage ?? this.perPage,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      initialLoading: initialLoading ?? this.initialLoading,
      error: error,
    );
  }

  static NotificationsPagingState initial() {
    return const NotificationsPagingState(
      items: [],
      page: 1,
      perPage: 30,
      isLoadingMore: false,
      hasMore: true,
      initialLoading: true,
      error: null,
    );
  }
}

class NotificationsPagingController extends StateNotifier<NotificationsPagingState> {
  NotificationsPagingController(this._ref) : super(NotificationsPagingState.initial()) {
    loadInitial();
  }

  final Ref _ref;

  Future<void> loadInitial() async {
    state = NotificationsPagingState.initial();

    try {
      final repo = _ref.read(notificationsRepositoryProvider);
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
      final repo = _ref.read(notificationsRepositoryProvider);
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

  Future<void> markAsRead(int id) async {
    try {
      await _ref.read(notificationsRepositoryProvider).markAsRead(id);
      final updated = state.items.map((n) {
        if (n['id'] == id) {
          final copy = Map<String, dynamic>.from(n);
          copy['is_read'] = true;
          return copy;
        }
        return n;
      }).toList();
      state = state.copyWith(items: updated);
    } catch (e) {
      state = state.copyWith(error: e);
    }
  }
}

final notificationsPagingProvider =
    StateNotifierProvider<NotificationsPagingController, NotificationsPagingState>((ref) {
  return NotificationsPagingController(ref);
});
