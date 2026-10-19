import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../../ui/molecules/notification_bell_button.dart';
import '../profile/profile_providers.dart';
import '../meals/today_meal_menu_widget.dart';
import '../keylem/keylem_bottom_sheet.dart';
import '../duty_schedules/today_duty_widget.dart';
import '../profile/portal_profile_app_bar_action.dart';

class TeacherDashboardPage extends ConsumerWidget {
  const TeacherDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final theme = Theme.of(context);
    final name = profile.valueOrNull?['name']?.toString() ?? 'Öğretmen';

    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Dashboard'),
          actions: const [
            NotificationBellButton(),
            PortalProfileAppBarAction(fallbackName: 'Öğretmen'),
          ],
        ),
        drawer: AppDrawer(
          sections: sections,
          headerTitle: 'EduLem',
          headerSubtitle: name,
        ),
        body: RefreshIndicator(
          onRefresh: () async => ref.invalidate(profileProvider),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
              Text(
                'Hoş Geldiniz, $name',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Bugün neler yapmak istersiniz?',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 24),
              // Günün menüsü – auto-fetches from /meal-menus
              const TodayMealMenuWidget(),
              // Bugünkü nöbet görevi (varsa görünür)
              const TodayDutyWidget(),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.3,
                children: [
                  _buildQuickCard(
                    context,
                    icon: Icons.how_to_reg,
                    title: 'Yoklama Al',
                    color: Colors.green,
                    onTap: () => context.push('/attendances'),
                  ),
                  _buildQuickCard(
                    context,
                    icon: Icons.tv_rounded,
                    title: 'KeyLem',
                    color: const Color(0xFF6366F1),
                    onTap: () => showKeylemBottomSheet(context),
                  ),
                  _buildQuickCard(
                    context,
                    icon: Icons.assignment,
                    title: 'Ödevler',
                    color: Colors.orange,
                    onTap: () => context.push('/homework'),
                  ),
                  _buildQuickCard(
                    context,
                    icon: Icons.calendar_month,
                    title: 'Ders Programı',
                    color: Colors.teal,
                    onTap: () => context.push('/schedule'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

  Widget _buildQuickCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                color.withValues(alpha: 0.15),
                color.withValues(alpha: 0.05),
              ],
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 32, color: color),
              const SizedBox(height: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[800],
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
