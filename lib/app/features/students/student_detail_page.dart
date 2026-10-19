import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/network/api_exception.dart';
import '../../core/utils/role_utils.dart';

import '../../ui/atoms/app_card.dart';
import '../auth/auth_providers.dart';
import 'students_providers.dart';
import 'students_paging_controller.dart';

// ─── Telefon numarasını normalize et ──────────────────────────────────────────
String _normalizePhone(String raw) {
  String digits = raw.replaceAll(RegExp(r'[^\d]'), '');
  if (digits.startsWith('0') && digits.length >= 10) {
    digits = '+90${digits.substring(1)}';
  } else if (!digits.startsWith('9') && digits.length == 10) {
    digits = '+90$digits';
  } else if (digits.startsWith('90') && digits.length == 12) {
    digits = '+$digits';
  } else if (digits.length == 11 && digits.startsWith('0')) {
    digits = '+9$digits';
  } else {
    digits = '+$digits';
  }
  return digits;
}

// ─── Telefon aksiyon bottom sheet ─────────────────────────────────────────────
Future<void> _showPhoneActions(BuildContext context, String rawPhone) async {
  if (rawPhone.isEmpty) return;
  final normalized = _normalizePhone(rawPhone);

  await showModalBottomSheet<void>(
    context: context,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                child: Row(
                  children: [
                    const Icon(Icons.phone_outlined, size: 18, color: Colors.grey),
                    const SizedBox(width: 8),
                    Text(rawPhone, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
              const Divider(),
              ListTile(
                leading: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.call, color: Colors.green),
                ),
                title: const Text('Ara', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(normalized, style: const TextStyle(fontSize: 12)),
                onTap: () async {
                  Navigator.pop(ctx);
                  final uri = Uri(scheme: 'tel', path: normalized);
                  if (await canLaunchUrl(uri)) await launchUrl(uri);
                },
              ),
              ListTile(
                leading: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.chat, color: Color(0xFF25D366)),
                ),
                title: const Text("WhatsApp'tan Mesaj Gönder", style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(normalized, style: const TextStyle(fontSize: 12)),
                onTap: () async {
                  Navigator.pop(ctx);
                  final digitsOnly = normalized.replaceAll(RegExp(r'[^\d]'), '');
                  final uri = Uri.parse('https://wa.me/$digitsOnly');
                  if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
                },
              ),
              ListTile(
                leading: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.copy, color: Colors.blue),
                ),
                title: const Text('Kopyala', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(rawPhone, style: const TextStyle(fontSize: 12)),
                onTap: () {
                  Clipboard.setData(ClipboardData(text: rawPhone));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('$rawPhone kopyalandı'),
                      behavior: SnackBarBehavior.floating,
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      );
    },
  );
}

// ─── Tıklanabilir telefon satırı ──────────────────────────────────────────────
Widget _phoneTile(BuildContext context, String label, String phone) {
  if (phone.isEmpty) return const SizedBox.shrink();
  return InkWell(
    borderRadius: BorderRadius.circular(8),
    onTap: () => _showPhoneActions(context, phone),
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 14, color: Colors.black87),
                children: [
                  TextSpan(text: '$label ', style: const TextStyle(color: Colors.black54)),
                  TextSpan(
                    text: phone,
                    style: const TextStyle(
                      color: Colors.blue,
                      fontWeight: FontWeight.w600,
                      decoration: TextDecoration.underline,
                      decorationColor: Colors.blue,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Icon(Icons.chevron_right, size: 18, color: Colors.blue),
        ],
      ),
    ),
  );
}

final studentDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(studentsRepositoryProvider);
  return repo.getById(id);
});

class StudentDetailPage extends ConsumerWidget {
  const StudentDetailPage({super.key, required this.id});

  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(studentDetailProvider(id));
    final authSession = ref.watch(authSessionProvider);
    final role = authSession.valueOrNull?.role.toLowerCase() ?? '';
    final isTeacher =
        role.contains('teacher') ||
        role.contains('ogretmen') ||
        role.contains('öğretmen') ||
        role.contains('rehberlik') ||
        role.contains('guidance') ||
        role.contains('rehber');
    final isStudent = isStudentRole(role);
    final isFounder = role.contains('owner') ||
        role.contains('kurucu') ||
        role.contains('founder');
    final canManageStudent = !isTeacher && !isStudent;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Öğrenci Detayı'),
        actions: [
          if (canManageStudent) ...[
            IconButton(
              onPressed: () async {
                await context.push('/students/$id/edit');
                ref.invalidate(studentDetailProvider(id));
                ref.invalidate(studentsPagingProvider);
              },
              icon: const Icon(Icons.edit_outlined),
            ),
            IconButton(
              onPressed: () async {
                await ref.read(studentsRepositoryProvider).deleteById(id);
                ref.invalidate(studentsPagingProvider);
                if (context.mounted) {
                  Navigator.of(context).pop();
                }
              },
              icon: const Icon(Icons.delete_outline),
            ),
          ],
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: detail.when(
          data: (s) {
            final name = (s['name'] ?? '').toString();
            final number = (s['student_number'] ?? '').toString();
            final className = (s['class_name'] ?? '').toString();
            final email = (s['email'] ?? '').toString();
            final phone = (s['phone'] ?? '').toString();
            final tcNo = (s['tc_no'] ?? '').toString();
            final schoolNo = (s['school_no'] ?? '').toString();
            final birthDate = (s['birth_date'] ?? '').toString();
            final gender = (s['gender'] ?? '').toString();
            final isActive = s['is_active'] ?? s['active'];

            final campusName =
                (s['campus_name'] ??
                        s['classroom']?['branch']?['campus']?['name'] ??
                        '')
                    .toString();
            final educationLevelName =
                (s['education_level_name'] ??
                        s['classroom']?['education_level']?['name'] ??
                        '')
                    .toString();
            final address = (s['address'] ?? '').toString();

            final emergency = (s['emergency_contact_info'] is Map)
                ? Map<String, dynamic>.from(s['emergency_contact_info'] as Map)
                : const <String, dynamic>{};
            final emergencyName = (emergency['name'] ?? '').toString();
            final emergencyPhone = (emergency['phone'] ?? '').toString();
            final emergencyRelation = (emergency['relation'] ?? '').toString();

            final guardians = (s['guardians'] is List)
                ? (s['guardians'] as List)
                      .whereType<Map>()
                      .map((e) => Map<String, dynamic>.from(e))
                      .toList()
                : const <Map<String, dynamic>>[];

            return ListView(
              children: [
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name.isEmpty ? 'Öğrenci' : name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        (isActive == null)
                            ? 'Durum: -'
                            : 'Durum: ${isActive == true || isActive == 1 ? 'Aktif' : 'Pasif'}',
                      ),
                      if (number.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text('No: $number'),
                      ],
                      if (schoolNo.isNotEmpty && schoolNo != number) ...[
                        const SizedBox(height: 8),
                        Text('Okul No: $schoolNo'),
                      ],
                      if (tcNo.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text('TCKN: $tcNo'),
                      ],
                      if (birthDate.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text('Doğum: $birthDate'),
                      ],
                      if (gender.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text('Cinsiyet: ${_translateGender(gender)}'),
                      ],
                      if (className.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text('Sınıf: $className'),
                      ],
                      if (campusName.isNotEmpty ||
                          educationLevelName.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Kampüs/Kademe: ${campusName.isEmpty ? '-' : campusName} / ${educationLevelName.isEmpty ? '-' : educationLevelName}',
                        ),
                      ],
                      if (email.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text('Email: $email'),
                      ],
                      if (phone.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        _phoneTile(context, 'Telefon:', phone),
                      ],
                      if (address.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text('Adres: $address'),
                      ],
                    ],
                  ),
                ),

                if (guardians.isNotEmpty)
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Veliler',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 12),
                        ...guardians.map((g) {
                          final isLegal = g['is_legal_guardian'] == true ||
                              g['is_legal_guardian'] == 1 ||
                              g['is_legal_guardian'] == '1';
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      (g['name'] ?? '').toString().isEmpty
                                          ? 'Veli'
                                          : (g['name'] ?? '').toString(),
                                      style: const TextStyle(fontWeight: FontWeight.w700),
                                    ),
                                    if (isLegal) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Theme.of(context).primaryColor.withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(
                                            color: Theme.of(context).primaryColor,
                                            width: 0.8,
                                          ),
                                        ),
                                        child: Text(
                                          'Yasal Vasi',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: Theme.of(context).primaryColor,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                if ((g['relation_type'] ?? '').toString().isNotEmpty)
                                  Text(
                                    'Yakınlık: ${_translateRelation(g['relation_type'])}',
                                  ),
                                if ((g['phone'] ?? '').toString().isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  _phoneTile(
                                    context,
                                    isLegal ? 'Tel (Yasal Vasi):' : 'Tel:',
                                    (g['phone'] ?? '').toString(),
                                  ),
                                ],
                                if ((g['email'] ?? '').toString().isNotEmpty)
                                  Text('Email: ${g['email']}'),
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
                  ),

                if (emergencyName.isNotEmpty ||
                    emergencyPhone.isNotEmpty ||
                    emergencyRelation.isNotEmpty)
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Acil İletişim',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (emergencyName.isNotEmpty)
                          Text('Ad: $emergencyName'),
                        if (emergencyRelation.isNotEmpty)
                          Text(
                            'Yakınlık: ${_translateRelation(emergencyRelation)}',
                          ),
                        if (emergencyPhone.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          _phoneTile(context, 'Tel:', emergencyPhone),
                        ],
                      ],
                    ),
                  ),

                if (!isStudent && !isFounder) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        final classroomId = s['classroom_id'] ?? s['classroom']?['id'];
                        context.push(
                          '/conversations/new',
                          extra: {
                            'student_id': s['id'] ?? id,
                            'classroom_id': classroomId,
                            'classroom_name': s['class_name'] ?? s['classroom']?['name'],
                            'student': {
                              'id': s['id'] ?? id,
                              'name': (s['name'] ?? name).toString(),
                              'classroom_id': classroomId,
                              'school_no': (s['student_number'] ?? s['school_no'] ?? '').toString(),
                            },
                            'initialType': 'meeting',
                          },
                        );
                      },
                      icon: const Icon(Icons.event_note_rounded, size: 20),
                      label: const Text(
                        'Görüşme Ekle',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        foregroundColor: Colors.white,
                        elevation: 1,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) {
            final message = (e is ApiException)
                ? e.userFriendlyMessage
                : 'Bir hata oluştu. Lütfen tekrar deneyin.';
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: Colors.red),
                    const SizedBox(height: 16),
                    Text(
                      message,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 15),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  String _translateGender(String gender) {
    switch (gender.toLowerCase()) {
      case 'male':
        return 'Erkek';
      case 'female':
        return 'Kadın';
      case 'other':
        return 'Diğer';
      default:
        return gender;
    }
  }

  String _translateRelation(String relation) {
    switch (relation.toLowerCase()) {
      case 'mother':
        return 'Anne';
      case 'father':
        return 'Baba';
      case 'parent':
        return 'Ebeveyn';
      case 'grandmother':
        return 'Babaanne/Anneanne';
      case 'grandfather':
        return 'Dedey/Büyükbaba';
      case 'sibling':
        return 'Kardeş';
      case 'aunt':
        return 'Teyze/Hala';
      case 'uncle':
        return 'Amca/Dayı';
      case 'guardian':
        return 'Vasi';
      case 'other':
        return 'Diğer';
      default:
        return relation;
    }
  }
}
