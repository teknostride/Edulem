import React, { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import { Link, useLocation } from 'react-router-dom';

interface Exam {
    id: number;
    title: string;
    exam_date: string;
    exam_time?: string;
}

interface Template {
    id: number;
    scholarship_exam_id: number;
    name: string;
    school_name: string;
    exam_address: string;
    selected_grade_levels: string[] | null;
    is_active: boolean;
}

const ScholarshipExamEntryTemplates: React.FC = () => {
    const location = useLocation();
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<number | ''>('');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<Template | null>(null);

    const [form, setForm] = useState({
        name: '',
        school_name: '',
        exam_address: '',
        selected_grade_levels: '',
        is_active: true,
    });

    const selectedExam = useMemo(() => exams.find((e) => e.id === Number(selectedExamId)), [exams, selectedExamId]);

    const fetchExams = async () => {
        try {
            const res = await axiosClient.get('/scholarship-exams?per_page=200');
            const d = res.data?.data ?? res.data;
            const list = d?.exams?.data ?? d?.exams ?? [];
            setExams(Array.isArray(list) ? list : []);
        } catch (e) {
            setExams([]);
        }
    };

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ per_page: '50' });
            if (selectedExamId) {
                params.set('scholarship_exam_id', String(selectedExamId));
            }
            const res = await axiosClient.get(`/scholarship-exams/entry-templates?${params.toString()}`);
            const d = res.data?.data ?? res.data;
            const raw = d?.templates;
            const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
            setTemplates(list);
        } catch (e: any) {
            setTemplates([]);
            showToast('error', e?.response?.data?.message || 'Şablonlar yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!showModal) {
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
            document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
            return;
        }

        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
            document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
        };
    }, [showModal]);

    useEffect(() => {
        fetchExams();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const qExamId = params.get('exam_id');
        if (qExamId && String(selectedExamId) !== qExamId) {
            const num = Number(qExamId);
            if (!Number.isNaN(num) && num > 0) {
                setSelectedExamId(num);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    useEffect(() => {
        fetchTemplates();
    }, [selectedExamId]);

    const openCreate = () => {
        if (!selectedExamId) {
            showToast('error', 'Önce bir sınav seçmelisin');
            return;
        }

        setEditing(null);
        setForm({
            name: selectedExam ? `${selectedExam.title} Şablonu` : 'Şablon',
            school_name: '',
            exam_address: '',
            selected_grade_levels: '',
            is_active: true,
        });
        setShowModal(true);
    };

    const openEdit = (t: Template) => {
        setEditing(t);
        setForm({
            name: t.name,
            school_name: t.school_name,
            exam_address: t.exam_address,
            selected_grade_levels: (t.selected_grade_levels ?? []).join(', '),
            is_active: t.is_active,
        });
        setShowModal(true);
    };

    const save = async () => {
        if (!selectedExamId) return;
        if (!form.name.trim() || !form.school_name.trim() || !form.exam_address.trim()) {
            showToast('error', 'Lütfen zorunlu alanları doldurun');
            return;
        }

        const payload: any = {
            name: form.name.trim(),
            school_name: form.school_name.trim(),
            exam_address: form.exam_address.trim(),
            is_active: form.is_active,
            selected_grade_levels: form.selected_grade_levels
                ? form.selected_grade_levels.split(',').map((x) => x.trim()).filter(Boolean)
                : [],
        };

        try {
            setSaving(true);
            if (editing) {
                await axiosClient.put(`/scholarship-exams/entry-templates/${editing.id}`, payload);
                showToast('success', 'Şablon güncellendi');
            } else {
                await axiosClient.post('/scholarship-exams/entry-templates', {
                    scholarship_exam_id: Number(selectedExamId),
                    ...payload,
                });
                showToast('success', 'Şablon oluşturuldu');
            }
            setShowModal(false);
            setEditing(null);
            fetchTemplates();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Kaydetme başarısız');
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Şablon silinsin mi?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/scholarship-exams/entry-templates/${id}`);
            showToast('success', 'Şablon silindi');
            fetchTemplates();
        } catch (e) {
            showToast('error', 'Şablon silinemedi');
        }
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                        <h4 className="mb-sm-0">Belge Düzenleme (Giriş Belgesi Şablonları)</h4>
                        <Link to="/scholarship/exams" className="btn btn-soft-secondary">
                            <i className="ti ti-arrow-left me-1"></i> Sınavlara Dön
                        </Link>
                    </div>
                </div>
            </div>

            <div className="card mt-3">
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-8">
                            <label className="form-label">Sınav</label>
                            <select
                                className="form-select"
                                value={selectedExamId}
                                onChange={(e) => setSelectedExamId(e.target.value ? Number(e.target.value) : '')}
                            >
                                <option value="">Sınav seçiniz</option>
                                {exams.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.title} ({e.exam_date}{e.exam_time ? ` ${String(e.exam_time).slice(0, 5)}` : ''})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-4 text-end">
                            <button className="btn btn-primary" onClick={openCreate} disabled={!selectedExamId}>
                                <i className="ti ti-plus me-1"></i> Yeni Şablon
                            </button>
                        </div>
                    </div>

                    <hr />

                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-muted">Şablon bulunamadı.</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Ad</th>
                                        <th>Okul Adı</th>
                                        <th>Aktif</th>
                                        <th className="text-end">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map((t) => (
                                        <tr key={t.id}>
                                            <td>{t.name}</td>
                                            <td>{t.school_name}</td>
                                            <td>
                                                {t.is_active ? (
                                                    <span className="badge bg-soft-success text-success">Aktif</span>
                                                ) : (
                                                    <span className="badge bg-soft-secondary text-secondary">Pasif</span>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                <button className="btn btn-sm btn-soft-secondary me-1" onClick={() => openEdit(t)}>
                                                    <i className="ti ti-edit"></i>
                                                </button>
                                                <button className="btn btn-sm btn-soft-danger" onClick={() => remove(t.id)}>
                                                    <i className="ti ti-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <>
                    <div className="modal fade show" style={{ display: 'block', zIndex: 1055 }} tabIndex={-1}>
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">{editing ? 'Şablon Düzenle' : 'Yeni Şablon'}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label">Şablon Adı *</label>
                                            <input
                                                className="form-control"
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Okul Adı *</label>
                                            <input
                                                className="form-control"
                                                value={form.school_name}
                                                onChange={(e) => setForm({ ...form, school_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">Sınav Adresi *</label>
                                            <textarea
                                                className="form-control"
                                                rows={3}
                                                value={form.exam_address}
                                                onChange={(e) => setForm({ ...form, exam_address: e.target.value })}
                                            ></textarea>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">Sınıf Düzeyleri (virgülle)</label>
                                            <input
                                                className="form-control"
                                                placeholder="Örn: 4, 5, 6"
                                                value={form.selected_grade_levels}
                                                onChange={(e) => setForm({ ...form, selected_grade_levels: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={form.is_active}
                                                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                                    id="is_active"
                                                />
                                                <label className="form-check-label" htmlFor="is_active">Aktif şablon olarak işaretle</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-soft-secondary" onClick={() => setShowModal(false)}>
                                        İptal
                                    </button>
                                    <button className="btn btn-primary" onClick={save} disabled={saving}>
                                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => setShowModal(false)}></div>
                </>
            )}
        </div>
    );
};

export default ScholarshipExamEntryTemplates;
