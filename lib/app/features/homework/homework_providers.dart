import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'homework_repository.dart';

final homeworkRepositoryProvider = Provider<HomeworkRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return HomeworkRepository(api);
});
