import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client_provider.dart';
import '../../theme/app_colors.dart';
import '../../ui/atoms/app_card.dart';
import '../education_levels/education_levels_providers.dart';
import '../profile/profile_providers.dart';
import 'surveys_providers.dart';

class SurveyDetailPage extends ConsumerStatefulWidget {
  final int surveyId;
  const SurveyDetailPage({super.key, required this.surveyId});

  @override
  ConsumerState<SurveyDetailPage> createState() => _SurveyDetailPageState();
}

class _SurveyDetailPageState extends ConsumerState<SurveyDetailPage> {
  Map<int, dynamic> answers = {};
  int? selectedEducationLevelId;
  bool isSubmitting = false;

  @override
  Widget build(BuildContext context) {
    final surveyAsync = ref.watch(surveyDetailProvider(widget.surveyId));
    final questionsAsync = ref.watch(surveyQuestionsProvider(widget.surveyId));
    final profile = ref.watch(profileProvider);
    final educationLevelsAsync = ref.watch(educationLevelsListProvider);

    final role = profile.valueOrNull?['role']?['name']?.toString() ?? '';
    final userEducationLevelIds =
        (profile.valueOrNull?['education_level_ids'] as List<dynamic>?)
            ?.cast<int>() ??
        [];
    final isTeacherRole = role.contains('Öğretmen') || role.contains('teacher');
    final mustSelectEducationLevel =
        isTeacherRole && userEducationLevelIds.length > 1;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Anket'),
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: const Icon(Icons.arrow_back),
        ),
      ),
      body: surveyAsync.when(
        data: (survey) {
          final title = (survey['title'] ?? 'Anket').toString();
          final description = (survey['description'] ?? '').toString();

          return questionsAsync.when(
            data: (questions) {
              return SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          if (description.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              description,
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.white.withValues(alpha: 0.8),
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Education Level Selection (for teachers)
                    if (mustSelectEducationLevel)
                      educationLevelsAsync.when(
                        data: (levels) {
                          final userLevels = levels
                              .where(
                                (l) => userEducationLevelIds.contains(l['id']),
                              )
                              .toList();
                          return _buildEducationLevelSelector(userLevels);
                        },
                        loading: () =>
                            const Center(child: CircularProgressIndicator()),
                        error: (_, _) => const SizedBox.shrink(),
                      ),

                    // Questions
                    if (questions.isEmpty)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: Text('Bu ankette soru bulunmuyor.'),
                        ),
                      )
                    else
                      ...questions.asMap().entries.map((entry) {
                        final index = entry.key;
                        final question = entry.value;
                        return _buildQuestionCard(question, index + 1);
                      }),

                    const SizedBox(height: 24),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isSubmitting ? null : _submitSurvey,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: isSubmitting
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Anketi Tamamla',
                                style: TextStyle(fontSize: 16),
                              ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Sorular yüklenemedi: $e')),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Anket yüklenemedi: $e')),
      ),
    );
  }

  Widget _buildEducationLevelSelector(List<Map<String, dynamic>> levels) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.school, color: Colors.orange),
                const SizedBox(width: 8),
                const Text(
                  'Kademe Seçimi',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 4),
                const Text('*', style: TextStyle(color: Colors.red)),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'Birden fazla kademede dersiniz varsa, anketi hangi kademeden doldurduğunuzu seçiniz.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade400),
                borderRadius: BorderRadius.circular(8),
              ),
              child: DropdownButton<int?>(
                value: selectedEducationLevelId,
                hint: const Text('Seçiniz...'),
                isExpanded: true,
                underline: const SizedBox.shrink(),
                items: levels.map((level) {
                  return DropdownMenuItem<int?>(
                    value: level['id'] as int,
                    child: Text(
                      level['name']?.toString() ?? 'Kademe #${level['id']}',
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    selectedEducationLevelId = value;
                  });
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionCard(Map<String, dynamic> question, int index) {
    final questionId = question['id'] as int? ?? 0;
    final questionText = (question['question'] ?? 'Soru').toString();
    final questionType = (question['question_type'] ?? 'text').toString();
    final isRequired = question['is_required'] == true;
    final options =
        (question['options'] as List<dynamic>?)?.cast<String>() ?? [];

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$index',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    questionText,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (isRequired)
                  const Text(
                    '*',
                    style: TextStyle(color: Colors.red, fontSize: 16),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            _buildQuestionInput(questionId, questionType, options),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionInput(
    int questionId,
    String type,
    List<String> options,
  ) {
    final currentValue = answers[questionId];

    switch (type) {
      case 'multiple_choice':
      case 'single_choice':
        return Column(
          children: options.asMap().entries.map((entry) {
            final opt = entry.value;
            final isSelected = currentValue == opt;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () {
                  setState(() {
                    answers[questionId] = opt;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isSelected
                          ? AppColors.primary
                          : Colors.grey.shade300,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(8),
                    color: isSelected
                        ? AppColors.primary.withValues(alpha: 0.05)
                        : null,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isSelected
                            ? Icons.radio_button_checked
                            : Icons.radio_button_unchecked,
                        color: isSelected ? AppColors.primary : Colors.grey,
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(opt)),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        );

      case 'rating':
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [1, 2, 3, 4, 5].map((rating) {
            final isSelected = currentValue == rating;
            return InkWell(
              onTap: () {
                setState(() {
                  answers[questionId] = rating;
                });
              },
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : Colors.grey.shade300,
                    width: 2,
                  ),
                  color: isSelected ? AppColors.primary : null,
                ),
                child: Center(
                  child: Text(
                    '$rating',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? Colors.white : Colors.grey.shade700,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        );

      case 'boolean':
        return Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () {
                  setState(() {
                    answers[questionId] = 'Evet';
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: currentValue == 'Evet'
                          ? Colors.green
                          : Colors.grey.shade300,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(8),
                    color: currentValue == 'Evet'
                        ? Colors.green.withValues(alpha: 0.1)
                        : null,
                  ),
                  child: Center(
                    child: Text(
                      'Evet',
                      style: TextStyle(
                        color: currentValue == 'Evet'
                            ? Colors.green
                            : Colors.grey.shade700,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: InkWell(
                onTap: () {
                  setState(() {
                    answers[questionId] = 'Hayır';
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: currentValue == 'Hayır'
                          ? Colors.red
                          : Colors.grey.shade300,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(8),
                    color: currentValue == 'Hayır'
                        ? Colors.red.withValues(alpha: 0.1)
                        : null,
                  ),
                  child: Center(
                    child: Text(
                      'Hayır',
                      style: TextStyle(
                        color: currentValue == 'Hayır'
                            ? Colors.red
                            : Colors.grey.shade700,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        );

      case 'text':
      default:
        return TextField(
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Cevabınızı buraya yazınız...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          onChanged: (value) {
            setState(() {
              answers[questionId] = value;
            });
          },
        );
    }
  }

  Future<void> _submitSurvey() async {
    // Validate required questions
    final questions = await ref.read(
      surveyQuestionsProvider(widget.surveyId).future,
    );
    final unanswered = questions.where((q) {
      if (q['is_required'] != true) return false;
      final id = q['id'] as int? ?? 0;
      return answers[id] == null || answers[id].toString().isEmpty;
    }).toList();

    if (unanswered.isNotEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lütfen tüm zorunlu soruları cevaplayın.'),
          ),
        );
      }
      return;
    }

    setState(() => isSubmitting = true);

    try {
      final api = ref.read(apiClientProvider);
      await api.postJson(
        '/surveys/online/${widget.surveyId}/responses',
        data: {
          'online_survey_id': widget.surveyId,
          'respondent_education_level_id': selectedEducationLevelId,
          'answers': answers.entries
              .map((e) => {'question_id': e.key, 'answer': e.value})
              .toList(),
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Anket cevabınız başarıyla gönderildi. Teşekkür ederiz!',
            ),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Cevap gönderilemedi: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => isSubmitting = false);
      }
    }
  }
}
