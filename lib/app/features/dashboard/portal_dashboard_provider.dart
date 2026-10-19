import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';

final selectedPortalStudentIdProvider = StateProvider<int?>((ref) => null);

final portalDashboardProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final studentId = ref.watch(selectedPortalStudentIdProvider);

  final queryParams = <String, dynamic>{};
  if (studentId != null) {
    queryParams['student_id'] = studentId;
  }

  final response = await api.getJson('/portal/student/dashboard', queryParameters: queryParams);
  if (response['status'] == true && response['data'] != null) {
    return Map<String, dynamic>.from(response['data'] as Map);
  }
  return Map<String, dynamic>.from(response);
});
