import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'grades_providers.dart';

final gradeDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, id) async {
  final repo = ref.read(gradesRepositoryProvider);
  return repo.getById(id);
});

class GradeDetailPage extends ConsumerWidget {
  const GradeDetailPage({super.key, required this.id});

  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(gradeDetailProvider(id));
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Not Detayı')),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: detail.when(
          data: (g) {
            final grade = (g['grade'] ?? '').toString();
            final gradeType = (g['grade_type'] ?? '').toString();
            final semester = (g['semester'] ?? '').toString();
            final createdAt = (g['created_at'] ?? '').toString();

            final exam = g['exam'] is Map ? (g['exam'] as Map) : null;
            final examName = (exam?['name'] ?? exam?['title'] ?? '').toString();

            final student = g['student'] is Map ? (g['student'] as Map) : null;
            final studentName = (student?['name'] ?? '').toString();

            final teacher = g['teacher'] is Map ? (g['teacher'] as Map) : null;
            final teacherName = (teacher?['name'] ?? '').toString();

            return ListView(
              children: [
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        examName.isEmpty ? 'Not Kaydı' : examName,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      Text('Not: $grade'),
                      if (gradeType.isNotEmpty) Text('Tür: $gradeType'),
                      if (semester.isNotEmpty) Text('Dönem: $semester'),
                      if (studentName.isNotEmpty) Text('Öğrenci: $studentName'),
                      if (teacherName.isNotEmpty) Text('Öğretmen: $teacherName'),
                      if (createdAt.isNotEmpty) Text('Tarih: $createdAt'),
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
