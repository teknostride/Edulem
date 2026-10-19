import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client_provider.dart';
import 'sms_repository.dart';

final smsRepositoryProvider = Provider<SmsRepository>((ref) {
  final api = ref.watch(apiClientProvider);
  return SmsRepository(api);
});

List<Map<String, dynamic>> _extractList(dynamic data, String primaryKey) {
  if (data == null) return [];
  if (data is List) {
    return List<Map<String, dynamic>>.from(data.whereType<Map<String, dynamic>>());
  }
  if (data is Map<String, dynamic>) {
    final list = data[primaryKey] ??
        data['data']?[primaryKey] ??
        data['data'] ??
        data['items'] ??
        data['records'];
    if (list is List) {
      return List<Map<String, dynamic>>.from(list.whereType<Map<String, dynamic>>());
    }
  }
  return [];
}

// SMS Geçmişi
final smsHistoryProvider = FutureProvider.family
    .autoDispose<Map<String, dynamic>, Map<String, String>?>((
      ref,
      filters,
    ) async {
      final repo = ref.watch(smsRepositoryProvider);
      return repo.getSmsHistory(
        status: filters?['status'],
        title: filters?['title'],
        scheduledFrom: filters?['scheduled_from'],
        scheduledTo: filters?['scheduled_to'],
      );
    });

// SMS Şablonları
final smsTemplatesProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final repo = ref.watch(smsRepositoryProvider);
  return repo.getSmsTemplates(isActive: true);
});

// Hedef Gruplar
final smsClassroomsProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final repo = ref.watch(smsRepositoryProvider);
  final data = await repo.getClassrooms();
  return _extractList(data, 'classrooms');
});

final smsBranchesProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final repo = ref.watch(smsRepositoryProvider);
  final data = await repo.getBranches();
  return _extractList(data, 'branches');
});

final smsStudentsProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final repo = ref.watch(smsRepositoryProvider);
  final data = await repo.getStudents();
  return _extractList(data, 'students');
});

final smsTeachersProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final repo = ref.watch(smsRepositoryProvider);
  final data = await repo.getTeachers();
  return _extractList(data, 'users');
});
