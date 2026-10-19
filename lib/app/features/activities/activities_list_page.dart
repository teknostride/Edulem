import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_providers.dart';
import '../profile/profile_providers.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import 'activities_providers.dart';

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

class ActivitiesListPage extends ConsumerStatefulWidget {
  const ActivitiesListPage({super.key});

  @override
  ConsumerState<ActivitiesListPage> createState() => _ActivitiesListPageState();
}

class _ActivitiesListPageState extends ConsumerState<ActivitiesListPage> {
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
              DropdownMenuItem(value: 'sports', child: Text('Spor')),
              DropdownMenuItem(value: 'cultural', child: Text('Kültürel')),
              DropdownMenuItem(value: 'academic', child: Text('Akademik')),
              DropdownMenuItem(value: 'social', child: Text('Sosyal')),
              DropdownMenuItem(value: 'volunteer', child: Text('Gönüllülük')),
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
              DropdownMenuItem(value: 'pending', child: Text('Beklemede')),
              DropdownMenuItem(value: 'approved', child: Text('Onaylandý')),
              DropdownMenuItem(value: 'rejected', child: Text('Reddedildi')),
              DropdownMenuItem(value: 'completed', child: Text('Tamamlandý')),
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
              labelText: 'Etkinlik Ara',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(String dateStr) {
    if (dateStr.isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateStr;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'sports':
        return Colors.green;
      case 'cultural':
        return Colors.purple;
      case 'academic':
        return Colors.blue;
      case 'social':
        return Colors.orange;
      case 'volunteer':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getCategoryText(String category) {
    switch (category.toLowerCase()) {
      case 'sports':
        return 'Spor';
      case 'cultural':
        return 'Kültürel';
      case 'academic':
        return 'Akademik';
      case 'social':
        return 'Sosyal';
      case 'volunteer':
        return 'Gönüllülük';
      default:
        return 'Diðer';
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return Colors.orange;
      case 'approved':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      case 'completed':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Onaylandý';
      case 'rejected':
        return 'Reddedildi';
      case 'completed':
        return 'Tamamlandý';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role;
    final activities = ref.watch(activitiesListProvider);
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
        title: Text(isManagement ? 'Etkinlik Yönetimi' : 'Etkinlikler'),
        actions: [
          // Öðretmenler ve yöneticiler etkinlik oluþturabilir
          if (isTeacher || isManagement)
            IconButton(
              onPressed: () => context.push('/activities/new'),
              icon: const Icon(Icons.add),
              tooltip: 'Yeni Etkinlik',
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
                hintText: 'Etkinlik ara...',
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
        onRefresh: () async => ref.invalidate(activitiesListProvider),
        child: Column(
          children: [
            // Filtre paneli
            if (_showFilters) _buildFilterPanel(),
            // Liste
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: activities.when(
                  data: (items) {
                    if (items.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.event_outlined,
                              size: 64,
                              color: Colors.grey.shade400,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Etkinlik bulunamadý',
                              style: TextStyle(
                                fontSize: 18,
                                color: Colors.grey.shade600,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Yeni etkinlik oluþturmak için + butonuna basýn',
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
                        final activity = items[index];
                        final id = activity['id'] as int? ?? 0;
                        final title =
                            activity['title']?.toString() ?? 'Ýsimsiz';
                        final description = activity['description']?.toString();
                        final location = activity['location']?.toString();
                        final startDate = activity['start_date']?.toString();
                        final endDate = activity['end_date']?.toString();
                        final isApproved = activity['is_approved'] == true;
                        final participantsCount =
                            activity['participants_count'] ?? 0;
                        final likesCount = activity['likes_count'] ?? 0;
                        final category =
                            activity['category']?.toString() ?? 'other';
                        final status =
                            activity['status']?.toString() ?? 'pending';

                        // Web parity verileri
                        final organizer = activity['organizer'] as Map?;
                        final maxParticipants = activity['max_participants'];
                        final attachments =
                            activity['attachments'] as List? ?? [];
                        final tags = activity['tags'] as List? ?? [];

                        return InkWell(
                          onTap: id > 0
                              ? () => context.push('/activities/$id')
                              : null,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withAlpha(12),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                              // Durum rengi
                              border: Border.all(
                                color: _getStatusColor(
                                  status,
                                ).withValues(alpha: 0.3),
                                width: 1,
                              ),
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
                                            isApproved
                                                ? Icons.event_available
                                                : Icons.event,
                                            color: isApproved
                                                ? Colors.green
                                                : Colors.orange,
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
                                if (description?.isNotEmpty == true) ...[
                                  Text(
                                    description!,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      color: Colors.black87,
                                      height: 1.4,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 12),
                                ],
                                // Tarih ve konum bilgileri
                                Row(
                                  children: [
                                    Icon(
                                      Icons.schedule_outlined,
                                      size: 16,
                                      color: Colors.grey,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      _formatDateTime(startDate!),
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey,
                                      ),
                                    ),
                                    if (endDate?.isNotEmpty == true &&
                                        endDate != startDate) ...[
                                      const SizedBox(width: 4),
                                      const Text(
                                        '-',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        _formatDateTime(endDate!),
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                if (location?.isNotEmpty == true) ...[
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.location_on_outlined,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        location!,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                                // Katýlýmcý bilgileri
                                if (participantsCount > 0) ...[
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.people_outline,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        '$participantsCount katýlýmcý',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                      if (maxParticipants != null) ...[
                                        const SizedBox(width: 4),
                                        Text(
                                          '/$maxParticipants',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                      if (likesCount > 0) ...[
                                        const SizedBox(width: 8),
                                        Icon(
                                          Icons.favorite_outline,
                                          size: 16,
                                          color: Colors.grey,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '$likesCount beðeni',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                                // Ek bilgiler
                                if (organizer != null ||
                                    attachments.isNotEmpty ||
                                    tags.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      if (organizer != null &&
                                          organizer['name'] != null) ...[
                                        Icon(
                                          Icons.person_outline,
                                          size: 16,
                                          color: Colors.grey,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          organizer['name'].toString(),
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                      if (attachments.isNotEmpty) ...[
                                        const SizedBox(width: 8),
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
                  error: (e, _) => Center(child: Text('Hata: $e')),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
