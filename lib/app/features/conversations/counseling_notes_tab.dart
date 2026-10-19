import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'conversations_providers.dart';

final counselingNotesProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
      final repo = ref.watch(conversationsRepositoryProvider);
      return repo.listSessions(page: 1, perPage: 50);
    });

class CounselingNotesTab extends ConsumerWidget {
  const CounselingNotesTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notesAsync = ref.watch(counselingNotesProvider);

    return notesAsync.when(
      data: (data) {
        final sessions = data['sessions'] as List<Map<String, dynamic>>? ?? [];
        // Sadece notu olan görüşmeleri filtrele
        final notesList = sessions
            .where(
              (s) => s['notes'] != null && s['notes'].toString().isNotEmpty,
            )
            .toList();

        if (notesList.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.note_add_outlined, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text('Henüz not bulunmuyor'),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: notesList.length,
          itemBuilder: (context, index) {
            final note = notesList[index];
            final studentName = note['student']?['student_name'] ?? 'İsimsiz';
            final date = note['session_date'] ?? '-';
            final notes = note['notes'] ?? '';
            final type = note['type'] == 'student' ? 'Öğrenci' : 'Veli';

            return Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          child: Text(
                            studentName.isNotEmpty
                                ? studentName[0].toUpperCase()
                                : '?',
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                studentName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              Text(
                                '$type • $date',
                                style: const TextStyle(
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () {
                            Navigator.pushNamed(
                              context,
                              '/conversations/${note['id']}/edit',
                            );
                          },
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    Text(
                      notes,
                      style: const TextStyle(fontSize: 14, height: 1.5),
                    ),
                  ],
                ),
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
