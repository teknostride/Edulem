import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/network/api_client_provider.dart';
import '../profile/profile_providers.dart';

class User {
  final int id;
  final String name;
  final String? avatar;
  final String? role;
  final String? email;
  final bool isOnline;

  User({
    required this.id,
    required this.name,
    this.avatar,
    this.role,
    this.email,
    this.isOnline = false,
  });
}

class UserSelectionPage extends ConsumerStatefulWidget {
  const UserSelectionPage({super.key});

  @override
  ConsumerState<UserSelectionPage> createState() => _UserSelectionPageState();
}

class _UserSelectionPageState extends ConsumerState<UserSelectionPage> {
  final _searchController = TextEditingController();
  bool _isLoading = true;
  List<User> _users = [];
  List<User> _filteredUsers = [];

  @override
  void initState() {
    super.initState();
    _fetchUsers();
    _searchController.addListener(_filterUsers);
  }

  Future<void> _fetchUsers() async {
    try {
      final api = ref.read(apiClientProvider);
      final queryParams = <String, String>{
        'per_page': '100',
        'for_messaging': '1',
        'role': 'owner,Genel Müdür,Kampüs Müdürü,Müdür,Müdür Yardımcısı,Öğretmen,Rehberlik,Öğrenci İşleri,Muhasebe,Sınıf Öğretmeni',
      };

      final response = await api.getJson(
        '/users',
        queryParameters: queryParams,
      );

      final dynamic rawUsers = response['users'] ?? response['data'] ?? response['value'];
      final List<dynamic> usersList = rawUsers is List
          ? rawUsers
          : (rawUsers is Map && rawUsers['users'] is List ? rawUsers['users'] as List<dynamic> : []);

      // Mevcut kullanıcıyı filtrele
      final currentUserId = ref.read(profileProvider).valueOrNull?['id'];

      setState(() {
        _users = usersList
            .where((u) => u['id'] != currentUserId)
            .where((u) {
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
            .map(
              (u) => User(
                id: u['id'] as int,
                name: u['name']?.toString() ?? 'İsimsiz',
                avatar: u['avatar']?.toString(),
                role: (u['role'] is Map)
                    ? (u['role']['display_name']?.toString() ??
                          u['role']['name']?.toString() ??
                          'Personel')
                    : u['role_name']?.toString() ?? 'Personel',
                email: u['email']?.toString(),
                isOnline: u['is_online'] == true || u['online'] == true,
              ),
            )
            .toList();
        _filteredUsers = _users;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Kullanıcılar yüklenemedi: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _filterUsers() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredUsers = _users.where((u) {
        final nameMatch = u.name.toLowerCase().contains(query);
        final roleMatch = u.role?.toLowerCase().contains(query) ?? false;
        final emailMatch = u.email?.toLowerCase().contains(query) ?? false;
        return nameMatch || roleMatch || emailMatch;
      }).toList();
    });
  }

  void _startChat(User user) {
    // Sohbet başlat veya mevcut sohbete git
    context.push('/messages/chat/${user.id}', extra: user);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Yeni Mesaj'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
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
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.search_off,
                          size: 64,
                          color: Colors.grey.shade400,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Kullanıcı bulunamadı',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: _filteredUsers.length,
                    itemBuilder: (context, index) {
                      final user = _filteredUsers[index];
                      return _buildUserTile(user);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserTile(User user) {
    return ListTile(
      leading: Stack(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: Colors.grey.shade300,
            backgroundImage: user.avatar != null
                ? NetworkImage(user.avatar!)
                : null,
            child: user.avatar == null
                ? Text(
                    user.name[0].toUpperCase(),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  )
                : null,
          ),
          if (user.isOnline)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: Colors.green,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
              ),
            ),
        ],
      ),
      title: Text(
        user.name,
        style: const TextStyle(fontWeight: FontWeight.w500),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(user.role ?? 'Personel'),
          if (user.email != null)
            Text(
              user.email!,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
            ),
        ],
      ),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Theme.of(context).primaryColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          user.isOnline ? 'Çevrimiçi' : 'Çevrimdışı',
          style: TextStyle(
            fontSize: 12,
            color: user.isOnline ? Colors.green : Colors.grey.shade600,
          ),
        ),
      ),
      onTap: () => _startChat(user),
    );
  }
}
