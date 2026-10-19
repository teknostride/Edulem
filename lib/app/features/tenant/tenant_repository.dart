import '../../core/network/api_client.dart';

class TenantRepository {
  TenantRepository(this._api);

  final ApiClient _api;

  Future<Map<String, dynamic>> getTenantProfile() async {
    return _api.getJson('/tenant/profile');
  }

  Future<Map<String, dynamic>> getTenantStatistics() async {
    return _api.getJson('/tenant/statistics');
  }

  Future<Map<String, dynamic>> updateTenantProfile({
    required String name,
    required String domain,
  }) async {
    return _api.putJson(
      '/tenant/profile',
      data: {
        'name': name,
        'domain': domain,
      },
    );
  }

  Future<Map<String, dynamic>> updateTenantProfileWithLogo({
    required String name,
    required String domain,
    required List<int> logoBytes,
    required String fileName,
  }) async {
    // Multipart form data for logo upload
    return _api.postJson(
      '/tenant/profile',
      data: {
        'name': name,
        'domain': domain,
        'logo': logoBytes,
      },
    );
  }
}
