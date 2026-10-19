import '../../core/network/api_client.dart';

class CampusesRepository {
  CampusesRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list() async {
    final data = await _api.getJson('/campuses');
    final List<dynamic> items = data['data'] ?? data['campuses'] ?? [];
    return items
        .map((e) => _normalizeCampus(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/campuses/$id');
    return _normalizeCampus(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> create({
    required String name,
    String? address,
    String? phone,
    String? email,
    String? city,
    String? district,
  }) async {
    final data = await _api.postJson(
      '/campuses',
      data: {
        'name': name,
        'address': address,
        'phone': phone,
        'email': email,
        'city': city,
        'district': district,
      },
    );
    return _normalizeCampus(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> update({
    required int id,
    String? name,
    String? address,
    String? phone,
    String? email,
    String? city,
    String? district,
  }) async {
    final data = await _api.putJson(
      '/campuses/$id',
      data: {
        ...?((name != null) ? {'name': name} : null),
        ...?((address != null) ? {'address': address} : null),
        ...?((phone != null) ? {'phone': phone} : null),
        ...?((email != null) ? {'email': email} : null),
        ...?((city != null) ? {'city': city} : null),
        ...?((district != null) ? {'district': district} : null),
      },
    );
    return _normalizeCampus(data['data'] ?? data);
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/campuses/$id');
  }

  Map<String, dynamic> _normalizeCampus(Map<String, dynamic> c) {
    return {
      'id': c['id'],
      'name': c['name'] ?? '',
      'address': c['address'],
      'phone': c['phone'],
      'email': c['email'],
      'city': c['city'],
      'district': c['district'],
      'classrooms_count': c['classrooms_count'] ?? c['classroomsCount'] ?? 0,
    };
  }
}
