import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../../ui/molecules/notification_bell_button.dart';
import '../../core/utils/role_utils.dart';
import '../profile/profile_providers.dart';
import '../auth/auth_providers.dart';
import '../announcements/announcements_providers.dart';
import '../meals/today_meal_menu_widget.dart';
import '../keylem/keylem_bottom_sheet.dart';
import '../duty_schedules/today_duty_widget.dart';
import '../profile/portal_profile_app_bar_action.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);
    final authSession = ref.watch(authSessionProvider);
    final sections = ref.watch(drawerSectionsProvider);

    // Oturum henüz yükleniyorsa eski oturum verisine bakarak yanlış yönlendirme yapma
    if (authSession.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final role = authSession.valueOrNull?.role;
    final isStaff = isStaffOrAdminRole(role);

    // Personel, yönetici, kurucu vb. doğrudan bu sayfada (DashboardPage) kalır
    if (!isStaff) {
      final isTeacher = isTeacherRole(role);
      final isStudent = isStudentRole(role);

      if (isTeacher) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (context.mounted) {
            context.go('/dashboard/teacher');
          }
        });
        return const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );
      }

      if (isStudent) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (context.mounted) {
            context.go('/dashboard/student');
          }
        });
        return const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );
      }
    }

    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          actions: [
            IconButton(
              onPressed: () => context.push('/search'),
              icon: const Icon(Icons.search),
            ),
            const NotificationBellButton(),
            const PortalProfileAppBarAction(fallbackName: 'Yönetici'),
          ],
        ),
        drawer: AppDrawer(
          sections: sections,
          headerTitle: 'EduLem',
          headerSubtitle: profile.valueOrNull?['name']?.toString(),
        ),
        body: RefreshIndicator(
          onRefresh: () async => ref.invalidate(profileProvider),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Günün menüsü (auto-fetches)
                const TodayMealMenuWidget(),
                // Bugünkü nöbet görevi (varsa görünür)
                const TodayDutyWidget(),
                const SizedBox(height: 20),
                const Text(
                  'Hızlı Erişim',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                _buildQuickAccessGrid(context, isStudent: false),
                const SizedBox(height: 24),
                const Text(
                  'Son Duyurular',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                _buildRecentAnnouncements(context, ref),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildQuickAccessGrid(
    BuildContext context, {
    bool isStudent = false,
  }) {
    final List<_QuickAccessItem> items;
    if (isStudent) {
      items = [
        _QuickAccessItem(
          icon: Icons.campaign,
          label: 'Duyurular',
          route: '/announcements',
          color: Colors.blue,
        ),
        _QuickAccessItem(
          icon: Icons.assignment,
          label: 'Ödevler',
          route: '/homework',
          color: Colors.orange,
        ),
        _QuickAccessItem(
          icon: Icons.calendar_month,
          label: 'Ders Programı',
          route: '/schedule',
          color: Colors.teal,
        ),
        _QuickAccessItem(
          icon: Icons.message,
          label: 'Mesajlar',
          route: '/messages',
          color: Colors.indigo,
        ),
      ];
    } else {
      items = [
        _QuickAccessItem(
          icon: Icons.how_to_reg,
          label: 'Yoklama Al',
          route: '/attendances',
          color: Colors.green,
        ),
        _QuickAccessItem(
          icon: Icons.tv_rounded,
          label: 'KeyLem',
          color: const Color(0xFF6366F1),
          onTap: () => showKeylemBottomSheet(context),
        ),
        _QuickAccessItem(
          icon: Icons.assignment,
          label: 'Ödevler',
          route: '/homework',
          color: Colors.orange,
        ),
        _QuickAccessItem(
          icon: Icons.calendar_month,
          label: 'Ders Programı',
          route: '/schedule',
          color: Colors.teal,
        ),
      ];
    }

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: items
          .map((item) => _buildQuickAccessItem(context, item))
          .toList(),
    );
  }

  Widget _buildQuickAccessItem(BuildContext context, _QuickAccessItem item) {
    return InkWell(
      onTap: () {
        if (item.onTap != null) {
          item.onTap!();
        } else if (item.route != null && item.route!.isNotEmpty) {
          context.push(item.route!);
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: item.color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.icon, color: item.color, size: 32),
            const SizedBox(height: 8),
            Text(
              item.label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: item.color.withValues(alpha: 0.8),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentAnnouncements(BuildContext context, WidgetRef ref) {
    final recentAsync = ref.watch(recentAnnouncementsProvider);

    return AppCard(
      child: recentAsync.when(
        data: (announcements) {
          if (announcements.isEmpty) {
            return const ListTile(
              leading: Icon(Icons.campaign, color: Colors.grey),
              title: Text('Henüz duyuru yok'),
              subtitle: Text('Yeni duyurular burada görünecek'),
            );
          }
          return Column(
            children: announcements.take(5).map((a) {
              final title = a['title']?.toString() ?? 'Başlıksız';
              final message = a['message']?.toString() ?? '';
              final createdAt = a['created_at']?.toString() ?? '';
              final type = a['type']?.toString() ?? 'info';
              final id = a['id'] is int
                  ? a['id']
                  : int.tryParse(a['id'].toString()) ?? 0;

              // Clean HTML
              final cleanMessage = message
                  .replaceAll(RegExp(r'<[^>]*>'), ' ')
                  .replaceAll('&nbsp;', ' ')
                  .trim();

              // Type color
              Color typeColor;
              switch (type) {
                case 'success':
                  typeColor = Colors.green;
                  break;
                case 'warning':
                  typeColor = Colors.orange;
                  break;
                case 'error':
                  typeColor = Colors.red;
                  break;
                default:
                  typeColor = Colors.blue;
              }

              return Column(
                children: [
                  ListTile(
                    leading: Icon(Icons.campaign, color: typeColor),
                    title: Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      cleanMessage.isNotEmpty
                          ? cleanMessage
                          : createdAt.isNotEmpty
                          ? createdAt.substring(0, 10)
                          : 'Duyuru',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onTap: () => context.push('/announcements/$id'),
                  ),
                  if (announcements.indexOf(a) < announcements.length - 1 &&
                      announcements.indexOf(a) < 4)
                    const Divider(height: 1),
                ],
              );
            }).toList(),
          );
        },
        loading: () => const Center(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: CircularProgressIndicator(),
          ),
        ),
        error: (e, _) => ListTile(
          leading: const Icon(Icons.error, color: Colors.red),
          title: const Text('Duyurular yüklenemedi'),
          subtitle: Text('Hata: $e'),
          onTap: () => ref.invalidate(recentAnnouncementsProvider),
        ),
      ),
    );
  }
}

class _QuickAccessItem {
  final IconData icon;
  final String label;
  final String? route;
  final VoidCallback? onTap;
  final Color color;

  _QuickAccessItem({
    required this.icon,
    required this.label,
    this.route,
    this.onTap,
    required this.color,
  });
}
