import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'internal_messages_repository.dart';

final internalMessagesRepositoryProvider = Provider<InternalMessagesRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return InternalMessagesRepository(api);
});

final internalMessagesListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final repo = ref.read(internalMessagesRepositoryProvider);
  return repo.list();
});

final internalMessageDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(internalMessagesRepositoryProvider);
  return repo.getById(id);
});
