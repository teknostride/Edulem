import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'calendar_events_providers.dart';

class CalendarEventsListPage extends ConsumerWidget {
  const CalendarEventsListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final events = ref.watch(calendarEventsListProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Takvim Etkinlikleri'),
        actions: [IconButton(onPressed: () {}, icon: const Icon(Icons.add))],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(calendarEventsListProvider),
        child: events.when(
          data: (items) {
            if (items.isEmpty) {
              return const Center(child: Text('Etkinlik bulunamadı'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final event = items[index];
                final id = event['id'] as int? ?? 0;
                final title = event['title']?.toString() ?? 'İsimsiz';
                final description = event['description']?.toString();
                final location = event['location']?.toString();
                final startDate = event['start_date']?.toString();
                final endDate = event['end_date']?.toString();
                final isAllDay = event['is_all_day'] == true;
                final participants = event['participants'] as List? ?? [];

                return AppCard(
                  child: ListTile(
                    leading: Icon(
                      isAllDay ? Icons.today : Icons.event,
                      color: isAllDay ? Colors.green : Colors.blue,
                    ),
                    title: Text(title),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (description != null && description.isNotEmpty)
                          Text(
                            description,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        if (location != null && location.isNotEmpty)
                          Text('Konum: $location'),
                        if (startDate != null) Text('Başlangıç: $startDate'),
                        if (endDate != null) Text('Bitiş: $endDate'),
                        Text('${participants.length} katılımcı'),
                      ],
                    ),
                    onTap: () {
                      if (id > 0) {
                        context.push('/calendar-events/$id');
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
