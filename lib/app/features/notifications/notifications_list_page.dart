import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'notifications_paging_controller.dart';

class NotificationsListPage extends ConsumerStatefulWidget {
  const NotificationsListPage({super.key});

  @override
  ConsumerState<NotificationsListPage> createState() => _NotificationsListPageState();
}

class _NotificationsListPageState extends ConsumerState<NotificationsListPage> {
  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
  }

  void _onScroll() {
    final state = ref.read(notificationsPagingProvider);
    if (state.isLoadingMore || !state.hasMore) return;

    final pos = _scrollController.position;
    if (!pos.hasPixels || !pos.hasContentDimensions) return;

    if (pos.pixels > pos.maxScrollExtent - 240) {
      ref.read(notificationsPagingProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final paging = ref.watch(notificationsPagingProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Bildirimler')),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(notificationsPagingProvider.notifier).loadInitial(),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: paging.initialLoading
              ? const Center(child: CircularProgressIndicator())
              : paging.error != null
                  ? Center(child: Text('Hata: ${paging.error}'))
                  : ListView.separated(
                      controller: _scrollController,
                      itemCount: paging.items.length + (paging.hasMore ? 1 : 0),
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        if (index >= paging.items.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(child: CircularProgressIndicator()),
                          );
                        }

                        final n = paging.items[index];
                        final id = (n['id'] is int)
                            ? n['id'] as int
                            : int.tryParse('${n['id']}') ?? -1;
                        final title = (n['title'] ?? '').toString();
                        final message = (n['message'] ?? '').toString();
                        final isRead = n['is_read'] == true;
                        final createdAt = (n['created_at'] ?? '').toString();

                        return AppCard(
                          child: ListTile(
                            leading: Icon(
                              isRead ? Icons.notifications_none : Icons.notifications,
                              color: isRead ? Colors.grey : Theme.of(context).primaryColor,
                            ),
                            title: Text(
                              title.isEmpty ? 'Bildirim' : title,
                              style: TextStyle(
                                fontWeight: isRead ? FontWeight.normal : FontWeight.w700,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  message.isEmpty ? 'İçerik yok' : message,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                if (createdAt.isNotEmpty)
                                  Text(
                                    createdAt,
                                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                                  ),
                              ],
                            ),
                            trailing: !isRead
                                ? IconButton(
                                    icon: const Icon(Icons.done_outline),
                                    onPressed: id > 0
                                        ? () => ref
                                            .read(notificationsPagingProvider.notifier)
                                            .markAsRead(id)
                                        : null,
                                  )
                                : null,
                          ),
                        );
                      },
                    ),
        ),
      ),
    );
  }
}
