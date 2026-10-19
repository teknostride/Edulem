import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'tutoring_repository.dart';

final tutoringRepositoryProvider = Provider<TutoringRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return TutoringRepository(api);
});
