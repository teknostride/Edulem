import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/announcements/announcements_providers.dart';
import '../../features/messages/messages_unread_providers.dart';
import '../../features/messages/conversations_paging_controller.dart';
import '../../theme/app_colors.dart';

class NotificationBellButton extends ConsumerWidget {
  const NotificationBellButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final announcementsBadgeAsync = ref.watch(announcementsBadgeProvider);
    final unreadMessagesAsync = ref.watch(unreadMessagesCountProvider);

    final announcementsCount = announcementsBadgeAsync.when(
      data: (data) => (data['unread_count'] as int?) ?? 0,
      loading: () => 0,
      error: (_, _) => 0,
    );

    final messagesCount = unreadMessagesAsync.when(
      data: (count) => count,
      loading: () => 0,
      error: (_, _) => 0,
    );

    final totalCount = announcementsCount + messagesCount;

    return Stack(
      children: [
        IconButton(
          onPressed: () => _showNotificationsMenu(context, ref),
          icon: const Icon(Icons.notifications_outlined),
        ),
        if (totalCount > 0)
          Positioned(
            right: 4,
            top: 4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.danger,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
              child: Text(
                totalCount > 99 ? '99+' : '$totalCount',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }

  void _showNotificationsMenu(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => const NotificationsBottomSheet(),
    );
  }
}

class NotificationsBottomSheet extends ConsumerStatefulWidget {
  const NotificationsBottomSheet({super.key});

  @override
  ConsumerState<NotificationsBottomSheet> createState() =>
      _NotificationsBottomSheetState();
}

class _NotificationsBottomSheetState
    extends ConsumerState<NotificationsBottomSheet> {
  @override
  Widget build(BuildContext context) {
    final announcementsAsync = ref.watch(recentAnnouncementsProvider);
    final conversationsAsync = ref.watch(conversationsPagingProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(16),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Bildirimler',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
              ),
              // Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Duyurular Section
                    _buildSectionHeader(
                      'Duyurular',
                      Icons.campaign,
                      Colors.orange,
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/announcements');
                      },
                    ),
                    const SizedBox(height: 8),
                    announcementsAsync.when(
                      data: (items) {
                        if (items.isEmpty) {
                          return const Text(
                            'Yeni duyuru yok',
                            style: TextStyle(color: Colors.grey),
                          );
                        }
                        return Column(
                          children: items.take(3).map((item) {
                            final title = (item['title'] ?? 'Duyuru')
                                .toString();
                            final date = (item['created_at'] ?? '').toString();
                            return ListTile(
                              leading: const Icon(
                                Icons.campaign,
                                color: Colors.orange,
                                size: 20,
                              ),
                              title: Text(
                                title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 14),
                              ),
                              subtitle: date.isNotEmpty
                                  ? Text(
                                      date,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey,
                                      ),
                                    )
                                  : null,
                              dense: true,
                              onTap: () {
                                Navigator.pop(context);
                                context.push('/announcements/${item['id']}');
                              },
                            );
                          }).toList(),
                        );
                      },
                      loading: () =>
                          const Center(child: CircularProgressIndicator()),
                      error: (_, _) => const Text('Duyurular yüklenemedi'),
                    ),
                    const Divider(height: 32),
                    // Mesajlar Section
                    _buildSectionHeader(
                      'Mesajlar',
                      Icons.message,
                      Colors.blue,
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/messages');
                      },
                    ),
                    const SizedBox(height: 8),
                    Builder(
                      builder: (context) {
                        if (conversationsAsync.initialLoading) {
                          return const Center(
                            child: CircularProgressIndicator(),
                          );
                        }
                        if (conversationsAsync.error != null) {
                          return const Text('Mesajlar yüklenemedi');
                        }
                        final items = conversationsAsync.items
                            .where((c) => (c['unread_count'] ?? 0) > 0)
                            .toList();
                        if (items.isEmpty) {
                          return const Text(
                            'Yeni mesaj yok',
                            style: TextStyle(color: Colors.grey),
                          );
                        }
                        return Column(
                          children: items.take(3).map((conv) {
                            final name =
                                (conv['other_user']?['name'] ?? 'Kullanıcı')
                                    .toString();
                            final message = (conv['last_message'] ?? '')
                                .toString();
                            final count = (conv['unread_count'] ?? 0) as int;
                            return ListTile(
                              leading: CircleAvatar(
                                radius: 16,
                                backgroundColor: Colors.blue.withValues(
                                  alpha: 0.2,
                                ),
                                child: const Icon(
                                  Icons.person,
                                  size: 16,
                                  color: Colors.blue,
                                ),
                              ),
                              title: Text(
                                name,
                                style: const TextStyle(fontSize: 14),
                              ),
                              subtitle: Text(
                                message.isNotEmpty ? message : 'Yeni mesaj var',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12),
                              ),
                              trailing: count > 0
                                  ? Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.danger,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        '$count',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    )
                                  : null,
                              dense: true,
                              onTap: () {
                                Navigator.pop(context);
                                final userId =
                                    conv['other_user']?['id'] as int?;
                                if (userId != null) {
                                  context.push('/messages/chat/$userId');
                                }
                              },
                            );
                          }).toList(),
                        );
                      },
                    ),
                    const Divider(height: 32),
                    // Ödevler Section
                    _buildSectionHeader(
                      'Ödevler',
                      Icons.assignment_outlined,
                      Colors.teal,
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/homework');
                      },
                    ),
                    const SizedBox(height: 8),
                    ListTile(
                      leading: const Icon(
                        Icons.menu_book,
                        color: Colors.teal,
                        size: 20,
                      ),
                      title: const Text(
                        'Ödev Takibi ve Detayları',
                        style: TextStyle(fontSize: 14),
                      ),
                      subtitle: const Text(
                        'Tüm verilen ve teslim edilecek ödevler',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      dense: true,
                      trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                      onTap: () {
                        Navigator.pop(context);
                        context.push('/homework');
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSectionHeader(
    String title,
    IconData icon,
    Color color, {
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const Spacer(),
          const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
        ],
      ),
    );
  }
}
