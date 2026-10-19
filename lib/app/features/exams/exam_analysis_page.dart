import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/atoms/app_card.dart';
import 'exams_providers.dart';

num _toNum(dynamic val, [num fallback = 0]) {
  if (val == null) return fallback;
  if (val is num) return val;
  if (val is String) {
    return num.tryParse(val) ?? fallback;
  }
  return fallback;
}

double _toDouble(dynamic val, [double fallback = 0.0]) {
  return _toNum(val, fallback).toDouble();
}

int _toInt(dynamic val, [int fallback = 0]) {
  return _toNum(val, fallback).toInt();
}

class ExamAnalysisPage extends ConsumerStatefulWidget {
  const ExamAnalysisPage({super.key, required this.examId});

  final int examId;

  @override
  ConsumerState<ExamAnalysisPage> createState() => _ExamAnalysisPageState();
}

class _ExamAnalysisPageState extends ConsumerState<ExamAnalysisPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  bool _loadFailed = false;
  Map<String, dynamic> _exam = {};
  Map<String, dynamic> _analytics = {};
  List<Map<String, dynamic>> _results = [];
  List<Map<String, dynamic>> _classrooms = [];
  // T-Score hesaplama için önceden hesaplanan değerler
  Map<int, Map<String, dynamic>> _courseStats = {};
  double _minTASP = 0;
  double _maxTASP = 0;
  // Kompakt görünüm modu
  bool _isCompact = false;
  // Sınıf ve Öğrenci sekmesi seçim state'leri
  int? _selectedClassroomId;
  int? _selectedStudentId;
  String _studentFilterQuery = '';
  // Öğrenci Konu / Kazanım Analizi state'leri
  final Map<int, Map<String, dynamic>> _studentAnalyticsCache = {};
  final Set<int> _loadedStudentAnalyticsIds = {};
  bool _isLoadingStudentAnalytics = false;
  int? _selectedTopicCourseId;
  String _topicFilterMode = 'all'; // 'all', 'weak', 'mastered'
  String _topicSearchQuery = '';
  // Scroll senkronizasyonu için controller'lar
  final ScrollController _leftVerticalController = ScrollController();
  final ScrollController _rightVerticalController = ScrollController();
  final ScrollController _horizontalScrollController = ScrollController();
  final ScrollController _headerHorizontalController = ScrollController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadData();

    // Dikey scroll senkronizasyonu
    _leftVerticalController.addListener(() {
      if (_rightVerticalController.hasClients &&
          _rightVerticalController.offset != _leftVerticalController.offset) {
        _rightVerticalController.jumpTo(_leftVerticalController.offset);
      }
    });
    _rightVerticalController.addListener(() {
      if (_leftVerticalController.hasClients &&
          _leftVerticalController.offset != _rightVerticalController.offset) {
        _leftVerticalController.jumpTo(_rightVerticalController.offset);
      }
    });
    // Yatay scroll senkronizasyonu (başlık ve içerik)
    _horizontalScrollController.addListener(() {
      if (_headerHorizontalController.hasClients &&
          _headerHorizontalController.offset !=
              _horizontalScrollController.offset) {
        _headerHorizontalController.jumpTo(_horizontalScrollController.offset);
      }
    });
  }

  @override
  void dispose() {
    _leftVerticalController.dispose();
    _rightVerticalController.dispose();
    _horizontalScrollController.dispose();
    _headerHorizontalController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _loadFailed = false;
    });
    try {
      final repo = ref.read(examsRepositoryProvider);

      // 4 API çağrısını paralel olarak başlat (biri yavaş/hatalı olsa bile diğerleri engellenmez)
      final responses = await Future.wait([
        repo.getOmrExamById(widget.examId).catchError((e) {
          debugPrint('Error getOmrExamById: $e');
          return <String, dynamic>{};
        }),
        repo.getAnalytics(widget.examId).catchError((e) {
          debugPrint('Error getAnalytics: $e');
          return <String, dynamic>{};
        }),
        repo.getResults(widget.examId).catchError((e) {
          debugPrint('Error getResults: $e');
          return <Map<String, dynamic>>[];
        }),
        repo.getClassrooms().catchError((e) {
          debugPrint('Error getClassrooms: $e');
          return <Map<String, dynamic>>[];
        }),
      ]);

      if (!mounted) return;

      _exam = responses[0] as Map<String, dynamic>;
      _analytics = responses[1] as Map<String, dynamic>;
      _results = responses[2] as List<Map<String, dynamic>>;
      _classrooms = responses[3] as List<Map<String, dynamic>>;

      // T-Score istatistiklerini hesapla ve _results listesini bu sıralamayla güncelle
      _calculateTScoreStats();

      if (_results.isNotEmpty) {
        final firstStudent = _results.first['student'] is Map
            ? _results.first['student'] as Map
            : null;
        final sid = _toInt(firstStudent?['id'] ?? _results.first['student_id'], 0);
        _selectedStudentId = sid > 0 ? sid : null;

        final firstClassroom = firstStudent?['classroom'] is Map
            ? firstStudent!['classroom'] as Map
            : null;
        final cid = _toInt(firstClassroom?['id'] ?? _results.first['classroom_id'], 0);
        _selectedClassroomId = cid > 0 ? cid : null;

        if (_selectedStudentId != null) {
          _fetchStudentAnalytics(_selectedStudentId!);
        }
      }
    } catch (e, stack) {
      debugPrint('Error in _loadData: $e\n$stack');
      _loadFailed = true;
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  // Öğrenci bazlı analitik ve konu/kazanımları yükle
  Future<void> _fetchStudentAnalytics(int studentId, {bool force = false}) async {
    if (!force && _loadedStudentAnalyticsIds.contains(studentId)) {
      return;
    }
    _loadedStudentAnalyticsIds.add(studentId);

    setState(() => _isLoadingStudentAnalytics = true);
    try {
      final repo = ref.read(examsRepositoryProvider);
      final data = await repo.getStudentAnalytics(widget.examId, studentId);
      if (mounted) {
        setState(() {
          _studentAnalyticsCache[studentId] = data;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _studentAnalyticsCache[studentId] = {};
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingStudentAnalytics = false;
        });
      }
    }
  }

  // T-Score istatistiklerini hesapla (web sitesindeki gibi senkron & anında)
  void _calculateTScoreStats() {
    if (_results.isEmpty) return;

    final result = _computeTScoreStats(_results);
    _courseStats = result.courseStats;
    _minTASP = result.minTASP;
    _maxTASP = result.maxTASP;

    for (final r in _results) {
      final rawResultScores = r['course_scores'];
      final resultCourseScores = rawResultScores is Map ? rawResultScores : {};
      double tasp = 0;
      resultCourseScores.forEach((key, value) {
        if (value is Map) {
          final courseId = int.tryParse(key.toString()) ?? 0;
          if (courseId == 0) return;
          final net = _toDouble(value['net']);
          final stats = _courseStats[courseId];
          if (stats == null) return;
          final mean = _toDouble(stats['mean'], 10.0);
          final stdDev = _toDouble(stats['stdDev'], 3.0);
          final weight = _getCourseWeight(courseId);

          final z = _calculateZScore(net, mean, stdDev);
          final t = _calculateTScore(z);
          final asp = _calculateASP(t, weight);
          tasp += asp;
        }
      });
      final score = _scaleTo500(tasp, _minTASP, _maxTASP);
      r['_calculated_score'] = score;
    }

    _results.sort(
      (a, b) => _toDouble(b['_calculated_score']).compareTo(_toDouble(a['_calculated_score'])),
    );
  }

  @override
  Widget build(BuildContext context) {
    final examName = _exam['name']?.toString() ?? 'Sınav #${widget.examId}';

    return Scaffold(
      appBar: AppBar(
        title: Text(examName),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: false,
          tabs: const [
            Tab(icon: Icon(Icons.dashboard_outlined), text: 'Genel'),
            Tab(icon: Icon(Icons.table_chart_outlined), text: 'Sonuçlar'),
            Tab(icon: Icon(Icons.groups_outlined), text: 'Sınıf'),
            Tab(icon: Icon(Icons.person_outline), text: 'Öğrenci'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : (_loadFailed && _results.isEmpty && _exam.isEmpty)
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.cloud_off_outlined,
                            size: 64, color: Colors.grey.shade400),
                        const SizedBox(height: 16),
                        const Text(
                          'Sınav analizi verileri yüklenemedi',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Sunucudan sonuçlar alınamadı. Lütfen tekrar deneyin.',
                          style: TextStyle(
                              fontSize: 13, color: Colors.grey.shade600),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          onPressed: _loadData,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Tekrar Dene'),
                        ),
                      ],
                    ),
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildGeneralTab(),
                    _buildResultsTab(),
                    _buildClassTab(),
                    _buildStudentTab(),
                  ],
                ),
    );
  }

  Widget _buildGeneralTab() {
    // Analytics parse - farklı API response yapıları için
    final summary = _analytics['summary'] as Map? ?? {};
    final statistics = _analytics['statistics'] as Map? ?? {};

    // Önce summary'den, yoksa statistics'ten, yoksa direkt _analytics'ten al
    num total = _toNum(summary['total'] ?? statistics['total'] ?? _analytics['total']);
    num avgNet = _toNum(summary['avg_net'] ?? statistics['avg'] ?? _analytics['avg_net']);
    num medianNet = _toNum(summary['median_net'] ?? statistics['median'] ?? _analytics['median_net']);
    num stdDev = _toNum(summary['std_dev'] ?? statistics['std_dev'] ?? _analytics['std_dev']);

    // Analytics boşsa results'dan hesapla
    if (total == 0 && _results.isNotEmpty) {
      total = _results.length;
      final scores = _results
          .map((r) => _toNum(r['total_net'] ?? r['net'] ?? r['score']))
          .toList();
      if (scores.isNotEmpty) {
        avgNet = scores.reduce((a, b) => a + b) / scores.length;
        scores.sort();
        medianNet = scores.length.isOdd
            ? scores[scores.length ~/ 2]
            : (scores[scores.length ~/ 2 - 1] + scores[scores.length ~/ 2]) / 2;
      }
    }

    // Sınav bilgilerini nested objelerden çıkar
    final examCourses = _exam['exam_courses'] as List? ?? [];
    String lessonName = '-';
    if (examCourses.isNotEmpty) {
      final course = examCourses[0] as Map?;
      final courseData = course?['course'] as Map?;
      lessonName =
          courseData?['name']?.toString() ?? course?['name']?.toString() ?? '-';
    }

    // Eğer exam_courses boşsa, exam_type'dan lesson bilgisi al
    if (lessonName == '-' && _exam['exam_type'] != null) {
      lessonName = _exam['exam_type'].toString();
    }

    // level'dan classroom bilgisi al
    final level = _exam['level']?.toString() ?? '';
    final classroomName = level.isNotEmpty ? level : '-';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sınav Bilgisi
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sınav Bilgisi',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                _buildInfoRow('Ders', lessonName),
                _buildInfoRow('Sınıf', classroomName),
                _buildInfoRow('Tarih', _exam['exam_date']?.toString() ?? '-'),
                _buildInfoRow(
                  'Tür',
                  _exam['exam_type']?.toString() ??
                      _exam['type']?.toString() ??
                      '-',
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // İstatistik Kartları
          Row(
            children: [
              Expanded(
                child: _buildStatCard('Toplam', total.toString(), Colors.blue),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildStatCard(
                  'Ort. Net',
                  avgNet.toStringAsFixed(2),
                  Colors.green,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Medyan',
                  medianNet.toStringAsFixed(2),
                  Colors.orange,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildStatCard(
                  'Std. Sapma',
                  stdDev.toStringAsFixed(2),
                  Colors.purple,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Sınav Verileri Özeti
          _buildExamDataSummary(),
          const SizedBox(height: 16),

          // Ders Dağılımları (Branş Ortalamaları)
          if (_analytics['course_distributions'] is List)
            _buildCourseAverages(_analytics['course_distributions'] as List),
          const SizedBox(height: 16),

          // Doğru/Yanlış/Boş Analizi
          _buildCorrectWrongEmptyAnalysis(),
          const SizedBox(height: 16),

          // Net Dağılımı (Histogram)
          _buildNetDistributionChart(),
          const SizedBox(height: 16),

          // Sınıf Ortalamaları
          if (_classrooms.isNotEmpty) _buildClassAverages(),
        ],
      ),
    );
  }

  Widget _buildResultsTab() {
    if (_results.isEmpty) {
      return const Center(child: Text('Henüz sonuç girilmemiş'));
    }

    // T-Score stats hesaplanmadıysa hesapla
    if (_courseStats.isEmpty) {
      _calculateTScoreStats();
    }

    // Ders sütunlarını course_scores Map'inden al (tüm sonuçları tara)
    final courseIdsSet = <int>{};
    for (final r in _results) {
      final raw = r['course_scores'];
      if (raw is Map) {
        for (final k in raw.keys) {
          final cid = int.tryParse(k.toString());
          if (cid != null && cid > 0) courseIdsSet.add(cid);
        }
      }
    }

    final courseIds = courseIdsSet.toList()
      ..sort(
        (a, b) =>
            _getCourseOrderIndex(a).compareTo(_getCourseOrderIndex(b)),
      );

    final subjectNames = courseIds
        .map((id) => _getShortSubjectNameById(id))
        .toList();

    // Önce tüm sonuçlara puan hesapla
    final scoredResults = _results.map((result) {
      final rawResultScores = result['course_scores'];
      final resultCourseScores = rawResultScores is Map ? rawResultScores : {};
      double tasp = 0;
      resultCourseScores.forEach((key, value) {
        if (value is Map) {
          final courseId = int.tryParse(key.toString()) ?? 0;
          if (courseId == 0) return;
          final net = _toDouble(value['net']);
          final stats = _courseStats[courseId];
          if (stats == null) return;
          final mean = _toDouble(stats['mean'], 10.0);
          final stdDev = _toDouble(stats['stdDev'], 3.0);
          final weight = _getCourseWeight(courseId);

          final z = _calculateZScore(net, mean, stdDev);
          final t = _calculateTScore(z);
          final asp = _calculateASP(t, weight);
          tasp += asp;
        }
      });
      final score = _scaleTo500(tasp, _minTASP, _maxTASP);
      return {'result': result, 'score': score, 'tasp': tasp};
    }).toList();

    // Puana göre sırala (büyükten küçüğe)
    scoredResults.sort(
      (a, b) => _toDouble(b['score']).compareTo(_toDouble(a['score'])),
    );

    return Column(
      children: [
        // Compact toggle and count
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Checkbox(
                    value: _isCompact,
                    onChanged: (v) {
                      setState(() {
                        _isCompact = v ?? false;
                      });
                    },
                    visualDensity: VisualDensity.compact,
                  ),
                  const Text('Kompakt', style: TextStyle(fontSize: 12)),
                ],
              ),
              Text(
                '${_results.length} kayıt',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
        // Results table with sticky header and left columns
        Expanded(
          child: Column(
            children: [
              // ÜST BAŞLIK - Sabit kalır
              Container(
                height: 48,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  border: Border(
                    bottom: BorderSide(color: Colors.grey.shade300),
                  ),
                ),
                child: Row(
                  children: [
                    // Sol başlık (Sıra, Öğrenci)
                    Container(
                      width: _isCompact ? 110 : 140,
                      padding: EdgeInsets.symmetric(
                        horizontal: _isCompact ? 4 : 8,
                      ),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 35,
                            child: Text(
                              'Sıra',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: _isCompact ? 10 : 12,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Text(
                              'Öğrenci',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: _isCompact ? 10 : 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Sağ başlık (Dersler, Toplam, Puan)
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        controller: _headerHorizontalController,
                        physics: const NeverScrollableScrollPhysics(),
                        child: Container(
                          width:
                              (subjectNames.length *
                                  (_isCompact ? 42.0 : 55.0)) +
                              110 +
                              (_isCompact ? 16 : 32),
                          padding: EdgeInsets.symmetric(
                            horizontal: _isCompact ? 8 : 16,
                          ),
                          child: Row(
                            children: [
                              ...subjectNames.map(
                                (subject) => Container(
                                  width: _isCompact ? 42 : 55,
                                  alignment: Alignment.center,
                                  child: Text(
                                    subject,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                              Container(
                                width: 55,
                                alignment: Alignment.center,
                                child: Text(
                                  'Toplam',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: _isCompact ? 10 : 12,
                                  ),
                                ),
                              ),
                              Container(
                                width: 55,
                                alignment: Alignment.center,
                                child: Text(
                                  'Puan',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: _isCompact ? 10 : 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // İÇERİK - Kaydırılabilir
              Expanded(
                child: Row(
                  children: [
                    // SOL İÇERİK - Sabit sütunlar
                    Container(
                      width: _isCompact ? 110 : 140,
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black12,
                            blurRadius: 4,
                            offset: Offset(2, 0),
                          ),
                        ],
                      ),
                      child: ListView.builder(
                        controller: _leftVerticalController,
                        itemCount: scoredResults.length,
                        itemBuilder: (context, index) {
                          final data = scoredResults[index];
                          final rank = index + 1;
                          final result = data['result'] as Map<String, dynamic>;
                          final student = result['student'] is Map
                              ? result['student'] as Map
                              : {};
                          final studentName =
                              (student['name'] ??
                                      result['student_name'] ??
                                      'İsimsiz')
                                  .toString();
                          final classroomName =
                              (student['classroom'] is Map
                                      ? (student['classroom'] as Map)['name']
                                      : student['classroom_name'] ?? '')
                                  .toString();
                          final studentNumber =
                              (student['student_number'] ??
                                      student['number'] ??
                                      '')
                                  .toString();
                          final scoreValue = _toDouble(data['score']);

                          return InkWell(
                            onTap: () => _showStudentDetailModal(result, rank, scoreValue),
                            child: Container(
                              height: _isCompact ? 48 : 56,
                              padding: EdgeInsets.symmetric(
                                horizontal: _isCompact ? 4 : 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(color: Colors.grey.shade200),
                                ),
                              ),
                              child: Row(
                                children: [
                                  SizedBox(
                                    width: 35,
                                    child: Text(
                                      '$rank',
                                      style: TextStyle(
                                        fontSize: _isCompact ? 10 : 12,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          studentName,
                                          style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: _isCompact ? 9 : 11,
                                            color: Colors.blue.shade900,
                                            height: 1.1,
                                          ),
                                          softWrap: true,
                                          maxLines: 2,
                                          overflow: TextOverflow.clip,
                                        ),
                                        if (classroomName.isNotEmpty ||
                                            studentNumber.isNotEmpty)
                                          Text(
                                            '$classroomName${classroomName.isNotEmpty && studentNumber.isNotEmpty ? ' - ' : ''}$studentNumber',
                                            style: TextStyle(
                                              fontSize: _isCompact ? 8 : 9,
                                              color: Colors.grey.shade600,
                                              height: 1.0,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                            maxLines: 1,
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    // SAĞ İÇERİK - Kaydırılabilir
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        controller: _horizontalScrollController,
                        child: SizedBox(
                          width:
                              (subjectNames.length *
                                  (_isCompact ? 42.0 : 55.0)) +
                              110 +
                              (_isCompact ? 16 : 32),
                          child: ListView.builder(
                            controller: _rightVerticalController,
                            itemCount: scoredResults.length,
                            itemBuilder: (context, index) {
                              final data = scoredResults[index];
                              final rank = index + 1;
                              final result =
                                  data['result'] as Map<String, dynamic>;
                              final scoreValue = _toDouble(data['score']);
                              final rawResultScores = result['course_scores'];
                              final resultCourseScores =
                                  rawResultScores is Map ? rawResultScores : {};
                              final totalNet =
                                  (result['total_net'] ?? result['net'] ?? 0)
                                      .toString();
                              final score = scoreValue.toStringAsFixed(2);

                              return InkWell(
                                onTap: () => _showStudentDetailModal(result, rank, scoreValue),
                                child: Container(
                                  height: _isCompact ? 48 : 56,
                                  padding: EdgeInsets.symmetric(
                                    horizontal: _isCompact ? 8 : 16,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    border: Border(
                                      bottom: BorderSide(
                                        color: Colors.grey.shade200,
                                      ),
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      ...courseIds.map((courseId) {
                                        final courseData =
                                            resultCourseScores[courseId
                                                .toString()] ??
                                            resultCourseScores[courseId];
                                        final net = courseData is Map
                                            ? courseData['net'] ?? '-'
                                            : '-';
                                        return Container(
                                          width: _isCompact ? 42 : 55,
                                          alignment: Alignment.center,
                                          child: Text(
                                            net.toString(),
                                            style: TextStyle(
                                              fontSize: _isCompact ? 10 : 12,
                                            ),
                                          ),
                                        );
                                      }),
                                      Container(
                                        width: 55,
                                        alignment: Alignment.center,
                                        child: Text(
                                          totalNet,
                                          style: TextStyle(
                                            fontSize: _isCompact ? 10 : 12,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        width: 55,
                                        alignment: Alignment.center,
                                        child: Text(
                                          score,
                                          style: TextStyle(
                                            fontSize: _isCompact ? 10 : 12,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // Kısa ders isimleri (tablo başlıkları için)
  String _getShortSubjectNameById(int id) {
    const shortNames = {
      1: 'Mat',
      2: 'Fen',
      3: 'Tür',
      4: 'İnk',
      5: 'Din',
      6: 'İng',
    };
    return shortNames[id] ?? 'D$id';
  }

  // Detaylı ders ismi (Modal ve kartlar için)
  String _getCourseDisplayName(dynamic key, Map? val) {
    if (val != null) {
      final name = val['course_name'] ?? val['name'];
      if (name != null &&
          name.toString().trim().isNotEmpty &&
          name.toString().trim() != 'Ders') {
        return name.toString().trim();
      }
    }
    final courseId = int.tryParse(key.toString()) ?? _toInt(val?['course_id']);
    if (courseId > 0) {
      // 1. Sınav içindeki dersleri kontrol et
      final examCourses = _exam['exam_courses'] as List? ?? [];
      for (final ec in examCourses) {
        if (ec is Map) {
          final cid = ec['course_id'] ?? ec['course']?['id'] ?? ec['id'];
          final parsedCid = cid is int ? cid : int.tryParse('$cid');
          if (parsedCid == courseId) {
            final cName =
                ec['course']?['name'] ?? ec['name'] ?? ec['course_name'];
            if (cName != null && cName.toString().trim().isNotEmpty) {
              return cName.toString().trim();
            }
          }
        }
      }
      // 2. Standart müfredat ders isimleri
      const knownNames = {
        1: 'Matematik',
        2: 'Fen Bilimleri',
        3: 'Türkçe',
        4: 'T.C. İnkılap Tarihi ve Atatürkçülük',
        5: 'Din Kültürü ve Ahlak Bilgisi',
        6: 'İngilizce',
      };
      if (knownNames.containsKey(courseId)) {
        return knownNames[courseId]!;
      }
      return 'Ders $courseId';
    }
    return 'Ders';
  }

  /// Web sitesindeki ders sıralaması (Türkçe, İnkılap, Din, İngilizce, Matematik, Fen)
  int _getCourseOrderIndex(int courseId) {
    switch (courseId) {
      case 3:
        return 1; // Türkçe
      case 4:
        return 2; // İnkılap
      case 5:
        return 3; // Din Kültürü
      case 6:
        return 4; // İngilizce
      case 1:
        return 5; // Matematik
      case 2:
        return 6; // Fen Bilgisi
      default:
        return 999;
    }
  }

  // ============================================================================
  // T-SCORE PUAN HESAPLAMA (LGS)
  // ============================================================================

  /// Ders ağırlığını hesapla
  /// API ID'leri: 1=Matematik, 2=Fen, 3=Türkçe (ağırlık 4)
  /// 4=İnkılap, 5=Din, 6=İngilizce (ağırlık 1)
  double _getCourseWeight(int courseId) {
    if (courseId == 1 || courseId == 2 || courseId == 3) {
      return 4; // Matematik, Fen Bilgisi, Türkçe
    }
    return 1; // İnkılap, Din Kültürü, İngilizce
  }

  /// Z-Score hesapla: Z = (Net - Mean) / StdDev
  double _calculateZScore(double net, double mean, double stdDev) {
    final effectiveStdDev = stdDev > 0 ? stdDev : 1.0;
    return (net - mean) / effectiveStdDev;
  }

  /// T-Score hesapla: T = 50 + (10 * Z)
  double _calculateTScore(double zScore) {
    return 50 + (10 * zScore);
  }

  /// ASP (Ağırlıklı Standart Puan) hesapla: ASP = T * weight
  double _calculateASP(double tScore, double weight) {
    return tScore * weight;
  }

  /// 100-500 aralığına ölçekle
  /// Final = 100 + ((TASP - MinTASP) / (MaxTASP - MinTASP)) * 400
  double _scaleTo500(double tasp, double minTASP, double maxTASP) {
    final range = maxTASP - minTASP;
    if (range <= 0) return 300;
    final score = 100 + ((tasp - minTASP) / range) * 400;
    return score.clamp(100, 500);
  }

  Widget _buildStatCard(String title, String value, Color color) {
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Text(
            title,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value),
        ],
      ),
    );
  }

  // Branş Ortalamaları - _results'dan hesapla
  Widget _buildCourseAverages(List distributions) {
    // API'den gelen veriyi kullan, yoksa _results'dan hesapla
    final courseStats = <int, Map<String, dynamic>>{};

    // Önce _results'dan hesapla (daha güvenilir)
    for (final result in _results) {
      final courseScores = result['course_scores'] as Map? ?? {};
      courseScores.forEach((key, value) {
        if (value is Map) {
          final courseId = int.tryParse(key.toString()) ?? 0;
          if (courseId == 0) return;

          courseStats.putIfAbsent(
            courseId,
            () => {
              'nets': <double>[],
              'corrects': <int>[],
              'wrongs': <int>[],
              'empties': <int>[],
            },
          );

          courseStats[courseId]!['nets'].add(_toDouble(value['net']));
          courseStats[courseId]!['corrects'].add(_toInt(value['correct']));
          courseStats[courseId]!['wrongs'].add(_toInt(value['wrong']));
          courseStats[courseId]!['empties'].add(_toInt(value['empty'] ?? value['blank']));
        }
      });
    }

    // Ders ID'lerini web sırasına göre sırala
    final sortedCourseIds = courseStats.keys.toList()
      ..sort(
        (a, b) => _getCourseOrderIndex(a).compareTo(_getCourseOrderIndex(b)),
      );

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Branş Ortalamaları',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ...sortedCourseIds.map((courseId) {
            final stats = courseStats[courseId]!;
            final nets = stats['nets'] as List<double>;
            final corrects = stats['corrects'] as List<int>;
            final wrongs = stats['wrongs'] as List<int>;
            final empties = stats['empties'] as List<int>;

            final avgNet = nets.isNotEmpty
                ? nets.reduce((a, b) => a + b) / nets.length
                : 0.0;
            final avgCorrect = corrects.isNotEmpty
                ? corrects.reduce((a, b) => a + b) / corrects.length
                : 0.0;
            final avgWrong = wrongs.isNotEmpty
                ? wrongs.reduce((a, b) => a + b) / wrongs.length
                : 0.0;
            final avgEmpty = empties.isNotEmpty
                ? empties.reduce((a, b) => a + b) / empties.length
                : 0.0;

            final courseName = _getShortSubjectNameById(courseId);

            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        courseName,
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      Text(
                        'Net: ${avgNet.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      _buildMiniStat(
                        'D',
                        avgCorrect.toStringAsFixed(1),
                        Colors.green,
                      ),
                      const SizedBox(width: 8),
                      _buildMiniStat(
                        'Y',
                        avgWrong.toStringAsFixed(1),
                        Colors.red,
                      ),
                      const SizedBox(width: 8),
                      _buildMiniStat(
                        'B',
                        avgEmpty.toStringAsFixed(1),
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
    );
  }

  Widget _buildMiniStat(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  // Doğru/Yanlış/Boş Analizi
  Widget _buildCorrectWrongEmptyAnalysis() {
    // Tüm sonuçlardan toplam doğru/yanlış/boş hesapla
    int totalCorrect = 0;
    int totalWrong = 0;
    int totalEmpty = 0;

    for (final result in _results) {
      final courseScores = result['course_scores'] as Map? ?? {};
      courseScores.forEach((key, value) {
        if (value is Map) {
          totalCorrect += _toInt(value['correct']);
          totalWrong += _toInt(value['wrong']);
          totalEmpty += _toInt(value['empty'] ?? value['blank']);
        }
      });
    }

    final total = totalCorrect + totalWrong + totalEmpty;
    if (total == 0) return const SizedBox.shrink();

    // Toplam soru sayısı (sınavdaki gerçek soru sayısı)
    final examCourses = _exam['exam_courses'] as List? ?? [];
    int totalQuestions = 0;
    for (final course in examCourses) {
      final c = course as Map?;
      totalQuestions +=
          _toInt(c?['question_count'] ?? c?['questions_count']);
    }

    // Öğrenci sayısı
    final studentCount = _results.length;
    final totalPossibleAnswers = totalQuestions * studentCount;

    // Yüzdeleri hesapla (toplam cevaplanan sorulara göre değil, toplam mümkün cevaplara göre)
    final correctPercent = totalPossibleAnswers > 0
        ? (totalCorrect / totalPossibleAnswers * 100).toStringAsFixed(1)
        : '0.0';
    final wrongPercent = totalPossibleAnswers > 0
        ? (totalWrong / totalPossibleAnswers * 100).toStringAsFixed(1)
        : '0.0';
    final emptyPercent = totalPossibleAnswers > 0
        ? (totalEmpty / totalPossibleAnswers * 100).toStringAsFixed(1)
        : '0.0';

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Doğru / Yanlış / Boş Analizi',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildBigStatCard(
                  'Doğru',
                  '$totalCorrect',
                  '%$correctPercent',
                  Colors.green,
                  Icons.check_circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildBigStatCard(
                  'Yanlış',
                  '$totalWrong',
                  '%$wrongPercent',
                  Colors.red,
                  Icons.cancel,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildBigStatCard(
                  'Boş',
                  '$totalEmpty',
                  '%$emptyPercent',
                  Colors.grey,
                  Icons.help_outline,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBigStatCard(
    String title,
    String count,
    String percent,
    Color color,
    IconData icon,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 6),
          Text(
            title,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          Text(
            count,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            percent,
            style: TextStyle(fontSize: 11, color: color.withValues(alpha: 0.8)),
          ),
        ],
      ),
    );
  }

  // Net Dağılımı (Bar Chart)
  Widget _buildNetDistributionChart() {
    // Net değerlerini grupla
    final netScores = _results
        .map((r) => _toDouble(r['total_net'] ?? r['net']))
        .toList();

    if (netScores.isEmpty) return const SizedBox.shrink();

    netScores.sort();
    final minNet = netScores.first;
    final maxNet = netScores.last;
    final range = maxNet - minNet;

    // 5 aralığa böl
    final intervals = 5;
    final intervalSize = range > 0 ? range / intervals : 1;

    final distribution = List<int>.filled(intervals, 0);
    for (final net in netScores) {
      int index = ((net - minNet) / intervalSize).floor();
      if (index >= intervals) index = intervals - 1;
      distribution[index]++;
    }

    final maxCount = distribution.reduce((a, b) => a > b ? a : b);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Net Dağılımı',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ClipRect(
            child: SizedBox(
              height: 170,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: List.generate(intervals, (index) {
                  final count = distribution[index];
                  final height = maxCount > 0
                      ? (count / maxCount * 100).toDouble()
                      : 0.0;
                  final start = minNet + (index * intervalSize);

                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text('$count', style: const TextStyle(fontSize: 10)),
                          const SizedBox(height: 4),
                          Container(
                            width: double.infinity,
                            height: height,
                            decoration: BoxDecoration(
                              color: Colors.blue.shade400,
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(4),
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              start >= 10
                                  ? start.toStringAsFixed(0)
                                  : start.toStringAsFixed(1),
                              style: TextStyle(
                                fontSize: 8,
                                color: Colors.grey.shade600,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Sınıf Ortalamaları
  Widget _buildClassAverages() {
    // Sınıfları hesapla
    final classStats = <String, List<double>>{};

    for (final result in _results) {
      final student = result['student'] is Map ? result['student'] as Map : {};
      final className =
          (student['classroom'] is Map
                  ? (student['classroom'] as Map)['name']
                  : student['classroom_name'] ?? 'Diğer')
              .toString();
      final net = _toDouble(result['total_net'] ?? result['net']);

      classStats.putIfAbsent(className, () => []).add(net);
    }

    if (classStats.isEmpty) return const SizedBox.shrink();

    final sortedClasses = classStats.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Sınıf Ortalamaları',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ...sortedClasses.map((entry) {
            final className = entry.key;
            final nets = entry.value;
            final avg = nets.reduce((a, b) => a + b) / nets.length;
            final max = nets.reduce((a, b) => a > b ? a : b);
            final min = nets.reduce((a, b) => a < b ? a : b);

            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      className,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ),
                  Expanded(
                    child: _buildClassStat(
                      'Ort',
                      avg.toStringAsFixed(2),
                      Colors.blue,
                    ),
                  ),
                  Expanded(
                    child: _buildClassStat(
                      'En Yüksek',
                      max.toStringAsFixed(1),
                      Colors.green,
                    ),
                  ),
                  Expanded(
                    child: _buildClassStat(
                      'En Düşük',
                      min.toStringAsFixed(1),
                      Colors.orange,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${nets.length} öğr',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildClassStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  // Sınav Verileri Özeti - Her ders için soru sayıları
  Widget _buildExamDataSummary() {
    final examCourses = _exam['exam_courses'] as List? ?? [];
    if (examCourses.isEmpty) return const SizedBox.shrink();

    // Tüm derslerin soru sayılarını topla
    int totalQuestions = 0;
    for (final course in examCourses) {
      final c = course as Map?;
      totalQuestions +=
          _toInt(c?['question_count'] ?? c?['questions_count']);
    }

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Sınav Verileri',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          // Toplam soru sayısı
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue.shade200),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Toplam Soru',
                  style: TextStyle(fontWeight: FontWeight.w500),
                ),
                Text(
                  '$totalQuestions',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue.shade700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Her ders için soru sayısı
          ...examCourses.map((course) {
            final c = course as Map?;
            final courseData = c?['course'] as Map?;
            final courseName =
                courseData?['name']?.toString() ??
                c?['name']?.toString() ??
                'Ders';
            final questionCount =
                _toInt(c?['question_count'] ?? c?['questions_count']);
            final shortName = courseName.length > 6
                ? courseName.substring(0, 6)
                : courseName;

            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      shortName,
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                  // Progress bar
                  Expanded(
                    flex: 3,
                    child: LinearProgressIndicator(
                      value: totalQuestions > 0
                          ? questionCount / totalQuestions
                          : 0,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Colors.blue.shade400,
                      ),
                      minHeight: 8,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    width: 40,
                    alignment: Alignment.centerRight,
                    child: Text(
                      '$questionCount',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  // ============================================================================
  // ÖĞRENCİ DETAY MODALI / BOTTOM SHEET
  // ============================================================================
  void _showStudentDetailModal(Map<String, dynamic> result, int rank, double score) {
    final student = result['student'] is Map ? result['student'] as Map : {};
    final studentName = (student['name'] ?? result['student_name'] ?? 'İsimsiz').toString();
    final classroomName = (student['classroom'] is Map
            ? (student['classroom'] as Map)['name']
            : student['classroom_name'] ?? '')
        .toString();
    final studentNumber = (student['student_number'] ?? student['number'] ?? '').toString();
    final totalNet = (result['total_net'] ?? result['net'] ?? 0).toString();
    final courseScores = result['course_scores'] as Map? ?? {};

    final classroomId = _toInt((student['classroom'] is Map ? (student['classroom'] as Map)['id'] : null) ?? result['classroom_id']);
    int? classRank;
    int? classTotal;
    if (classroomId > 0) {
      final classStudents = _results.where((r) {
        final s = r['student'] is Map ? r['student'] as Map : {};
        final c = s['classroom'] is Map ? s['classroom'] as Map : {};
        return _toInt(c['id'] ?? r['classroom_id']) == classroomId;
      }).toList();
      classTotal = classStudents.length;
      final idx = classStudents.indexOf(result);
      if (idx >= 0) classRank = idx + 1;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          builder: (_, scrollController) {
            return Container(
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 10),
                    width: 40,
                    height: 5,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2.5),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: Colors.blue.shade100,
                          child: Text(
                            studentName.isNotEmpty ? studentName[0].toUpperCase() : '?',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.blue.shade800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                studentName,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '$classroomName ${studentNumber.isNotEmpty ? '• No: $studentNumber' : ''}',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.of(ctx).pop(),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: ListView(
                      controller: scrollController,
                      padding: const EdgeInsets.all(16),
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: _buildModalStatBox(
                                'Genel Sıra',
                                '#$rank / ${_results.length}',
                                Colors.amber.shade800,
                                Icons.emoji_events_outlined,
                              ),
                            ),
                            if (classRank != null) ...[
                              const SizedBox(width: 8),
                              Expanded(
                                child: _buildModalStatBox(
                                  'Sınıf Sırası',
                                  '#$classRank / $classTotal',
                                  Colors.purple.shade700,
                                  Icons.groups_outlined,
                                ),
                              ),
                            ],
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildModalStatBox(
                                'Toplam Net',
                                totalNet,
                                Colors.blue.shade700,
                                Icons.bar_chart,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildModalStatBox(
                                'Puan',
                                score.toStringAsFixed(2),
                                Colors.green.shade700,
                                Icons.star_outline,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Ders Bazlı Sonuçlar ve Netler',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 10),
                        ...(() {
                          final entries = courseScores.entries.toList()
                            ..sort((a, b) {
                              final idA = int.tryParse(a.key.toString()) ?? 0;
                              final idB = int.tryParse(b.key.toString()) ?? 0;
                              return _getCourseOrderIndex(idA).compareTo(_getCourseOrderIndex(idB));
                            });
                          return entries.map((entry) {
                            final val = entry.value;
                            if (val is! Map) return const SizedBox.shrink();
                            final courseName = _getCourseDisplayName(entry.key, val);
                          final correct = _toInt(val['correct']);
                          final wrong = _toInt(val['wrong']);
                          final empty = _toInt(val['empty'] ?? val['blank']);
                          final net = _toDouble(val['net']).toStringAsFixed(2);
                          final qCount = _toInt(val['question_count'] ?? val['questions_count'] ?? (correct + wrong + empty));
                          final percent = qCount > 0 ? (correct / qCount).clamp(0.0, 1.0) : 0.0;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      courseName,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Colors.blue.shade50,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        '$net Net',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.blue.shade800,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    _buildPillTag('Doğru: $correct', Colors.green),
                                    const SizedBox(width: 6),
                                    _buildPillTag('Yanlış: $wrong', Colors.red),
                                    const SizedBox(width: 6),
                                    _buildPillTag('Boş: $empty', Colors.grey),
                                    const Spacer(),
                                    Text(
                                      'Soru: $qCount',
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: percent,
                                    minHeight: 6,
                                    backgroundColor: Colors.grey.shade200,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      percent > 0.7
                                          ? Colors.green
                                          : percent > 0.4
                                              ? Colors.orange
                                              : Colors.red,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList();
                      })(),
                    ],
                  ),
                ),
              ],
            ),
          );
          },
        );
      },
    );
  }

  Widget _buildModalStatBox(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOutcomeSummaryBox(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildPillTag(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600),
      ),
    );
  }

  // ============================================================================
  // SINIF BAZLI ANALİZ SEKMESİ
  // ============================================================================
  Widget _buildClassTab() {
    if (_results.isEmpty) {
      return const Center(child: Text('Henüz sınav sonucu bulunmuyor.'));
    }

    final availableClasses = <int, String>{};
    for (final r in _results) {
      final s = r['student'] as Map?;
      final c = s?['classroom'] as Map?;
      if (c != null && c['id'] != null) {
        final cid = _toInt(c['id']);
        if (cid > 0) {
          availableClasses[cid] = (c['name'] ?? 'Sınıf #$cid').toString();
        }
      }
    }
    for (final c in _classrooms) {
      if (c['id'] != null) {
        final cid = _toInt(c['id']);
        if (cid > 0 && !availableClasses.containsKey(cid)) {
          availableClasses[cid] = (c['name'] ?? 'Sınıf #$cid').toString();
        }
      }
    }

    if (availableClasses.isEmpty) {
      return const Center(child: Text('Sınıf bilgisi bulunamadı.'));
    }

    if (_selectedClassroomId == null || !availableClasses.containsKey(_selectedClassroomId)) {
      _selectedClassroomId = availableClasses.keys.first;
    }

    final classResults = _results.where((r) {
      final s = r['student'] as Map?;
      final c = s?['classroom'] as Map?;
      final cid = _toInt(c?['id']);
      return cid == _selectedClassroomId;
    }).toList();

    num classTotalNet = 0;
    double maxNet = 0;
    double minNet = 999;
    for (final r in classResults) {
      final netVal = _toDouble(r['total_net'] ?? r['net']);
      classTotalNet += netVal;
      if (netVal > maxNet) maxNet = netVal;
      if (netVal < minNet) minNet = netVal;
    }
    if (minNet == 999) minNet = 0;
    final classAvgNet = classResults.isNotEmpty ? classTotalNet / classResults.length : 0.0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.class_outlined, color: Colors.blue),
                  const SizedBox(width: 8),
                  Text(
                    'Sınıf Seçimi',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                initialValue: _selectedClassroomId,
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                items: availableClasses.entries.map((entry) {
                  return DropdownMenuItem<int>(
                    value: entry.key,
                    child: Text(entry.value, style: const TextStyle(fontWeight: FontWeight.w600)),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedClassroomId = val);
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _buildStatCard('Öğrenci Sayısı', '${classResults.length}', Colors.blue),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildStatCard('Sınıf Ort. Net', classAvgNet.toStringAsFixed(2), Colors.green),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _buildStatCard('En Yüksek Net', maxNet.toStringAsFixed(2), Colors.purple),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildStatCard('En Düşük Net', minNet.toStringAsFixed(2), Colors.orange),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          'Sınıf Öğrencileri Sıralaması (${classResults.length})',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        if (classResults.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: Text('Bu sınıfa ait sınav kaydı bulunamadı.')),
          )
        else
          ...classResults.map((result) {
            final student = result['student'] is Map ? result['student'] as Map : {};
            final studentName = (student['name'] ?? result['student_name'] ?? 'İsimsiz').toString();
            final net = (result['total_net'] ?? result['net'] ?? 0).toString();
            final classRank = classResults.indexOf(result) + 1;
            final generalRank = _results.indexOf(result) + 1;

            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              elevation: 1,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.blue.shade50,
                  child: Text('#$classRank', style: TextStyle(color: Colors.blue.shade800, fontSize: 13, fontWeight: FontWeight.bold)),
                ),
                title: Text(studentName, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text('Genel Sıra: #$generalRank / ${_results.length}', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text('$net Net', style: TextStyle(color: Colors.green.shade800, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.chevron_right, color: Colors.grey),
                  ],
                ),
                onTap: () => _showStudentDetailModal(result, generalRank, _toDouble(result['_calculated_score'])),
              ),
            );
          }),
      ],
    );
  }

  // ============================================================================
  // ÖĞRENCİ BAZLI ANALİZ SEKMESİ
  // ============================================================================
  Widget _buildStudentTab() {
    if (_results.isEmpty) {
      return const Center(child: Text('Henüz sınav sonucu bulunmuyor.'));
    }

    final filteredResults = _results.where((r) {
      if (_studentFilterQuery.trim().isEmpty) return true;
      final student = r['student'] is Map ? r['student'] as Map : {};
      final name = (student['name'] ?? r['student_name'] ?? '').toString().toLowerCase();
      final no = (student['student_number'] ?? student['number'] ?? '').toString();
      final q = _studentFilterQuery.toLowerCase();
      return name.contains(q) || no.contains(q);
    }).toList();

    Map<String, dynamic>? selectedResult;
    for (final r in _results) {
      final s = r['student'] as Map?;
      final sid = _toInt(s?['id'] ?? r['student_id']);
      if (sid == _selectedStudentId) {
        selectedResult = r;
        break;
      }
    }
    selectedResult ??= _results.first;

    final student = selectedResult['student'] is Map ? selectedResult['student'] as Map : {};
    final currentStudentId = _toInt(student['id'] ?? selectedResult['student_id']);
    if (_selectedStudentId == null || _selectedStudentId == 0) {
      _selectedStudentId = currentStudentId;
    }
    final studentName = (student['name'] ?? selectedResult['student_name'] ?? 'İsimsiz').toString();
    final classroomName = (student['classroom'] is Map ? (student['classroom'] as Map)['name'] : selectedResult['classroom_name'] ?? '').toString();
    final studentNumber = (student['student_number'] ?? student['number'] ?? '').toString();
    final rank = _results.indexOf(selectedResult) + 1;
    final totalNet = (selectedResult['total_net'] ?? selectedResult['net'] ?? 0).toString();

    // Sınıf içi sıra
    final classroomId = _toInt((student['classroom'] is Map ? (student['classroom'] as Map)['id'] : null) ?? selectedResult['classroom_id']);
    int? classRank;
    int? classTotal;
    if (classroomId > 0) {
      final classStudents = _results.where((r) {
        final s = r['student'] is Map ? r['student'] as Map : {};
        final c = s['classroom'] is Map ? s['classroom'] as Map : {};
        return _toInt(c['id'] ?? r['classroom_id']) == classroomId;
      }).toList();
      classTotal = classStudents.length;
      final idx = classStudents.indexOf(selectedResult);
      if (idx >= 0) classRank = idx + 1;
    }

    // Otomatik olarak seçili öğrencinin konu analitiğini yükle
    if (currentStudentId > 0 && !_loadedStudentAnalyticsIds.contains(currentStudentId) && !_isLoadingStudentAnalytics) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _fetchStudentAnalytics(currentStudentId);
      });
    }

    final studentAnalytics = currentStudentId > 0 ? _studentAnalyticsCache[currentStudentId] : null;

    final List<Map<String, dynamic>> rawTopicList = [];
    if (studentAnalytics != null && studentAnalytics['topic_analysis'] is List && (studentAnalytics['topic_analysis'] as List).isNotEmpty) {
      final list = studentAnalytics['topic_analysis'] as List;
      for (final item in list) {
        if (item is Map) {
          rawTopicList.add(Map<String, dynamic>.from(item));
        }
      }
    } else if (studentAnalytics != null &&
        ((studentAnalytics['questions'] is List && (studentAnalytics['questions'] as List).isNotEmpty) ||
         (studentAnalytics['wrong_blank_questions'] is List && (studentAnalytics['wrong_blank_questions'] as List).isNotEmpty))) {
      // Sorulardan türet (Fallback)
      final qList = (studentAnalytics['questions'] is List && (studentAnalytics['questions'] as List).isNotEmpty)
          ? studentAnalytics['questions'] as List
          : studentAnalytics['wrong_blank_questions'] as List;
      final Map<String, Map<String, dynamic>> grouped = {};
      for (final q in qList) {
        if (q is! Map) continue;
        final cId = _toInt(q['course_id']);
        final cName = _getCourseDisplayName(cId, q);
        final tName = (q['topic_name'] ?? 'Kazanım Belirtilmemiş').toString();
        final key = '${cId}_$tName';
        if (!grouped.containsKey(key)) {
          grouped[key] = {
            'topic_name': tName,
            'course_name': cName,
            'course_id': cId,
            'correct': 0,
            'wrong': 0,
            'blank': 0,
            'total': 0,
          };
        }
        final status = (q['status'] ?? '').toString();
        if (status == 'correct') {
          grouped[key]!['correct'] = _toInt(grouped[key]!['correct']) + 1;
        } else if (status == 'wrong') {
          grouped[key]!['wrong'] = _toInt(grouped[key]!['wrong']) + 1;
        } else {
          grouped[key]!['blank'] = _toInt(grouped[key]!['blank']) + 1;
        }
        grouped[key]!['total'] = _toInt(grouped[key]!['total']) + 1;
      }
      for (final g in grouped.values) {
        final total = _toInt(g['total']);
        final correct = _toInt(g['correct']);
        g['success_rate'] = total > 0 ? (correct / total) * 100 : 0.0;
        rawTopicList.add(g);
      }
    }

    final Map<int, String> distinctCourses = {};
    for (final t in rawTopicList) {
      final cid = _toInt(t['course_id']);
      final cname = _getCourseDisplayName(cid, t);
      t['course_name'] = cname;
      if (cid > 0 && cname.isNotEmpty) {
        distinctCourses[cid] = cname;
      }
    }

    final filteredByCourse = _selectedTopicCourseId == null
        ? rawTopicList
        : rawTopicList.where((t) {
            final cid = _toInt(t['course_id']);
            return cid == _selectedTopicCourseId;
          }).toList();

    final totalTopicsCount = filteredByCourse.length;
    final weakTopicsCount = filteredByCourse.where((t) => _toInt(t['wrong']) > 0 || _toInt(t['blank']) > 0).length;
    final masteredTopicsCount = filteredByCourse.where((t) => _toInt(t['total']) > 0 && _toInt(t['wrong']) == 0 && _toInt(t['blank']) == 0).length;

    final filteredTopics = filteredByCourse.where((t) {
      final wrong = _toInt(t['wrong']);
      final blank = _toInt(t['blank']);
      final correct = _toInt(t['correct']);
      if (_topicFilterMode == 'weak' && wrong == 0 && blank == 0) {
        return false;
      }
      if (_topicFilterMode == 'mastered' && (wrong > 0 || blank > 0 || correct == 0)) {
        return false;
      }
      if (_topicSearchQuery.trim().isNotEmpty) {
        final query = _topicSearchQuery.toLowerCase().trim();
        final topicName = (t['topic_name'] ?? '').toString().toLowerCase();
        final courseName = (t['course_name'] ?? '').toString().toLowerCase();
        if (!topicName.contains(query) && !courseName.contains(query)) {
          return false;
        }
      }
      return true;
    }).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.person_search_outlined, color: Colors.blue),
                  const SizedBox(width: 8),
                  Text(
                    'Öğrenci Seçimi ve Arama',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                decoration: InputDecoration(
                  hintText: 'İsim veya numara ile ara...',
                  prefixIcon: const Icon(Icons.search),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onChanged: (val) {
                  setState(() => _studentFilterQuery = val);
                },
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<int>(
                key: ValueKey(_selectedStudentId),
                initialValue: filteredResults.any((r) {
                  final s = r['student'] is Map ? r['student'] as Map : {};
                  final sid = _toInt(s['id'] ?? r['student_id']);
                  return sid == _selectedStudentId;
                }) ? _selectedStudentId : null,
                isExpanded: true,
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                items: filteredResults.map((r) {
                  final s = r['student'] is Map ? r['student'] as Map : {};
                  final sid = _toInt(s['id'] ?? r['student_id']);
                  final sname = (s['name'] ?? r['student_name'] ?? 'İsimsiz').toString();
                  return DropdownMenuItem<int>(
                    value: sid,
                    child: Text(sname, overflow: TextOverflow.ellipsis),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _selectedStudentId = val;
                      _selectedTopicCourseId = null;
                      _topicSearchQuery = '';
                      _topicFilterMode = 'all';
                    });
                    _fetchStudentAnalytics(val);
                  }
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Seçili öğrenci karne kartı
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: Colors.blue.shade100,
                    child: Text(
                      studentName.isNotEmpty ? studentName[0].toUpperCase() : '?',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.blue.shade800),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(studentName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text('$classroomName ${studentNumber.isNotEmpty ? '• No: $studentNumber' : ''}', style: TextStyle(color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildModalStatBox('Genel Sıra', '#$rank / ${_results.length}', Colors.amber.shade800, Icons.emoji_events_outlined),
                  ),
                  if (classRank != null) ...[
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildModalStatBox('Sınıf Sırası', '#$classRank / $classTotal', Colors.purple.shade700, Icons.groups_outlined),
                    ),
                  ],
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildModalStatBox('Toplam Net', totalNet, Colors.blue.shade700, Icons.bar_chart),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        // Konu ve Kazanım Analizi Başlığı
        Row(
          children: [
            Icon(Icons.checklist_rounded, color: Colors.blue.shade700, size: 22),
            const SizedBox(width: 8),
            Text(
              'Konu ve Kazanım Analizi',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const Spacer(),
            if (_isLoadingStudentAnalytics)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else if (currentStudentId > 0)
              InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => _fetchStudentAnalytics(currentStudentId, force: true),
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: Icon(Icons.refresh, size: 20, color: Colors.blue.shade700),
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Öğrencinin konu kazanım başarıları ve eksik kaldığı alanlar',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 12),
        // Özet İstatistik Kutuları
        Row(
          children: [
            Expanded(
              child: _buildOutcomeSummaryBox('Toplam', '$totalTopicsCount', Colors.blue.shade700, Icons.list_alt_rounded),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildOutcomeSummaryBox('Eksikler', '$weakTopicsCount', Colors.red.shade700, Icons.warning_amber_rounded),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildOutcomeSummaryBox('Tam Başarı', '$masteredTopicsCount', Colors.green.shade700, Icons.check_circle_outline_rounded),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Arama Kutusu
        TextField(
          decoration: InputDecoration(
            hintText: 'Kazanım veya konu ara...',
            prefixIcon: const Icon(Icons.search, size: 20),
            suffixIcon: _topicSearchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    onPressed: () => setState(() => _topicSearchQuery = ''),
                  )
                : null,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          onChanged: (val) => setState(() => _topicSearchQuery = val),
        ),
        const SizedBox(height: 10),
        // Ders Filtreleri
        if (distinctCourses.isNotEmpty) ...[
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                ChoiceChip(
                  label: const Text('Tüm Dersler'),
                  selected: _selectedTopicCourseId == null,
                  onSelected: (selected) {
                    if (selected) setState(() => _selectedTopicCourseId = null);
                  },
                ),
                const SizedBox(width: 6),
                ...distinctCourses.entries.map((c) {
                  final isSelected = _selectedTopicCourseId == c.key;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(c.value),
                      selected: isSelected,
                      onSelected: (selected) {
                        setState(() => _selectedTopicCourseId = selected ? c.key : null);
                      },
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],
        // Durum Filtresi (Tümü, Eksikler, Tam Başarı)
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              ChoiceChip(
                label: const Text('Tümü'),
                selected: _topicFilterMode == 'all',
                onSelected: (selected) {
                  if (selected) setState(() => _topicFilterMode = 'all');
                },
              ),
              const SizedBox(width: 6),
              ChoiceChip(
                label: Text('Eksikler ($weakTopicsCount)'),
                selectedColor: Colors.red.shade100,
                selected: _topicFilterMode == 'weak',
                onSelected: (selected) {
                  if (selected) setState(() => _topicFilterMode = 'weak');
                },
              ),
              const SizedBox(width: 6),
              ChoiceChip(
                label: Text('Tam Başarı ($masteredTopicsCount)'),
                selectedColor: Colors.green.shade100,
                selected: _topicFilterMode == 'mastered',
                onSelected: (selected) {
                  if (selected) setState(() => _topicFilterMode = 'mastered');
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Konu Listesi / Yükleniyor / Boş Durum
        if (_isLoadingStudentAnalytics && rawTopicList.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (filteredTopics.isEmpty)
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.info_outline, size: 36, color: Colors.grey.shade400),
                    const SizedBox(height: 8),
                    Text(
                      rawTopicList.isEmpty
                          ? 'Bu öğrenci için konu/kazanım verisi bulunamadı.'
                          : 'Filtreye uygun konu/kazanım bulunamadı.',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    if (rawTopicList.isEmpty && currentStudentId > 0) ...[
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () => _fetchStudentAnalytics(currentStudentId, force: true),
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('Kazanımları Yükle / Yenile'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          )
        else
          ...filteredTopics.map((topic) {
            final topicName = (topic['topic_name'] ?? 'Belirtilmemiş').toString();
            final courseName = (topic['course_name'] ?? 'Ders').toString();
            final correct = _toInt(topic['correct']);
            final wrong = _toInt(topic['wrong']);
            final blank = _toInt(topic['blank']);
            final total = _toInt(topic['total'] ?? (correct + wrong + blank));
            final successRate = (topic['success_rate'] != null
                    ? _toDouble(topic['success_rate'])
                    : (total > 0 ? (correct / total * 100) : 0.0))
                .clamp(0.0, 100.0);
            final ratePercent = (successRate / 100.0).clamp(0.0, 1.0);
            final isWeak = wrong > 0 || blank > 0;
            final rateColor = successRate >= 70
                ? Colors.green
                : successRate >= 40
                    ? Colors.orange
                    : Colors.red;

            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              elevation: 0.5,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: BorderSide(
                  color: isWeak ? Colors.red.shade100 : Colors.grey.shade200,
                  width: isWeak ? 1.2 : 1,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.blue.shade50,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  courseName,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.blue.shade900,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                topicName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: rateColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '%${successRate.toStringAsFixed(0)}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: rateColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        _buildPillTag('Doğru: $correct', Colors.green),
                        const SizedBox(width: 6),
                        _buildPillTag('Yanlış: $wrong', Colors.red),
                        const SizedBox(width: 6),
                        _buildPillTag('Boş: $blank', Colors.grey),
                        const Spacer(),
                        Text(
                          'Toplam: $total Soru',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: ratePercent,
                        minHeight: 5,
                        backgroundColor: Colors.grey.shade200,
                        valueColor: AlwaysStoppedAnimation<Color>(rateColor),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}

// T-Score hesaplama sonucu için helper class
class _TScoreStatsResult {
  final Map<int, Map<String, dynamic>> courseStats;
  final double minTASP;
  final double maxTASP;

  _TScoreStatsResult({
    required this.courseStats,
    required this.minTASP,
    required this.maxTASP,
  });
}

// T-Score hesaplama fonksiyonu (senkron & anında çalışır)
_TScoreStatsResult _computeTScoreStats(List<Map<String, dynamic>> results) {
  if (results.isEmpty) {
    return _TScoreStatsResult(courseStats: {}, minTASP: 0, maxTASP: 0);
  }

  // Tüm sonuçları tarayarak mevcut ders ID'lerini topla
  final courseIds = <int>{};
  for (final r in results) {
    final rawScores = r['course_scores'];
    if (rawScores is Map) {
      for (final k in rawScores.keys) {
        final cid = int.tryParse(k.toString());
        if (cid != null && cid > 0) courseIds.add(cid);
      }
    }
  }

  // Her ders için tüm öğrencilerin netlerinden istatistik hesapla
  final courseStats = <int, Map<String, dynamic>>{};
  for (final courseId in courseIds) {
    final nets = <double>[];
    for (final r in results) {
      final rawScores = r['course_scores'];
      if (rawScores is Map) {
        final courseData = rawScores[courseId.toString()] ?? rawScores[courseId];
        if (courseData is Map && courseData['net'] != null) {
          nets.add(_toDouble(courseData['net']));
        }
      }
    }
    if (nets.isNotEmpty) {
      final mean = nets.reduce((a, b) => a + b) / nets.length;
      final variance =
          nets.fold<double>(0, (sum, v) => sum + (v - mean) * (v - mean)) /
          nets.length;
      final stdDev = math.sqrt(variance);
      final maxQuestions = nets.isNotEmpty ? nets.reduce(math.max) : 20.0;
      courseStats[courseId] = {
        'mean': mean,
        'stdDev': stdDev > 0.1 ? stdDev : 3.0,
        'maxQuestions': maxQuestions > 0 ? maxQuestions : 20.0,
      };
    }
  }

  // Min/Max TASP hesapla
  final minTASP = _calculateMinTASP(courseStats);
  final maxTASP = _calculateMaxTASP(courseStats);

  return _TScoreStatsResult(
    courseStats: courseStats,
    minTASP: minTASP,
    maxTASP: maxTASP,
  );
}

// Top-level helper functions for T-Score computation

double _getCourseWeight(int courseId) {
  if (courseId == 1 || courseId == 2 || courseId == 3) {
    return 4; // Matematik, Fen Bilgisi, Türkçe
  }
  return 1; // İnkılap, Din Kültürü, İngilizce
}

double _calculateZScore(double net, double mean, double stdDev) {
  final effectiveStdDev = stdDev > 0 ? stdDev : 1.0;
  return (net - mean) / effectiveStdDev;
}

double _calculateTScore(double zScore) {
  return 50 + (10 * zScore);
}

double _calculateASP(double tScore, double weight) {
  return tScore * weight;
}

double _calculateMinTASP(Map<int, Map<String, dynamic>> configs) {
  double minTASP = 0;
  configs.forEach((courseId, cfg) {
    final mean = _toDouble(cfg['mean'], 0.0);
    final stdDev = _toDouble(cfg['stdDev'], 3.0);
    final weight = _getCourseWeight(courseId);
    final z = _calculateZScore(0, mean, stdDev);
    final t = _calculateTScore(z);
    final asp = _calculateASP(t, weight);
    minTASP += asp;
  });
  return minTASP;
}

double _calculateMaxTASP(Map<int, Map<String, dynamic>> configs) {
  double maxTASP = 0;
  configs.forEach((courseId, cfg) {
    final maxQuestions = _toDouble(cfg['maxQuestions'], 20.0);
    final mean = _toDouble(cfg['mean'], 0.0);
    final stdDev = _toDouble(cfg['stdDev'], 3.0);
    final weight = _getCourseWeight(courseId);
    final z = _calculateZScore(maxQuestions, mean, stdDev);
    final t = _calculateTScore(z);
    final asp = _calculateASP(t, weight);
    maxTASP += asp;
  });
  return maxTASP;
}
