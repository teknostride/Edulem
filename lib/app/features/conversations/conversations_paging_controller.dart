import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../profile/profile_providers.dart';
import 'conversations_providers.dart';

// Filtre provider'ları
final conversationStatusFilterProvider = StateProvider<String>((ref) => 'all');
final conversationSearchFilterProvider = StateProvider<String>((ref) => '');

class ConversationPagingState {
  const ConversationPagingState({
    required this.items,
    required this.page,
    required this.perPage,
    required this.isLoadingMore,
    required this.hasMore,
    required this.initialLoading,
    this.error,
    this.pagination,
  });

  final List<Map<String, dynamic>> items;
  final int page;
  final int perPage;
  final bool isLoadingMore;
  final bool hasMore;
  final bool initialLoading;
  final Object? error;
  final Map<String, dynamic>? pagination;

  ConversationPagingState copyWith({
    List<Map<String, dynamic>>? items,
    int? page,
    int? perPage,
    bool? isLoadingMore,
    bool? hasMore,
    bool? initialLoading,
    Object? error,
    Map<String, dynamic>? pagination,
  }) {
    return ConversationPagingState(
      items: items ?? this.items,
      page: page ?? this.page,
      perPage: perPage ?? this.perPage,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      initialLoading: initialLoading ?? this.initialLoading,
      error: error,
      pagination: pagination ?? this.pagination,
    );
  }

  static ConversationPagingState initial() {
    return const ConversationPagingState(
      items: [],
      page: 1,
      perPage: 50,
      isLoadingMore: false,
      hasMore: true,
      initialLoading: true,
      error: null,
      pagination: null,
    );
  }
}

class ConversationPagingController
    extends StateNotifier<ConversationPagingState> {
  ConversationPagingController(this._ref)
    : super(ConversationPagingState.initial()) {
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
    state = ConversationPagingState.initial();

    try {
      final repo = _ref.read(conversationsRepositoryProvider);
      final status = _ref.read(conversationStatusFilterProvider);
      final search = _ref.read(conversationSearchFilterProvider);

      // Mevcut kullanıcının ID'sini al
      final profile = _ref.read(profileProvider);
      final counselorId = int.tryParse(
        profile.valueOrNull?['id']?.toString() ?? '',
      );
      debugPrint(
        'DEBUG: Loading sessions with counselorId=$counselorId, status=$status',
      );

      final result = await repo.listSessions(
        page: 1,
        perPage: state.perPage,
        status: status,
        search: search,
        counselorId: counselorId,
      );

      debugPrint(
        'DEBUG: Sessions result: ${result['sessions']?.length ?? 0} items',
      );
      final items = result['sessions'] as List<Map<String, dynamic>>;
      final pagination = result['pagination'] as Map<String, dynamic>?;

      if (_mounted) {
        state = state.copyWith(
          items: items,
          page: 1,
          initialLoading: false,
          hasMore: items.length >= state.perPage,
          error: null,
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
      final repo = _ref.read(conversationsRepositoryProvider);
      final status = _ref.read(conversationStatusFilterProvider);
      final search = _ref.read(conversationSearchFilterProvider);

      // Mevcut kullanıcının ID'sini al
      final profile = _ref.read(profileProvider);
      final counselorId = int.tryParse(
        profile.valueOrNull?['id']?.toString() ?? '',
      );

      final result = await repo.listSessions(
        page: nextPage,
        perPage: state.perPage,
        status: status,
        search: search,
        counselorId: counselorId,
      );

      final items = result['sessions'] as List<Map<String, dynamic>>;

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
}

final conversationPagingProvider =
    StateNotifierProvider<
      ConversationPagingController,
      ConversationPagingState
    >((ref) {
      return ConversationPagingController(ref);
    });
