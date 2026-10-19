import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'assessment_providers.dart';

class StudentAssessmentPage extends ConsumerStatefulWidget {
  const StudentAssessmentPage({super.key});

  @override
  ConsumerState<StudentAssessmentPage> createState() =>
      _StudentAssessmentPageState();
}

class _StudentAssessmentPageState extends ConsumerState<StudentAssessmentPage> {
  Map<String, dynamic>? _selectedResult;
  bool _detailLoading = false;

  @override
  Widget build(BuildContext context) {
    final examsAsync = ref.watch(studentExamsProvider);
    final sessionsAsync = ref.watch(studentSessionsProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _selectedResult != null ? 'Sınav Analizi' : 'Ölçme Değerlendirme',
        ),
        leading: _selectedResult != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _selectedResult = null),
              )
            : null,
      ),
      drawer: _selectedResult != null
          ? null
          : AppDrawer(
              sections: sections,
              headerTitle: 'EduLem',
              headerSubtitle: profile.valueOrNull?['name']?.toString(),
            ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(studentExamsProvider);
          ref.invalidate(studentSessionsProvider);
        },
        child: _selectedResult != null
            ? _buildDetailView()
            : _buildListView(examsAsync, sessionsAsync),
      ),
    );
  }

  Widget _buildListView(
    AsyncValue<List<Map<String, dynamic>>> examsAsync,
    AsyncValue<List<Map<String, dynamic>>> sessionsAsync,
  ) {
    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        // Oturumlar
        sessionsAsync.when(
          data: (sessions) {
            if (sessions.isEmpty) {
              return const SliverToBoxAdapter(child: SizedBox.shrink());
            }
            return SliverToBoxAdapter(
              child: _buildSection(
                title: 'Birleşik Oturumlar',
                child: Column(
                  children: sessions.map((s) => _buildSessionCard(s)).toList(),
                ),
              ),
            );
          },
          loading: () => const SliverToBoxAdapter(
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            ),
          ),
          error: (e, _) => const SliverToBoxAdapter(child: SizedBox.shrink()),
        ),
        // Sınavlar
        examsAsync.when(
          data: (exams) {
            if (exams.isEmpty && sessionsAsync.valueOrNull?.isEmpty == true) {
              return const SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.assignment_outlined,
                        size: 64,
                        color: Colors.grey,
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Henüz açıklanmış bir sınav sonucu bulunmuyor.',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              );
            }
            return SliverToBoxAdapter(
              child: _buildSection(
                title: 'Sınavlar',
                child: Column(
                  children: exams.map((e) => _buildExamCard(e)).toList(),
                ),
              ),
            );
          },
          loading: () => const SliverToBoxAdapter(
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            ),
          ),
          error: (e, _) => SliverToBoxAdapter(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Hata: $e'),
              ),
            ),
          ),
        ),
        const SliverPadding(padding: EdgeInsets.only(bottom: 24)),
      ],
    );
  }

  Widget _buildSection({required String title, required Widget child}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _buildExamCard(Map<String, dynamic> exam) {
    final examName = exam['exam_name']?.toString() ?? 'Sınav';
    final examDate = exam['exam_date']?.toString() ?? '';
    final examType = exam['exam_type']?.toString() ?? '';
    final totalNet = exam['total_net']?.toString() ?? '-';
    final totalPoint = exam['total_point']?.toString() ?? '-';
    final schoolRank =
        exam['school_rank']?.toString() ?? exam['rank']?.toString() ?? '-';
    final classRank = exam['class_rank']?.toString() ?? '-';
    final examId = (exam['exam_id'] ?? exam['id']) is int
        ? (exam['exam_id'] ?? exam['id']) as int
        : int.tryParse('${exam['exam_id'] ?? exam['id']}') ?? 0;
    final studentId = exam['student_id'] is int
        ? exam['student_id'] as int
        : int.tryParse('${exam['student_id']}');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    examName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (examType.isNotEmpty)
                  Chip(
                    label: Text(examType, style: const TextStyle(fontSize: 12)),
                    padding: EdgeInsets.zero,
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
            if (examDate.isNotEmpty)
              Text(
                examDate,
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildStat('Net', totalNet, Colors.blue),
                _buildStat('Puan', totalPoint, Colors.green),
                _buildStat('Kurum', schoolRank, Colors.orange),
                _buildStat('Sınıf', classRank, Colors.purple),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.tonal(
                onPressed: _detailLoading
                    ? null
                    : () => _loadExamDetail(
                        examId,
                        studentId,
                        schoolRank: schoolRank,
                        classRank: classRank,
                      ),
                child: _detailLoading
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Analizi Gör'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSessionCard(Map<String, dynamic> session) {
    final name = session['name']?.toString() ?? 'Oturum';
    final examDate = session['exam_date']?.toString() ?? '';
    final examCount = session['exam_count']?.toString() ?? '0';
    final totalNet = session['total_net']?.toString() ?? '-';
    final totalPoint = session['total_point']?.toString() ?? '-';
    final schoolRank =
        session['school_rank']?.toString() ??
        session['rank']?.toString() ??
        '-';
    final classRank = session['class_rank']?.toString() ?? '-';
    final sessionId = (session['id'] ?? session['session_id']) is int
        ? (session['id'] ?? session['session_id']) as int
        : int.tryParse('${session['id'] ?? session['session_id']}') ?? 0;
    final studentId = session['student_id'] is int
        ? session['student_id'] as int
        : int.tryParse('${session['student_id']}');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: Colors.blue.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Chip(
                  label: Text(
                    '$examCount Sınav',
                    style: const TextStyle(fontSize: 12),
                  ),
                  padding: EdgeInsets.zero,
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            if (examDate.isNotEmpty)
              Text(
                examDate,
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildStat('Net', totalNet, Colors.blue),
                _buildStat('Puan', totalPoint, Colors.green),
                _buildStat('Kurum', schoolRank, Colors.orange),
                _buildStat('Sınıf', classRank, Colors.purple),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _detailLoading
                    ? null
                    : () => _loadSessionDetail(
                        sessionId,
                        studentId,
                        schoolRank: schoolRank,
                        classRank: classRank,
                      ),
                child: _detailLoading
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Analiz'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStat(String label, String value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
      ),
    );
  }

  Future<void> _loadExamDetail(
    int examId,
    int? studentId, {
    String? schoolRank,
    String? classRank,
  }) async {
    setState(() => _detailLoading = true);
    try {
      final repo = ref.read(assessmentRepositoryProvider);
      final result = await repo.getExamResult(examId, studentId: studentId);
      if (mounted) {
        if (result.isEmpty) {
          setState(() => _detailLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Bu sınav henüz analize açılmamış.')),
          );
          return;
        }
        if (result['result'] is Map) {
          final resMap = Map<String, dynamic>.from(result['result'] as Map);
          if ((resMap['school_rank'] == null || resMap['school_rank'] == 0 || resMap['school_rank'] == '-') &&
              schoolRank != null &&
              schoolRank != '-') {
            resMap['school_rank'] = schoolRank;
          }
          if ((resMap['class_rank'] == null || resMap['class_rank'] == 0 || resMap['class_rank'] == '-') &&
              classRank != null &&
              classRank != '-') {
            resMap['class_rank'] = classRank;
          }
          result['result'] = resMap;
        }
        setState(() {
          _selectedResult = result;
          _detailLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _detailLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Analiz yüklenirken hata: $e')));
      }
    }
  }

  Future<void> _loadSessionDetail(
    int sessionId,
    int? studentId, {
    String? schoolRank,
    String? classRank,
  }) async {
    setState(() => _detailLoading = true);
    try {
      final repo = ref.read(assessmentRepositoryProvider);
      final result = await repo.getSessionResult(
        sessionId,
        studentId: studentId,
      );
      if (mounted) {
        if (result.isEmpty) {
          setState(() => _detailLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Bu oturum henüz analize açılmamış.')),
          );
          return;
        }
        if (result['result'] is Map) {
          final resMap = Map<String, dynamic>.from(result['result'] as Map);
          if ((resMap['school_rank'] == null || resMap['school_rank'] == 0 || resMap['school_rank'] == '-') &&
              schoolRank != null &&
              schoolRank != '-') {
            resMap['school_rank'] = schoolRank;
          }
          if ((resMap['class_rank'] == null || resMap['class_rank'] == 0 || resMap['class_rank'] == '-') &&
              classRank != null &&
              classRank != '-') {
            resMap['class_rank'] = classRank;
          }
          result['result'] = resMap;
        }
        setState(() {
          _selectedResult = result;
          _detailLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _detailLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Analiz yüklenirken hata: $e')));
      }
    }
  }

  Widget _buildDetailView() {
    final result = _selectedResult?['result'] is Map
        ? Map<String, dynamic>.from(_selectedResult!['result'] as Map)
        : <String, dynamic>{};
    final exam = _selectedResult?['exam'] is Map
        ? Map<String, dynamic>.from(_selectedResult!['exam'] as Map)
        : <String, dynamic>{};
    final session = _selectedResult?['session'] is Map
        ? Map<String, dynamic>.from(_selectedResult!['session'] as Map)
        : <String, dynamic>{};

    final rawCourseScores = _selectedResult?['course_scores'];
    final List<Map<String, dynamic>> courseScoresList = [];
    if (rawCourseScores is List) {
      for (final cs in rawCourseScores) {
        if (cs is Map) courseScoresList.add(Map<String, dynamic>.from(cs));
      }
    } else if (rawCourseScores is Map) {
      for (final cs in rawCourseScores.values) {
        if (cs is Map) courseScoresList.add(Map<String, dynamic>.from(cs));
      }
    }

    final classAverages = (_selectedResult?['class_averages'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final schoolAverages = (_selectedResult?['school_averages'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final topicAnalysis = (_selectedResult?['topic_analysis'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    final examName = exam['name']?.toString() ??
        session['name']?.toString() ??
        'Sınav Analizi';
    final totalNet = result['total_net']?.toString() ?? '-';
    final totalPoint = result['total_point']?.toString() ?? '-';
    final schoolRank = result['school_rank']?.toString() ??
        result['rank']?.toString() ??
        '-';
    final classRank = result['class_rank']?.toString() ?? '-';
    final bookletType = result['booklet_type']?.toString() ?? '-';

    int totalCorrect = 0;
    int totalWrong = 0;
    int totalBlank = 0;

    for (final cs in courseScoresList) {
      totalCorrect += int.tryParse(cs['correct']?.toString() ?? '0') ?? 0;
      totalWrong += int.tryParse(cs['wrong']?.toString() ?? '0') ?? 0;
      totalBlank += int.tryParse(cs['blank']?.toString() ?? '0') ?? 0;
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  examName,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (bookletType.isNotEmpty && bookletType != '-')
                Chip(
                  label: Text(
                    'Kitapçık: $bookletType',
                    style: const TextStyle(fontSize: 12),
                  ),
                  visualDensity: VisualDensity.compact,
                ),
            ],
          ),
          const SizedBox(height: 16),
          // Özet kartları (Listeyle tam birebir uyumlu: Net, Puan, Kurum Sırası, Sınıf Sırası)
          Row(
            children: [
              _buildSummaryCard('Toplam Net', totalNet, Colors.blue),
              _buildSummaryCard('Toplam Puan', totalPoint, Colors.green),
              _buildSummaryCard('Kurum Sırası', schoolRank, Colors.orange),
              _buildSummaryCard('Sınıf Sırası', classRank, Colors.purple),
            ],
          ),
          const SizedBox(height: 16),
          // Soru dağılımı
          if (totalCorrect + totalWrong + totalBlank > 0)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Soru Dağılımı',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    _buildDistributionRow('Doğru', totalCorrect, Colors.green),
                    _buildDistributionRow('Yanlış', totalWrong, Colors.red),
                    _buildDistributionRow('Boş', totalBlank, Colors.grey),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),
          // Ders bazlı performans
          if (courseScoresList.isNotEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Detaylı Performans',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    ...courseScoresList.map((cs) {
                      final courseName =
                          cs['course_name']?.toString() ?? 'Ders';
                      final correct = cs['correct']?.toString() ?? '0';
                      final wrong = cs['wrong']?.toString() ?? '0';
                      final blank = cs['blank']?.toString() ?? '0';
                      final net = cs['net']?.toString() ?? '0';
                      final courseId =
                          int.tryParse(cs['course_id']?.toString() ?? '0') ?? 0;

                      final classAvg = classAverages.firstWhere(
                        (ca) =>
                            int.tryParse(ca['course_id']?.toString() ?? '') ==
                            courseId,
                        orElse: () => {},
                      );
                      final schoolAvg = schoolAverages.firstWhere(
                        (sa) =>
                            int.tryParse(sa['course_id']?.toString() ?? '') ==
                            courseId,
                        orElse: () => {},
                      );
                      final classAvgNet =
                          classAvg['average_net']?.toString() ?? '-';
                      final schoolAvgNet =
                          schoolAvg['average_net']?.toString() ?? '-';

                      final studentNetVal = double.tryParse(net) ?? 0;
                      final classAvgVal = double.tryParse(classAvgNet) ?? 0;
                      final isAbove = studentNetVal >= classAvgVal;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    courseName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isAbove
                                        ? Colors.green.shade50
                                        : Colors.orange.shade50,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    isAbove ? 'Ortalama Üstü' : 'Ortalama Altı',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isAbove
                                          ? Colors.green
                                          : Colors.orange,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                _buildMiniStat('D', correct, Colors.green),
                                _buildMiniStat('Y', wrong, Colors.red),
                                _buildMiniStat('B', blank, Colors.grey),
                                _buildMiniStat('Net', net, Colors.blue),
                                _buildMiniStat(
                                  'Snf.Ort',
                                  classAvgNet,
                                  Colors.teal,
                                ),
                                _buildMiniStat(
                                  'Okul.Ort',
                                  schoolAvgNet,
                                  Colors.grey,
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),
          // Konu analizi
          if (topicAnalysis.isNotEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Konu/Kazanım Bazlı Başarı',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    ...topicAnalysis.map((ta) {
                      final courseName = ta['course_name']?.toString() ?? '';
                      final topicName = ta['topic_name']?.toString() ?? 'Diğer';
                      final correct = ta['correct'] as int? ?? 0;
                      final wrong = ta['wrong'] as int? ?? 0;
                      final blank = ta['blank'] as int? ?? 0;
                      final total = correct + wrong + blank;
                      final success = total > 0 ? (correct / total) * 100 : 0;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (courseName.isNotEmpty)
                              Text(
                                courseName,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey,
                                ),
                              ),
                            Text(
                              topicName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                SizedBox(
                                  width: 40,
                                  child: Text(
                                    '${success.toStringAsFixed(0)}%',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: success / 100,
                                      backgroundColor: Colors.grey.shade200,
                                      color: success >= 70
                                          ? Colors.green
                                          : success >= 40
                                          ? Colors.orange
                                          : Colors.red,
                                      minHeight: 6,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(String label, String value, Color color) {
    return Expanded(
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
                textAlign: TextAlign.center,
              ),
              Text(
                label,
                style: const TextStyle(fontSize: 10, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDistributionRow(String label, int value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: 8),
          Text(label),
          const Spacer(),
          Text(
            '$value Soru',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, Color color) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
