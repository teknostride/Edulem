import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';

class RolesRepository {
  RolesRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list({
    bool includePermissions = false,
  }) async {
    final data = await _api.getJson(
      '/roles',
      queryParameters: {if (includePermissions) 'include_permissions': 'true'},
    );

    debugPrint('Roles API response: $data');

    final List<dynamic> items = data['data'] ?? data['roles'] ?? [];
    return items
        .map((e) => _normalizeRole(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/roles/$id');
    return _normalizeRole(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> create({
    required String name,
    required String displayName,
    String? description,
    int hierarchyLevel = 1,
    List<String>? permissions,
  }) async {
    final data = await _api.postJson(
      '/roles',
      data: {
        'name': name,
        'display_name': displayName,
        'description': description,
        'hierarchy_level': hierarchyLevel,
        ...?((permissions != null) ? {'permissions': permissions} : null),
      },
    );
    return _normalizeRole(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> update({
    required int id,
    String? name,
    String? displayName,
    String? description,
    int? hierarchyLevel,
    List<String>? permissions,
  }) async {
    final data = await _api.putJson(
      '/roles/$id',
      data: {
        ...?((name != null) ? {'name': name} : null),
        ...?((displayName != null) ? {'display_name': displayName} : null),
        ...?((description != null) ? {'description': description} : null),
        ...?((hierarchyLevel != null)
            ? {'hierarchy_level': hierarchyLevel}
            : null),
        ...?((permissions != null) ? {'permissions': permissions} : null),
      },
    );
    return _normalizeRole(data['data'] ?? data);
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/roles/$id');
  }

  Map<String, dynamic> _normalizeRole(Map<String, dynamic> r) {
    return {
      'id': r['id'],
      'name': r['name'] ?? '',
      'display_name': r['display_name'] ?? r['displayName'] ?? '',
      'description': r['description'],
      'hierarchy_level': r['hierarchy_level'] ?? r['hierarchyLevel'] ?? 1,
      'is_system_role': r['is_system_role'] ?? r['isSystemRole'] ?? false,
      'users_count': r['users_count'] ?? r['usersCount'] ?? 0,
      'permissions': r['permissions'] ?? [],
    };
  }
}
