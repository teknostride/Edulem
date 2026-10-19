import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'exams_providers.dart';

final examDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, id) async {
  final repo = ref.read(examsRepositoryProvider);
  return repo.getById(id);
});

class ExamDetailPage extends ConsumerWidget {
  const ExamDetailPage({super.key, required this.id});

  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(examDetailProvider(id));
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Sınav Detayı')),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: detail.when(
          data: (e) {
            final name = (e['name'] ?? '').toString();
            final examDate = (e['exam_date'] ?? '').toString();
            final type = (e['type'] ?? '').toString();
            final isActive = e['is_active'] == true;

            final lesson = e['lesson'] is Map ? (e['lesson'] as Map) : null;
            final lessonName = (lesson?['name'] ?? '').toString();

            final classroom = e['classroom'] is Map ? (e['classroom'] as Map) : null;
            final classroomName = (classroom?['name'] ?? '').toString();

            final description = (e['description'] ?? '').toString();

            return ListView(
              children: [
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name.isEmpty ? 'Sınav' : name,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      if (examDate.isNotEmpty) Text('Tarih: $examDate'),
                      if (type.isNotEmpty) Text('Tür: $type'),
                      Text('Aktif: ${isActive ? 'Evet' : 'Hayır'}'),
                      if (lessonName.isNotEmpty) Text('Ders: $lessonName'),
                      if (classroomName.isNotEmpty) Text('Sınıf: $classroomName'),
                      if (description.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(description),
                      ],
                    ],
                  ),
                ),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Hata: $e')),
        ),
      ),
    );
  }
}
