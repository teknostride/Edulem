import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'announcements_providers.dart';

class AnnouncementDetailPage extends ConsumerWidget {
  const AnnouncementDetailPage({super.key, required this.id});

  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(announcementDetailProvider(id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Duyuru Detayı'),
        actions: [
          detail.maybeWhen(
            data: (m) {
              final isStarred = m['is_starred'] == true || m['is_starred'] == 1 || m['is_starred'] == '1';
              final isImportant = m['is_important'] == true || m['is_important'] == 1 || m['is_important'] == '1';
              
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    onPressed: () async {
                      await ref
                          .read(announcementsRepositoryProvider)
                          .toggleStar(id, value: !isStarred);
                      ref.invalidate(announcementDetailProvider(id));
                      ref.invalidate(announcementsListProvider);
                    },
                    icon: Icon(isStarred ? Icons.star : Icons.star_border, color: isStarred ? Colors.amber : null),
                  ),
                  IconButton(
                    onPressed: () async {
                      await ref
                          .read(announcementsRepositoryProvider)
                          .toggleImportant(id, value: !isImportant);
                      ref.invalidate(announcementDetailProvider(id));
                      ref.invalidate(announcementsListProvider);
                    },
                    icon: Icon(Icons.priority_high, color: isImportant ? Colors.red : null),
                  ),
                ],
              );
            },
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: detail.when(
          data: (m) {
            // API yanıt yapısı: direkt title/message (flat structure)
            final title = (m['title'] ?? m['subject'] ?? m['name'] ?? 'Duyuru')
                .toString();
            // HTML tag'lerini temizle
            final rawBody =
                (m['message'] ?? m['content'] ?? m['description'] ?? '')
                    .toString();
            final body = rawBody
                .replaceAll(RegExp(r'<[^>]*>'), ' ') // HTML tag'lerini kaldır
                .replaceAll('&nbsp;', ' ') // Non-breaking space
                .replaceAll('&amp;', '&') // Ampersand
                .replaceAll('&lt;', '<') // Less than
                .replaceAll('&gt;', '>') // Greater than
                .replaceAll('&quot;', '"') // Quote
                .replaceAll('&#39;', "'") // Apostrophe
                .trim();

            return ListView(
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        if (body.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Text(body),
                        ],
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () async {
                                  await ref
                                      .read(announcementsRepositoryProvider)
                                      .markRead(id);
                                  ref.invalidate(
                                    announcementDetailProvider(id),
                                  );
                                  ref.invalidate(announcementsListProvider);
                                },
                                child: const Text('Okundu İşaretle'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Hata: $e')),
        ),
      ),
    );
  }
}
