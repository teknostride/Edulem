import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'academic_years_providers.dart';

class AcademicYearsListPage extends ConsumerWidget {
  const AcademicYearsListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final academicYears = ref.watch(academicYearsListProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Eğitim Yılları'),
        actions: [IconButton(onPressed: () {}, icon: const Icon(Icons.add))],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(academicYearsListProvider),
        child: academicYears.when(
          data: (items) {
            if (items.isEmpty) {
              return const Center(child: Text('Eğitim yılı bulunamadı'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final ay = items[index];
                final id = ay['id'] as int? ?? 0;
                final name = ay['name']?.toString() ?? 'İsimsiz';
                final startDate = ay['start_date']?.toString();
                final endDate = ay['end_date']?.toString();
                final isActive = ay['is_active'] == true;
                final classroomsCount = ay['classrooms_count'] ?? 0;

                return AppCard(
                  child: ListTile(
                    leading: Icon(
                      Icons.calendar_today,
                      color: isActive ? Colors.green : null,
                    ),
                    title: Text(name),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (startDate != null) Text('$startDate - $endDate'),
                        Text('$classroomsCount sınıf'),
                      ],
                    ),
                    trailing: isActive
                        ? const Chip(
                            label: Text('Aktif'),
                            backgroundColor: Colors.green,
                          )
                        : null,
                    onTap: () {
                      if (id > 0) {
                        context.push('/academic-years/$id');
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
