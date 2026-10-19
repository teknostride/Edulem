import '../../core/network/api_client.dart';

class ProfileRepository {
  ProfileRepository(this._api);

  final ApiClient _api;

  Future<Map<String, dynamic>> getProfile() async {
    return _api.getJson('/user/profile');
  }

  Future<Map<String, dynamic>> getStudentProfile() async {
    return _api.getJson('/portal/student/profile');
  }

  Future<Map<String, dynamic>> getGuardianProfile() async {
    return _api.getJson('/portal/student/profile');
  }

  Future<Map<String, dynamic>> getLayoutInit() async {
    return _api.getJson('/layout/init');
  }

  Future<Map<String, dynamic>> getGuardianDashboard() async {
    return _api.getJson('/portal/student/dashboard');
  }

  Future<Map<String, dynamic>> updateProfile({
    required String name,
    required String email,
    String? phone,
    String? bio,
  }) async {
    return _api.putJson(
      '/user/profile',
      data: {
        'name': name,
        'email': email,
        if (phone != null) 'phone': phone, // ignore: use_null_aware_elements
        if (bio != null) 'bio': bio, // ignore: use_null_aware_elements
      },
    );
  }

  Future<Map<String, dynamic>> uploadAvatar(String filePath) async {
    return _api.putMultipartJson('/user/profile', files: {'avatar': filePath});
  }
}
