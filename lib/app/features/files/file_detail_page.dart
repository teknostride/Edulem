import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../core/utils/link_utils.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'files_providers.dart';
import 'files_paging_controller.dart';

final fileDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final repo = ref.read(filesRepositoryProvider);
  return repo.getById(id);
});

class FileDetailPage extends ConsumerWidget {
  const FileDetailPage({super.key, required this.id});

  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(fileDetailProvider(id));
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dosya Detayı'),
        actions: [
          IconButton(
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Silme Onayı'),
                  content: const Text(
                    'Bu dosyayı silmek istediğinize emin misiniz?',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      child: const Text('İptal'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(true),
                      child: const Text('Sil'),
                    ),
                  ],
                ),
              );
              if (confirmed != true) return;

              await ref.read(filesRepositoryProvider).deleteById(id);
              ref.invalidate(filesPagingProvider);
              if (context.mounted) {
                context.pop();
              }
            },
            icon: const Icon(Icons.delete_outline),
          ),
          IconButton(
            onPressed: () async {
              final path = detail.valueOrNull?['path']?.toString();
              if (path == null || path.isEmpty) return;
              await LinkUtils.openExternal(path);
            },
            icon: const Icon(Icons.download),
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: detail.when(
          data: (f) {
            final name = (f['name'] ?? '').toString();
            final size = (f['size'] ?? 0);
            final mime = (f['mime_type'] ?? '').toString();
            final path = (f['path'] ?? '').toString();
            final createdAt = (f['created_at'] ?? '').toString();

            return ListView(
              children: [
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name.isEmpty ? 'Dosya' : name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (size > 0) Text('Boyut: ${_formatBytes(size)}'),
                      if (mime.isNotEmpty) Text('Tür: $mime'),
                      if (createdAt.isNotEmpty) Text('Yüklenme: $createdAt'),
                      if (path.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        const Text(
                          'İndirme linki:',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        SelectableText(path),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            OutlinedButton.icon(
                              onPressed: () async {
                                await LinkUtils.copyToClipboard(path);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Link kopyalandı.'),
                                    ),
                                  );
                                }
                              },
                              icon: const Icon(Icons.copy),
                              label: const Text('Kopyala'),
                            ),
                            const SizedBox(width: 12),
                            ElevatedButton.icon(
                              onPressed: () => LinkUtils.openExternal(path),
                              icon: const Icon(Icons.open_in_new),
                              label: const Text('Aç'),
                            ),
                          ],
                        ),
                      ],
                    ],
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

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }
}
