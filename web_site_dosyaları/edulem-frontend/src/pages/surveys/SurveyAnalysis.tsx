import { useState, useEffect, Fragment } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import Chart from 'react-apexcharts';

interface AnalysisItem {
    question_id?: number;
    question_index?: number;
    question: string;
    question_type?: string;
    total_answers: number;
    answers: any[];
}

const SurveyAnalysis = () => {
    const { type, id } = useParams();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [analysis, setAnalysis] = useState<AnalysisItem[]>([]);
    const [viewType, setViewType] = useState<'general' | 'individual'>('general');
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
    }, [id, viewType]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const statsRes = await axiosClient.get(`/surveys/${type === 'online' ? 'online' : 'forms'}/${id}/statistics`);
            setStats(statsRes.data.data);

            const analysisRes = await axiosClient.get(`/surveys/${type === 'online' ? 'online' : 'forms'}/${id}/analysis?type=${viewType}`);
            setAnalysis(analysisRes.data.data.analysis);
        } catch (error) {
            showToast('error', 'Analiz verileri yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const downloadPdf = async (url: string, fileName: string) => {
        try {
            const res = await axiosClient.get(url, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const href = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = href;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(href);
        } catch (e) {
            showToast('error', 'PDF indirilemedi');
        }
    };

    const renderChart = (item: AnalysisItem) => {
        // Aggregate answers for charting
        const counts: { [key: string]: number } = {};
        item.answers.forEach(a => {
            const val = typeof a === 'object' ? a.answer : a;
            counts[val] = (counts[val] || 0) + 1;
        });

        const labels = Object.keys(counts);
        const series = Object.values(counts);

        const options: any = {
            chart: {
                type: 'pie',
                toolbar: { show: false }
            },
            labels: labels,
            responsive: [{
                breakpoint: 480,
                options: { chart: { width: 200 } }
            }],
            legend: { position: 'bottom' },
            colors: ['#3b6cff', '#0dcaf0', '#198754', '#ffc107', '#dc3545']
        };

        return (
            <div className="py-3">
                <Chart options={options} series={series} type="pie" height={250} />
            </div>
        );
    };

    if (loading && !stats) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title mb-1">Anket Analizi</h4>
                    <p className="text-muted mb-0">Katılım oranları ve cevap dağılımları.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                    <div className="btn-group">
                        <button
                            className={`btn ${viewType === 'general' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewType('general')}
                        >
                            Genel Dağılım
                        </button>
                        <button
                            className={`btn ${viewType === 'individual' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewType('individual')}
                        >
                            Bireysel Cevaplar
                        </button>
                    </div>

                    <div className="btn-group">
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => downloadPdf(`/surveys/${type === 'online' ? 'online' : 'forms'}/${id}/statistics/pdf`, `anket-istatistik-${id}.pdf`)}
                        >
                            İstatistik PDF
                        </button>
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => downloadPdf(`/surveys/${type === 'online' ? 'online' : 'forms'}/${id}/analysis/pdf?type=${viewType}`, `anket-analiz-${id}-${viewType}.pdf`)}
                        >
                            Analiz PDF
                        </button>
                    </div>
                </div>
            </div>

            {stats && (
                <div className="row mb-4">
                    <div className="col-md-3">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body">
                                <h6 className="text-muted mb-2">Toplam Katılım</h6>
                                <h3 className="mb-0">{stats.total_responses}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body">
                                <h6 className="text-muted mb-2">Anonim Cevaplar</h6>
                                <h3 className="mb-0 text-info">{stats.anonymous_responses}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body py-2">
                                <h6 className="text-muted mb-2">Katılımcı Dağılımı</h6>
                                <div className="d-flex gap-3">
                                    {Object.entries(stats.by_respondent_type || {}).map(([type, count]: any) => (
                                        <div key={type}>
                                            <span className="badge bg-light text-dark me-1">{type}:</span>
                                            <strong>{count}</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6 mt-3">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body py-2">
                                <h6 className="text-muted mb-2">Kampüs Dağılımı</h6>
                                <div className="d-flex flex-wrap gap-2">
                                    {Object.entries(stats.by_campus || {}).map(([campus, count]: any) => (
                                        <span key={campus} className="badge bg-light text-dark">
                                            {campus}: <strong>{count}</strong>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6 mt-3">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body py-2">
                                <h6 className="text-muted mb-2">Kademe Dağılımı</h6>
                                <div className="d-flex flex-wrap gap-2">
                                    {Object.entries(stats.by_education_level || {}).map(([lvl, count]: any) => (
                                        <span key={lvl} className="badge bg-light text-dark">
                                            {lvl}: <strong>{count}</strong>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="row">
                {viewType === 'general' ? (
                    analysis.map((item, index) => (
                        <div className="col-lg-6 mb-4" key={index}>
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-header bg-transparent py-3">
                                    <h6 className="mb-0">{index + 1}. {item.question}</h6>
                                    <small className="text-muted">{item.total_answers} Toplam Cevap</small>
                                </div>
                                <div className="card-body">
                                    {item.total_answers > 0 ? (
                                        item.question_type === 'text' ? (
                                            <div className="overflow-auto" style={{ maxHeight: '200px' }}>
                                                {item.answers.slice(0, 10).map((a, i) => (
                                                    <div key={i} className="p-2 mb-1 bg-light rounded small">
                                                        "{typeof a === 'object' ? a.answer : a}"
                                                    </div>
                                                ))}
                                                {item.answers.length > 10 && <small className="text-muted">...ve {item.answers.length - 10} cevap daha</small>}
                                            </div>
                                        ) : renderChart(item)
                                    ) : (
                                        <div className="text-center py-4 text-muted small">Henüz cevap verilmemiş.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Katılımcı</th>
                                            <th>Tarih</th>
                                            <th>Cevaplar</th>
                                            <th>Detay</th>
                                            <th className="text-end pe-3">Notlar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analysis.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center py-5 text-muted">Bireysel veri bulunamadı.</td></tr>
                                        ) : (
                                            analysis.map((item: any, i) => (
                                                <Fragment key={i}>
                                                    <tr>
                                                        <td>
                                                            <div className="fw-bold">{item.respondent?.name || 'Bilinmiyor'}</div>
                                                            <small className="text-muted">{item.respondent_type}</small>
                                                        </td>
                                                        <td>{new Date(item.submitted_at).toLocaleString('tr-TR')}</td>
                                                        <td>
                                                            <span className="badge bg-soft-primary text-primary">
                                                                {Array.isArray(item.answers) ? item.answers.length : Object.keys(item.answers || {}).length} Cevap
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                                                            >
                                                                {expandedRow === i ? 'Kapat' : 'İncele'}
                                                            </button>
                                                        </td>
                                                        <td className="text-end pe-3">
                                                            <small className="text-muted d-block text-truncate" style={{ maxWidth: '200px' }}>{item.notes || '-'}</small>
                                                        </td>
                                                    </tr>

                                                    {expandedRow === i && (
                                                        <tr>
                                                            <td colSpan={5} className="bg-light">
                                                                <div className="p-3">
                                                                    <div className="fw-bold mb-2">Soru / Cevap Detayı</div>
                                                                    <div className="d-flex flex-column gap-2">
                                                                        {(item.answers_detailed || []).map((a: any, idx: number) => (
                                                                            <div key={idx} className="p-2 bg-white rounded border">
                                                                                <div className="fw-semibold">{a.question || `Soru #${a.question_id}`}</div>
                                                                                <div className="text-muted">Cevap: <strong>{String(a.answer ?? '')}</strong></div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .bg-soft-primary { background-color: rgba(59, 108, 255, 0.1); }
            `}</style>
        </div>
    );
};

export default SurveyAnalysis;
