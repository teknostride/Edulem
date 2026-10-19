import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'grades_repository.dart';

final gradesRepositoryProvider = Provider<GradesRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return GradesRepository(api);
});
