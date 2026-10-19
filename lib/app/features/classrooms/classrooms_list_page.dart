import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'classrooms_providers.dart';

class ClassroomsListPage extends ConsumerWidget {
  const ClassroomsListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classrooms = ref.watch(classroomsListProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sınıflar'),
        actions: [IconButton(onPressed: () {}, icon: const Icon(Icons.add))],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(classroomsListProvider),
        child: classrooms.when(
          data: (items) {
            if (items.isEmpty) {
              return const Center(child: Text('Sınıf bulunamadı'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final classroom = items[index];
                final id = classroom['id'] as int? ?? 0;
                final name = classroom['name']?.toString() ?? 'İsimsiz';
                final code = classroom['code']?.toString();
                final capacity = classroom['capacity'];
                final campus = classroom['campus']?['name'];
                final studentsCount = classroom['students_count'] ?? 0;

                return AppCard(
                  child: ListTile(
                    leading: const Icon(Icons.meeting_room),
                    title: Text(name),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (code != null && code.isNotEmpty) Text('Kod: $code'),
                        if (capacity != null) Text('Kapasite: $capacity'),
                        if (campus != null) Text('Kampüs: $campus'),
                        Text('$studentsCount öğrenci'),
                      ],
                    ),
                    onTap: () {
                      if (id > 0) {
                        context.push('/classrooms/$id');
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
