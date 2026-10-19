import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'bulletins_repository.dart';

final bulletinsRepositoryProvider = Provider<BulletinsRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return BulletinsRepository(api);
});

final bulletinsListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  final repo = ref.read(bulletinsRepositoryProvider);
  return repo.list();
});

final bulletinDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(bulletinsRepositoryProvider);
  return repo.getById(id);
});
