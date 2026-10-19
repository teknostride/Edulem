import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'messages_repository.dart';

final messagesRepositoryProvider = Provider<MessagesRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return MessagesRepository(api);
});
