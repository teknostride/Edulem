import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_providers.dart';
import '../../features/profile/profile_providers.dart';
import '../../features/profile/account_manager_service.dart';
import '../../core/utils/role_utils.dart';
import '../../theme/app_colors.dart';
import '../atoms/app_card.dart';
import '../../features/keylem/keylem_bottom_sheet.dart';

class AppDrawerItem {
  const AppDrawerItem({
    required this.title,
    this.subtitle,
    this.icon,
    this.route,
    this.onTap,
    this.children = const [],
  });

  final String title;
  final String? subtitle;
  final IconData? icon;
  final String? route;
  final VoidCallback? onTap;
  final List<AppDrawerItem> children;

  bool get hasChildren => children.isNotEmpty;
}

class AppDrawerSection {
  const AppDrawerSection({required this.title, required this.items});

  final String title;
  final List<AppDrawerItem> items;
}

class AppDrawer extends ConsumerWidget {
  const AppDrawer({
    super.key,
    required this.sections,
    this.headerTitle = 'EduLem',
    this.headerSubtitle,
    this.unreadCounts = const {},
  });

  final List<AppDrawerSection> sections;
  final String headerTitle;
  final String? headerSubtitle;
  final Map<String, int> unreadCounts;

  Widget? _buildUnreadBadge(String? route) {
    if (route == null) return null;
    final count = unreadCounts[route] ?? 0;
    if (count <= 0) return null;

    final text = count > 99 ? '99+' : count.toString();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.danger,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  void _comingSoon(BuildContext context, String featureName) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('$featureName Yakında'),
          content: const Text('Bu bölüm sonraki adımlarda eklenecek.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Tamam'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildItem(BuildContext context, AppDrawerItem item) {
    if (!item.hasChildren) {
      return ListTile(
        leading: item.icon != null
            ? Icon(item.icon, color: Colors.blueGrey[700])
            : null,
        title: Text(item.title),
        subtitle: item.subtitle != null ? Text(item.subtitle!) : null,
        trailing: _buildUnreadBadge(item.route),
        onTap: () {
          Navigator.of(context).pop();
          if (item.onTap != null) {
            item.onTap!();
            return;
          }
          final route = item.route;
          if (route == '/keylem') {
            showKeylemBottomSheet(context);
            return;
          }
          if (route != null && route.trim().isNotEmpty) {
            context.go(route);
          } else {
            _comingSoon(context, item.title);
          }
        },
      );
    }

    return ExpansionTile(
      leading: item.icon != null
          ? Icon(item.icon, color: Colors.blueGrey[700])
          : null,
      title: Text(item.title),
      subtitle: item.subtitle != null ? Text(item.subtitle!) : null,
      children: item.children.map((c) => _buildItem(context, c)).toList(),
    );
  }

  String _getDashboardRoute(String? role) {
    return getDashboardRouteForRole(role);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authSession = ref.watch(authSessionProvider);
    final role = authSession.valueOrNull?.role;
    final dashboardRoute = _getDashboardRoute(role);

    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: InkWell(
                onTap: () {
                  Navigator.of(context).pop();
                  context.go(dashboardRoute);
                },
                borderRadius: BorderRadius.circular(12),
                child: AppCard(
                  child: Row(
                    children: [
                      Container(
                        height: 44,
                        width: 44,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Consumer(
                          builder: (context, ref, _) {
                            final logoInfo = ref.watch(tenantLogoInfoProvider);
                            return logoInfo.when(
                              data: (info) {
                                final url = (info['url'] ?? '').toString();
                                final headers = (info['headers'] is Map)
                                    ? Map<String, String>.from(
                                        info['headers'] as Map,
                                      )
                                    : const <String, String>{};
                                if (url.trim().isEmpty) {
                                  return ClipOval(
                                    child: Image.asset(
                                      'assets/images/logo.png',
                                      fit: BoxFit.cover,
                                      width: 44,
                                      height: 44,
                                    ),
                                  );
                                }
                                return ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.network(
                                    url,
                                    headers: headers,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, _, _) {
                                      return ClipOval(
                                        child: Image.asset(
                                          'assets/images/logo.png',
                                          fit: BoxFit.cover,
                                          width: 44,
                                          height: 44,
                                        ),
                                      );
                                    },
                                  ),
                                );
                              },
                              loading: () => ClipOval(
                                child: Image.asset(
                                  'assets/images/logo.png',
                                  fit: BoxFit.cover,
                                  width: 44,
                                  height: 44,
                                ),
                              ),
                              error: (_, _) => ClipOval(
                                child: Image.asset(
                                  'assets/images/logo.png',
                                  fit: BoxFit.cover,
                                  width: 44,
                                  height: 44,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              headerTitle,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                            if (headerSubtitle != null &&
                                headerSubtitle!.trim().isNotEmpty)
                              Text(
                                headerSubtitle!,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                ),
                                overflow: TextOverflow.ellipsis,
                                maxLines: 1,
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: EdgeInsets.zero,
                itemCount: sections.length,
                itemBuilder: (context, index) {
                  final section = sections[index];
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
                        child: Text(
                          section.title,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      ...section.items.map((i) => _buildItem(context, i)),
                    ],
                  );
                },
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.logout, color: AppColors.danger),
              title: Text(
                'Çıkış Yap',
                style: TextStyle(color: AppColors.danger),
              ),
              onTap: () async {
                // Notifier'ı drawer açık ve mounted iken hemen al
                final notifier = ref.read(savedAccountsProvider.notifier);

                // Çıkış onay dialogu göster
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
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.red,
                        ),
                        child: const Text('Çıkış Yap'),
                      ),
                    ],
                  ),
                );

                if (confirmed != true) return;

                // Onaylandıysa drawer'ı kapat
                if (context.mounted) {
                  Navigator.of(context).pop();
                }

                // Önceden alınmış notifier üzerinden çıkış yap (kalan profil varsa ona geçer, yoksa /login'e yönlendirir)
                await notifier.logoutActiveAccount();
              },
            ),
          ],
        ),
      ),
    );
  }
}
