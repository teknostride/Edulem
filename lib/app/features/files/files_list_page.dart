import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:file_picker/file_picker.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'files_providers.dart';
import 'files_paging_controller.dart';

class FilesListPage extends ConsumerStatefulWidget {
  const FilesListPage({super.key});

  @override
  ConsumerState<FilesListPage> createState() => _FilesListPageState();
}

class _FilesListPageState extends ConsumerState<FilesListPage> {
  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
  }

  void _onScroll() {
    final state = ref.read(filesPagingProvider);
    if (state.isLoadingMore || !state.hasMore) return;

    final pos = _scrollController.position;
    if (!pos.hasPixels || !pos.hasContentDimensions) return;

    if (pos.pixels > pos.maxScrollExtent - 240) {
      ref.read(filesPagingProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _uploadFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        allowMultiple: false,
      );

      if (result == null || result.files.isEmpty) return;

      final file = result.files.first;
      final path = file.path;
      if (path == null) return;

      await ref
          .read(filesRepositoryProvider)
          .upload(filePath: path, fileName: file.name);

      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Dosya yüklendi.')));
      }

      ref.invalidate(filesPagingProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Yükleme hatası: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final paging = ref.watch(filesPagingProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dosyalar'),
        actions: [
          IconButton(
            onPressed: _uploadFile,
            icon: const Icon(Icons.upload_file),
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        // Riverpod 2.6.1 sürümü için valueOrNull yerine .value kullanıldı
        headerSubtitle: profile.value?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(filesPagingProvider.notifier).loadInitial(),
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

                    final f = paging.items[index];
                    final id = (f['id'] is int)
                        ? f['id'] as int
                        : int.tryParse('${f['id']}') ?? -1;
                    final name = (f['name'] ?? '').toString();
                    final size = (f['size'] ?? 0);
                    final mime = (f['mime_type'] ?? '').toString();
                    final createdAt = (f['created_at'] ?? '').toString();

                    return AppCard(
                      child: ListTile(
                        leading: Icon(_iconForMime(mime)),
                        title: Text(
                          name.isEmpty ? 'Dosya' : name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (size > 0) Text('Boyut: ${_formatBytes(size)}'),
                            if (mime.isNotEmpty) Text(mime),
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
                        trailing: IconButton(
                          icon: const Icon(Icons.download),
                          onPressed: () {
                            if (id > 0) {
                              context.go('/files/$id');
                            }
                          },
                        ),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }

  IconData _iconForMime(String mime) {
    final lower = mime.toLowerCase();
    if (lower.startsWith('image/')) return Icons.image;
    if (lower.startsWith('video/')) return Icons.video_file;
    if (lower.startsWith('audio/')) return Icons.audio_file;
    if (lower.contains('pdf')) return Icons.picture_as_pdf;
    if (lower.contains('word') || lower.contains('document')) {
      return Icons.description;
    }
    if (lower.contains('sheet') || lower.contains('excel')) {
      return Icons.grid_on;
    }
    if (lower.contains('presentation') || lower.contains('powerpoint')) {
      return Icons.slideshow;
    }
    if (lower.contains('zip') ||
        lower.contains('rar') ||
        lower.contains('archive')) {
      return Icons.archive;
    }
    return Icons.insert_drive_file;
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
