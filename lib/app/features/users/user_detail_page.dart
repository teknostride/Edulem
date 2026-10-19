import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import 'users_providers.dart';

class UserDetailPage extends ConsumerWidget {
  const UserDetailPage({super.key, required this.id});

  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(userDetailProvider(id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kullanıcı Detayı'),
        actions: [
          IconButton(
            onPressed: () async {
              await context.push('/users/$id/edit');
              ref.invalidate(userDetailProvider(id));
              ref.invalidate(usersListProvider);
            },
            icon: const Icon(Icons.edit_outlined),
          ),
          IconButton(
            onPressed: () async {
              final ok = await showDialog<bool>(
                context: context,
                builder: (context) {
                  return AlertDialog(
                    title: const Text('Silinsin mi?'),
                    content: const Text('Bu kullanıcı silinecek.'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        child: const Text('Vazgeç'),
                      ),
                      ElevatedButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        child: const Text('Sil'),
                      ),
                    ],
                  );
                },
              );

              if (ok != true) return;

              await ref.read(usersRepositoryProvider).deleteById(id);
              ref.invalidate(usersListProvider);

              if (context.mounted) {
                context.go('/users');
              }
            },
            icon: const Icon(Icons.delete_outline),
          ),
        ],
      ),
      body: detail.when(
        data: (m) {
          final name = (m['name'] ?? '${m['first_name'] ?? ''} ${m['last_name'] ?? ''}').toString().trim();
          final email = (m['email'] ?? '').toString();
          final phone = (m['phone'] ?? '').toString();
          final tcNo = (m['tc_no'] ?? '').toString();
          final isActive = m['is_active'] == true || m['is_active'] == 1 || m['is_active'] == '1';

          // Role
          String roleName = 'Kullanıcı';
          if (m['role'] is Map) {
            roleName = (m['role']['display_name'] ?? m['role']['name'] ?? 'Kullanıcı').toString();
          } else if (m['role_name'] != null) {
            roleName = m['role_name'].toString();
          }

          final teacherType = (m['teacher_type'] ?? '').toString();
          final department = (m['department'] ?? '').toString();
          final campusName = (m['campus_name'] ?? '').toString();
          final educationLevelName = (m['education_level_name'] ?? '').toString();

          // Statistics
          final stats = m['statistics'] is Map ? Map<String, dynamic>.from(m['statistics']) : null;
          final hwCount = stats?['homework_count']?.toString() ?? '0';
          final attCount = stats?['attendance_count']?.toString() ?? '0';
          final meetCount = stats?['meeting_count']?.toString() ?? '0';
          final annCount = stats?['announcement_count']?.toString() ?? '0';

          // Managed classrooms
          final managedClassrooms = m['managed_classrooms'] is List ? (m['managed_classrooms'] as List) : null;
          final teachingAssignments = m['teaching_assignments'] is List ? (m['teaching_assignments'] as List) : null;

          // Session info
          final sessionInfo = m['session_info'] is Map ? Map<String, dynamic>.from(m['session_info']) : null;
          final lastActive = sessionInfo?['last_active_at'] ?? m['last_login_at'];

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Profil Özeti Kartı
              AppCard(
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 36,
                      backgroundColor: Theme.of(context).primaryColor,
                      child: Text(
                        name.isNotEmpty ? name.substring(0, 1).toUpperCase() : 'U',
                        style: const TextStyle(fontSize: 28, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      name.isEmpty ? 'Kullanıcı' : name,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      alignment: WrapAlignment.center,
                      children: [
                        Chip(
                          avatar: const Icon(Icons.shield_outlined, size: 16),
                          label: Text(roleName),
                          backgroundColor: Colors.blue.withValues(alpha: 0.1),
                          labelStyle: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 12),
                          padding: EdgeInsets.zero,
                        ),
                        Chip(
                          avatar: Icon(isActive ? Icons.check_circle : Icons.cancel, size: 16, color: isActive ? Colors.green : Colors.red),
                          label: Text(isActive ? 'Aktif' : 'Pasif'),
                          backgroundColor: (isActive ? Colors.green : Colors.red).withValues(alpha: 0.1),
                          labelStyle: TextStyle(color: isActive ? Colors.green : Colors.red, fontWeight: FontWeight.bold, fontSize: 12),
                          padding: EdgeInsets.zero,
                        ),
                        if (teacherType.isNotEmpty)
                          Chip(
                            label: Text(teacherType),
                            backgroundColor: Colors.purple.withValues(alpha: 0.1),
                            labelStyle: const TextStyle(color: Colors.purple, fontSize: 12),
                            padding: EdgeInsets.zero,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Kimlik & İletişim Bilgileri
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.badge_outlined, color: Colors.blue, size: 20),
                        SizedBox(width: 8),
                        Text('Kimlik & İletişim', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Divider(height: 20),
                    if (tcNo.isNotEmpty) ...[
                      _buildInfoRow('TC Kimlik No', tcNo),
                      const SizedBox(height: 8),
                    ],
                    if (email.isNotEmpty) ...[
                      _buildInfoRow('E-posta', email),
                      const SizedBox(height: 8),
                    ],
                    if (phone.isNotEmpty) ...[
                      _buildInfoRow('Telefon', phone),
                      const SizedBox(height: 8),
                    ],
                    _buildInfoRow('Kullanıcı ID', '#$id'),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Kurumsal & Akademik Kapsam
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.school_outlined, color: Colors.indigo, size: 20),
                        SizedBox(width: 8),
                        Text('Kurumsal & Görev Kapsamı', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Divider(height: 20),
                    _buildInfoRow('Kampüs', campusName.isNotEmpty ? campusName : 'Tüm Kampüsler'),
                    const SizedBox(height: 8),
                    _buildInfoRow('Kademe', educationLevelName.isNotEmpty ? educationLevelName : 'Tüm Kademeler'),
                    if (department.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _buildInfoRow('Bölüm / Departman', department),
                    ],
                    if (managedClassrooms != null && managedClassrooms.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      const Text('Sorumlu Olduğu Sınıflar (Sınıf Rehberliği):', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87)),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: managedClassrooms.map((c) {
                          final cName = (c is Map ? (c['name'] ?? 'Sınıf') : 'Sınıf').toString();
                          return Chip(
                            avatar: const Icon(Icons.people_outline, size: 14),
                            label: Text(cName),
                            backgroundColor: Colors.teal.withValues(alpha: 0.1),
                            labelStyle: const TextStyle(color: Colors.teal, fontSize: 12),
                          );
                        }).toList(),
                      ),
                    ],
                    if (teachingAssignments != null && teachingAssignments.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      const Text('Ders Verdiği Sınıflar:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87)),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: teachingAssignments.map((t) {
                          final cls = (t is Map ? (t['classroom_name'] ?? '') : '').toString();
                          final lsn = (t is Map ? (t['lesson_name'] ?? '') : '').toString();
                          return Chip(
                            label: Text('$cls • $lsn'),
                            backgroundColor: Colors.blueGrey.withValues(alpha: 0.1),
                            labelStyle: const TextStyle(color: Colors.blueGrey, fontSize: 11),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // İstatistik Kartı
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.bar_chart_outlined, color: Colors.teal, size: 20),
                        SizedBox(width: 8),
                        Text('Sistem Aktivite Özeti', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Divider(height: 20),
                    Row(
                      children: [
                        Expanded(child: _buildMetricTile('Ödevler', hwCount, Icons.book_outlined, Colors.blue)),
                        const SizedBox(width: 8),
                        Expanded(child: _buildMetricTile('Yoklamalar', attCount, Icons.check_box_outlined, Colors.green)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(child: _buildMetricTile('Görüşmeler', meetCount, Icons.chat_bubble_outline, Colors.orange)),
                        const SizedBox(width: 8),
                        Expanded(child: _buildMetricTile('Duyurular', annCount, Icons.campaign_outlined, Colors.purple)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Güvenlik & Oturum
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.lock_clock_outlined, color: Colors.deepOrange, size: 20),
                        SizedBox(width: 8),
                        Text('Güvenlik & Giriş Geçmişi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Divider(height: 20),
                    _buildInfoRow('Son Giriş/Aktivite', lastActive != null ? lastActive.toString() : 'Kayıt yok'),
                    if (sessionInfo?['token_device'] != null) ...[
                      const SizedBox(height: 8),
                      _buildInfoRow('Oturum Cihazı', sessionInfo!['token_device'].toString()),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Hata: $e')),
      ),
    );
  }

  Widget _buildInfoRow(String title, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 130,
          child: Text(title, style: const TextStyle(color: Colors.grey, fontSize: 13)),
        ),
        Expanded(
          child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ),
      ],
    );
  }

  Widget _buildMetricTile(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.black54)),
        ],
      ),
    );
  }
}
