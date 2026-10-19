import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'lessons_providers.dart';

class LessonDetailPage extends ConsumerWidget {
  const LessonDetailPage({super.key, required this.id});

  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lessonAsync = ref.watch(lessonDetailProvider(id));
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ders Detayı'),
        actions: [
          IconButton(
            onPressed: () => context.go('/lessons/$id/edit'),
            icon: const Icon(Icons.edit),
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: lessonAsync.when(
        data: (lesson) {
          final name = lesson['name']?.toString() ?? 'İsimsiz';
          final code = lesson['code']?.toString();
          final description = lesson['description']?.toString();
          final weeklyHours = lesson['weekly_hours'];
          final teachers = lesson['teachers'] as List? ?? [];

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(lessonDetailProvider(id)),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.book,
                              size: 48,
                              color: Colors.blue,
                            ),
                            const SizedBox(width: 16),
                            Expanded(
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
                                  if (code != null && code.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      'Kod: $code',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        if (description != null && description.isNotEmpty) ...[
                          const Text(
                            'Açıklama',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            description,
                            style: const TextStyle(fontSize: 16),
                          ),
                          const SizedBox(height: 16),
                        ],
                        if (weeklyHours != null) ...[
                          Row(
                            children: [
                              const Icon(
                                Icons.access_time,
                                size: 20,
                                color: Colors.grey,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Haftada $weeklyHours saat',
                                style: const TextStyle(fontSize: 16),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                        ],
                        Row(
                          children: [
                            const Icon(
                              Icons.people,
                              size: 20,
                              color: Colors.grey,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${teachers.length} öğretmen',
                              style: const TextStyle(fontSize: 16),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (teachers.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const Text(
                      'Öğretmenler',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...teachers.map((t) {
                      final teacherName =
                          t['name']?.toString() ??
                          '${t['first_name'] ?? ''} ${t['last_name'] ?? ''}'
                              .trim();
                      final teacherEmail = t['email']?.toString();
                      return AppCard(
                        child: ListTile(
                          leading: const Icon(Icons.person),
                          title: Text(
                            teacherName.isEmpty ? 'İsimsiz' : teacherName,
                          ),
                          subtitle:
                              teacherEmail != null && teacherEmail.isNotEmpty
                              ? Text(teacherEmail)
                              : null,
                        ),
                      );
                    }),
                  ],
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) {
          final errorMsg = e.toString();
          final isServerError =
              errorMsg.contains('500') || errorMsg.contains('ApiException');
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  isServerError
                      ? 'Sunucu hatası oluştu.\nLütfen daha sonra tekrar deneyin.'
                      : 'Hata: $e',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(lessonDetailProvider(id)),
                  child: const Text('Yeniden Dene'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
