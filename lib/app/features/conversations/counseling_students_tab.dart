import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'conversations_providers.dart';

final counselingStudentsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
      final repo = ref.watch(conversationsRepositoryProvider);
      return repo.listStudents(page: 1, perPage: 50);
    });

class CounselingStudentsTab extends ConsumerWidget {
  const CounselingStudentsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(counselingStudentsProvider);

    return studentsAsync.when(
      data: (data) {
        final students = data['students'] as List<Map<String, dynamic>>? ?? [];

        if (students.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.people_outline, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text('Henüz danışan bulunmuyor'),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: students.length,
          itemBuilder: (context, index) {
            final student = students[index];
            final name = student['student_name'] ?? 'İsimsiz';
            final status = student['status'] ?? 'active';
            final issues = (student['issues'] as List?)?.join(', ') ?? '-';

            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?'),
                ),
                title: Text(name),
                subtitle: Text('Sorunlar: $issues'),
                trailing: Chip(
                  label: Text(
                    status == 'active' ? 'Aktif' : 'Pasif',
                    style: const TextStyle(fontSize: 12),
                  ),
                  backgroundColor: status == 'active'
                      ? Colors.green.shade100
                      : Colors.grey.shade300,
                ),
                onTap: () {
                  // Detay sayfasına git
                },
              ),
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, stack) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text('Hata: $err'),
          ],
        ),
      ),
    );
  }
}
