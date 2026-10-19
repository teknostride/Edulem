import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'roles_repository.dart';

final rolesRepositoryProvider = Provider<RolesRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return RolesRepository(api);
});

final rolesListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final repo = ref.read(rolesRepositoryProvider);
  return repo.list(includePermissions: true);
});

final roleDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(rolesRepositoryProvider);
  return repo.getById(id);
});
