import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'permissions_repository.dart';

final permissionsRepositoryProvider = Provider<PermissionsRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return PermissionsRepository(api);
});

final permissionsListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final repo = ref.read(permissionsRepositoryProvider);
  return repo.list();
});

final permissionDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(permissionsRepositoryProvider);
  return repo.getById(id);
});
