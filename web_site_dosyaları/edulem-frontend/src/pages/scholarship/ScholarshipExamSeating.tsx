import React, { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import { Link, useParams } from 'react-router-dom';

interface Classroom {
    id: number;
    name: string;
    capacity: number;
}

interface SeatingResult {
    exam_id: number;
    session_id: string | null;
    total_applications: number;
    total_classrooms: number;
    arrangements: Array<{
        classroom_id: number;
        classroom_name: string;
        capacity: number;
        assigned: number;
    }>;
}

const ScholarshipExamSeating: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();

    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [selectedClassroomIds, setSelectedClassroomIds] = useState<number[]>([]);
    const [shuffle, setShuffle] = useState(true);
    const [sameSchoolApart, setSameSchoolApart] = useState(false);
    const [sameGradeApart, setSameGradeApart] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SeatingResult | null>(null);

    const [campuses, setCampuses] = useState<any[]>([]);
    const [selectedCampusId, setSelectedCampusId] = useState<string>('');

    const fetchInitialData = async () => {
        try {
            const [classroomsRes, campusesRes] = await Promise.all([
                axiosClient.get('/classrooms?per_page=200'),
                axiosClient.get('/campuses')
            ]);

            const clsData = classroomsRes.data?.data ?? classroomsRes.data;
            setClassrooms(clsData?.classrooms ?? clsData ?? []);

            const cmpData = campusesRes.data?.data ?? campusesRes.data;
            setCampuses(cmpData?.campuses ?? cmpData ?? []);
        } catch (e) {
            setClassrooms([]);
            setCampuses([]);
            showToast('error', 'Veriler yüklenemedi');
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const filteredClassrooms = useMemo(() => {
        if (!selectedCampusId) return classrooms;
        return classrooms.filter((c: any) => c.campus_id === Number(selectedCampusId) || c.campus?.id === Number(selectedCampusId));
    }, [classrooms, selectedCampusId]);

    const totalSelectedCapacity = useMemo(() => {
        const map = new Map(classrooms.map((c) => [c.id, c.capacity]));
        return selectedClassroomIds.reduce((sum, id) => sum + (map.get(id) ?? 0), 0);
    }, [classrooms, selectedClassroomIds]);

    const toggleClassroom = (id: number) => {
        setSelectedClassroomIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleAllFiltered = () => {
        const filteredIds = filteredClassrooms.map(c => c.id);
        const allSelected = filteredIds.every(id => selectedClassroomIds.includes(id));
        if (allSelected) {
            setSelectedClassroomIds(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            setSelectedClassroomIds(prev => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const generate = async () => {
        if (!examId) return;
        if (!selectedClassroomIds.length) {
            showToast('error', 'En az bir derslik seçmelisin');
            return;
        }

        try {
            setLoading(true);
            setResult(null);

            const payload: any = {
                classroom_ids: selectedClassroomIds,
                shuffle,
                same_school_apart: sameSchoolApart,
                same_grade_apart: sameGradeApart,
            };

            if (sessionId.trim()) {
                payload.session_id = sessionId.trim();
            }

            const res = await axiosClient.post(`/scholarship-exams/${examId}/seating/generate`, payload);
            const d = res.data?.data ?? res.data;
            setResult(d);
            showToast('success', 'Yerleştirme tamamlandı');
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Yerleştirme başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                        <h4 className="mb-sm-0">Sınav Sınıfı / Oturma Planı</h4>
                        <Link to={`/scholarship/exams/${examId}/applications`} className="btn btn-soft-secondary">
                            <i className="ti ti-arrow-left me-1"></i> Başvurulara Dön
                        </Link>
                    </div>
                </div>
            </div>

            <div className="card mt-3">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">Kampüs</label>
                            <select
                                className="form-select"
                                value={selectedCampusId}
                                onChange={(e) => setSelectedCampusId(e.target.value)}
                            >
                                <option value="">Tüm Kampüsler</option>
                                {campuses.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Seans ID (opsiyonel)</label>
                            <input
                                className="form-control"
                                value={sessionId}
                                onChange={(e) => setSessionId(e.target.value)}
                                placeholder="Örn: S1"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Seçenekler</label>
                            <div className="d-flex flex-wrap gap-3">
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={shuffle}
                                        onChange={(e) => setShuffle(e.target.checked)}
                                        id="shuffle"
                                    />
                                    <label className="form-check-label" htmlFor="shuffle">Karıştır</label>
                                </div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={sameSchoolApart}
                                        onChange={(e) => setSameSchoolApart(e.target.checked)}
                                        id="sameSchoolApart"
                                    />
                                    <label className="form-check-label" htmlFor="sameSchoolApart">Aynı okul yan yana gelmesin</label>
                                </div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={sameGradeApart}
                                        onChange={(e) => setSameGradeApart(e.target.checked)}
                                        id="sameGradeApart"
                                    />
                                    <label className="form-check-label" htmlFor="sameGradeApart">Aynı sınıf düzeyi yan yana</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr />

                    <div className="row">
                        <div className="col-12">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h5 className="mb-0">Derslik Seçimi</h5>
                                <div className="text-muted">Seçili kapasite: {totalSelectedCapacity}</div>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th>
                                                <input
                                                    type="checkbox"
                                                    onChange={toggleAllFiltered}
                                                    checked={filteredClassrooms.length > 0 && filteredClassrooms.every(c => selectedClassroomIds.includes(c.id))}
                                                />
                                            </th>
                                            <th>Derslik</th>
                                            <th>Kampüs</th>
                                            <th>Kapasite</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredClassrooms.map((c: any) => (
                                            <tr key={c.id}>
                                                <td style={{ width: 40 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedClassroomIds.includes(c.id)}
                                                        onChange={() => toggleClassroom(c.id)}
                                                    />
                                                </td>
                                                <td>{c.name}</td>
                                                <td>{c.campus?.name || '-'}</td>
                                                <td>{c.capacity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="text-end mt-3">
                        <button className="btn btn-primary" onClick={generate} disabled={loading}>
                            {loading ? 'Yerleştiriliyor...' : 'Oturma Planı Oluştur'}
                        </button>
                    </div>
                </div>
            </div>

            {result && (
                <div className="card mt-3">
                    <div className="card-header">
                        <h5 className="card-title mb-0">Sonuç</h5>
                    </div>
                    <div className="card-body">
                        <div className="row g-3">
                            <div className="col-md-3 col-6">
                                <div className="border rounded p-2 text-center">
                                    <div className="text-muted">Başvuru</div>
                                    <div className="fs-4 fw-bold">{result.total_applications}</div>
                                </div>
                            </div>
                            <div className="col-md-3 col-6">
                                <div className="border rounded p-2 text-center">
                                    <div className="text-muted">Derslik</div>
                                    <div className="fs-4 fw-bold">{result.total_classrooms}</div>
                                </div>
                            </div>
                        </div>

                        <div className="table-responsive mt-3">
                            <table className="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Derslik</th>
                                        <th>Kapasite</th>
                                        <th>Yerleşen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.arrangements.map((a) => (
                                        <tr key={a.classroom_id}>
                                            <td>{a.classroom_name}</td>
                                            <td>{a.capacity}</td>
                                            <td>{a.assigned}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScholarshipExamSeating;
