import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client_provider.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'messages_unread_providers.dart';

class ConversationsListPage extends ConsumerStatefulWidget {
  const ConversationsListPage({super.key});

  @override
  ConsumerState<ConversationsListPage> createState() =>
      _ConversationsListPageState();
}

class _ConversationsListPageState extends ConsumerState<ConversationsListPage> {
  final _searchController = TextEditingController();
  bool _isLoading = true;
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _filteredUsers = [];
  Map<int, Map<String, dynamic>> _lastMessages = {};

  @override
  void initState() {
    super.initState();
    _loadData();
    _searchController.addListener(_filterUsers);
  }

  Future<void> _loadData() async {
    // Önce kullanıcıları çek, sonra konuşmaları (sıralama için kullanıcıların yüklenmiş olması gerekir)
    await _fetchUsers();
    await _fetchConversations();
  }

  Future<void> _fetchUsers() async {
    try {
      final api = ref.read(apiClientProvider);
      final profile = ref.read(profileProvider).valueOrNull;
      final currentUserId = profile?['id'];

      // Öğrenci kontrolü
      final role = (profile?['role'] ?? '').toString().toLowerCase();
      final isStudent =
          role.contains('student') ||
          role.contains('ogrenci') ||
          role.contains('öğrenci');

      final queryParams = <String, String>{
        'per_page': '100',
        'for_messaging': '1',
        'role': 'owner,Genel Müdür,Kampüs Müdürü,Müdür,Müdür Yardımcısı,Öğretmen,Rehberlik,Öğrenci İşleri,Muhasebe,Sınıf Öğretmeni',
      };
      if (isStudent) {
        final campusId = profile?['campus_id'] ?? profile?['school_id'];
        if (campusId != null) {
          queryParams['campus_id'] = campusId.toString();
        }
      }

      final response = await api.getJson(
        '/users',
        queryParameters: queryParams,
      );

      final dynamic rawUsers = response['users'] ?? response['data'] ?? response['value'];
      final List<dynamic> usersList = rawUsers is List
          ? rawUsers
          : (rawUsers is Map && rawUsers['users'] is List ? rawUsers['users'] as List<dynamic> : []);

      if (mounted) {
        setState(() {
          _users = usersList
              .where((u) => u is Map && u['id'] != currentUserId)
              .where((u) {
                // Kurum personeli listesinde sadece personel göster (öğrenci ve veliler hariç)
                final userRole =
                    ((u['role'] is Map
                                ? u['role']['name'] ??
                                      u['role']['key'] ??
                                      u['role']['slug'] ??
                                      u['role']['display_name']
                                : u['role'] ?? u['role_name']) ??
                            '')
                        .toString()
                        .toLowerCase();
                return !userRole.contains('student') &&
                    !userRole.contains('ogrenci') &&
                    !userRole.contains('öğrenci') &&
                    !userRole.contains('guardian') &&
                    !userRole.contains('veli');
              })
              .map((u) => Map<String, dynamic>.from(u as Map))
              .toList();
          _filteredUsers = List.from(_users);
          _sortUsersByLastMessage();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _fetchConversations() async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.getJson(
        '/messages/conversations',
        queryParameters: {'page': '1', 'per_page': '100'},
      );
      // Farklı API yanıt yapılarını handle et
      List<dynamic> conversations = [];
      if (response['conversations'] is List) {
        conversations = response['conversations'] as List;
      } else if (response['data'] is Map &&
          response['data']['conversations'] is List) {
        conversations = response['data']['conversations'] as List;
      } else if (response['data'] is List) {
        conversations = response['data'] as List;
      }

      final lastMsgs = <int, Map<String, dynamic>>{};
      final currentUserId = ref.read(profileProvider).valueOrNull?['id'];
      for (final c in conversations) {
        // API 'user' veya 'other_user' döndürüyor
        final otherUser =
            (c['other_user'] ?? c['user']) as Map<String, dynamic>?;
        final otherUserId = otherUser?['id'] as int?;
        if (otherUserId != null && otherUserId != currentUserId) {
          // last_message obje olarak gelirse content'i al, yoksa string olarak al
          final lastMsg = c['last_message'];
          String messageContent = '';
          int? senderId;

          if (lastMsg is Map) {
            messageContent =
                lastMsg['content']?.toString() ??
                lastMsg['body']?.toString() ??
                '';
            senderId = lastMsg['sender_id'] as int?;
          } else {
            messageContent = lastMsg?.toString() ?? '';
          }

          lastMsgs[otherUserId] = {
            'message': messageContent,
            'time':
                c['updated_at']?.toString() ??
                c['last_message_at']?.toString() ??
                '',
            'unread': c['unread_count'] ?? 0,
            'is_me': senderId == currentUserId,
          };
        }
      }

      if (mounted) {
        setState(() {
          _lastMessages = lastMsgs;
          _sortUsersByLastMessage();
          _isLoading = false; // Veri tamamen yüklendi ve sıralandı
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _sortUsersByLastMessage() {
    _users.sort((a, b) {
      final aId = a['id'] as int;
      final bId = b['id'] as int;
      final aTime = _lastMessages[aId]?['time']?.toString() ?? '';
      final bTime = _lastMessages[bId]?['time']?.toString() ?? '';

      // Eğer her ikisinin de son mesajı varsa, zamana göre sırala (en yeni üstte)
      if (aTime.isNotEmpty && bTime.isNotEmpty) {
        return bTime.compareTo(aTime); // Descending (en yeni üstte)
      }
      // Son mesajı olan üstte
      if (aTime.isNotEmpty) return -1;
      if (bTime.isNotEmpty) return 1;
      // İkisinin de mesajı yoksa isme göre sırala
      final aName = (a['name'] ?? '').toString();
      final bName = (b['name'] ?? '').toString();
      return aName.compareTo(bName);
    });
    // _filteredUsers'ı da aynı şekilde sıralanmış kopya olarak güncelle
    _filteredUsers = List.from(_users);
  }

  void _filterUsers() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        // Arama boşsa, sıralanmış tüm kullanıcıları göster
        _filteredUsers = List.from(_users);
        // Sıralamayı koru: mesajı olanlar üstte (zamana göre), mesajı olmayanlar altta (A-Z)
        _filteredUsers.sort((a, b) {
          final aId = a['id'] as int;
          final bId = b['id'] as int;
          final aTime = _lastMessages[aId]?['time']?.toString() ?? '';
          final bTime = _lastMessages[bId]?['time']?.toString() ?? '';
          // Her ikisinin de mesajı varsa, zamana göre sırala (en yeni üstte)
          if (aTime.isNotEmpty && bTime.isNotEmpty) {
            return bTime.compareTo(aTime);
          }
          // Mesajı olan üstte
          if (aTime.isNotEmpty) return -1;
          if (bTime.isNotEmpty) return 1;
          // İkisinin de mesajı yoksa isme göre A-Z sırala
          final aName = (a['name'] ?? '').toString();
          final bName = (b['name'] ?? '').toString();
          return aName.compareTo(bName);
        });
      } else {
        _filteredUsers = _users.where((u) {
          final fullName = '${u['first_name'] ?? ''} ${u['last_name'] ?? ''} ${u['name'] ?? ''}'.toLowerCase();
          final email = (u['email'] ?? '').toString().toLowerCase();
          final role =
              ((u['role'] is Map
                          ? u['role']['display_name'] ?? u['role']['name']
                          : u['role']) ??
                      '')
                  .toString()
                  .toLowerCase();
          return fullName.contains(query) || email.contains(query) || role.contains(query);
        }).toList();
        // Arama sonuçlarını da aynı mantıkla sırala
        _filteredUsers.sort((a, b) {
          final aId = a['id'] as int;
          final bId = b['id'] as int;
          final aTime = _lastMessages[aId]?['time']?.toString() ?? '';
          final bTime = _lastMessages[bId]?['time']?.toString() ?? '';
          if (aTime.isNotEmpty && bTime.isNotEmpty) {
            return bTime.compareTo(aTime);
          }
          if (aTime.isNotEmpty) return -1;
          if (bTime.isNotEmpty) return 1;
          final aName = (a['name'] ?? '').toString();
          final bName = (b['name'] ?? '').toString();
          return aName.compareTo(bName);
        });
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final unread = ref.watch(unreadMessagesCountProvider).valueOrNull ?? 0;

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: const Text('Mesajlar'),
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
        unreadCounts: {'/messages': unread},
      ),
      body: Column(
        children: [
          // Arama kutusu
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Personel ara...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Colors.grey.shade100,
              ),
            ),
          ),

          // Başlık
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Text(
                  'Kurum Personeli',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const Spacer(),
                Text(
                  '${_users.length} kişi',
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Kullanıcı listesi
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredUsers.isEmpty
                ? _buildEmptyState()
                : RefreshIndicator(
                    onRefresh: _loadData,
                    child: ListView.separated(
                      itemCount: _filteredUsers.length,
                      separatorBuilder: (context, index) =>
                          const Divider(height: 1, indent: 88),
                      itemBuilder: (context, index) {
                        return _buildUserItem(_filteredUsers[index]);
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserItem(Map<String, dynamic> user) {
    final userId = user['id'] as int;
    final name = user['name']?.toString() ?? 'İsimsiz';
    final avatar = user['avatar']?.toString();
    final role = user['role'] is Map
        ? (user['role']['display_name']?.toString() ??
              user['role']['name']?.toString() ??
              'Personel')
        : user['role']?.toString() ?? 'Personel';
    final isOnline = user['is_online'] == true || user['online'] == true;

    // Son mesaj bilgisi varsa göster
    final lastMsg = _lastMessages[userId];
    final lastMessage = lastMsg?['message']?.toString() ?? '';
    final lastTime = lastMsg?['time']?.toString() ?? '';
    final unreadCount = lastMsg?['unread'] ?? 0;
    final isMe = lastMsg?['is_me'] ?? false;
    final displayMessage = isMe && lastMessage.isNotEmpty
        ? 'Siz: $lastMessage'
        : lastMessage;

    return InkWell(
      onTap: () async {
        await context.push(
          '/messages/chat/$userId',
          extra: {'name': name, 'avatar': avatar},
        );
        // Chat sayfasından geri dönünce listeyi güncelle (sıralama değişmiş olabilir)
        if (mounted) {
          _loadData();
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            // Avatar
            Stack(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: Colors.grey.shade300,
                  backgroundImage: avatar != null ? NetworkImage(avatar) : null,
                  child: avatar == null
                      ? Text(
                          name.isNotEmpty ? name[0].toUpperCase() : '?',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                if (isOnline)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 16),

            // Kullanıcı bilgileri
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: unreadCount > 0
                                ? FontWeight.bold
                                : FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (lastTime.isNotEmpty)
                        Text(
                          _formatTime(lastTime),
                          style: TextStyle(
                            fontSize: 12,
                            color: unreadCount > 0
                                ? Theme.of(context).primaryColor
                                : Colors.grey.shade500,
                            fontWeight: unreadCount > 0
                                ? FontWeight.bold
                                : FontWeight.normal,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          lastMessage.isEmpty ? role : displayMessage,
                          style: TextStyle(
                            fontSize: 14,
                            color: unreadCount > 0
                                ? Colors.black87
                                : Colors.grey.shade600,
                            fontWeight: unreadCount > 0
                                ? FontWeight.w500
                                : FontWeight.normal,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (unreadCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Theme.of(context).primaryColor,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            unreadCount.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.chat_bubble_outline,
            size: 80,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 20),
          Text(
            'Henüz mesaj yok',
            style: TextStyle(
              fontSize: 20,
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Yeni bir sohbet başlatmak için\nalttaki butona basın',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () => context.push('/messages/new'),
            icon: const Icon(Icons.chat),
            label: const Text('Yeni Mesaj'),
          ),
        ],
      ),
    );
  }

  String _formatTime(String dateStr) {
    if (dateStr.isEmpty) return '';
    try {
      final dt = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(dt);

      if (diff.inDays == 0) {
        return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      } else if (diff.inDays == 1) {
        return 'Dün';
      } else if (diff.inDays < 7) {
        const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        return days[dt.weekday - 1];
      } else {
        return '${dt.day}/${dt.month}/${dt.year % 100}';
      }
    } catch (e) {
      return '';
    }
  }
}
