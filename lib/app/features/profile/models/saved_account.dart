class SavedAccount {
  const SavedAccount({
    required this.id,
    required this.name,
    required this.role,
    required this.roleKey,
    required this.token,
    required this.tcNo,
    this.avatar,
    this.subtitle,
    required this.userData,
    this.isStudent = false,
    this.studentId,
    this.activeSeasonId,
    required this.lastActiveAt,
  });

  final String id;
  final String name;
  final String role;
  final String roleKey;
  final String token;
  final String tcNo;
  final String? avatar;
  final String? subtitle;
  final Map<String, dynamic> userData;
  final bool isStudent;
  final int? studentId;
  final String? activeSeasonId;
  final DateTime lastActiveAt;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'role': role,
        'roleKey': roleKey,
        'token': token,
        'tcNo': tcNo,
        'avatar': avatar,
        'subtitle': subtitle,
        'userData': userData,
        'isStudent': isStudent,
        'studentId': studentId,
        'activeSeasonId': activeSeasonId,
        'lastActiveAt': lastActiveAt.toIso8601String(),
      };

  factory SavedAccount.fromJson(Map<String, dynamic> json) {
    return SavedAccount(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Kullanıcı',
      role: json['role']?.toString() ?? 'Kullanıcı',
      roleKey: json['roleKey']?.toString() ?? 'default',
      token: json['token']?.toString() ?? '',
      tcNo: json['tcNo']?.toString() ?? '',
      avatar: json['avatar']?.toString(),
      subtitle: json['subtitle']?.toString(),
      userData: json['userData'] is Map
          ? Map<String, dynamic>.from(json['userData'] as Map)
          : <String, dynamic>{},
      isStudent: json['isStudent'] == true,
      studentId: json['studentId'] is int
          ? json['studentId'] as int
          : int.tryParse(json['studentId']?.toString() ?? ''),
      activeSeasonId: json['activeSeasonId']?.toString(),
      lastActiveAt: json['lastActiveAt'] != null
          ? DateTime.tryParse(json['lastActiveAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  SavedAccount copyWith({
    String? id,
    String? name,
    String? role,
    String? roleKey,
    String? token,
    String? tcNo,
    String? avatar,
    String? subtitle,
    Map<String, dynamic>? userData,
    bool? isStudent,
    int? studentId,
    String? activeSeasonId,
    DateTime? lastActiveAt,
  }) {
    return SavedAccount(
      id: id ?? this.id,
      name: name ?? this.name,
      role: role ?? this.role,
      roleKey: roleKey ?? this.roleKey,
      token: token ?? this.token,
      tcNo: tcNo ?? this.tcNo,
      avatar: avatar ?? this.avatar,
      subtitle: subtitle ?? this.subtitle,
      userData: userData ?? this.userData,
      isStudent: isStudent ?? this.isStudent,
      studentId: studentId ?? this.studentId,
      activeSeasonId: activeSeasonId ?? this.activeSeasonId,
      lastActiveAt: lastActiveAt ?? this.lastActiveAt,
    );
  }
}
