import '../../core/network/api_client.dart';

class PermissionsRepository {
  PermissionsRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list() async {
    final data = await _api.getJson('/permissions');

    final List<dynamic> items = data['data'] ?? data['permissions'] ?? [];
    return items
        .map((e) => _normalizePermission(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/permissions/$id');
    return _normalizePermission(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> create({
    required String name,
    required String displayName,
    required String category,
    String? description,
    bool isSystemPermission = false,
  }) async {
    final data = await _api.postJson(
      '/permissions',
      data: {
        'name': name,
        'display_name': displayName,
        'category': category,
        'description': description,
        'is_system_permission': isSystemPermission,
      },
    );
    return _normalizePermission(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> update({
    required int id,
    String? name,
    String? displayName,
    String? category,
    String? description,
    bool? isSystemPermission,
  }) async {
    final data = await _api.putJson(
      '/permissions/$id',
      data: {
        ...?((name != null) ? {'name': name} : null),
        ...?((displayName != null) ? {'display_name': displayName} : null),
        ...?((category != null) ? {'category': category} : null),
        ...?((description != null) ? {'description': description} : null),
        ...?((isSystemPermission != null)
            ? {'is_system_permission': isSystemPermission}
            : null),
      },
    );
    return _normalizePermission(data['data'] ?? data);
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/permissions/$id');
  }

  Map<String, dynamic> _normalizePermission(Map<String, dynamic> p) {
    return {
      'id': p['id'],
      'name': p['name'] ?? '',
      'display_name': p['display_name'] ?? p['displayName'] ?? '',
      'category': p['category'] ?? '',
      'description': p['description'],
      'is_system_permission':
          p['is_system_permission'] ?? p['isSystemPermission'] ?? false,
      'roles_count': p['roles_count'] ?? p['rolesCount'] ?? 0,
    };
  }
}
