import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_providers.dart';
import '../profile/profile_providers.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import 'bulletins_providers.dart';

// Rol sabitleri
const teacherRoles = [
  'Öðretmen',
  'Sýnýf Öðretmeni',
  'Rehberlik',
  'teacher',
  'guidance',
];
const managementRoles = [
  'owner',
  'Genel Müdür',
  'Kampüs Müdürü',
  'Müdür',
  'Müdür Yardýmcýsý',
  'Öðrenci Ýþleri',
  'student_affairs',
  'admin',
  'kurucu',
  'superadmin',
  'founder',
];

class BulletinsListPage extends ConsumerStatefulWidget {
  const BulletinsListPage({super.key});

  @override
  ConsumerState<BulletinsListPage> createState() => _BulletinsListPageState();
}

class _BulletinsListPageState extends ConsumerState<BulletinsListPage> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'all';
  String _selectedStatus = 'all';
  bool _showFilters = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Widget _buildFilterPanel() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Filtreler',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              TextButton(
                onPressed: () {
                  setState(() {
                    _searchController.clear();
                    _selectedCategory = 'all';
                    _selectedStatus = 'all';
                  });
                },
                child: const Text('Temizle'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _selectedCategory,
            items: const [
              DropdownMenuItem(value: 'all', child: Text('Tüm Kategoriler')),
              DropdownMenuItem(value: 'academic', child: Text('Akademik')),
              DropdownMenuItem(value: 'cultural', child: Text('Kültürel')),
              DropdownMenuItem(value: 'sports', child: Text('Spor')),
              DropdownMenuItem(value: 'social', child: Text('Sosyal')),
              DropdownMenuItem(value: 'general', child: Text('Genel')),
            ],
            onChanged: (value) =>
                setState(() => _selectedCategory = value ?? 'all'),
            decoration: const InputDecoration(
              labelText: 'Kategori',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _selectedStatus,
            items: const [
              DropdownMenuItem(value: 'all', child: Text('Tüm Durumlar')),
              DropdownMenuItem(value: 'draft', child: Text('Taslak')),
              DropdownMenuItem(value: 'published', child: Text('Yayýnda')),
              DropdownMenuItem(value: 'archived', child: Text('Arþivlenmiþ')),
            ],
            onChanged: (value) =>
                setState(() => _selectedStatus = value ?? 'all'),
            decoration: const InputDecoration(
              labelText: 'Durum',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _searchController,
            decoration: const InputDecoration(
              labelText: 'Bülten Ara',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    if (dateStr.isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
    } catch (e) {
      return dateStr;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'academic':
        return Colors.blue;
      case 'cultural':
        return Colors.purple;
      case 'sports':
        return Colors.green;
      case 'social':
        return Colors.orange;
      case 'general':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String _getCategoryText(String category) {
    switch (category.toLowerCase()) {
      case 'academic':
        return 'Akademik';
      case 'cultural':
        return 'Kültürel';
      case 'sports':
        return 'Spor';
      case 'social':
        return 'Sosyal';
      case 'general':
        return 'Genel';
      default:
        return 'Diðer';
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'draft':
        return Colors.grey;
      case 'published':
        return Colors.green;
      case 'archived':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'Taslak';
      case 'published':
        return 'Yayýnda';
      case 'archived':
        return 'Arþivlenmiþ';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role;
    final bulletins = ref.watch(bulletinsListProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    // Rol kontrolü
    bool isTeacher =
        userRole != null &&
        teacherRoles.any((r) => r.toLowerCase() == userRole.toLowerCase());
    bool isManagement =
        userRole != null &&
        managementRoles.any((r) => r.toLowerCase() == userRole.toLowerCase());

    return Scaffold(
      appBar: AppBar(
        title: Text(isManagement ? 'Bülten Yönetimi' : 'Bültenler'),
        actions: [
          // Öðretmenler ve yöneticiler bülten oluþturabilir
          if (isTeacher || isManagement)
            IconButton(
              onPressed: () => context.push('/bulletins/new'),
              icon: const Icon(Icons.add),
              tooltip: 'Yeni Bülten',
            ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      // Arama ve filtreleme
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Filtre butonu
          FloatingActionButton(
            heroTag: 'filter',
            onPressed: () => setState(() => _showFilters = !_showFilters),
            backgroundColor: Theme.of(
              context,
            ).primaryColor.withValues(alpha: 0.9),
            child: Icon(_showFilters ? Icons.filter_alt : Icons.filter_list),
          ),
          const SizedBox(height: 12),
          // Arama çubuðu
          Container(
            margin: const EdgeInsets.only(bottom: 80),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Bülten ara...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () =>
                            setState(() => _searchController.clear()),
                      )
                    : null,
                border: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(bulletinsListProvider),
        child: Column(
          children: [
            // Filtre paneli
            if (_showFilters) _buildFilterPanel(),
            // Liste
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: bulletins.when(
                  data: (items) {
                    if (items.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.article_outlined,
                              size: 64,
                              color: Colors.grey.shade400,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Bülten bulunamadý',
                              style: TextStyle(
                                fontSize: 18,
                                color: Colors.grey.shade600,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Yeni bülten oluþturmak için + butonuna basýn',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey.shade500,
                              ),
                            ),
                          ],
                        ),
                      );
                    }
                    return ListView.separated(
                      itemCount: items.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final bulletin = items[index];
                        final id = bulletin['id'] as int? ?? 0;
                        final title =
                            bulletin['title']?.toString() ?? 'Ýsimsiz';
                        final content = bulletin['content']?.toString() ?? '';
                        final author = bulletin['author'] as Map?;
                        final isPublished = bulletin['is_published'] == true;
                        final publishedAt =
                            bulletin['published_at']?.toString() ?? '';
                        final student = bulletin['student'] as Map?;
                        final category =
                            bulletin['category']?.toString() ?? 'general';
                        final status = isPublished ? 'published' : 'draft';

                        // Web parity verileri
                        final viewCount = bulletin['view_count'] ?? 0;
                        final attachments =
                            bulletin['attachments'] as List? ?? [];
                        final tags = bulletin['tags'] as List? ?? [];
                        final featured = bulletin['is_featured'] == true;

                        return InkWell(
                          onTap: id > 0
                              ? () => context.push('/bulletins/$id')
                              : null,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.05),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                              // Öne çýkan bülten rengi
                              border: featured
                                  ? Border.all(
                                      color: Colors.amber.shade300,
                                      width: 2,
                                    )
                                  : null,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Baþlýk ve durum
                                Row(
                                  children: [
                                    Expanded(
                                      child: Row(
                                        children: [
                                          Icon(
                                            isPublished
                                                ? Icons.article
                                                : Icons.edit_note,
                                            color: isPublished
                                                ? Colors.blue
                                                : Colors.grey,
                                            size: 20,
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              title,
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.w700,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          if (featured)
                                            const Icon(
                                              Icons.star,
                                              color: Colors.amber,
                                              size: 16,
                                            ),
                                        ],
                                      ),
                                    ),
                                    // Durum chip'leri
                                    Row(
                                      children: [
                                        // Kategori chip'i
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            color: _getCategoryColor(
                                              category,
                                            ).withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                          ),
                                          child: Text(
                                            _getCategoryText(category),
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: _getCategoryColor(
                                                category,
                                              ),
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        // Durum chip'i
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            color: _getStatusColor(
                                              status,
                                            ).withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                          ),
                                          child: Text(
                                            _getStatusText(status),
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: _getStatusColor(status),
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                // Açýklama
                                if (content.isNotEmpty) ...[
                                  Text(
                                    content,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      color: Colors.black87,
                                      height: 1.4,
                                    ),
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 12),
                                ],
                                // Meta bilgiler
                                Row(
                                  children: [
                                    if (author != null &&
                                        author['name'] != null) ...[
                                      Icon(
                                        Icons.person_outline,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        author['name'].toString(),
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                    ],
                                    if (publishedAt.isNotEmpty) ...[
                                      Icon(
                                        Icons.schedule_outlined,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        _formatDate(publishedAt),
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                    ],
                                    if (viewCount > 0) ...[
                                      Icon(
                                        Icons.visibility_outlined,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        '$viewCount görüntülenme',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                // Öðrenci bilgisi
                                if (student != null &&
                                    student['name'] != null) ...[
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.school_outlined,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Öðrenci: ${student['name']}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                                // Ek bilgiler
                                if (attachments.isNotEmpty ||
                                    tags.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      if (attachments.isNotEmpty) ...[
                                        Icon(
                                          Icons.attach_file_outlined,
                                          size: 16,
                                          color: Colors.grey,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${attachments.length} ek',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                      if (tags.isNotEmpty) ...[
                                        const SizedBox(width: 8),
                                        Icon(
                                          Icons.tag_outlined,
                                          size: 16,
                                          color: Colors.grey,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${tags.length} etiket',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 64,
                          color: Colors.red.shade400,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Hata',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.red.shade600,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '$e',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.red.shade500,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
