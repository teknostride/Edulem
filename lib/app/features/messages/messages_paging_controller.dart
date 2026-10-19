import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'messages_providers.dart';

class MessagesPagingState {
  const MessagesPagingState({
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

  MessagesPagingState copyWith({
    List<Map<String, dynamic>>? items,
    int? page,
    int? perPage,
    bool? isLoadingMore,
    bool? hasMore,
    bool? initialLoading,
    Object? error,
  }) {
    return MessagesPagingState(
      items: items ?? this.items,
      page: page ?? this.page,
      perPage: perPage ?? this.perPage,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      initialLoading: initialLoading ?? this.initialLoading,
      error: error,
    );
  }

  static MessagesPagingState initial() {
    return const MessagesPagingState(
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

class MessagesPagingController extends StateNotifier<MessagesPagingState> {
  MessagesPagingController(this._ref, this.conversationId)
      : super(MessagesPagingState.initial()) {
    loadInitial();
  }

  final Ref _ref;
  final int conversationId;

  Future<void> loadInitial() async {
    state = MessagesPagingState.initial();

    try {
      final repo = _ref.read(messagesRepositoryProvider);
      final items = await repo.listMessages(
        conversationId: conversationId,
        page: 1,
        perPage: state.perPage,
      );
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
      final repo = _ref.read(messagesRepositoryProvider);
      final items = await repo.listMessages(
        conversationId: conversationId,
        page: nextPage,
        perPage: state.perPage,
      );

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

  Future<void> send(String content) async {
    try {
      final repo = _ref.read(messagesRepositoryProvider);
      await repo.sendMessage(conversationId: conversationId, content: content);
      await loadInitial(); // refresh
    } catch (e) {
      state = state.copyWith(error: e);
    }
  }
}

final messagesPagingProvider =
    StateNotifierProvider.family<MessagesPagingController, MessagesPagingState, int>((ref, id) {
  return MessagesPagingController(ref, id);
});
