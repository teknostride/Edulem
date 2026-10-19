import '../../core/network/api_client.dart';

class UsersRepository {
  UsersRepository(this._api);

  final ApiClient _api;

  Future<Map<String, dynamic>> list({
    String? search,
    String? role,
    int? page,
    int? perPage,
  }) async {
    final queryParams = <String, dynamic>{
      if (search != null && search.isNotEmpty) 'search': search,
      if (role != null && role.isNotEmpty) 'role': role,
      'page': page?.toString(),
      'per_page': perPage?.toString(),
    };

    final data = await _api.getJson('/users', queryParameters: queryParams);
    return data;
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/users/$id');
    if (data['user'] is Map) {
      return Map<String, dynamic>.from(data['user']);
    }
    return data;
  }

  Future<Map<String, dynamic>> create(Map<String, dynamic> payload) async {
    final data = await _api.postJson('/users', data: payload);
    if (data['user'] is Map) {
      return Map<String, dynamic>.from(data['user']);
    }
    return data;
  }

  Future<Map<String, dynamic>> update(
    int id,
    Map<String, dynamic> payload,
  ) async {
    final data = await _api.putJson('/users/$id', data: payload);
    if (data['user'] is Map) {
      return Map<String, dynamic>.from(data['user']);
    }
    return data;
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/users/$id');
  }
}
