import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client_provider.dart';
import 'messages_repository.dart';

/// Mevcut mailbox (inbox, starred, sent, trash)
final conversationsMailboxProvider = StateProvider<String>((ref) => 'inbox');

/// Arama sorgusu
final conversationsSearchProvider = StateProvider<String>((ref) => '');

/// Mesajlar repository provider
final messagesRepositoryProvider = Provider<MessagesRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return MessagesRepository(api);
});
