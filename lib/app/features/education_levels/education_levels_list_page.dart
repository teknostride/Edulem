import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'education_levels_providers.dart';

class EducationLevelsListPage extends ConsumerWidget {
  const EducationLevelsListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final educationLevels = ref.watch(educationLevelsListProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Eğitim Seviyeleri'),
        actions: [IconButton(onPressed: () {}, icon: const Icon(Icons.add))],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(educationLevelsListProvider),
        child: educationLevels.when(
          data: (items) {
            if (items.isEmpty) {
              return const Center(child: Text('Eğitim seviyesi bulunamadı'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final el = items[index];
                final id = el['id'] as int? ?? 0;
                final name = el['name']?.toString() ?? 'İsimsiz';
                final code = el['code']?.toString();
                final order = el['order'] ?? 0;
                final years = el['years'];
                final classroomsCount = el['classrooms_count'] ?? 0;

                return AppCard(
                  child: ListTile(
                    leading: const Icon(Icons.school),
                    title: Text(name),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (code != null && code.isNotEmpty) Text('Kod: $code'),
                        Text('Sıra: $order'),
                        if (years != null) Text('$years yıl'),
                        Text('$classroomsCount sınıf'),
                      ],
                    ),
                    onTap: () {
                      if (id > 0) {
                        context.push('/education-levels/$id');
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
