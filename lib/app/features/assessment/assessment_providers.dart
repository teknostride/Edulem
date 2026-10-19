import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import 'assessment_repository.dart';

final assessmentRepositoryProvider = Provider<AssessmentRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return AssessmentRepository(api);
});

final studentExamsProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final repo = ref.read(assessmentRepositoryProvider);
  return repo.getStudentExams();
});

final studentSessionsProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final repo = ref.read(assessmentRepositoryProvider);
  return repo.getStudentSessions();
});

final examResultProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  examId,
) async {
  final repo = ref.read(assessmentRepositoryProvider);
  return repo.getExamResult(examId);
});

final sessionResultProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  sessionId,
) async {
  final repo = ref.read(assessmentRepositoryProvider);
  return repo.getSessionResult(sessionId);
});
