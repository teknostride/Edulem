import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import '../auth/auth_providers.dart';
import 'announcements_repository.dart';

// Mailbox filtresi provider
final announcementsMailboxProvider = StateProvider<String>((ref) => 'inbox');

// Arama filtresi provider
final announcementsSearchProvider = StateProvider<String?>((ref) => null);

// Badge sayıları provider
final announcementsBadgeProvider = StreamProvider<Map<String, dynamic>>((
  ref,
) async* {
  final repo = ref.read(announcementsRepositoryProvider);
  while (true) {
    try {
      final data = await repo.getUnreadCount();
      yield data;
    } catch (_) {
      yield const {};
    }
    await Future.delayed(const Duration(minutes: 1));
  }
});

final announcementsRepositoryProvider = Provider<AnnouncementsRepository>((
  ref,
) {
  final api = ref.read(apiClientProvider);
  return AnnouncementsRepository(api);
});

// Duyurular listesi (mailbox ile)
final announcementsListProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, mailbox) async {
      final repo = ref.read(announcementsRepositoryProvider);
      final search = ref.watch(announcementsSearchProvider);
      final session = ref.watch(authSessionProvider).valueOrNull;
      
      return repo.list(
        mailbox: mailbox, 
        search: search,
        role: session?.role,
      );
    });

final announcementDetailProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, id) async {
      final repo = ref.read(announcementsRepositoryProvider);
      return repo.getById(id);
    });

// Son duyurular (dashboard için) - inbox'tan son 5 duyuru
final recentAnnouncementsProvider = FutureProvider<List<dynamic>>((ref) async {
  final repo = ref.read(announcementsRepositoryProvider);
  final result = await repo.list(mailbox: 'inbox', page: 1, perPage: 5);
  return result['announcements'] as List<dynamic>? ?? [];
});
