import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_providers.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import 'announcements_providers.dart';

// Mailbox türleri
typedef AnnouncementMailbox = String;
const String mailboxInbox = 'inbox';
const String mailboxSent = 'sent';
const String mailboxStarred = 'starred';
const String mailboxImportant = 'important';
const String mailboxScheduled = 'scheduled';
const String mailboxDrafts = 'drafts';
const String mailboxTrash = 'trash';

// Rol sabitleri
const teacherRoles = [
  'Öğretmen',
  'Sınıf Öğretmeni',
  'Rehberlik',
  'teacher',
  'guidance',
];
const managementRoles = [
  'owner',
  'Genel Müdür',
  'Kampüs Müdürü',
  'Müdür',
  'Müdür Yardımcısı',
  'Öğrenci İşleri',
  'student_affairs',
  'admin',
  'kurucu',
  'superadmin',
  'founder',
];

class AnnouncementsListPage extends ConsumerStatefulWidget {
  const AnnouncementsListPage({super.key});

  @override
  ConsumerState<AnnouncementsListPage> createState() =>
      _AnnouncementsListPageState();
}

class _AnnouncementsListPageState extends ConsumerState<AnnouncementsListPage> {
  final TextEditingController _searchController = TextEditingController();
  final Set<int> _selectedIds = {};
  bool _isSelectionMode = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String _formatDate(String dateStr) {
    if (dateStr.isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) return 'Şimdi';
      if (diff.inHours < 1) return '${diff.inMinutes} dk önce';
      if (diff.inDays < 1) return '${diff.inHours} sa önce';
      if (diff.inDays == 1) return 'Dün';
      if (diff.inDays < 7) return '${diff.inDays} gün önce';

      return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
    } catch (e) {
      return dateStr;
    }
  }

  Future<void> _handleMarkAsRead(int id) async {
    try {
      await ref.read(announcementsRepositoryProvider).markRead(id);
      ref.invalidate(announcementsListProvider);
      ref.invalidate(announcementsBadgeProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Okundu işaretlenemedi: $e')));
      }
    }
  }

  Future<void> _handleMarkAllRead() async {
    try {
      await ref.read(announcementsRepositoryProvider).markAllRead();
      ref.invalidate(announcementsListProvider);
      ref.invalidate(announcementsBadgeProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Tüm duyurular okundu olarak işaretlendi'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('İşlem başarısız: $e')));
      }
    }
  }

  Future<void> _handleToggleStar(int id, bool currentValue) async {
    try {
      await ref
          .read(announcementsRepositoryProvider)
          .toggleStar(id, value: !currentValue);
      ref.invalidate(announcementsListProvider);
      ref.invalidate(announcementsBadgeProvider);
    } catch (e) {
      // Silent fail
    }
  }

  Future<void> _handleToggleImportant(int id, bool currentValue) async {
    try {
      await ref
          .read(announcementsRepositoryProvider)
          .toggleImportant(id, value: !currentValue);
      ref.invalidate(announcementsListProvider);
      ref.invalidate(announcementsBadgeProvider);
    } catch (e) {
      // Silent fail
    }
  }

  Future<void> _handleDelete(int id, String currentMailbox) async {
    final isTrash = currentMailbox == mailboxTrash;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isTrash ? 'Kalıcı Sil' : 'Çöpe Taşı'),
        content: Text(
          isTrash
              ? 'Bu duyuruyu kalıcı olarak silmek istediğinizden emin misiniz?'
              : 'Bu duyuruyu çöpe taşımak istediğinizden emin misiniz?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: isTrash ? Colors.red : Colors.orange,
            ),
            child: Text(isTrash ? 'Sil' : 'Çöpe Taşı'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final repo = ref.read(announcementsRepositoryProvider);
      if (isTrash) {
        await repo.delete(id);
      } else {
        await repo.trash(id);
      }
      ref.invalidate(announcementsListProvider);
      ref.invalidate(announcementsBadgeProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(isTrash ? 'Duyuru silindi' : 'Çöpe taşındı')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('İşlem başarısız: $e')));
      }
    }
  }

  Future<void> _handleBulkDelete(String currentMailbox) async {
    if (_selectedIds.isEmpty) return;

    final isTrash = currentMailbox == mailboxTrash;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isTrash ? 'Toplu Sil' : 'Toplu Çöpe Taşı'),
        content: Text(
          '${_selectedIds.length} duyuruyu ${isTrash ? 'kalıcı olarak silmek' : 'çöpe taşımak'} istediğinizden emin misiniz?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: isTrash ? Colors.red : Colors.orange,
            ),
            child: Text(isTrash ? 'Sil' : 'Çöpe Taşı'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final repo = ref.read(announcementsRepositoryProvider);
      if (isTrash) {
        for (final id in _selectedIds) {
          await repo.delete(id);
        }
      } else {
        await repo.bulkTrash(_selectedIds.toList());
      }
      setState(() {
        _selectedIds.clear();
        _isSelectionMode = false;
      });
      ref.invalidate(announcementsListProvider);
      ref.invalidate(announcementsBadgeProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '${_selectedIds.length} duyuru ${isTrash ? 'silindi' : 'çöpe taşındı'}',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('İşlem başarısız: $e')));
      }
    }
  }

  Widget _buildBottomNavBar(
    String currentMailbox,
    Map<String, dynamic>? badgeData,
  ) {
    // API'den gelen değerler int veya String olabilir, güvenli parse et
    int parseIntValue(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    final unreadCount = parseIntValue(badgeData?['unread_count']);
    final starredCount = parseIntValue(badgeData?['starred_count']);
    final sentCount = parseIntValue(badgeData?['sent_count']);
    final importantCount = parseIntValue(badgeData?['important_count']);
    final trashCount = parseIntValue(badgeData?['trash_count']);

    // Mailbox'lardan sadece bazılarını bottom nav'da göster (max 5)
    final items = [
      _MailboxItem(
        icon: Icons.inbox,
        label: 'Gelen',
        mailbox: mailboxInbox,
        badge: unreadCount > 0 ? unreadCount : null,
      ),
      _MailboxItem(
        icon: Icons.star,
        label: 'Yıldızlı',
        mailbox: mailboxStarred,
        badge: starredCount > 0 ? starredCount : null,
      ),
      _MailboxItem(
        icon: Icons.priority_high,
        label: 'Önemli',
        mailbox: mailboxImportant,
        badge: importantCount > 0 ? importantCount : null,
      ),
      _MailboxItem(
        icon: Icons.send,
        label: 'Gönderilen',
        mailbox: mailboxSent,
        badge: sentCount > 0 ? sentCount : null,
      ),
      _MailboxItem(
        icon: Icons.delete,
        label: 'Çöp',
        mailbox: mailboxTrash,
        badge: trashCount > 0 ? trashCount : null,
      ),
    ];

    // Mevcut mailbox'in index'ini bul
    int currentIndex = 0;
    for (int i = 0; i < items.length; i++) {
      if (items[i].mailbox == currentMailbox) {
        currentIndex = i;
        break;
      }
    }

    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      currentIndex: currentIndex,
      onTap: (index) {
        ref.read(announcementsMailboxProvider.notifier).state =
            items[index].mailbox;
      },
      items: items.map((item) {
        return BottomNavigationBarItem(
          icon: Badge(
            isLabelVisible: item.badge != null && item.badge! > 0,
            label: item.badge != null ? Text(item.badge.toString()) : null,
            child: Icon(item.icon),
          ),
          label: item.label,
        );
      }).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role;
    final currentMailbox = ref.watch(announcementsMailboxProvider);
    final announcementsAsync = ref.watch(
      announcementsListProvider(currentMailbox),
    );
    final badgeAsync = ref.watch(announcementsBadgeProvider);

    final isManagement =
        userRole != null &&
        managementRoles.any((r) => r.toLowerCase() == userRole.toLowerCase());

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: _isSelectionMode
            ? Text('${_selectedIds.length} seçildi')
            : const Text('Duyurular'),
        actions: [
          if (_isSelectionMode) ...[
            IconButton(
              onPressed: () => _handleBulkDelete(currentMailbox),
              icon: const Icon(Icons.delete),
            ),
            IconButton(
              onPressed: () {
                setState(() {
                  _selectedIds.clear();
                  _isSelectionMode = false;
                });
              },
              icon: const Icon(Icons.close),
            ),
          ] else ...[
            IconButton(
              onPressed: () {
                  showSearch(
                    context: context,
                    delegate: _AnnouncementSearchDelegate(ref),
                  );
                },
                icon: const Icon(Icons.search),
              ),
            if (isManagement)
              IconButton(
                onPressed: () => context.push('/announcements/new'),
                icon: const Icon(Icons.add),
              ),
            PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'mark_all_read':
                    _handleMarkAllRead();
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'mark_all_read',
                  child: Row(
                    children: [
                      Icon(Icons.done_all),
                      SizedBox(width: 8),
                      Text('Tümünü okundu işaretle'),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      bottomNavigationBar: _buildBottomNavBar(
        currentMailbox,
        badgeAsync.valueOrNull,
      ),
      drawer: Consumer(
        builder: (context, ref, child) {
          final sections = ref.watch(drawerSectionsProvider);
          return AppDrawer(sections: sections);
        },
      ),
      body: announcementsAsync.when(
        data: (result) {
          // Debug: API yanıtını konsola yazdır
          debugPrint('Announcements API result: $result');

          final announcements = result['announcements'] as List<dynamic>? ?? [];
          debugPrint('Announcements count: ${announcements.length}');

          if (announcements.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    currentMailbox == mailboxTrash
                        ? Icons.delete_outline
                        : Icons.inbox_outlined,
                    size: 64,
                    color: Colors.grey.shade400,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _getEmptyStateText(currentMailbox),
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () => ref.invalidate(announcementsListProvider),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Yenile'),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: announcements.length,
            itemBuilder: (context, index) {
              final a = announcements[index] as Map<String, dynamic>;
              // ID int veya String olabilir
              final rawId = a['id'];
              final id = rawId is int
                  ? rawId
                  : (rawId is String ? int.tryParse(rawId) ?? 0 : 0);
              // API yanıt yapısı: direkt title/message (nested data yok)
              final title = a['title']?.toString() ?? 'Başlıksız';
              final message = a['message']?.toString() ?? '';
              final isRead = a['read'] == true || a['read'] == 1 || a['read'] == '1';
              final isStarred = a['is_starred'] == true || a['is_starred'] == 1 || a['is_starred'] == '1';
              final isImportant = a['is_important'] == true || a['is_important'] == 1 || a['is_important'] == '1';
              final createdAt = a['created_at']?.toString() ?? '';
              final userName =
                  a['user_name']?.toString() ??
                  a['sender_name']?.toString() ??
                  'Sistem';

              final isSelected = _selectedIds.contains(id);

              return InkWell(
                onLongPress: () {
                  setState(() {
                    _isSelectionMode = true;
                    _selectedIds.add(id);
                  });
                },
                onTap: () {
                  if (_isSelectionMode) {
                    setState(() {
                      if (isSelected) {
                        _selectedIds.remove(id);
                        if (_selectedIds.isEmpty) {
                          _isSelectionMode = false;
                        }
                      } else {
                        _selectedIds.add(id);
                      }
                    });
                  } else {
                    if (!isRead) {
                      _handleMarkAsRead(id);
                    }
                    context.push('/announcements/$id');
                  }
                },
                child: Container(
                  decoration: BoxDecoration(
                    color: isSelected
                        ? Colors.blue.shade50
                        : isRead
                        ? null
                        : Colors.blue.shade50.withValues(alpha: 0.3),
                    border: Border(
                      bottom: BorderSide(color: Colors.grey.shade200),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    child: Row(
                      children: [
                        if (_isSelectionMode)
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: Icon(
                              isSelected
                                  ? Icons.check_box
                                  : Icons.check_box_outline_blank,
                              color: Theme.of(context).primaryColor,
                            ),
                          ),
                        // Star button
                        IconButton(
                          onPressed: () => _handleToggleStar(id, isStarred),
                          icon: Icon(
                            isStarred ? Icons.star : Icons.star_border,
                            color: isStarred ? Colors.amber : Colors.grey,
                          ),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          iconSize: 20,
                        ),
                        const SizedBox(width: 8),
                        // Important indicator
                        if (isImportant)
                          const Padding(
                            padding: EdgeInsets.only(right: 8),
                            child: Icon(
                              Icons.priority_high,
                              color: Colors.red,
                              size: 16,
                            ),
                          ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      userName,
                                      style: TextStyle(
                                        fontWeight: isRead
                                            ? FontWeight.normal
                                            : FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Text(
                                    _formatDate(createdAt),
                                    style: TextStyle(
                                      color: Colors.grey.shade600,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                title,
                                style: TextStyle(
                                  fontWeight: isRead
                                      ? FontWeight.normal
                                      : FontWeight.bold,
                                  fontSize: 15,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                message
                                    .replaceAll(RegExp(r'<[^>]*>'), ' ')
                                    .replaceAll('&nbsp;', ' ')
                                    .replaceAll('&amp;', '&')
                                    .replaceAll('&lt;', '<')
                                    .replaceAll('&gt;', '>')
                                    .replaceAll('&quot;', '"')
                                    .replaceAll('&#39;', "'")
                                    .trim(),
                                style: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontSize: 13,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        // Actions popup
                        if (!_isSelectionMode)
                          PopupMenuButton<String>(
                            onSelected: (value) {
                              switch (value) {
                                case 'important':
                                  _handleToggleImportant(id, isImportant);
                                  break;
                                case 'delete':
                                  _handleDelete(id, currentMailbox);
                                  break;
                              }
                            },
                            itemBuilder: (context) => [
                              PopupMenuItem(
                                value: 'important',
                                child: Row(
                                  children: [
                                    Icon(
                                      isImportant
                                          ? Icons.label_off
                                          : Icons.label,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      isImportant
                                          ? 'Önemli değil'
                                          : 'Önemli işaretle',
                                    ),
                                  ],
                                ),
                              ),
                              PopupMenuItem(
                                value: 'delete',
                                child: Row(
                                  children: [
                                    Icon(
                                      currentMailbox == mailboxTrash
                                          ? Icons.delete_forever
                                          : Icons.delete,
                                      color: Colors.red,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      currentMailbox == mailboxTrash
                                          ? 'Kalıcı Sil'
                                          : 'Çöpe Taşı',
                                      style: const TextStyle(color: Colors.red),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Hata: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(announcementsListProvider),
                child: const Text('Yeniden Dene'),
              ),
            ],
          ),
        ),
      ),
    );
  }
  String _getEmptyStateText(String mailbox) {
    switch (mailbox) {
      case mailboxStarred:
        return 'Yıldızlı mesaj yok';
      case mailboxImportant:
        return 'Önemli mesaj yok';
      case mailboxSent:
        return 'Gönderilen mesaj yok';
      case mailboxTrash:
        return 'Çöp kutusu boş';
      default:
        return 'Gelen kutunuz boş';
    }
  }
}

class _MailboxItem {
  final IconData icon;
  final String label;
  final String mailbox;
  final int? badge;

  _MailboxItem({
    required this.icon,
    required this.label,
    required this.mailbox,
    this.badge,
  });
}

// Arama delegate
class _AnnouncementSearchDelegate extends SearchDelegate<String> {
  final WidgetRef _ref;

  _AnnouncementSearchDelegate(this._ref);

  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      if (query.isNotEmpty)
        IconButton(
          onPressed: () {
            query = '';
          },
          icon: const Icon(Icons.clear),
        ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      onPressed: () => close(context, ''),
      icon: const Icon(Icons.arrow_back),
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    _ref.read(announcementsSearchProvider.notifier).state = query;
    _ref.invalidate(announcementsListProvider);
    close(context, query);
    return const SizedBox.shrink();
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    return const SizedBox.shrink();
  }
}
