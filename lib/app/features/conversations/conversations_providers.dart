import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'conversations_repository.dart';

final conversationsRepositoryProvider = Provider<ConversationsRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return ConversationsRepository(api);
});

final teacherClassroomsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.read(conversationsRepositoryProvider);
  return repo.getClassrooms();
});
