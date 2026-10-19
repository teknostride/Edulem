import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

const DAYS_OF_WEEK = [
    { id: 1, label: 'Pazartesi' },
    { id: 2, label: 'Salı' },
    { id: 3, label: 'Çarşamba' },
    { id: 4, label: 'Perşembe' },
    { id: 5, label: 'Cuma' },
    { id: 6, label: 'Cumartesi' },
    { id: 7, label: 'Pazar' },
];

const MealMenuForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [classrooms, setClassrooms] = useState<any[]>([]);

    // Mod seçimi: 'single' (Tek Gün) veya 'bulk' (Tarih Aralığı & Haftanın Günleri)
    const [mode, setMode] = useState<'single' | 'bulk'>('bulk');

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Varsayılan bitiş tarihi: 1 ay sonrası
    const defaultEndDate = () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        menu_date: todayStr,
        start_date: todayStr,
        end_date: defaultEndDate(),
        days_of_week: [1, 2, 3, 4, 5], // Pzt-Cum varsayılan
        overwrite: true,
        meal_type: 'breakfast', // Varsayılan kahvaltı ya da öğle
        meals: [{ name: '', description: '' }],
        is_published: true,
        classroom_id: '',
        target_student_ids: []
    });

    useEffect(() => {
        fetchClassrooms();
        if (isEdit) {
            setMode('single');
            fetchMenu();
        }
    }, [id]);

    const fetchClassrooms = async () => {
        try {
            const res = await axiosClient.get('/classrooms');
            setClassrooms(res.data.data.classrooms || res.data.data);
        } catch (error) {
            console.error('Sınıflar yüklenemedi');
        }
    };

    const fetchMenu = async () => {
        try {
            const res = await axiosClient.get(`/meal-menus/${id}`);
            const data = res.data.data;
            setFormData({
                menu_date: data.menu_date,
                start_date: data.menu_date,
                end_date: data.menu_date,
                days_of_week: [1, 2, 3, 4, 5],
                overwrite: true,
                meal_type: data.meal_type,
                meals: Array.isArray(data.meals) && data.meals.length > 0 ? data.meals : [{ name: '', description: '' }],
                is_published: data.is_published,
                classroom_id: data.classroom_id || '',
                target_student_ids: data.target_student_ids || []
            });
        } catch (error) {
            showToast('error', 'Menü bilgileri yüklenemedi');
            navigate('/operations/meal-menus');
        } finally {
            setFetching(false);
        }
    };

    const handleMealChange = (index: number, field: 'name' | 'description', value: string) => {
        const newMeals = [...formData.meals];
        newMeals[index] = { ...newMeals[index], [field]: value };
        setFormData({ ...formData, meals: newMeals });
    };

    const addMeal = () => {
        setFormData({ ...formData, meals: [...formData.meals, { name: '', description: '' }] });
    };

    const removeMeal = (index: number) => {
        if (formData.meals.length === 1) return;
        const newMeals = formData.meals.filter((_, i) => i !== index);
        setFormData({ ...formData, meals: newMeals });
    };

    const toggleDay = (dayId: number) => {
        const exists = formData.days_of_week.includes(dayId);
        const updated = exists 
            ? formData.days_of_week.filter(d => d !== dayId)
            : [...formData.days_of_week, dayId].sort();
        setFormData({ ...formData, days_of_week: updated });
    };

    const setQuickRange = (type: 'this_week' | 'this_month' | 'next_30_days') => {
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);

        if (type === 'this_week') {
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            start.setDate(now.getDate() + diff);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
        } else if (type === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (type === 'next_30_days') {
            start = new Date(now);
            end = new Date(now);
            end.setDate(now.getDate() + 30);
        }

        const toStr = (d: Date) => d.toISOString().split('T')[0];
        setFormData({
            ...formData,
            start_date: toStr(start),
            end_date: toStr(end)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const cleanMeals = formData.meals
            .map((m) => ({
                name: String(m?.name ?? '').trim(),
                description: String(m?.description ?? '').trim() || null,
            }))
            .filter((m) => m.name !== '');

        if (cleanMeals.length === 0) {
            showToast('error', 'Lütfen en az bir yemek giriniz.');
            setLoading(false);
            return;
        }

        let payload: any = {
            meal_type: formData.meal_type,
            meals: cleanMeals,
            classroom_id: formData.classroom_id || null,
            target_student_ids: formData.target_student_ids,
            is_published: formData.is_published,
        };

        if (isEdit || mode === 'single') {
            payload.menu_date = formData.menu_date;
        } else {
            if (formData.days_of_week.length === 0) {
                showToast('error', 'Lütfen haftanın en az bir gününü seçiniz.');
                setLoading(false);
                return;
            }
            payload.start_date = formData.start_date;
            payload.end_date = formData.end_date;
            payload.days_of_week = formData.days_of_week;
            payload.overwrite = formData.overwrite;
        }

        try {
            if (isEdit) {
                await axiosClient.put(`/meal-menus/${id}`, payload);
                showToast('success', 'Menü güncellendi');
            } else {
                const res = await axiosClient.post('/meal-menus', payload);
                showToast('success', res.data?.message || 'Menü başarıyla kaydedildi');
            }
            navigate('/operations/meal-menus');
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'İşlem başarısız');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="mb-4">
                <h4 className="page-title">{isEdit ? 'Menü Düzenle' : 'Yemek Menüsü Ekle'}</h4>
                <p className="text-muted">
                    {isEdit 
                        ? 'Seçili tarihteki yemek öğününü güncelleyin.' 
                        : 'Tek gün veya tüm haftalara/aylara yayılacak toplu menü tanımlayın.'}
                </p>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-9">
                    <form onSubmit={handleSubmit} className="card border-0 shadow-sm">
                        <div className="card-body">
                            {/* Mod Değiştirici (Sadece Yeni Eklerken) */}
                            {!isEdit && (
                                <div className="mb-4">
                                    <label className="form-label fw-bold">Ekleme Yöntemi</label>
                                    <div className="row g-2">
                                        <div className="col-md-6">
                                            <div 
                                                className={`p-3 border rounded cursor-pointer d-flex align-items-center gap-3 ${mode === 'bulk' ? 'border-primary bg-soft-primary text-primary fw-medium' : 'bg-light'}`}
                                                onClick={() => setMode('bulk')}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <i className="ti ti-calendar-repeat fs-3"></i>
                                                <div>
                                                    <div className="fw-semibold">Tarih Aralığı & Haftalık Tekrar (Önerilen)</div>
                                                    <small className="text-muted d-block">Örn: Tüm ay boyunca her gün veya hafta içi kahvaltı/yemek listesi</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div 
                                                className={`p-3 border rounded cursor-pointer d-flex align-items-center gap-3 ${mode === 'single' ? 'border-primary bg-soft-primary text-primary fw-medium' : 'bg-light'}`}
                                                onClick={() => setMode('single')}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <i className="ti ti-calendar fs-3"></i>
                                                <div>
                                                    <div className="fw-semibold">Tek Günlük Menü</div>
                                                    <small className="text-muted d-block">Yalnızca seçilen tek bir tarihe menü ekleyin</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="row g-3">
                                {/* Öğün Türü */}
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Öğün Türü</label>
                                    <select
                                        className="form-select form-select-lg"
                                        value={formData.meal_type}
                                        onChange={e => setFormData({ ...formData, meal_type: e.target.value as any })}
                                        required
                                    >
                                        <option value="breakfast">🍳 Kahvaltı</option>
                                        <option value="lunch">🍲 Öğle Yemeği</option>
                                        <option value="dinner">🍽️ Akşam Yemeği</option>
                                        <option value="snack">🍎 İkindi / Ara Öğün</option>
                                    </select>
                                </div>

                                {/* Kapsam (Sınıf) */}
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Kapsam (Opsiyonel)</label>
                                    <select
                                        className="form-select form-select-lg"
                                        value={formData.classroom_id}
                                        onChange={e => setFormData({ ...formData, classroom_id: e.target.value })}
                                    >
                                        <option value="">🏫 Tüm Okul (Genel)</option>
                                        {classrooms.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* TARİH SEÇİMİ: TEK GÜN */}
                                {(isEdit || mode === 'single') ? (
                                    <div className="col-md-12">
                                        <label className="form-label fw-semibold">Tarih</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={formData.menu_date}
                                            onChange={e => setFormData({ ...formData, menu_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                ) : (
                                    /* TARİH SEÇİMİ: TOPLU ARALIK & GÜNLER */
                                    <div className="col-md-12 p-3 rounded bg-light border">
                                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                            <h6 className="m-0 fw-bold text-dark">
                                                <i className="ti ti-calendar-event me-1 text-primary"></i>
                                                Tarih Aralığı ve Uygulanacak Günler
                                            </h6>
                                            <div className="btn-group btn-group-sm">
                                                <button type="button" className="btn btn-outline-secondary" onClick={() => setQuickRange('this_week')}>Bu Hafta</button>
                                                <button type="button" className="btn btn-outline-secondary" onClick={() => setQuickRange('this_month')}>Bu Ay</button>
                                                <button type="button" className="btn btn-outline-secondary" onClick={() => setQuickRange('next_30_days')}>Önümüzdeki 30 Gün</button>
                                            </div>
                                        </div>

                                        <div className="row g-3 mb-3">
                                            <div className="col-md-6">
                                                <label className="form-label small text-muted">Başlangıç Tarihi</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={formData.start_date}
                                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small text-muted">Bitiş Tarihi</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={formData.end_date}
                                                    min={formData.start_date}
                                                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <label className="form-label small text-muted m-0">Haftanın Hangi Günlerine Eklensin?</label>
                                                <div className="d-flex gap-2">
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-sm btn-link p-0 text-decoration-none"
                                                        onClick={() => setFormData({ ...formData, days_of_week: [1, 2, 3, 4, 5] })}
                                                    >
                                                        Hafta İçi (Pzt-Cum)
                                                    </button>
                                                    <span className="text-muted">|</span>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-sm btn-link p-0 text-decoration-none"
                                                        onClick={() => setFormData({ ...formData, days_of_week: [1, 2, 3, 4, 5, 6, 7] })}
                                                    >
                                                        Her Gün (7 Gün)
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="d-flex flex-wrap gap-2">
                                                {DAYS_OF_WEEK.map(d => {
                                                    const active = formData.days_of_week.includes(d.id);
                                                    return (
                                                        <button
                                                            key={d.id}
                                                            type="button"
                                                            className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                            onClick={() => toggleDay(d.id)}
                                                        >
                                                            {active && <i className="ti ti-check me-1"></i>}
                                                            {d.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="form-check form-switch mt-2">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="overwriteCheck"
                                                checked={formData.overwrite}
                                                onChange={e => setFormData({ ...formData, overwrite: e.target.checked })}
                                            />
                                            <label className="form-check-label text-muted small" htmlFor="overwriteCheck">
                                                Aynı günde var olan bu türdeki menünün üzerine yaz (Güncelle)
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* YEMEK LİSTESİ */}
                                <div className="col-md-12">
                                    <label className="form-label d-flex justify-content-between align-items-center fw-semibold">
                                        <span>Yemek / İçerik Listesi</span>
                                        <button type="button" className="btn btn-sm btn-soft-primary" onClick={addMeal}>
                                            <i className="ti ti-plus me-1"></i> Yeni Yemek Ekle
                                        </button>
                                    </label>
                                    <div className="d-flex flex-column gap-2">
                                        {formData.meals.map((meal, index) => (
                                            <div key={index} className="input-group">
                                                <span className="input-group-text bg-light text-muted">{index + 1}</span>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder={formData.meal_type === 'breakfast' ? "Örn: Haşlanmış Yumurta, Peynir, Zeytin, Bal" : "Örn: Mercimek Çorbası"}
                                                    value={meal.name}
                                                    onChange={e => handleMealChange(index, 'name', e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger"
                                                    onClick={() => removeMeal(index)}
                                                    disabled={formData.meals.length === 1}
                                                    title="Yemeği Sil"
                                                >
                                                    <i className="ti ti-trash"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-md-12">
                                    <div className="form-check form-switch mt-2">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="isPublished"
                                            checked={formData.is_published}
                                            onChange={e => setFormData({ ...formData, is_published: e.target.checked })}
                                        />
                                        <label className="form-check-label fw-medium" htmlFor="isPublished">Menüyü Hemen Yayınla</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer bg-transparent border-top p-3 d-flex justify-content-between align-items-center">
                            <button type="button" className="btn btn-light" onClick={() => navigate('/operations/meal-menus')}>Vazgeç</button>
                            <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                                {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                                {isEdit ? 'Güncelle' : (mode === 'bulk' ? 'Toplu Menüyü Kaydet' : 'Kaydet')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <style>{`
                .btn-soft-primary { background-color: rgba(59, 108, 255, 0.1); color: var(--bs-primary); border: none; }
                .btn-soft-primary:hover { background-color: rgba(59, 108, 255, 0.2); }
                .bg-soft-primary { background-color: rgba(59, 108, 255, 0.08); }
            `}</style>
        </div>
    );
};

export default MealMenuForm;
