import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'search_repository.dart';

final searchRepositoryProvider = Provider<SearchRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return SearchRepository(api);
});

final globalSearchProvider = FutureProvider.family<Map<String, dynamic>, String>((
  ref,
  query,
) async {
  final repo = ref.read(searchRepositoryProvider);
  return repo.globalSearch(query: query);
});
