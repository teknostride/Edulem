import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/role_utils.dart';
import '../auth/auth_providers.dart';
import 'account_manager_service.dart';
import 'add_profile_bottom_sheet.dart';
import 'profile_providers.dart';
import 'student_switcher_service.dart';

class PortalProfileAppBarAction extends ConsumerWidget {
  const PortalProfileAppBarAction({
    super.key,
    this.fallbackName = 'Öğrenci',
  });

  final String fallbackName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(profileProvider);
    final profile = profileAsync.valueOrNull;
    final session = ref.watch(authSessionProvider).valueOrNull;
    final savedAccounts = ref.watch(savedAccountsProvider);

    final displayName = profile?['student_name']?.toString() ??
        profile?['name']?.toString() ??
        fallbackName;
    final avatar = profile?['avatar']?.toString() ?? profile?['photo_url']?.toString();
    final rawId = profile?['student_id'] ?? profile?['id'];
    final currentStudentId = (rawId is int)
        ? rawId
        : (int.tryParse(rawId?.toString() ?? '') ?? 0);


    // Kardeşler listesi
    final rawSiblings = (profile?['siblings'] as List?) ??
        (profile?['students'] as List?) ??
        [];

    final List<Map<String, dynamic>> siblings = [];
    for (final item in rawSiblings) {
      if (item is Map) {
        final m = Map<String, dynamic>.from(item);
        final id = m['id'] is int
            ? m['id'] as int
            : int.tryParse(m['id']?.toString() ?? '') ?? 0;
        final name = (m['student_name'] ?? m['name'] ?? '').toString().trim();
        if (id > 0 &&
            id != currentStudentId &&
            name.toLowerCase() != displayName.trim().toLowerCase()) {
          if (!siblings.any((s) =>
              s['id'] == id ||
              (s['name']?.toString().trim().toLowerCase() ==
                      name.toLowerCase() &&
                  name.isNotEmpty))) {
            siblings.add(m);
          }
        }
      }
    }

    // Diğer kayıtlı profiller (şu anki aktif profil hariç)
    final otherAccounts = savedAccounts.where((a) {
      if (session == null) return false;
      if (session.token.isNotEmpty && a.token.isNotEmpty && a.token == session.token) {
        return false;
      }
      final isCurrentStudent = isStudentRole(session.role) &&
          a.isStudent &&
          ((currentStudentId > 0 && a.studentId == currentStudentId) ||
              (a.name.trim().toLowerCase() == displayName.trim().toLowerCase()));
      if (isCurrentStudent) return false;

      final isCurrentStaff = !isStudentRole(session.role) &&
          !a.isStudent &&
          (a.name.trim().toLowerCase() == displayName.trim().toLowerCase());
      if (isCurrentStaff) return false;

      return true;
    }).toList();

    final hasMultipleProfiles =
        otherAccounts.isNotEmpty || siblings.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Theme(
        data: Theme.of(context).copyWith(
          popupMenuTheme: PopupMenuThemeData(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 8,
          ),
        ),
        child: PopupMenuButton<String>(
          offset: const Offset(0, 48),
          onSelected: (value) async {
            if (value == 'profile') {
              context.push('/profile');
            } else if (value == 'add_profile') {
              AddProfileBottomSheet.show(context);
            } else if (value == 'logout_current') {
              final notifier = ref.read(savedAccountsProvider.notifier);
              await notifier.logoutActiveAccount();
            } else if (value == 'logout_all' || value == 'logout') {
              final notifier = ref.read(savedAccountsProvider.notifier);
              await notifier.logoutAllAccounts();
            } else if (value.startsWith('switch_acc_')) {
              // Farklı bir kayıtlı profile geçiş yap
              final targetAccId = value.replaceFirst('switch_acc_', '');
              final targetAcc = savedAccounts.firstWhere(
                (a) => a.id == targetAccId,
                orElse: () => otherAccounts.first,
              );
              if (context.mounted) {
                await ref
                    .read(savedAccountsProvider.notifier)
                    .switchToAccount(context, targetAcc);
              }
            } else if (value.startsWith('switch_sib_')) {
              // Kardeş öğrencisine geçiş yap
              final targetIdStr = value.replaceFirst('switch_sib_', '');
              final target = siblings.firstWhere(
                (s) => s['id'].toString() == targetIdStr,
                orElse: () => <String, dynamic>{},
              );
              if (target.isNotEmpty && context.mounted) {
                await ref
                    .read(studentSwitcherServiceProvider)
                    .switchToStudent(context, target);
              }
            }
          },
          itemBuilder: (context) {
            final items = <PopupMenuEntry<String>>[];

            // 1. Başlık: HESAPLAR / PROFİLLER
            items.add(
              const PopupMenuItem<String>(
                enabled: false,
                height: 30,
                child: Text(
                  'HESAPLAR VE PROFİLLER',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.6,
                    color: Colors.grey,
                  ),
                ),
              ),
            );

            // Aktif Profil
            items.add(
              PopupMenuItem<String>(
                value: 'current_active',
                enabled: false,
                child: Row(
                  children: [
                    const Icon(Icons.check_circle,
                        color: Color(0xFF2563EB), size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            displayName,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1E3A8A),
                              fontSize: 13,
                            ),
                          ),
                          Row(
                            children: [
                              Container(
                                margin: const EdgeInsets.only(top: 2),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2563EB)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  formatRoleName(session?.role),
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF2563EB),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );

            // Diğer Kayıtlı Profiller (Öğretmen, Öğrenci, Veli vb.)
            for (final acc in otherAccounts) {
              items.add(
                PopupMenuItem<String>(
                  value: 'switch_acc_${acc.id}',
                  child: Row(
                    children: [
                      const Icon(Icons.swap_horiz,
                          color: Color(0xFF2563EB), size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              acc.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              () {
                                final roleName = formatRoleName(acc.role);
                                if (acc.subtitle != null &&
                                    acc.subtitle!.isNotEmpty &&
                                    acc.subtitle!.toLowerCase() != acc.role.toLowerCase() &&
                                    acc.subtitle!.toLowerCase() != roleName.toLowerCase()) {
                                  return '$roleName • ${acc.subtitle}';
                                }
                                return roleName;
                              }(),
                              style: const TextStyle(
                                  fontSize: 11, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            // Kardeşler (eğer kayıtlı profillerde zaten yoksa)
            for (final sib in siblings) {
              final sibId = sib['id'].toString();
              final sibName =
                  (sib['name'] ?? sib['student_name'] ?? 'Öğrenci').toString();

              // Eğer bu kardeş zaten otherAccounts içinde varsa tekrar ekleme
              final alreadyInAccounts =
                  otherAccounts.any((a) => a.studentId?.toString() == sibId);
              if (alreadyInAccounts) continue;

              final classroom = (sib['classroom_name'] ??
                      (sib['classroom'] is Map
                          ? sib['classroom']['name']
                          : null) ??
                      '')
                  .toString();

              items.add(
                PopupMenuItem<String>(
                  value: 'switch_sib_$sibId',
                  child: Row(
                    children: [
                      const Icon(Icons.swap_horiz,
                          color: Colors.blueGrey, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              sibName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                            if (classroom.isNotEmpty)
                              Text(
                                'Öğrenci • $classroom',
                                style: const TextStyle(
                                    fontSize: 11, color: Colors.grey),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            // 2. Yeni Profil Ekleme Butonu (Profil yazısının hemen üstünde)
            items.add(const PopupMenuDivider());
            items.add(
              const PopupMenuItem<String>(
                value: 'add_profile',
                child: Row(
                  children: [
                    Icon(Icons.person_add_alt_1_rounded,
                        color: Color(0xFF2563EB), size: 20),
                    SizedBox(width: 10),
                    Text(
                      'Yeni Profil Ekle',
                      style: TextStyle(
                        color: Color(0xFF2563EB),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            );

            // 3. Profil ve Çıkış Seçenekleri
            items.add(const PopupMenuDivider());
            items.add(
              const PopupMenuItem<String>(
                value: 'profile',
                child: Row(
                  children: [
                    Icon(Icons.person_outline, size: 20),
                    SizedBox(width: 10),
                    Text('Profil'),
                  ],
                ),
              ),
            );

            if (savedAccounts.length > 1) {
              items.add(
                PopupMenuItem<String>(
                  value: 'logout_current',
                  child: Row(
                    children: [
                      Icon(Icons.logout, color: Colors.orange.shade800, size: 20),
                      const SizedBox(width: 10),
                      Text(
                        'Bu Profilin Oturumunu Kapat',
                        style: TextStyle(color: Colors.orange.shade900, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              );
              items.add(
                const PopupMenuItem<String>(
                  value: 'logout_all',
                  child: Row(
                    children: [
                      Icon(Icons.power_settings_new_rounded,
                          color: Colors.red, size: 20),
                      SizedBox(width: 10),
                      Text('Tüm Hesaplardan Çık',
                          style: TextStyle(color: Colors.red, fontSize: 13)),
                    ],
                  ),
                ),
              );
            } else {
              items.add(
                const PopupMenuItem<String>(
                  value: 'logout',
                  child: Row(
                    children: [
                      Icon(Icons.logout, color: Colors.red, size: 20),
                      SizedBox(width: 10),
                      Text('Çıkış Yap', style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              );
            }

            return items;
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainerHighest
                  .withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Theme.of(context).dividerColor.withValues(alpha: 0.25),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircleAvatar(
                  radius: 14,
                  backgroundImage: avatar != null && avatar.isNotEmpty
                      ? NetworkImage(avatar)
                      : null,
                  backgroundColor: const Color(0xFF1E3A8A),
                  child: avatar == null || avatar.isEmpty
                      ? Text(
                          displayName.isNotEmpty
                              ? displayName[0].toUpperCase()
                              : 'Ö',
                          style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.white),
                        )
                      : null,
                ),
                const SizedBox(width: 6),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 105),
                  child: Text(
                    displayName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 2),
                Icon(
                  hasMultipleProfiles
                      ? Icons.keyboard_arrow_down
                      : Icons.arrow_drop_down,
                  size: 18,
                  color: hasMultipleProfiles
                      ? const Color(0xFF2563EB)
                      : Colors.grey,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
