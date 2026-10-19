import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'messages_providers.dart';

final unreadMessagesCountProvider = StreamProvider<int>((ref) async* {
  final repo = ref.read(messagesRepositoryProvider);

  while (true) {
    try {
      final data = await repo.unreadCount();

      final v =
          data['unread_count'] ??
          data['unread'] ??
          data['total_unread'] ??
          data['new_messages'] ??
          (data['data'] is Map
              ? (data['data']['unread_count'] ??
                    data['data']['unread'] ??
                    data['data']['total_unread'] ??
                    data['data']['new_messages'])
              : null) ??
          data['count'] ??
          (data['data'] is Map ? data['data']['count'] : null) ??
          0;

      int count = 0;
      if (v is int) {
        count = v;
      } else {
        count = int.tryParse('$v') ?? 0;
      }
      yield count;
    } catch (_) {
      yield 0;
    }
    // Her 1 dakikada bir güncelle
    await Future.delayed(const Duration(minutes: 1));
  }
});
