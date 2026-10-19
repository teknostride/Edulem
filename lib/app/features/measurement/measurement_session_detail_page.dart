import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import 'measurement_providers.dart';

class MeasurementSessionDetailPage extends ConsumerWidget {
  const MeasurementSessionDetailPage({super.key, required this.sessionId});

  final int sessionId;

  String _formatDate(String dateStr) {
    if (dateStr.isEmpty) return '---';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
    } catch (e) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionAsync = ref.watch(measurementSessionProvider(sessionId));

    return Scaffold(
      appBar: AppBar(title: const Text('Oturum Detayı')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(measurementSessionProvider(sessionId));
        },
        child: sessionAsync.when(
          data: (session) {
            final name = session['name']?.toString() ?? 'Bilinmiyor';
            final examType = session['exam_type']?.toString() ?? '---';
            final examDate = session['exam_date']?.toString() ?? '';
            final examIds = session['exam_ids'] is List
                ? session['exam_ids'] as List
                : <dynamic>[];
            final rawExams = session['exams'] is List
                ? session['exams'] as List
                : <dynamic>[];

            final exams = rawExams.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 12,
                        runSpacing: 6,
                        children: [
                          if (examType.isNotEmpty)
                            Chip(
                              label: Text(examType),
                              avatar: const Icon(Icons.category, size: 16),
                            ),
                          if (examDate.isNotEmpty)
                            Chip(
                              label: Text(_formatDate(examDate)),
                              avatar: const Icon(
                                Icons.calendar_today,
                                size: 16,
                              ),
                            ),
                          Chip(
                            label: Text('Sınav Sayısı: ${exams.isNotEmpty ? exams.length : examIds.length}'),
                            avatar: const Icon(Icons.quiz, size: 16),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    const Icon(Icons.analytics_outlined, color: Colors.blue),
                    const SizedBox(width: 8),
                    const Text(
                      'Sınavlar ve Analizler',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (exams.isEmpty && examIds.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Text(
                        'Bu oturumda henüz sınav tanımlanmamış.',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                else if (exams.isNotEmpty)
                  ...exams.map((exam) {
                    final exId = (exam['id'] is int)
                        ? exam['id'] as int
                        : int.tryParse('${exam['id']}') ?? -1;
                    final exName = exam['name']?.toString() ?? 'Sınav #$exId';
                    final exType = exam['exam_type']?.toString() ?? '';
                    final exDate = exam['exam_date']?.toString() ?? '';
                    final exLevel = exam['level']?.toString() ?? '';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      elevation: 1.5,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: Colors.grey.shade200),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: Colors.blue.shade50,
                                  child: Icon(Icons.assignment, color: Colors.blue.shade700, size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        exName,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Wrap(
                                        spacing: 6,
                                        runSpacing: 4,
                                        children: [
                                          if (exType.isNotEmpty)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: Colors.purple.shade50,
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                exType,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                  color: Colors.purple.shade700,
                                                ),
                                              ),
                                            ),
                                          if (exLevel.isNotEmpty)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: Colors.amber.shade50,
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                exLevel,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                  color: Colors.amber.shade900,
                                                ),
                                              ),
                                            ),
                                          if (exDate.isNotEmpty)
                                            Text(
                                              _formatDate(exDate),
                                              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            const Divider(height: 1),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                if (exId > 0) ...[
                                  OutlinedButton.icon(
                                    onPressed: () => context.push('/exams/$exId'),
                                    icon: const Icon(Icons.list_alt, size: 16),
                                    label: const Text('Sonuçlar'),
                                    style: OutlinedButton.styleFrom(
                                      visualDensity: VisualDensity.compact,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton.icon(
                                    onPressed: () => context.push('/exams/$exId/analysis'),
                                    icon: const Icon(Icons.bar_chart, size: 16),
                                    label: const Text('Detaylı Analiz'),
                                    style: ElevatedButton.styleFrom(
                                      visualDensity: VisualDensity.compact,
                                      backgroundColor: Colors.blue.shade600,
                                      foregroundColor: Colors.white,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  })
                else
                  // exams listesi henüz dönmediyse exam_ids listesinden butonları üret
                  ...examIds.map((rawId) {
                    final exId = int.tryParse('$rawId') ?? -1;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: const Icon(Icons.quiz, color: Colors.blue),
                        title: Text('Sınav #$exId'),
                        trailing: ElevatedButton.icon(
                          onPressed: exId > 0
                              ? () => context.push('/exams/$exId/analysis')
                              : null,
                          icon: const Icon(Icons.bar_chart, size: 16),
                          label: const Text('Detaylı Analiz'),
                        ),
                      ),
                    );
                  }),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                Text('Hata: $e', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () =>
                      ref.invalidate(measurementSessionProvider(sessionId)),
                  child: const Text('Tekrar Dene'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
