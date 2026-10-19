import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'messages_providers.dart';
import 'messages_unread_providers.dart';
import 'messages_paging_controller.dart';

class ConversationDetailPage extends ConsumerStatefulWidget {
  const ConversationDetailPage({super.key, required this.conversationId});

  final int conversationId;

  @override
  ConsumerState<ConversationDetailPage> createState() =>
      _ConversationDetailPageState();
}

class _ConversationDetailPageState
    extends ConsumerState<ConversationDetailPage> {
  late final ScrollController _scrollController;
  late final TextEditingController _textController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
    _textController = TextEditingController();
  }

  void _onScroll() {
    final state = ref.read(messagesPagingProvider(widget.conversationId));
    if (state.isLoadingMore || !state.hasMore) return;

    final pos = _scrollController.position;
    if (!pos.hasPixels || !pos.hasContentDimensions) return;

    if (pos.pixels > pos.maxScrollExtent - 240) {
      ref
          .read(messagesPagingProvider(widget.conversationId).notifier)
          .loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _textController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    await ref
        .read(messagesPagingProvider(widget.conversationId).notifier)
        .send(text);
    _textController.clear();
  }

  @override
  Widget build(BuildContext context) {
    final paging = ref.watch(messagesPagingProvider(widget.conversationId));
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mesajlar')),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Column(
        children: [
          Expanded(
            child: paging.initialLoading
                ? const Center(child: CircularProgressIndicator())
                : paging.error != null
                ? Center(child: Text('Hata: ${paging.error}'))
                : ListView.separated(
                    controller: _scrollController,
                    reverse: true,
                    itemCount: paging.items.length + (paging.hasMore ? 1 : 0),
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      if (index >= paging.items.length) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }

                      final m = paging.items[index];
                      final messageId = (m['id'] is int)
                          ? m['id'] as int
                          : int.tryParse('${m['id']}') ?? -1;
                      final content = (m['content'] ?? '').toString();
                      final sender = m['sender'] as Map? ?? {};
                      final senderName = (sender['name'] ?? '').toString();
                      final createdAt = (m['created_at'] ?? '').toString();
                      final isRead = m['is_read'] == true;

                      return InkWell(
                        onTap: (!isRead && messageId > 0)
                            ? () async {
                                await ref
                                    .read(messagesRepositoryProvider)
                                    .markAsRead(messageId);
                                ref.invalidate(unreadMessagesCountProvider);
                                ref.invalidate(
                                  messagesPagingProvider(widget.conversationId),
                                );
                              }
                            : null,
                        child: AppCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (senderName.isNotEmpty)
                                Text(
                                  senderName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              Text(
                                content,
                                style: TextStyle(
                                  fontWeight: isRead
                                      ? FontWeight.normal
                                      : FontWeight.w700,
                                ),
                              ),
                              if (createdAt.isNotEmpty)
                                Text(
                                  createdAt,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: const InputDecoration(
                      hintText: 'Mesaj yaz...',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _send,
                  icon: const Icon(Icons.send),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
