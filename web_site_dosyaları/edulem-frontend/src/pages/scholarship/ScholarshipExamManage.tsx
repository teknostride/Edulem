import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

interface ScholarshipExam {
    id: number;
    title: string;
    exam_date: string;
    exam_time?: string;
    status?: string;
}

const ScholarshipExamManage: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();
    const [exam, setExam] = useState<ScholarshipExam | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchExam = async () => {
        if (!examId) return;
        try {
            setLoading(true);
            const res = await axiosClient.get(`/scholarship-exams/${examId}`);
            const d = res.data?.data ?? res.data;
            setExam(d);
        } catch (e) {
            setExam(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExam();
    }, [examId]);

    const title = useMemo(() => {
        if (!exam) return 'Sınav Yönetimi';
        const dt = exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('tr-TR') : '';
        const tm = exam.exam_time ? String(exam.exam_time).slice(0, 5) : '';
        return `${exam.title}${dt ? ` (${dt}${tm ? ` ${tm}` : ''})` : ''}`;
    }, [exam]);

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                        <div>
                            <h4 className="mb-sm-0">{title}</h4>
                            {exam?.status ? <div className="text-muted">Durum: {exam.status}</div> : null}
                        </div>
                        <Link to="/scholarship/exams" className="btn btn-soft-secondary">
                            <i className="ti ti-arrow-left me-1"></i> Sınavlara Dön
                        </Link>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <div className="mt-2 text-muted">Yükleniyor...</div>
                </div>
            ) : (
                <div className="row g-3">
                    <div className="col-lg-8">
                        <div className="card">
                            <div className="card-header">
                                <h5 className="card-title mb-0">İç Menü</h5>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <Link to={`/scholarship/exams/${examId}/applications`} className="btn btn-soft-primary w-100 text-start">
                                            <i className="ti ti-users me-2"></i> Kayıtlar / Başvurular
                                        </Link>
                                    </div>
                                    <div className="col-md-6">
                                        <Link to={`/scholarship/exams/${examId}/seating`} className="btn btn-soft-primary w-100 text-start">
                                            <i className="ti ti-layout-grid me-2"></i> Sınav Sınıfı Oluşturma
                                        </Link>
                                    </div>
                                    <div className="col-md-6">
                                        <Link to={`/scholarship/entry-templates?exam_id=${examId}`} className="btn btn-soft-primary w-100 text-start">
                                            <i className="ti ti-file-text me-2"></i> Belge Düzenleme
                                        </Link>
                                    </div>
                                    <div className="col-md-6">
                                        <Link to={`/scholarship/exams/${examId}/applications`} className="btn btn-soft-primary w-100 text-start">
                                            <i className="ti ti-download me-2"></i> Öğrenci Belgesi İndirme
                                        </Link>
                                    </div>
                                    <div className="col-md-6">
                                        <Link to={`/scholarship/exams/${examId}/statistics`} className="btn btn-soft-primary w-100 text-start">
                                            <i className="ti ti-chart-bar me-2"></i> İstatistikler
                                        </Link>
                                    </div>
                                    <div className="col-md-6">
                                        <Link to={`/scholarship/exams/${examId}/edit`} className="btn btn-soft-secondary w-100 text-start">
                                            <i className="ti ti-edit me-2"></i> Sınavı Düzenle
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-header">
                                <h5 className="card-title mb-0">Hızlı İşlemler</h5>
                            </div>
                            <div className="card-body">
                                <div className="d-grid gap-2">
                                    <Link to={`/scholarship/exams/${examId}/applications`} className="btn btn-primary">
                                        <i className="ti ti-users me-1"></i> Başvuruları Aç
                                    </Link>
                                    <Link to={`/scholarship/exams/${examId}/seating`} className="btn btn-outline-primary">
                                        Oturma Planı Oluştur
                                    </Link>
                                    <Link to={`/scholarship/entry-templates?exam_id=${examId}`} className="btn btn-outline-primary">
                                        Şablon Seç / Düzenle
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScholarshipExamManage;
