import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'campuses_providers.dart';

class CampusesListPage extends ConsumerWidget {
  const CampusesListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campuses = ref.watch(campusesListProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kampüsler'),
        actions: [IconButton(onPressed: () {}, icon: const Icon(Icons.add))],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(campusesListProvider),
        child: campuses.when(
          data: (items) {
            if (items.isEmpty) {
              return const Center(child: Text('Kampüs bulunamadı'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final campus = items[index];
                final id = campus['id'] as int? ?? 0;
                final name = campus['name']?.toString() ?? 'İsimsiz';
                final address = campus['address']?.toString();
                final city = campus['city']?.toString();
                final phone = campus['phone']?.toString();
                final classroomsCount = campus['classrooms_count'] ?? 0;

                return AppCard(
                  child: ListTile(
                    leading: const Icon(Icons.location_on),
                    title: Text(name),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (address != null && address.isNotEmpty)
                          Text(address),
                        if (city != null && city.isNotEmpty)
                          Text('Şehir: $city'),
                        if (phone != null && phone.isNotEmpty)
                          Text('Tel: $phone'),
                        Text('$classroomsCount sınıf'),
                      ],
                    ),
                    onTap: () {
                      if (id > 0) {
                        context.push('/campuses/$id');
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
