import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'conversations_providers.dart';

final counselingSessionsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
      final repo = ref.watch(conversationsRepositoryProvider);
      return repo.listSessions(page: 1, perPage: 50);
    });

class CounselingSessionsTab extends ConsumerWidget {
  const CounselingSessionsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionsAsync = ref.watch(counselingSessionsProvider);

    return sessionsAsync.when(
      data: (data) {
        final sessions = data['sessions'] as List<Map<String, dynamic>>? ?? [];

        if (sessions.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text('Henüz görüşme bulunmuyor'),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: sessions.length,
          itemBuilder: (context, index) {
            final session = sessions[index];
            final studentName =
                session['student']?['student_name'] ?? 'İsimsiz';
            final type = session['type'] == 'student' ? 'Öğrenci' : 'Veli';
            final date = session['session_date'] ?? '-';
            final status = session['status'] ?? 'planned';
            final notes = session['notes'] ?? '';

            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: _getStatusColor(status),
                  child: Icon(
                    type == 'Öğrenci' ? Icons.person : Icons.family_restroom,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                title: Text('$studentName - $type Görüşmesi'),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Tarih: $date'),
                    if (notes.isNotEmpty)
                      Text(
                        notes,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontStyle: FontStyle.italic),
                      ),
                  ],
                ),
                isThreeLine: notes.isNotEmpty,
                trailing: Chip(
                  label: Text(
                    _getStatusText(status),
                    style: const TextStyle(fontSize: 12, color: Colors.white),
                  ),
                  backgroundColor: _getStatusColor(status),
                ),
                onTap: () {
                  Navigator.pushNamed(
                    context,
                    '/conversations/${session['id']}',
                  );
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

  Color _getStatusColor(String status) {
    switch (status) {
      case 'completed':
        return Colors.green;
      case 'planned':
        return Colors.blue;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'planned':
        return 'Planlandı';
      case 'cancelled':
        return 'İptal';
      default:
        return status;
    }
  }
}
