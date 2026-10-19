import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client_provider.dart';
import '../../theme/app_colors.dart';
import '../../ui/atoms/app_card.dart';

class SurveyAnalysisPage extends ConsumerStatefulWidget {
  final int surveyId;
  final String type;

  const SurveyAnalysisPage({
    super.key,
    required this.surveyId,
    this.type = 'online',
  });

  @override
  ConsumerState<SurveyAnalysisPage> createState() => _SurveyAnalysisPageState();
}

class _SurveyAnalysisPageState extends ConsumerState<SurveyAnalysisPage> {
  String viewType = 'general'; // 'general' or 'individual'
  bool isLoading = true;
  Map<String, dynamic>? stats;
  List<Map<String, dynamic>> analysis = [];

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => isLoading = true);
    try {
      final api = ref.read(apiClientProvider);

      // Fetch statistics
      final statsRes = await api.getJson(
        '/surveys/${widget.type}/${widget.surveyId}/statistics',
      );

      // Fetch analysis
      final analysisRes = await api.getJson(
        '/surveys/${widget.type}/${widget.surveyId}/analysis?type=$viewType',
      );

      setState(() {
        stats = (statsRes['data'] ?? statsRes) as Map<String, dynamic>?;
        final rawAnalysis =
            (analysisRes['data']?['analysis'] ?? analysisRes['data'] ?? [])
                as List<dynamic>?;
        analysis = rawAnalysis?.cast<Map<String, dynamic>>() ?? [];
      });
    } catch (e) {
      debugPrint('Error fetching analysis: $e');
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Anket Analizi'),
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: const Icon(Icons.arrow_back),
        ),
        actions: [
          IconButton(onPressed: _fetchData, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // View Type Toggle
                    _buildViewToggle(),
                    const SizedBox(height: 20),

                    // Statistics Cards
                    if (stats != null) _buildStatsCards(),
                    const SizedBox(height: 24),

                    // Analysis Content
                    if (viewType == 'general')
                      _buildGeneralAnalysis()
                    else
                      _buildIndividualAnalysis(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildViewToggle() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: () {
                setState(() {
                  viewType = 'general';
                });
                _fetchData();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: viewType == 'general' ? Colors.white : null,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: viewType == 'general'
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 4,
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Text(
                    'Genel Dağılım',
                    style: TextStyle(
                      fontWeight: viewType == 'general'
                          ? FontWeight.bold
                          : FontWeight.normal,
                      color: viewType == 'general'
                          ? AppColors.primary
                          : Colors.grey,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: InkWell(
              onTap: () {
                setState(() {
                  viewType = 'individual';
                });
                _fetchData();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: viewType == 'individual' ? Colors.white : null,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: viewType == 'individual'
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 4,
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Text(
                    'Bireysel Cevaplar',
                    style: TextStyle(
                      fontWeight: viewType == 'individual'
                          ? FontWeight.bold
                          : FontWeight.normal,
                      color: viewType == 'individual'
                          ? AppColors.primary
                          : Colors.grey,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCards() {
    final totalResponses = stats?['total_responses'] ?? 0;
    final anonymousResponses = stats?['anonymous_responses'] ?? 0;
    final byRespondentType =
        stats?['by_respondent_type'] as Map<String, dynamic>? ?? {};
    final byCampus = stats?['by_campus'] as Map<String, dynamic>? ?? {};
    final byEducationLevel =
        stats?['by_education_level'] as Map<String, dynamic>? ?? {};

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                'Toplam Katılım',
                '$totalResponses',
                Icons.people,
                Colors.blue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                'Anonim Cevaplar',
                '$anonymousResponses',
                Icons.visibility_off,
                Colors.teal,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (byRespondentType.isNotEmpty)
          _buildDistributionCard('Katılımcı Dağılımı', byRespondentType),
        if (byCampus.isNotEmpty) ...[
          const SizedBox(height: 12),
          _buildDistributionCard('Kampüs Dağılımı', byCampus),
        ],
        if (byEducationLevel.isNotEmpty) ...[
          const SizedBox(height: 12),
          _buildDistributionCard('Kademe Dağılımı', byEducationLevel),
        ],
      ],
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildDistributionCard(String title, Map<String, dynamic> data) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: data.entries.map((entry) {
              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${entry.key}: ${entry.value}',
                  style: const TextStyle(fontSize: 13),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildGeneralAnalysis() {
    if (analysis.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text('Henüz analiz verisi bulunmuyor.'),
        ),
      );
    }

    return Column(
      children: analysis.asMap().entries.map((entry) {
        final index = entry.key;
        final item = entry.value;
        return _buildQuestionAnalysisCard(item, index + 1);
      }).toList(),
    );
  }

  Widget _buildQuestionAnalysisCard(Map<String, dynamic> item, int index) {
    final question = (item['question'] ?? 'Soru').toString();
    final questionType = (item['question_type'] ?? '').toString();
    final totalAnswers = item['total_answers'] ?? 0;
    final answers = (item['answers'] as List<dynamic>?) ?? [];

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
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
                    '#$index',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    question,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '$totalAnswers toplam cevap',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),
            if (totalAnswers == 0)
              const Text(
                'Henüz cevap verilmemiş.',
                style: TextStyle(color: Colors.grey),
              )
            else if (questionType == 'text')
              _buildTextAnswers(answers)
            else
              _buildChartAnswers(answers),
          ],
        ),
      ),
    );
  }

  Widget _buildTextAnswers(List<dynamic> answers) {
    final displayAnswers = answers.take(5).toList();

    return Column(
      children: [
        ...displayAnswers.map((a) {
          final answer = ((a is Map ? a['answer'] : a) ?? '').toString();
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '"$answer"',
              style: const TextStyle(fontSize: 14, fontStyle: FontStyle.italic),
            ),
          );
        }),
        if (answers.length > 5)
          Text(
            '...ve ${answers.length - 5} cevap daha',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
      ],
    );
  }

  Widget _buildChartAnswers(List<dynamic> answers) {
    // Aggregate answers
    final counts = <String, int>{};
    for (final a in answers) {
      final val = ((a is Map ? a['answer'] : a) ?? '').toString();
      counts[val] = (counts[val] ?? 0) + 1;
    }

    final sorted = counts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Column(
      children: sorted.map((entry) {
        final percentage = answers.isEmpty
            ? 0
            : (entry.value / answers.length * 100).round();

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      entry.key,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                  Text(
                    '${entry.value} (%$percentage)',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              LinearProgressIndicator(
                value: answers.isEmpty ? 0 : entry.value / answers.length,
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                minHeight: 8,
                borderRadius: BorderRadius.circular(4),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildIndividualAnalysis() {
    if (analysis.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text('Bireysel veri bulunamadı.'),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: analysis.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = analysis[index];
        return _buildIndividualResponseCard(item);
      },
    );
  }

  Widget _buildIndividualResponseCard(Map<String, dynamic> item) {
    final respondent = item['respondent'] as Map<String, dynamic>?;
    final name = respondent?['name']?.toString() ?? 'Bilinmiyor';
    final respondentType = (item['respondent_type'] ?? '').toString();
    final submittedAt = (item['submitted_at'] ?? '').toString();
    final answersCount = (item['answers'] as List<dynamic>?)?.length ?? 0;

    return AppCard(
      child: ExpansionTile(
        tilePadding: EdgeInsets.zero,
        childrenPadding: const EdgeInsets.only(top: 16),
        title: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    respondentType,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '$answersCount Cevap',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        subtitle: submittedAt.isNotEmpty
            ? Text(
                submittedAt,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
              )
            : null,
        children: [
          Divider(color: Colors.grey.shade200),
          _buildIndividualAnswers(
            item['answers_detailed'] as List<dynamic>? ?? [],
          ),
        ],
      ),
    );
  }

  Widget _buildIndividualAnswers(List<dynamic> answers) {
    return Column(
      children: answers.asMap().entries.map((entry) {
        final a = entry.value as Map<String, dynamic>;
        final question = (a['question'] ?? 'Soru #${a['question_id']}')
            .toString();
        final answer = (a['answer'] ?? '').toString();

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                question,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Cevap: $answer',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
