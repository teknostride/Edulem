import { useMemo, useState } from 'react';
import type { StudentAnalytics } from '../types';

export default function StudentTopicAnalysis({ data }: { data: StudentAnalytics }) {
  const [selectedCourseId, setSelectedCourseId] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'weak' | 'correct'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'topics' | 'questions'>('topics');

  // Unified Question list
  const questionsList = useMemo(() => {
    if (data.questions && data.questions.length > 0) {
      return data.questions;
    }
    // Fallback: If only wrong_blank_questions exists
    if (data.wrong_blank_questions && data.wrong_blank_questions.length > 0) {
      return data.wrong_blank_questions.map((q) => ({
        ...q,
        topic_type: 'topic',
      }));
    }
    return [];
  }, [data]);

  // Unified Topic outcomes list
  const topicList = useMemo(() => {
    // If backend provided topic_analysis array
    if (Array.isArray(data.topic_analysis) && data.topic_analysis.length > 0) {
      return data.topic_analysis.map((t) => {
        const total = t.total ?? (t.correct + t.wrong + t.blank);
        const successRate = t.success_rate ?? (total > 0 ? Math.round((t.correct / total) * 100) : 0);
        return {
          ...t,
          total,
          success_rate: successRate,
        };
      });
    }

    // Otherwise derive directly from questionsList
    if (questionsList.length > 0) {
      const map = new Map<string, {
        topic_id: number;
        topic_name: string;
        course_id: number;
        course_name: string;
        correct: number;
        wrong: number;
        blank: number;
        total: number;
        success_rate: number;
      }>();

      questionsList.forEach((q) => {
        const key = `${q.course_id}_${q.topic_id}_${q.topic_name}`;
        if (!map.has(key)) {
          map.set(key, {
            topic_id: q.topic_id,
            topic_name: q.topic_name || 'Belirtilmemiş',
            course_id: q.course_id,
            course_name: q.course_name,
            correct: 0,
            wrong: 0,
            blank: 0,
            total: 0,
            success_rate: 0,
          });
        }
        const item = map.get(key)!;
        if (q.status === 'correct') item.correct++;
        else if (q.status === 'wrong') item.wrong++;
        else item.blank++;
        item.total++;
      });

      return Array.from(map.values()).map((item) => ({
        ...item,
        success_rate: item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0,
      })).sort((a, b) => {
        if (a.course_name !== b.course_name) return a.course_name.localeCompare(b.course_name, 'tr');
        if (b.wrong !== a.wrong) return b.wrong - a.wrong;
        return a.success_rate - b.success_rate;
      });
    }

    return [];
  }, [data, questionsList]);

  // Distinct courses for pill filtering
  const distinctCourses = useMemo(() => {
    const map = new Map<number, string>();
    topicList.forEach((t) => map.set(t.course_id, t.course_name));
    questionsList.forEach((q) => map.set(q.course_id, q.course_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [topicList, questionsList]);

  // Global summary statistics
  const summaryStats = useMemo(() => {
    const totalTopics = topicList.length;
    const weakTopics = topicList.filter((t) => t.wrong > 0 || t.blank > 0).length;
    const masteredTopics = topicList.filter((t) => t.total > 0 && t.wrong === 0 && t.blank === 0).length;
    
    const totalQ = questionsList.length;
    const correctQ = questionsList.filter((q) => q.status === 'correct').length;
    const wrongQ = questionsList.filter((q) => q.status === 'wrong').length;
    const blankQ = questionsList.filter((q) => q.status === 'blank').length;

    return {
      totalTopics,
      weakTopics,
      masteredTopics,
      totalQ,
      correctQ,
      wrongQ,
      blankQ,
    };
  }, [topicList, questionsList]);

  // Filtered Topics
  const filteredTopics = useMemo(() => {
    return topicList.filter((t) => {
      if (selectedCourseId !== 'all' && t.course_id !== selectedCourseId) return false;
      if (filterStatus === 'weak' && t.wrong === 0 && t.blank === 0) return false;
      if (filterStatus === 'correct' && (t.wrong > 0 || t.blank > 0 || t.correct === 0)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = t.topic_name.toLowerCase().includes(q);
        const matchesCourse = t.course_name.toLowerCase().includes(q);
        if (!matchesName && !matchesCourse) return false;
      }
      return true;
    });
  }, [topicList, selectedCourseId, filterStatus, searchQuery]);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return questionsList.filter((q) => {
      if (selectedCourseId !== 'all' && q.course_id !== selectedCourseId) return false;
      if (filterStatus === 'weak' && q.status === 'correct') return false;
      if (filterStatus === 'correct' && q.status !== 'correct') return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTopic = q.topic_name.toLowerCase().includes(query);
        const matchesCourse = q.course_name.toLowerCase().includes(query);
        const matchesQno = String(q.question_no).includes(query);
        if (!matchesTopic && !matchesCourse && !matchesQno) return false;
      }
      return true;
    });
  }, [questionsList, selectedCourseId, filterStatus, searchQuery]);

  // Top weak outcomes
  const topDeficiencies = useMemo(() => {
    return topicList
      .filter((t) => t.wrong > 0 && t.topic_name !== 'Belirtilmemiş')
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 5);
  }, [topicList]);

  const hasData = topicList.length > 0 || questionsList.length > 0;

  return (
    <div className="card shadow-sm border-0 mt-3">
      <div className="card-header bg-white border-bottom py-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <h6 className="mb-1 text-primary fw-bold d-flex align-items-center gap-2">
              <i className="ti ti-checklist fs-5"></i>
              Konu ve Kazanım Analizi
            </h6>
            <span className="small text-muted">
              Öğrencinin sınavdaki konu kazanım başarıları, eksik kaldığı alanlar ve soru bazlı yanıt dağılımı
            </span>
          </div>

          {/* View mode toggle */}
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${viewMode === 'topics' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('topics')}
            >
              <i className="ti ti-layout-grid me-1"></i>
              Kazanım Bazlı ({topicList.length})
            </button>
            <button
              type="button"
              className={`btn ${viewMode === 'questions' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('questions')}
            >
              <i className="ti ti-list-check me-1"></i>
              Soru Bazlı ({questionsList.length})
            </button>
          </div>
        </div>
      </div>

      <div className="card-body">
        {!hasData ? (
          <div className="text-center py-4 text-muted">
            <i className="ti ti-info-circle fs-3 d-block mb-2 text-secondary"></i>
            Bu sınav için soru veya konu kazanım eşleşmesi bulunamadı.
          </div>
        ) : (
          <>
            {/* Top Deficiency Alert */}
            {topDeficiencies.length > 0 && (
              <div className="alert alert-warning border-0 shadow-sm d-flex align-items-start gap-3 mb-3 p-3">
                <i className="ti ti-alert-triangle fs-4 text-warning flex-shrink-0 mt-1"></i>
                <div className="flex-grow-1">
                  <div className="fw-bold mb-1 text-dark">
                    Öncelikli Eksik Kazanımlar ({topDeficiencies.length} Konu)
                  </div>
                  <div className="small text-muted mb-2">
                    Öğrencinin en çok yanlış yaptığı kazanımlar tespit edildi. Bu konularda bireysel etüt veya ödevlendirme tavsiye edilir:
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {topDeficiencies.map((t, idx) => (
                      <span key={idx} className="badge bg-danger-subtle text-danger border border-danger-subtle p-2">
                        <strong>{t.course_name}:</strong> {t.topic_name}
                        <span className="ms-1 badge bg-danger text-white rounded-pill">
                          {t.wrong} Yanlış
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Metrics cards row */}
            <div className="row g-2 mb-3">
              <div className="col-6 col-md-3">
                <div className="p-2 border rounded text-center bg-light">
                  <div className="text-muted small">Toplam Kazanım</div>
                  <div className="fs-5 fw-bold text-dark">{summaryStats.totalTopics}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2 border rounded text-center bg-danger-subtle border-danger-subtle">
                  <div className="text-danger small fw-semibold">Eksik Kazanım</div>
                  <div className="fs-5 fw-bold text-danger">{summaryStats.weakTopics}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2 border rounded text-center bg-success-subtle border-success-subtle">
                  <div className="text-success small fw-semibold">Tam Başarı</div>
                  <div className="fs-5 fw-bold text-success">{summaryStats.masteredTopics}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2 border rounded text-center bg-light">
                  <div className="text-muted small">Cevap Dağılımı (D / Y / B)</div>
                  <div className="fs-6 fw-bold">
                    <span className="text-success">{summaryStats.correctQ} D</span>
                    {' / '}
                    <span className="text-danger">{summaryStats.wrongQ} Y</span>
                    {' / '}
                    <span className="text-secondary">{summaryStats.blankQ} B</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 p-2 bg-light rounded">
              {/* Course pills */}
              <div className="d-flex flex-wrap gap-1 align-items-center">
                <span className="small fw-semibold text-muted me-1">Ders:</span>
                <button
                  type="button"
                  className={`btn btn-xs py-1 px-2 rounded-pill ${selectedCourseId === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSelectedCourseId('all')}
                >
                  Tümü
                </button>
                {distinctCourses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`btn btn-xs py-1 px-2 rounded-pill ${selectedCourseId === c.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setSelectedCourseId(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Status filter & Search */}
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className={`btn ${filterStatus === 'all' ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
                    onClick={() => setFilterStatus('all')}
                  >
                    Tümü
                  </button>
                  <button
                    type="button"
                    className={`btn ${filterStatus === 'weak' ? 'btn-danger text-white' : 'btn-outline-danger'}`}
                    onClick={() => setFilterStatus('weak')}
                  >
                    <i className="ti ti-x me-1"></i>
                    Eksik Olanlar
                  </button>
                  <button
                    type="button"
                    className={`btn ${filterStatus === 'correct' ? 'btn-success text-white' : 'btn-outline-success'}`}
                    onClick={() => setFilterStatus('correct')}
                  >
                    <i className="ti ti-check me-1"></i>
                    Doğru Olanlar
                  </button>
                </div>

                <div className="input-group input-group-sm" style={{ width: 200 }}>
                  <span className="input-group-text bg-white">
                    <i className="ti ti-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Kazanım ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setSearchQuery('')}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* TAB 1: Kazanım Bazlı Tablo */}
            {viewMode === 'topics' && (
              <div className="table-responsive border rounded">
                <table className="table table-hover table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '18%' }}>Ders</th>
                      <th style={{ width: '38%' }}>Konu / Kazanım</th>
                      <th className="text-center" style={{ width: '8%' }}>Soru</th>
                      <th className="text-center" style={{ width: '14%' }}>D / Y / B</th>
                      <th style={{ width: '12%' }}>Başarı</th>
                      <th className="text-center" style={{ width: '10%' }}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTopics.map((t, index) => {
                      const isWeak = t.wrong > 0;
                      const isBlankOnly = t.wrong === 0 && t.blank > 0;
                      const isSuccess = t.wrong === 0 && t.blank === 0 && t.correct > 0;

                      return (
                        <tr key={index} className={isWeak ? 'table-danger-subtle' : ''}>
                          <td className="fw-semibold text-secondary">
                            {t.course_name}
                          </td>
                          <td>
                            <div className="fw-semibold text-dark">{t.topic_name}</div>
                          </td>
                          <td className="text-center fw-semibold text-muted">
                            {t.total}
                          </td>
                          <td className="text-center">
                            <span className="badge bg-success-subtle text-success me-1 px-2 py-1">
                              {t.correct} D
                            </span>
                            <span className="badge bg-danger-subtle text-danger me-1 px-2 py-1">
                              {t.wrong} Y
                            </span>
                            <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                              {t.blank} B
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: 6 }}>
                                <div
                                  className={`progress-bar ${
                                    t.success_rate >= 75
                                      ? 'bg-success'
                                      : t.success_rate >= 50
                                      ? 'bg-warning'
                                      : 'bg-danger'
                                  }`}
                                  style={{ width: `${t.success_rate}%` }}
                                ></div>
                              </div>
                              <span className="small fw-bold" style={{ minWidth: 35 }}>
                                %{t.success_rate}
                              </span>
                            </div>
                          </td>
                          <td className="text-center">
                            {isWeak ? (
                              <span className="badge bg-danger text-white">
                                <i className="ti ti-x me-1"></i>Eksik
                              </span>
                            ) : isBlankOnly ? (
                              <span className="badge bg-warning text-dark">
                                <i className="ti ti-minus me-1"></i>Boş
                              </span>
                            ) : isSuccess ? (
                              <span className="badge bg-success text-white">
                                <i className="ti ti-check me-1"></i>Tam
                              </span>
                            ) : (
                              <span className="badge bg-secondary text-white">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredTopics.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-muted">
                          Filtreye uygun konu kazanım bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Soru Bazlı Tablo */}
            {viewMode === 'questions' && (
              <div className="table-responsive border rounded">
                <table className="table table-hover table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="text-center" style={{ width: '8%' }}>Soru No</th>
                      <th style={{ width: '18%' }}>Ders</th>
                      <th style={{ width: '42%' }}>Konu / Kazanım</th>
                      <th className="text-center" style={{ width: '10%' }}>Öğrenci</th>
                      <th className="text-center" style={{ width: '10%' }}>Doğru</th>
                      <th className="text-center" style={{ width: '12%' }}>Sonuç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((q, idx) => {
                      const isCorrect = q.status === 'correct';
                      const isWrong = q.status === 'wrong';
                      const isBlank = q.status === 'blank';

                      return (
                        <tr
                          key={idx}
                          className={isWrong ? 'table-danger-subtle' : isBlank ? 'table-warning-subtle' : ''}
                        >
                          <td className="text-center fw-bold">
                            #{q.student_qno ?? q.question_no}
                          </td>
                          <td className="fw-semibold text-secondary">{q.course_name}</td>
                          <td>
                            <div className="fw-semibold text-dark">{q.topic_name}</div>
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge fs-6 ${
                                isCorrect
                                  ? 'bg-success text-white'
                                  : isWrong
                                  ? 'bg-danger text-white'
                                  : 'bg-secondary text-white'
                              }`}
                              style={{ width: 30 }}
                            >
                              {q.given_answer || '—'}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-light text-dark border fs-6" style={{ width: 30 }}>
                              {q.correct_answer}
                            </span>
                          </td>
                          <td className="text-center">
                            {isCorrect ? (
                              <span className="badge bg-success-subtle text-success px-2 py-1">
                                <i className="ti ti-check me-1"></i>Doğru
                              </span>
                            ) : isWrong ? (
                              <span className="badge bg-danger-subtle text-danger px-2 py-1">
                                <i className="ti ti-x me-1"></i>Yanlış
                              </span>
                            ) : (
                              <span className="badge bg-warning-subtle text-warning px-2 py-1">
                                <i className="ti ti-minus me-1"></i>Boş
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredQuestions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-muted">
                          Filtreye uygun soru bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
