import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Course { id: number; name: string; }
interface Topic { id: number; name: string; type: string; }
interface AnswerKeyRow {
  question_no: number;
  correct_answer: string;
  topic_id: number | '';
}
interface CourseBlock {
  course_id: number;
  course_name: string;
  booklet: 'A' | 'B';
  rows: AnswerKeyRow[];
}

const ANSWERS = ['A', 'B', 'C', 'D', 'E'];

export default function OmrAnswerKey() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topicsMap, setTopicsMap] = useState<Record<number, Topic[]>>({});
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [eRes, cRes] = await Promise.all([
          axiosClient.get(`/omr/exams/${examId}`),
          axiosClient.get('/omr/courses'),
        ]);
        const examData = eRes.data?.data?.exam;
        const existingKeys = eRes.data?.data?.answer_keys ?? [];
        setExam(examData);
        const courseList: Course[] = cRes.data?.data?.courses ?? [];
        setCourses(courseList);

        // Konuları yükle
        const tMap: Record<number, Topic[]> = {};
        await Promise.all(courseList.map(async (c) => {
          const tr = await axiosClient.get(`/omr/courses/${c.id}/topics`);
          tMap[c.id] = tr.data?.data?.topics ?? [];
        }));
        setTopicsMap(tMap);

        // Mevcut cevap anahtarlarını blok yapısına dönüştür
        if (existingKeys.length > 0) {
          const builtBlocks: CourseBlock[] = [];
          for (const ck of existingKeys) {
            for (const [booklet, keys] of Object.entries(ck.booklets as Record<string, any[]>)) {
              builtBlocks.push({
                course_id: ck.course_id,
                course_name: ck.course_name,
                booklet: booklet as 'A' | 'B',
                rows: keys.map((k: any) => ({
                  question_no: k.question_no,
                  correct_answer: k.correct_answer,
                  topic_id: k.topic_id ?? '',
                })),
              });
            }
          }
          setBlocks(builtBlocks);
        }
      } catch {
        showToast('error', 'Sınav bilgileri yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId]);

  const addBlock = () => {
    if (courses.length === 0) return;
    setBlocks(prev => [...prev, {
      course_id: courses[0].id,
      course_name: courses[0].name,
      booklet: 'A',
      rows: Array.from({ length: 20 }, (_, i) => ({ question_no: i + 1, correct_answer: 'A', topic_id: '' })),
    }]);
  };

  const removeBlock = (idx: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const updateBlockCourse = (idx: number, courseId: number) => {
    const course = courses.find(c => c.id === courseId);
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, course_id: courseId, course_name: course?.name ?? '' } : b));
  };

  const updateBlockBooklet = (idx: number, booklet: 'A' | 'B') => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, booklet } : b));
  };

  const updateRowCount = (idx: number, count: number) => {
    setBlocks(prev => prev.map((b, i) => {
      if (i !== idx) return b;
      const newRows = Array.from({ length: count }, (_, qi) => ({
        question_no: qi + 1,
        correct_answer: b.rows[qi]?.correct_answer ?? 'A',
        topic_id: b.rows[qi]?.topic_id ?? '',
      }));
      return { ...b, rows: newRows };
    }));
  };

  const updateRow = (blockIdx: number, rowIdx: number, field: keyof AnswerKeyRow, value: any) => {
    setBlocks(prev => prev.map((b, i) => {
      if (i !== blockIdx) return b;
      const rows = b.rows.map((r, j) => j === rowIdx ? { ...r, [field]: value } : r);
      return { ...b, rows };
    }));
  };

  // Toplu cevap girişi: "ABCDE..." formatında
  const bulkInput = (blockIdx: number, text: string) => {
    const cleaned = text.toUpperCase().replace(/[^ABCDE]/g, '');
    setBlocks(prev => prev.map((b, i) => {
      if (i !== blockIdx) return b;
      const rows = b.rows.map((r, j) => ({
        ...r,
        correct_answer: cleaned[j] ?? r.correct_answer,
      }));
      return { ...b, rows };
    }));
  };

  const save = async () => {
    if (blocks.length === 0) { showToast('warning', 'En az bir ders bloğu ekleyin'); return; }
    try {
      setSaving(true);
      const keys: any[] = [];
      for (const block of blocks) {
        for (const row of block.rows) {
          keys.push({
            course_id: block.course_id,
            booklet_type: block.booklet,
            question_no: row.question_no,
            correct_answer: row.correct_answer,
            topic_id: row.topic_id !== '' ? row.topic_id : null,
          });
        }
      }
      await axiosClient.post(`/omr/exams/${examId}/answer-keys`, { keys });
      showToast('success', 'Cevap anahtarı kaydedildi');
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <button className="btn btn-sm btn-light me-2" onClick={() => navigate('/omr/exams')}>
            <i className="ti ti-arrow-left me-1"></i> Geri
          </button>
          <h4 className="page-title d-inline mb-0">Cevap Anahtarı</h4>
          {exam && <p className="text-muted mb-0 mt-1">{exam.name} — {exam.exam_type} {exam.session ? `/ ${exam.session}` : ''}</p>}
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={addBlock}>
            <i className="ti ti-plus me-1"></i> Ders Bloğu Ekle
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-1"></span>}
            <i className="ti ti-device-floppy me-1"></i> Kaydet
          </button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <i className="ti ti-list-check fs-1 d-block mb-2"></i>
            Cevap anahtarı için ders bloğu ekleyin
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {blocks.map((block, blockIdx) => (
            <div className="col-md-6" key={blockIdx}>
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-light d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 160 }}
                      value={block.course_id}
                      onChange={e => updateBlockCourse(blockIdx, parseInt(e.target.value))}
                    >
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 90 }}
                      value={block.booklet}
                      onChange={e => updateBlockBooklet(blockIdx, e.target.value as 'A' | 'B')}
                    >
                      <option value="A">Kitapçık A</option>
                      <option value="B">Kitapçık B</option>
                    </select>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 100 }}
                      value={block.rows.length}
                      onChange={e => updateRowCount(blockIdx, parseInt(e.target.value))}
                    >
                      {[10, 15, 20, 25, 30, 35, 40].map(n => <option key={n} value={n}>{n} soru</option>)}
                    </select>
                  </div>
                  <button className="btn btn-xs btn-soft-danger" onClick={() => removeBlock(blockIdx)}>
                    <i className="ti ti-trash"></i>
                  </button>
                </div>

                {/* Toplu giriş */}
                <div className="card-body border-bottom pb-2">
                  <label className="form-label small mb-1">Toplu Cevap Girişi (ABCDE... formatında)</label>
                  <input
                    className="form-control form-control-sm font-monospace"
                    placeholder="ABCDEABCDE..."
                    maxLength={block.rows.length}
                    onChange={e => bulkInput(blockIdx, e.target.value)}
                  />
                </div>

                <div className="card-body p-0">
                  <div className="table-responsive" style={{ maxHeight: 400 }}>
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width: 50 }}>#</th>
                          <th style={{ width: 120 }}>Cevap</th>
                          <th>Konu/Kazanım</th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.rows.map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            <td className="text-muted">{row.question_no}</td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                {ANSWERS.map(a => (
                                  <button
                                    key={a}
                                    type="button"
                                    className={`btn ${row.correct_answer === a ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    style={{ padding: '2px 7px', fontSize: 12 }}
                                    onClick={() => updateRow(blockIdx, rowIdx, 'correct_answer', a)}
                                  >
                                    {a}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                value={row.topic_id}
                                onChange={e => updateRow(blockIdx, rowIdx, 'topic_id', e.target.value !== '' ? parseInt(e.target.value) : '')}
                              >
                                <option value="">—</option>
                                {(topicsMap[block.course_id] ?? []).map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
