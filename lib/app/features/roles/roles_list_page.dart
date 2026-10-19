import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'roles_providers.dart';

class RolesListPage extends ConsumerWidget {
  const RolesListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roles = ref.watch(rolesListProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Roller'),
        actions: [
          IconButton(
            onPressed: () => context.push('/roles/new'),
            icon: const Icon(Icons.add),
            tooltip: 'Yeni Rol',
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(rolesListProvider),
        child: roles.when(
          data: (items) {
            if (items.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.person_off, size: 64, color: Colors.grey),
                    const SizedBox(height: 16),
                    const Text(
                      'Rol bulunamadı',
                      style: TextStyle(fontSize: 18, color: Colors.grey),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'API\'dan rol verisi gelmiyor veya boş liste döndü',
                      style: TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => ref.invalidate(rolesListProvider),
                      icon: const Icon(Icons.refresh),
                      label: const Text('Yeniden Dene'),
                    ),
                  ],
                ),
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final role = items[index];
                final id = role['id'] as int? ?? 0;
                final displayName =
                    role['display_name']?.toString() ?? 'İsimsiz';
                final name = role['name']?.toString() ?? '';
                final description = role['description']?.toString();
                final isSystem = role['is_system_role'] == true;
                final usersCount = role['users_count'] ?? 0;
                final permissions = role['permissions'] as List? ?? [];

                return AppCard(
                  child: ListTile(
                    leading: Icon(
                      isSystem ? Icons.lock : Icons.person_outline,
                      color: isSystem ? Colors.orange : null,
                    ),
                    title: Text(displayName),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Kod: $name'),
                        if (description != null && description.isNotEmpty)
                          Text(description),
                        Text(
                          '$usersCount kullanıcı • ${permissions.length} yetki',
                        ),
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
                        context.push('/roles/$id');
                      }
                    },
                  ),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                const Text(
                  'Roller yüklenirken hata oluştu',
                  style: TextStyle(fontSize: 18, color: Colors.red),
                ),
                const SizedBox(height: 8),
                Text(
                  '$e',
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () => ref.invalidate(rolesListProvider),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Tekrar Dene'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
