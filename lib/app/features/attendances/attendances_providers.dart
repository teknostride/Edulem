import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'attendances_repository.dart';

final attendancesRepositoryProvider = Provider<AttendancesRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return AttendancesRepository(api);
});
