import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'permissions_providers.dart';

class PermissionsListPage extends ConsumerWidget {
  const PermissionsListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final permissions = ref.watch(permissionsListProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Yetkiler'),
        actions: [
          IconButton(
            onPressed: () => context.push('/permissions/new'),
            icon: const Icon(Icons.add),
            tooltip: 'Yeni Yetki',
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(permissionsListProvider),
        child: permissions.when(
          data: (items) {
            if (items.isEmpty) {
              return const Center(child: Text('Yetki bulunamadı'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final perm = items[index];
                final id = perm['id'] as int? ?? 0;
                final displayName =
                    perm['display_name']?.toString() ?? 'İsimsiz';
                final name = perm['name']?.toString() ?? '';
                final category = perm['category']?.toString() ?? '';
                final description = perm['description']?.toString();
                final isSystem = perm['is_system_permission'] == true;
                final rolesCount = perm['roles_count'] ?? 0;

                return AppCard(
                  child: ListTile(
                    leading: Icon(
                      isSystem ? Icons.lock : Icons.key,
                      color: isSystem ? Colors.orange : null,
                    ),
                    title: Text(displayName),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Kod: $name'),
                        if (category.isNotEmpty) Text('Kategori: $category'),
                        if (description != null && description.isNotEmpty)
                          Text(description),
                        Text('$rolesCount rol kullanıyor'),
                      ],
                    ),
                    trailing: isSystem
                        ? const Chip(
                            label: Text('Sistem'),
                            backgroundColor: Colors.orange,
                          )
                        : null,
                    onTap: () {
                      if (id > 0) {
                        context.push('/permissions/$id');
                      }
                    },
                  ),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Hata: $e')),
        ),
      ),
    );
  }
}
