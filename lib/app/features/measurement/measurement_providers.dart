import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client_provider.dart';
import 'measurement_repository.dart';

final measurementRepositoryProvider = Provider<MeasurementRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return MeasurementRepository(api);
});

/// OMR Sessions provider
final measurementSessionsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.read(measurementRepositoryProvider);
  return repo.getSessions();
});

/// Single session provider by ID
final measurementSessionProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, id) async {
  final repo = ref.read(measurementRepositoryProvider);
  return repo.getSessionById(id);
});

/// Exam results provider
final measurementExamResultsProvider = FutureProvider.family<List<Map<String, dynamic>>, int>((ref, examId) async {
  final repo = ref.read(measurementRepositoryProvider);
  return repo.getExamResults(examId);
});

/// Exam analytics provider
final measurementExamAnalyticsProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, examId) async {
  final repo = ref.read(measurementRepositoryProvider);
  return repo.getExamAnalytics(examId);
});
