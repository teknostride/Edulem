import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'users_repository.dart';

final usersRepositoryProvider = Provider<UsersRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return UsersRepository(api);
});

final usersListProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final repo = ref.read(usersRepositoryProvider);
  return repo.list();
});

final userDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(usersRepositoryProvider);
  return repo.getById(id);
});
