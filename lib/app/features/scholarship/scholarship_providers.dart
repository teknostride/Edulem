import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client_provider.dart';
import 'scholarship_repository.dart';

final scholarshipRepositoryProvider = Provider<ScholarshipRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return ScholarshipRepository(api);
});

/// Bursluluk sınavları listesi provider
final scholarshipExamsProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, page) async {
  final repo = ref.read(scholarshipRepositoryProvider);
  return repo.listExams(page: page);
});

/// Tekil sınav provider
final scholarshipExamProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, id) async {
  final repo = ref.read(scholarshipRepositoryProvider);
  return repo.getExamById(id);
});

/// Sınav başvuruları provider
final scholarshipApplicationsProvider = FutureProvider.family<List<Map<String, dynamic>>, int>((ref, examId) async {
  final repo = ref.read(scholarshipRepositoryProvider);
  return repo.getApplications(examId);
});

/// Sınav istatistikleri provider
final scholarshipStatisticsProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, examId) async {
  final repo = ref.read(scholarshipRepositoryProvider);
  return repo.getStatistics(examId);
});
