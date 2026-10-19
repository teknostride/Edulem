import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../../ui/molecules/notification_bell_button.dart';
import '../../ui/atoms/app_card.dart';
import '../profile/profile_providers.dart';
import 'portal_dashboard_provider.dart';
import '../meals/today_meal_menu_widget.dart';
import '../profile/portal_profile_app_bar_action.dart';

class StudentDashboardPage extends ConsumerWidget {
  const StudentDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final dashboardAsync = ref.watch(portalDashboardProvider);

    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          actions: const [
            NotificationBellButton(),
            PortalProfileAppBarAction(fallbackName: 'Öğrenci'),
          ],
        ),
        drawer: AppDrawer(
          sections: sections,
          headerTitle: 'EduLem',
          headerSubtitle: profile.valueOrNull?['name']?.toString() ?? 'Öğrenci',
        ),
        body: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(profileProvider);
            ref.invalidate(portalDashboardProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: dashboardAsync.when(
              data: (data) => _buildDashboardContent(context, ref, profile.valueOrNull, data),
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: CircularProgressIndicator(),
                ),
              ),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  child: Column(
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text('Veriler alınamadı: $e'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ref.invalidate(portalDashboardProvider),
                        child: const Text('Tekrar Dene'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDashboardContent(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic>? profile,
    Map<String, dynamic> data,
  ) {
    final student = data['student'] as Map<String, dynamic>? ?? {};
    final summary = data['summary'] as Map<String, dynamic>? ?? {};
    final todaySchedule = (data['today_schedule'] as List<dynamic>?) ?? [];
    final upcomingHomeworks = (data['upcoming_homeworks'] as List<dynamic>?) ?? [];
    final todayMenus = (data['today_menus'] as List<dynamic>?) ?? [];
    final legacyMenu = todayMenus.isEmpty ? (data['today_menu'] as Map<String, dynamic>?) : null;
    final announcements = (data['announcements'] as List<dynamic>?) ?? [];

    final studentName = student['name']?.toString() ?? profile?['name']?.toString() ?? 'Öğrenci';
    final classroomName = (student['classroom'] is Map ? student['classroom']['name'] : null)?.toString() ?? 'Sınıf Bilgisi Yok';
    final pendingCount = summary['pending_homework_count']?.toString() ?? '0';
    final completedCount = summary['completed_homework_count']?.toString() ?? '0';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Hoş Geldiniz Banner Kartı
        _buildHeroCard(studentName, classroomName),
        const SizedBox(height: 16),

        // 2. Ödev İstatistik Kartları
        Row(
          children: [
            Expanded(
              child: _buildSummaryCard(
                title: 'Bekleyen Ödev',
                count: pendingCount,
                icon: Icons.access_time_filled,
                color: Colors.orange,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildSummaryCard(
                title: 'Tamamlanan Ödev',
                count: completedCount,
                icon: Icons.check_circle,
                color: Colors.green,
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // 3. Günün Dersleri
        _buildTodayScheduleCard(context, todaySchedule),
        const SizedBox(height: 20),

        // 4. Yaklaşan Ödevler
        _buildUpcomingHomeworkCard(context, upcomingHomeworks),
        const SizedBox(height: 20),

        // 5. Günün Menüsü
        TodayMealMenuWidget(
          menus: todayMenus.isNotEmpty ? todayMenus : null,
          legacyMenu: legacyMenu,
        ),
        const SizedBox(height: 24),

        // 6. Hızlı Erişim Menüsü
        const Text(
          'Hızlı Erişim',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        _buildQuickAccessGrid(context),
        const SizedBox(height: 24),

        // 7. Son Duyurular
        if (announcements.isNotEmpty) ...[
          const Text(
            'Son Duyurular',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _buildAnnouncementsCard(context, announcements),
        ],
      ],
    );
  }

  Widget _buildHeroCard(String studentName, String classroomName) {
    return AppCard(
      color: const Color(0xFF1E3A8A),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            bottom: -30,
            child: Icon(
              Icons.school_outlined,
              size: 130,
              color: Colors.white.withValues(alpha: 0.12),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Merhaba, $studentName! 👋',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '$classroomName - Günlük özetin hazır.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard({
    required String title,
    required String count,
    required IconData icon,
    required MaterialColor color,
  }) {
    return AppCard(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    count,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 22),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayScheduleCard(BuildContext context, List<dynamic> todaySchedule) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.calendar_today_outlined, size: 20, color: Colors.blue.shade700),
                    const SizedBox(width: 8),
                    const Text(
                      'Günün Dersleri',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () => context.push('/schedule'),
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.blue.shade50,
                    foregroundColor: Colors.blue.shade800,
                    shape: const StadiumBorder(),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text('Haftalık', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          if (todaySchedule.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.event_busy_outlined, size: 40, color: Colors.grey),
                    SizedBox(height: 8),
                    Text('Bugün için ders bulunmuyor.', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: todaySchedule.length,
              separatorBuilder: (_, _) => const Divider(height: 1, indent: 16, endIndent: 16),
              itemBuilder: (context, idx) {
                final item = todaySchedule[idx] as Map<String, dynamic>;
                final lessonName = (item['lesson'] is Map ? item['lesson']['name'] : null)?.toString() ?? '-';
                final teacherName = (item['teacher'] is Map ? item['teacher']['name'] : null)?.toString() ?? '-';
                final startTime = item['start_time']?.toString().substring(0, 5) ?? '';
                final endTime = item['end_time']?.toString().substring(0, 5) ?? '';

                return ListTile(
                  leading: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${idx + 1}. Ders',
                      style: TextStyle(color: Colors.blue.shade800, fontWeight: FontWeight.bold, fontSize: 11),
                    ),
                  ),
                  title: Text(lessonName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  subtitle: Text(
                    '$startTime - $endTime • $teacherName',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildUpcomingHomeworkCard(BuildContext context, List<dynamic> homeworks) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.menu_book_outlined, size: 20, color: Colors.orange.shade700),
                    const SizedBox(width: 8),
                    const Text(
                      'Yaklaşan Ödevler',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () => context.push('/homework'),
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.orange.shade50,
                    foregroundColor: Colors.orange.shade900,
                    shape: const StadiumBorder(),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text('Tümü', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          if (homeworks.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.assignment_turned_in_outlined, size: 40, color: Colors.grey),
                    SizedBox(height: 8),
                    Text('Yaklaşan ödev bulunmuyor.', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: homeworks.length,
              separatorBuilder: (_, _) => const Divider(height: 1, indent: 16, endIndent: 16),
              itemBuilder: (context, idx) {
                final item = homeworks[idx] as Map<String, dynamic>;
                final title = item['title']?.toString() ?? 'Ödev';
                final lessonName = (item['lesson'] is Map ? item['lesson']['name'] : null)?.toString() ?? '-';
                final dueDate = item['due_date']?.toString() ?? '';

                return ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(Icons.book_outlined, color: Colors.orange.shade700, size: 20),
                  ),
                  title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  subtitle: Text(lessonName, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _formatDueDate(dueDate),
                      style: TextStyle(color: Colors.red.shade700, fontSize: 11, fontWeight: FontWeight.w500),
                    ),
                  ),
                  onTap: () => context.push('/homework'),
                );
              },
            ),
        ],
      ),
    );
  }

  // _buildTodayMenuCard removed – replaced by TodayMealMenuWidget

  Widget _buildQuickAccessGrid(BuildContext context) {
    final items = [
      _QuickAccessItem(
        icon: Icons.calendar_month,
        label: 'Ders Programı',
        route: '/schedule',
        color: Colors.blue,
      ),
      _QuickAccessItem(
        icon: Icons.assignment,
        label: 'Ödevler',
        route: '/homework',
        color: Colors.orange,
      ),
      _QuickAccessItem(
        icon: Icons.bar_chart,
        label: 'Sınavlar',
        route: '/assessment',
        color: Colors.purple,
      ),
      _QuickAccessItem(
        icon: Icons.restaurant_menu,
        label: 'Yemek Menüsü',
        route: '/meal-menus',
        color: Colors.red,
      ),
      _QuickAccessItem(
        icon: Icons.campaign,
        label: 'Duyurular',
        route: '/announcements',
        color: Colors.indigo,
      ),
      _QuickAccessItem(
        icon: Icons.quiz,
        label: 'Anketler',
        route: '/surveys',
        color: Colors.teal,
      ),
    ];

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 3,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      children: items
          .map((item) => _buildQuickAccessItem(context, item))
          .toList(),
    );
  }

  Widget _buildQuickAccessItem(BuildContext context, _QuickAccessItem item) {
    return InkWell(
      onTap: () => context.push(item.route),
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

  Widget _buildAnnouncementsCard(BuildContext context, List<dynamic> announcements) {
    return AppCard(
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: announcements.take(3).length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, idx) {
          final item = announcements[idx] as Map<String, dynamic>;
          final title = item['title']?.toString() ?? 'Duyuru';
          final id = item['id'] is int ? item['id'] : int.tryParse(item['id'].toString()) ?? 0;

          return ListTile(
            leading: const Icon(Icons.campaign, color: Colors.green),
            title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
            trailing: const Icon(Icons.chevron_right, size: 20),
            onTap: () => context.push('/announcements/$id'),
          );
        },
      ),
    );
  }

  String _formatDueDate(String dateStr) {
    if (dateStr.trim().isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
    } catch (_) {
      if (RegExp(r'^\d{4}-\d{2}-\d{2}').hasMatch(dateStr)) {
        final parts = dateStr.substring(0, 10).split('-');
        return '${parts[2]}.${parts[1]}.${parts[0]}';
      }
      return dateStr;
    }
  }
}

class _QuickAccessItem {
  final IconData icon;
  final String label;
  final String route;
  final Color color;

  _QuickAccessItem({required this.icon, required this.label, required this.route, required this.color});
}
