import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_providers.dart';
import '../profile/profile_providers.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import 'internal_messages_providers.dart';

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

class InternalMessagesListPage extends ConsumerStatefulWidget {
  const InternalMessagesListPage({super.key});

  @override
  ConsumerState<InternalMessagesListPage> createState() =>
      _InternalMessagesListPageState();
}

class _InternalMessagesListPageState
    extends ConsumerState<InternalMessagesListPage> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedPriority = 'all';
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
                    _selectedPriority = 'all';
                    _selectedStatus = 'all';
                  });
                },
                child: const Text('Temizle'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _selectedPriority,
            items: const [
              DropdownMenuItem(value: 'all', child: Text('Tüm Öncelikler')),
              DropdownMenuItem(value: 'low', child: Text('Düþük')),
              DropdownMenuItem(value: 'medium', child: Text('Orta')),
              DropdownMenuItem(value: 'high', child: Text('Yüksek')),
              DropdownMenuItem(value: 'urgent', child: Text('Acil')),
            ],
            onChanged: (value) =>
                setState(() => _selectedPriority = value ?? 'all'),
            decoration: const InputDecoration(
              labelText: 'Öncelik',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _selectedStatus,
            items: const [
              DropdownMenuItem(value: 'all', child: Text('Tüm Durumlar')),
              DropdownMenuItem(value: 'unread', child: Text('Okunmamýþ')),
              DropdownMenuItem(value: 'read', child: Text('Okunmuþ')),
              DropdownMenuItem(value: 'replied', child: Text('Yanýtlanmýþ')),
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
              labelText: 'Mesaj Ara',
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
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays == 0) {
        return 'Bugün ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
      } else if (difference.inDays == 1) {
        return 'Dün ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
      } else if (difference.inDays < 7) {
        return '${difference.inDays} gün önce';
      } else {
        return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
      }
    } catch (e) {
      return dateStr;
    }
  }

  Color _getPriorityColor(int priority) {
    switch (priority) {
      case 3: // urgent
        return Colors.red;
      case 2: // high
        return Colors.orange;
      case 1: // medium
        return Colors.amber;
      case 0: // low
      default:
        return Colors.grey;
    }
  }

  String _getPriorityText(int priority) {
    switch (priority) {
      case 3:
        return 'Acil';
      case 2:
        return 'Yüksek';
      case 1:
        return 'Orta';
      case 0:
        return 'Düþük';
      default:
        return 'Normal';
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role;
    final messages = ref.watch(internalMessagesListProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    // Rol kontrolü
    bool isManagement =
        userRole != null &&
        managementRoles.any((r) => r.toLowerCase() == userRole.toLowerCase());

    return Scaffold(
      appBar: AppBar(
        title: Text(isManagement ? 'Mesaj Yönetimi' : 'Dahili Mesajlar'),
        actions: [
          // Tüm roller mesaj gönderebilir
          IconButton(
            onPressed: () => context.push('/internal-messages/new'),
            icon: const Icon(Icons.add),
            tooltip: 'Yeni Mesaj',
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
                hintText: 'Mesaj ara...',
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
        onRefresh: () async => ref.invalidate(internalMessagesListProvider),
        child: Column(
          children: [
            // Filtre paneli
            if (_showFilters) _buildFilterPanel(),
            // Liste
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: messages.when(
                  data: (items) {
                    if (items.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.mail_outline,
                              size: 64,
                              color: Colors.grey.shade400,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Mesaj bulunamadý',
                              style: TextStyle(
                                fontSize: 18,
                                color: Colors.grey.shade600,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Yeni mesaj oluþturmak için + butonuna basýn',
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
                        final msg = items[index];
                        final id = msg['id'] as int? ?? 0;
                        final subject =
                            msg['subject']?.toString() ?? 'Konu yok';
                        final sender = msg['sender'] as Map?;
                        final isRead = msg['is_read'] == true;
                        final priority = msg['priority'] as int? ?? 0;
                        final sentAt = msg['sent_at']?.toString() ?? '';
                        final content = msg['content']?.toString() ?? '';

                        // Web parity verileri
                        final recipient = msg['recipient'] as Map?;
                        final attachments = msg['attachments'] as List? ?? [];
                        final replyCount = msg['reply_count'] ?? 0;
                        final isImportant = msg['is_important'] == true;

                        return InkWell(
                          onTap: id > 0
                              ? () => context.push('/internal-messages/$id')
                              : null,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isRead
                                  ? Colors.white
                                  : Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.05),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                              // Önemli mesaj rengi
                              border: isImportant
                                  ? Border.all(
                                      color: Colors.red.shade300,
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
                                            isRead
                                                ? Icons.mail_outline
                                                : Icons.mail,
                                            color: isRead
                                                ? Colors.grey
                                                : Colors.blue,
                                            size: 20,
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              subject,
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: isRead
                                                    ? FontWeight.w500
                                                    : FontWeight.w700,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          if (isImportant)
                                            const Icon(
                                              Icons.star,
                                              color: Colors.red,
                                              size: 16,
                                            ),
                                        ],
                                      ),
                                    ),
                                    // Durum chip'leri
                                    Row(
                                      children: [
                                        // Öncelik chip'i
                                        if (priority > 0)
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color: _getPriorityColor(
                                                priority,
                                              ).withValues(alpha: 0.1),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              _getPriorityText(priority),
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: _getPriorityColor(
                                                  priority,
                                                ),
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        if (!isRead && priority > 0)
                                          const SizedBox(width: 4),
                                        // Durum chip'i
                                        if (!isRead)
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color: Colors.blue.withValues(
                                                alpha: 0.1,
                                              ),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                            child: const Text(
                                              'Okunmamýþ',
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: Colors.blue,
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
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 12),
                                ],
                                // Meta bilgiler
                                Row(
                                  children: [
                                    if (sender != null &&
                                        sender['name'] != null) ...[
                                      Icon(
                                        Icons.person_outline,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        sender['name'].toString(),
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                    ],
                                    if (sentAt.isNotEmpty) ...[
                                      Icon(
                                        Icons.schedule_outlined,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        _formatDate(sentAt),
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                    ],
                                    if (replyCount > 0) ...[
                                      Icon(
                                        Icons.reply,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        '$replyCount yanýt',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                // Alýcý bilgisi
                                if (recipient != null &&
                                    recipient['name'] != null) ...[
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.send_outlined,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Alýcý: ${recipient['name']}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                                // Ek bilgiler
                                if (attachments.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
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
