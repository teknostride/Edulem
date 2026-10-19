import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../core/network/api_exception.dart';
import '../../core/storage/secure_storage_provider.dart';
import '../../core/utils/role_utils.dart';
import '../../ui/atoms/app_card.dart';
import '../auth/auth_providers.dart';
import '../auth/auth_session.dart';
import 'account_manager_service.dart';
import 'profile_providers.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  bool _editMode = false;
  bool _saving = false;
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _bioController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _phoneController = TextEditingController();
    _bioController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  String _getRoleDisplayName(String? role, [Map<String, dynamic>? profile, AuthSession? session]) {
    final normalized = (role ?? '').toLowerCase().trim();
    if (session?.isStudent == true ||
        normalized == 'student' ||
        normalized == 'öğrenci' ||
        isStudentRole(normalized) ||
        (profile != null &&
            (profile['student_name'] != null ||
                profile['school_no'] != null ||
                profile['is_student'] == true ||
                isStudentRole(profile['role']?.toString()) ||
                isStudentRole(profile['role_name']?.toString())))) {
      return 'Öğrenci';
    }

    const roleMap = {
      'owner': 'Kurucu',
      'admin': 'Yönetici',
      'superadmin': 'Süper Admin',
      'teacher': 'Öğretmen',
      'student': 'Öğrenci',
      'guardian': 'Veli',
      'staff': 'Personel',
      'kurucu': 'Kurucu',
      'ogretmen': 'Öğretmen',
      'mudur': 'Müdür',
      'mudur_yardimcisi': 'Müdür Yardımcısı',
    };
    if (normalized == 'default') {
      return 'Kullanıcı';
    }
    return roleMap[normalized] ?? (role?.isNotEmpty == true && role != 'default' ? role! : 'Üye');
  }

  void _initControllers(Map<String, dynamic>? profile) {
    _nameController.text = profile?['name']?.toString() ?? '';
    // Normalize empty/null strings so the text field is blank, not showing 'null'
    final rawEmail = profile?['email']?.toString() ?? '';
    _emailController.text = rawEmail == 'null' ? '' : rawEmail;
    final rawPhone = profile?['phone']?.toString() ?? '';
    _phoneController.text = rawPhone == 'null' ? '' : rawPhone;
    _bioController.text = profile?['bio']?.toString() ?? '';
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);

    try {
      final repo = ref.read(profileRepositoryProvider);
      await repo.updateProfile(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        phone: _phoneController.text.trim(),
        bio: _bioController.text.trim(),
      );

      ref.invalidate(profileProvider);

      if (mounted) {
        setState(() => _editMode = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Profil güncellendi')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hata: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickAndUploadAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 80,
    );
    if (picked == null) return;

    try {
      final repo = ref.read(profileRepositoryProvider);
      await repo.uploadAvatar(picked.path);
      ref.invalidate(profileProvider);

      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Avatar güncellendi')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Avatar yüklenemedi: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showChangePasswordDialog() {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Şifre Değiştir'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: currentPasswordController,
                decoration: const InputDecoration(
                  labelText: 'Mevcut Şifre',
                  prefixIcon: Icon(Icons.lock_outline),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: newPasswordController,
                decoration: const InputDecoration(
                  labelText: 'Yeni Şifre',
                  prefixIcon: Icon(Icons.lock),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirmPasswordController,
                decoration: const InputDecoration(
                  labelText: 'Yeni Şifre (Tekrar)',
                  prefixIcon: Icon(Icons.lock),
                ),
                obscureText: true,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          FilledButton(
            onPressed: () async {
              if (newPasswordController.text !=
                  confirmPasswordController.text) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Yeni şifreler eşleşmiyor'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }
              if (newPasswordController.text.length < 6) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Şifre en az 6 karakter olmalıdır'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }

              try {
                final repo = ref.read(authRepositoryProvider);
                await repo.changePassword(
                  currentPassword: currentPasswordController.text,
                  newPassword: newPasswordController.text,
                  confirmPassword: confirmPasswordController.text,
                );

                // Oturum tazeleme kasasındaki şifreyi de güncelle
                try {
                  final storage = ref.read(secureStorageProvider);
                  await storage.write(
                    key: 'SESSION_PASSWORD',
                    value: newPasswordController.text,
                  );
                } catch (_) {}

                if (context.mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Şifre değiştirildi')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  final msg = e is ApiException
                      ? e.userFriendlyMessage
                      : e.toString().replaceFirst('Exception: ', '');
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(msg),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Kaydet'),
          ),
        ],
      ),
    );
  }

  Future<void> _logout() async {
    final notifier = ref.read(savedAccountsProvider.notifier);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Çıkış Yap'),
        content: const Text(
          'Uygulamadan çıkış yapmak istediğinize emin misiniz?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: const Text('İptal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Çıkış Yap'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await notifier.logoutActiveAccount();
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final authSession = ref.watch(authSessionProvider);
    final userRoleRaw = (authSession.valueOrNull?.role ??
            profile.valueOrNull?['role'] ??
            profile.valueOrNull?['role_name'] ??
            '')
        .toString();
    final isStudent = isStudentRole(userRoleRaw);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil'),
        actions: [
          if (!isStudent)
            IconButton(
              onPressed: () {
                if (_editMode) {
                  setState(() => _editMode = false);
                } else {
                  _initControllers(profile.valueOrNull);
                  setState(() => _editMode = true);
                }
              },
              icon: Icon(_editMode ? Icons.close : Icons.edit),
              tooltip: _editMode ? 'İptal' : 'Düzenle',
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(profileProvider),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: profile.when(
            data: (data) {
              // Always re-init when not editing so fresh network data (e.g. email) is shown
              if (!_editMode) {
                _initControllers(data);
              } else if (_nameController.text.isEmpty) {
                _initControllers(data);
              }
              return _buildContent(context, data, authSession.valueOrNull);
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error, color: Colors.red.shade400, size: 48),
                  const SizedBox(height: 16),
                  Text('Profil yüklenemedi: $e'),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    Map<String, dynamic>? profile,
    AuthSession? session,
  ) {
    final name = profile?['name']?.toString() ?? 'Kullanıcı';
    final rawEmail = profile?['email']?.toString() ?? '';
    final email = (rawEmail.isEmpty || rawEmail == 'null') ? '-' : rawEmail;
    final rawRole = session?.role ?? profile?['role'] ?? profile?['role_name'] ?? 'Üye';
    final role = _getRoleDisplayName(rawRole, profile, session);
    final isStudent = session?.isStudent == true ||
        isStudentRole(rawRole.toString()) ||
        role == 'Öğrenci';
    final avatar = profile?['avatar']?.toString();
    final rawPhone = (profile?['phone'] ?? profile?['emergency_contact_info']?['phone'] ?? '').toString();
    final phone = (rawPhone.isEmpty || rawPhone == 'null') ? '-' : rawPhone;
    final bio = profile?['bio']?.toString();
    final rawCampus = (profile?['campus_name'] ??
            profile?['campus']?['name'] ??
            profile?['classroom']?['campus']?['name'] ??
            profile?['classroom']?['branch']?['name'] ??
            profile?['tenant']?['name'] ??
            '')
        .toString();
    final campusName = (rawCampus.isEmpty || rawCampus == 'null') ? '-' : rawCampus;
    final rawClassroom = (profile?['classroom_name'] ??
            profile?['class_name'] ??
            profile?['classroom']?['name'] ??
            '')
        .toString();
    final classroomName = (rawClassroom.isEmpty || rawClassroom == 'null') ? '' : rawClassroom;
    final students = (profile?['students'] is List) ? (profile?['students'] as List) : const [];
    final createdAt = profile?['created_at']?.toString();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Profil Kartı
        AppCard(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 60,
                      backgroundColor: Theme.of(context).primaryColor,
                      backgroundImage: avatar != null && avatar.isNotEmpty
                          ? NetworkImage(avatar)
                          : null,
                      child: avatar == null || avatar.isEmpty
                          ? Text(
                              name.isNotEmpty ? name[0].toUpperCase() : '?',
                              style: const TextStyle(
                                fontSize: 48,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            )
                          : null,
                    ),
                    if (_editMode && !isStudent)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: CircleAvatar(
                          radius: 20,
                          backgroundColor: Theme.of(context).primaryColor,
                          child: IconButton(
                            icon: const Icon(Icons.camera_alt, size: 18),
                            color: Colors.white,
                            onPressed: () => _pickAndUploadAvatar(),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  role,
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                ),
                if (campusName != '-') ...[
                  const SizedBox(height: 4),
                  Text(
                    campusName,
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                  ),
                ],
                if (classroomName.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    classroomName,
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                  ),
                ],
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  children: [
                    Chip(
                      label: Text(role),
                      backgroundColor: Theme.of(
                        context,
                      ).primaryColor.withValues(alpha: 0.1),
                      side: BorderSide.none,
                      labelStyle: TextStyle(
                        color: Theme.of(context).primaryColor,
                        fontSize: 12,
                      ),
                    ),
                    const Chip(
                      label: Text('Aktif'),
                      backgroundColor: Colors.green,
                      side: BorderSide.none,
                      labelStyle: TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Tarih bilgileri
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.calendar_today,
                      size: 14,
                      color: Colors.grey.shade500,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Katılım: ${createdAt != null ? DateFormat('dd.MM.yyyy').format(DateTime.parse(createdAt)) : '-'}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Hızlı İşlemler
        AppCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Hızlı İşlemler',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildActionChip(
                      icon: Icons.key,
                      label: 'Şifre Değiştir',
                      color: Colors.orange,
                      onTap: _showChangePasswordDialog,
                    ),
                    if (!isStudent) ...[
                      _buildActionChip(
                        icon: Icons.security,
                        label: 'Güvenlik',
                        color: Colors.blue,
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Güvenlik ayarları yakında geliyor'),
                            ),
                          );
                        },
                      ),
                      _buildActionChip(
                        icon: Icons.notifications,
                        label: 'Bildirimler',
                        color: Colors.purple,
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Bildirim ayarları yakında geliyor'),
                            ),
                          );
                        },
                      ),
                    ],
                    _buildActionChip(
                      icon: Icons.logout,
                      label: 'Çıkış',
                      color: Colors.red,
                      onTap: _logout,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Profil Bilgileri
        AppCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: (_editMode && !isStudent)
                ? _buildEditForm(context)
                : _buildProfileInfo(
                    context,
                    name,
                    email,
                    phone,
                    bio,
                    campusName,
                    classroomName: classroomName,
                    students: students,
                  ),
          ),
        ),
        const SizedBox(height: 16),

        // Aktivite Geçmişi
        AppCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Aktivite Geçmişi',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                _buildActivityItem(
                  icon: Icons.update,
                  color: Colors.blue,
                  title: 'Profil güncellendi',
                  subtitle: 'Profil bilgileri başarıyla güncellendi.',
                  date: DateTime.now(),
                ),
                const Divider(),
                _buildActivityItem(
                  icon: Icons.login,
                  color: Colors.green,
                  title: 'Sisteme giriş yapıldı',
                  subtitle: 'Hoş geldiniz! Sisteme başarıyla giriş yaptınız.',
                  date: createdAt != null
                      ? DateTime.parse(createdAt)
                      : DateTime.now(),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionChip({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return ActionChip(
      avatar: Icon(icon, color: color, size: 18),
      label: Text(label),
      backgroundColor: color.withValues(alpha: 0.1),
      side: BorderSide.none,
      labelStyle: TextStyle(color: color, fontSize: 12),
      onPressed: onTap,
    );
  }

  Widget _buildProfileInfo(
    BuildContext context,
    String name,
    String email,
    String phone,
    String? bio,
    String campusName, {
    String classroomName = '',
    List<dynamic> students = const [],
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Profil Bilgileri',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        _buildInfoRow('Ad Soyad', name),
        _buildInfoRow('E-posta', email),
        _buildInfoRow('Telefon', phone),
        _buildInfoRow('Kampüs', campusName),
        if (classroomName.isNotEmpty)
          _buildInfoRow('Sınıf', classroomName),
        if (students.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            'Öğrenciler',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 6),
          for (final s in students)
            if (s is Map)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.school, size: 22, color: Colors.blue),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              s['name']?.toString() ?? 'Öğrenci',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            if ((s['classroom_name'] ?? s['classroom']?['name']) != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                  'Sınıf: ${s['classroom_name'] ?? s['classroom']?['name']}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
        ],
        if (bio != null && bio.isNotEmpty && bio != '-') ...[
          const SizedBox(height: 8),
          _buildInfoRow('Hakkımda', bio),
        ],
      ],
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildEditForm(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Profil Bilgileri',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          // Ad Soyad - Tam genişlik
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Ad Soyad',
              prefixIcon: Icon(Icons.person),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Ad Soyad zorunludur';
              }
              return null;
            },
          ),
          const SizedBox(height: 8),
          // E-posta ve Telefon - Yan yana
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'E-posta',
                    prefixIcon: Icon(Icons.email, size: 20),
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 12,
                    ),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'E-posta zorunludur';
                    }
                    if (!value.contains('@')) {
                      return 'Geçerli e-posta';
                    }
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Telefon',
                    prefixIcon: Icon(Icons.phone, size: 20),
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 12,
                    ),
                  ),
                  keyboardType: TextInputType.phone,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _bioController,
            decoration: const InputDecoration(
              labelText: 'Hakkımda',
              prefixIcon: Icon(Icons.info, size: 20),
              border: OutlineInputBorder(),
              alignLabelWithHint: true,
              contentPadding: EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton(
                onPressed: () => setState(() => _editMode = false),
                child: const Text('İptal'),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: _saving ? null : _saveProfile,
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Kaydet'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActivityItem({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required DateTime date,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 4),
              Text(
                DateFormat('dd.MM.yyyy HH:mm').format(date),
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
