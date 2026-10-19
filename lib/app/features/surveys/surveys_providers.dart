import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client_provider.dart';
import '../auth/auth_providers.dart';

final surveysProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.read(apiClientProvider);
  final session = ref.read(authSessionProvider);
  final role = session.valueOrNull?.role.toLowerCase() ?? '';
  final isStudent =
      role.contains('student') ||
      role.contains('ogrenci') ||
      role.contains('öğrenci');

  final response = await api.getJson(
    isStudent ? '/portal/student/surveys' : '/surveys/online',
  );

  final data = response['data'] ?? response;
  if (data is List) {
    return data.cast<Map<String, dynamic>>();
  }
  if (data is Map && data['surveys'] is List) {
    return (data['surveys'] as List).cast<Map<String, dynamic>>();
  }
  return [];
});

final surveyDetailProvider = FutureProvider.family<Map<String, dynamic>, int>((
  ref,
  id,
) async {
  final api = ref.read(apiClientProvider);
  final response = await api.getJson('/surveys/online/$id');
  return (response['data'] ?? response) as Map<String, dynamic>;
});

final surveyQuestionsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, int>((ref, id) async {
      final api = ref.read(apiClientProvider);
      final response = await api.getJson('/surveys/online/$id/questions');

      final questions = response['data'] ?? response['questions'] ?? [];
      if (questions is List) {
        return questions.cast<Map<String, dynamic>>();
      }
      return [];
    });
