import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_providers.dart';
import '../profile/profile_providers.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';

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

class EventsListPage extends ConsumerStatefulWidget {
  const EventsListPage({super.key});

  @override
  ConsumerState<EventsListPage> createState() => _EventsListPageState();
}

class _EventsListPageState extends ConsumerState<EventsListPage> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'all';
  String _selectedStatus = 'upcoming';
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
                    _selectedStatus = 'upcoming';
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
              DropdownMenuItem(value: 'cultural', child: Text('Kültürel')),
              DropdownMenuItem(value: 'sports', child: Text('Spor')),
              DropdownMenuItem(value: 'academic', child: Text('Akademik')),
              DropdownMenuItem(value: 'social', child: Text('Sosyal')),
              DropdownMenuItem(value: 'ceremony', child: Text('Tören')),
              DropdownMenuItem(value: 'meeting', child: Text('Toplantý')),
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
              DropdownMenuItem(value: 'upcoming', child: Text('Yaklaþan')),
              DropdownMenuItem(value: 'ongoing', child: Text('Devam Eden')),
              DropdownMenuItem(value: 'completed', child: Text('Tamamlanan')),
              DropdownMenuItem(value: 'cancelled', child: Text('Ýptal Edilen')),
            ],
            onChanged: (value) =>
                setState(() => _selectedStatus = value ?? 'upcoming'),
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

  String _formatDate(String dateStr) {
    if (dateStr.isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
    } catch (e) {
      return dateStr;
    }
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
      case 'cultural':
        return Colors.purple;
      case 'sports':
        return Colors.green;
      case 'academic':
        return Colors.blue;
      case 'social':
        return Colors.orange;
      case 'ceremony':
        return Colors.red;
      case 'meeting':
        return Colors.indigo;
      default:
        return Colors.grey;
    }
  }

  String _getCategoryText(String category) {
    switch (category.toLowerCase()) {
      case 'cultural':
        return 'Kültürel';
      case 'sports':
        return 'Spor';
      case 'academic':
        return 'Akademik';
      case 'social':
        return 'Sosyal';
      case 'ceremony':
        return 'Tören';
      case 'meeting':
        return 'Toplantý';
      default:
        return 'Diðer';
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'upcoming':
        return Colors.blue;
      case 'ongoing':
        return Colors.green;
      case 'completed':
        return Colors.grey;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'upcoming':
        return 'Yaklaþan';
      case 'ongoing':
        return 'Devam Eden';
      case 'completed':
        return 'Tamamlanan';
      case 'cancelled':
        return 'Ýptal Edilen';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role;
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    // Rol kontrolü
    bool isManagement =
        userRole != null &&
        managementRoles.any((r) => r.toLowerCase() == userRole.toLowerCase());

    // Simüle edilmiþ etkinlik verileri
    final List<Map<String, dynamic>> mockEvents = [
      {
        'id': 1,
        'title': 'Mezuniyet Töreni',
        'description': '2024 yýly mezuniyet töreni',
        'category': 'ceremony',
        'status': 'upcoming',
        'start_date': '2024-06-15T10:00:00',
        'end_date': '2024-06-15T12:00:00',
        'location': 'Konferans Salonu',
        'participant_count': 150,
        'max_participants': 200,
        'created_by': {'name': 'Ahmet Yýlmaz'},
        'created_at': '2024-01-15T09:00:00',
      },
      {
        'id': 2,
        'title': 'Basketbol Maçý',
        'description': 'Öðretmenler vs Öðrenciler dostluk maçý',
        'category': 'sports',
        'status': 'ongoing',
        'start_date': '2024-04-13T14:00:00',
        'end_date': '2024-04-13T16:00:00',
        'location': 'Spor Salonu',
        'participant_count': 24,
        'max_participants': 30,
        'created_by': {'name': 'Mehmet Öz'},
        'created_at': '2024-04-01T10:00:00',
      },
      {
        'id': 3,
        'title': 'Kitap Fuarý',
        'description': 'Yayýnevi ve yazar katýlýmlý kitap fuarý',
        'category': 'cultural',
        'status': 'completed',
        'start_date': '2024-03-20T09:00:00',
        'end_date': '2024-03-22T17:00:00',
        'location': 'Okul Bahçesi',
        'participant_count': 500,
        'max_participants': null,
        'created_by': {'name': 'Ayþe Demir'},
        'created_at': '2024-03-01T08:00:00',
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(isManagement ? 'Etkinlik Yönetimi' : 'Etkinlikler'),
        actions: [
          // Yöneticiler etkinlik oluþturabilir
          if (isManagement)
            IconButton(
              onPressed: () => context.push('/events/new'),
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
        onRefresh: () async {
          // Refresh logic
        },
        child: Column(
          children: [
            // Filtre paneli
            if (_showFilters) _buildFilterPanel(),
            // Liste
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: mockEvents.isEmpty
                    ? Center(
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
                      )
                    : ListView.separated(
                        itemCount: mockEvents.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final event = mockEvents[index];
                          final id = event['id'] as int? ?? -1;
                          final title = event['title']?.toString() ?? '';
                          final description =
                              event['description']?.toString() ?? '';
                          final category =
                              event['category']?.toString() ?? 'general';
                          final status =
                              event['status']?.toString() ?? 'upcoming';
                          final startDate = event['start_date']?.toString();
                          final endDate = event['end_date']?.toString();
                          final createdBy = event['created_by'] as Map?;
                          final createdAt = (event['created_at'] ?? '')
                              .toString();

                          return InkWell(
                            onTap: () => context.go('/events/$id'),
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
                                              Icons.event,
                                              color: _getCategoryColor(
                                                category,
                                              ),
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
                                              borderRadius:
                                                  BorderRadius.circular(8),
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
                                              borderRadius:
                                                  BorderRadius.circular(8),
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
                                  if (description.isNotEmpty) ...[
                                    Text(
                                      description,
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
                                  // Oluþturucu bilgisi
                                  if (createdBy != null) ...[
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.person_outline,
                                          size: 16,
                                          color: Colors.grey,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Oluþturucu: ${createdBy['name']}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: Colors.grey,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          _formatDate(createdAt),
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
