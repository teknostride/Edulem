import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'exams_repository.dart';

final examsRepositoryProvider = Provider<ExamsRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return ExamsRepository(api);
});
