import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import '../roles/roles_providers.dart';
import 'users_paging_controller.dart';

class UsersListPage extends ConsumerStatefulWidget {
  const UsersListPage({super.key});

  @override
  ConsumerState<UsersListPage> createState() => _UsersListPageState();
}

class _UsersListPageState extends ConsumerState<UsersListPage> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  final _scrollController = ScrollController();
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    _searchFocusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      ref
          .read(usersPagingControllerProvider.notifier)
          .setSearch(_searchController.text.trim());
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(usersPagingControllerProvider.notifier).loadMore();
    }
  }

  List<Map<String, dynamic>> _getDefaultRoles() {
    return const [
      {'name': 'admin', 'display_name': 'Admin'},
      {'name': 'kurucu', 'display_name': 'Kurucu'},
      {'name': 'owner', 'display_name': 'Kurum Sahibi'},
      {'name': 'mudur', 'display_name': 'Müdür'},
      {'name': 'ogrenci_isleri', 'display_name': 'Öğrenci İşleri'},
      {'name': 'teacher', 'display_name': 'Öğretmen'},
      {'name': 'guardian', 'display_name': 'Veli'},
      {'name': 'student', 'display_name': 'Öğrenci'},
    ];
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kullanıcılar'),
        actions: [
          IconButton(
            onPressed: () async {
              await context.push('/users/new');
              ref.read(usersPagingControllerProvider.notifier).refresh();
            },
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _SearchTextField(
                  controller: _searchController,
                  focusNode: _searchFocusNode,
                ),
                const SizedBox(height: 12),
                Consumer(
                  builder: (context, ref, child) {
                    final paging = ref.watch(usersPagingControllerProvider);
                    final rolesAsync = ref.watch(rolesListProvider);
                    return rolesAsync.when(
                      data: (apiRoles) {
                        // API boş dönerse sabit rol listesi kullan
                        final roles = apiRoles.isEmpty
                            ? _getDefaultRoles()
                            : apiRoles;
                        final roleItems = [
                          const DropdownMenuItem<String>(
                            value: '',
                            child: Text('Tüm Roller'),
                          ),
                          ...roles.map((r) {
                            final name = r['name']?.toString() ?? '';
                            final displayName =
                                r['display_name']?.toString() ?? name;
                            return DropdownMenuItem<String>(
                              value: name,
                              child: Text(
                                displayName.isEmpty
                                    ? 'İsimsiz Rol'
                                    : displayName,
                              ),
                            );
                          }),
                        ];
                        return DropdownButtonFormField<String>(
                          initialValue: paging.role ?? '',
                          decoration: InputDecoration(
                            labelText: 'Rol',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                            ),
                          ),
                          items: roleItems,
                          onChanged: (val) {
                            ref
                                .read(usersPagingControllerProvider.notifier)
                                .setRole(val?.isEmpty == true ? null : val);
                          },
                        );
                      },
                      loading: () => DropdownButtonFormField<String>(
                        initialValue: paging.role ?? '',
                        decoration: InputDecoration(
                          labelText: 'Rol',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                          ),
                          suffixIcon: const SizedBox(
                            width: 20,
                            height: 20,
                            child: Padding(
                              padding: EdgeInsets.all(8.0),
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        ),
                        items: const [
                          DropdownMenuItem<String>(
                            value: '',
                            child: Text('Tüm Roller'),
                          ),
                        ],
                        onChanged: null,
                      ),
                      error: (e, _) {
                        return DropdownButtonFormField<String>(
                          initialValue: paging.role ?? '',
                          decoration: InputDecoration(
                            labelText: 'Rol',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                            ),
                          ),
                          items: const [
                            DropdownMenuItem<String>(
                              value: '',
                              child: Text('Tüm Roller'),
                            ),
                          ],
                          onChanged: null,
                        );
                      },
                    );
                  },
                ),
              ],
            ),
          ),
          Expanded(
            child: Consumer(
              builder: (context, ref, child) {
                final paging = ref.watch(usersPagingControllerProvider);
                final items = ref.watch(usersVisibleItemsProvider);
                return RefreshIndicator(
                  onRefresh: () async {
                    await ref
                        .read(usersPagingControllerProvider.notifier)
                        .refresh();
                  },
                  child: paging.hasError && items.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.error_outline,
                                size: 48,
                                color: Colors.red,
                              ),
                              const SizedBox(height: 16),
                              Text('Hata: ${paging.error}'),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: () => ref
                                    .read(
                                      usersPagingControllerProvider.notifier,
                                    )
                                    .refresh(),
                                child: const Text('Yeniden Dene'),
                              ),
                            ],
                          ),
                        )
                      : items.isEmpty && !paging.isLoading
                      ? const Center(child: Text('Kullanıcı bulunamadı'))
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: items.length + (paging.hasMore ? 1 : 0),
                          itemBuilder: (context, index) {
                            if (index >= items.length) {
                              return const Center(
                                child: Padding(
                                  padding: EdgeInsets.all(16),
                                  child: CircularProgressIndicator(),
                                ),
                              );
                            }

                            final item = items[index];
                            final m = item is Map ? item : <String, dynamic>{};
                            final id = (m['id'] is int)
                                ? m['id'] as int
                                : int.tryParse('${m['id']}') ?? -1;
                            final firstName = (m['first_name'] ?? '')
                                .toString();
                            final lastName = (m['last_name'] ?? '').toString();
                            final name =
                                firstName.isNotEmpty || lastName.isNotEmpty
                                ? '$firstName $lastName'.trim()
                                : (m['name'] ?? 'İsimsiz').toString();
                            final email = (m['email'] ?? '').toString();
                            final phone = (m['phone'] ?? '').toString();
                            final isActive =
                                m['is_active'] == true || m['active'] == true;
                            final role = m['role'] is Map
                                ? m['role']
                                : <String, dynamic>{};
                            final roleDisplayName = role['display_name'] != null
                                ? role['display_name'].toString()
                                : role['name']?.toString() ?? '';

                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: InkWell(
                                onTap: id > 0
                                    ? () => context.go('/users/$id')
                                    : null,
                                borderRadius: BorderRadius.circular(12),
                                child: AppCard(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              name.isEmpty ? 'Kullanıcı' : name,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color: isActive
                                                  ? Colors.green.withValues(
                                                      alpha: 0.1,
                                                    )
                                                  : Colors.red.withValues(
                                                      alpha: 0.1,
                                                    ),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              isActive ? 'Aktif' : 'Pasif',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: isActive
                                                    ? Colors.green
                                                    : Colors.red,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (roleDisplayName.isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            const Icon(
                                              Icons.badge_outlined,
                                              size: 16,
                                              color: Colors.grey,
                                            ),
                                            const SizedBox(width: 6),
                                            Text(
                                              roleDisplayName,
                                              style: const TextStyle(
                                                fontSize: 13,
                                                color: Colors.grey,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                      if (email.isNotEmpty) ...[
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            const Icon(
                                              Icons.email_outlined,
                                              size: 16,
                                              color: Colors.grey,
                                            ),
                                            const SizedBox(width: 6),
                                            Expanded(
                                              child: Text(
                                                email,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  fontSize: 13,
                                                  color: Colors.grey,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                      if (phone.isNotEmpty) ...[
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            const Icon(
                                              Icons.phone_outlined,
                                              size: 16,
                                              color: Colors.grey,
                                            ),
                                            const SizedBox(width: 6),
                                            Text(
                                              phone,
                                              style: const TextStyle(
                                                fontSize: 13,
                                                color: Colors.grey,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchTextField extends StatelessWidget {
  const _SearchTextField({required this.controller, required this.focusNode});

  final TextEditingController controller;
  final FocusNode focusNode;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      decoration: InputDecoration(
        hintText: 'Ara (isim, e-posta)...',
        prefixIcon: const Icon(Icons.search),
        suffixIcon: controller.text.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.clear),
                onPressed: () {
                  controller.clear();
                },
              )
            : null,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
