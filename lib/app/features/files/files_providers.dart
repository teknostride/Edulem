import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'files_repository.dart';

final filesRepositoryProvider = Provider<FilesRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return FilesRepository(api);
});
