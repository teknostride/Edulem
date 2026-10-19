import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client_provider.dart';
import 'tenant_repository.dart';

final tenantRepositoryProvider = Provider<TenantRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return TenantRepository(api);
});

final tenantProfileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final repo = ref.read(tenantRepositoryProvider);
  return repo.getTenantProfile();
});

final tenantStatisticsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final repo = ref.read(tenantRepositoryProvider);
  return repo.getTenantStatistics();
});
