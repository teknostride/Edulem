class AuthSession {
  const AuthSession({
    required this.token,
    required this.profile,
    required this.role,
    this.isStudent = false,
  });

  final String token;
  final Map<String, dynamic> profile;
  final String role;
  final bool isStudent;
}
