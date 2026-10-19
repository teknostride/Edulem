import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface MealMenu {
    id: number;
    menu_date: string;
    meal_type: 'breakfast' | 'lunch' | 'snack' | 'dinner';
    meals: Array<{ name: string; description?: string | null }>;
    is_published: boolean;
    classroom?: {
        name: string;
    };
}

const MealMenuList = () => {
    const navigate = useNavigate();
    const userData = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('USER_DATA') || '{}');
        } catch {
            return {};
        }
    }, []);
    const roleRaw = localStorage.getItem('USER_ROLE') || userData?.role || userData?.role_name || userData?.role_id;
    const roleKey = String(roleRaw ?? '').trim();
    const canEdit =
        roleKey === 'owner' ||
        roleKey === 'Admin' ||
        roleKey === 'Genel Müdür' ||
        roleKey === 'Müdür' ||
        roleKey === 'Müdür Yardımcısı' ||
        roleKey === 'Kampüs Müdürü' ||
        roleKey === 'Öğrenci İşleri' ||
        roleKey === 'student_affairs' ||
        roleKey === '10';

    const [menus, setMenus] = useState<MealMenu[]>([]);
    const [loading, setLoading] = useState(true);

    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
    const [weekOffset, setWeekOffset] = useState(0);
    const [monthDate, setMonthDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const [showQuickEditor, setShowQuickEditor] = useState(false);
    const [quickDate, setQuickDate] = useState<string>('');
    const [quickMealType, setQuickMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
    const [quickBulkApply, setQuickBulkApply] = useState<'single' | 'weekdays' | 'all_week'>('single');
    const [quickText, setQuickText] = useState<string>('');
    const [quickSaving, setQuickSaving] = useState(false);

    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleDownloadTemplate = async () => {
        try {
            const res = await axiosClient.get('/meal-menus/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'yemek_menusu_sablonu.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            showToast('error', 'Şablon indirilemedi.');
        }
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setIsImporting(true);
            const res = await axiosClient.post('/meal-menus/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            showToast('success', res.data?.message || 'Menüler başarıyla yüklendi.');
            fetchMenus();
        } catch (error: any) {
            showToast('error', error?.response?.data?.message || 'Yükleme sırasında hata oluştu.');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const normalizeDate = (d: Date) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
    };

    const toYmd = (d: Date) => {
        const x = normalizeDate(d);
        const yyyy = x.getFullYear();
        const mm = String(x.getMonth() + 1).padStart(2, '0');
        const dd = String(x.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const startOfWeekMonday = (d: Date) => {
        const x = normalizeDate(d);
        const day = x.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        x.setDate(x.getDate() + diff);
        return x;
    };

    const weekStart = useMemo(() => {
        const base = new Date();
        const monday = startOfWeekMonday(base);
        monday.setDate(monday.getDate() + weekOffset * 7);
        return monday;
    }, [weekOffset]);

    const weekDates = useMemo(() => {
        const arr: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            arr.push(d);
        }
        return arr;
    }, [weekStart]);

    const monthStart = useMemo(() => new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), [monthDate]);
    const monthEnd = useMemo(() => new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), [monthDate]);

    const range = useMemo(() => {
        if (viewMode === 'weekly') {
            return {
                from: toYmd(weekDates[0]),
                to: toYmd(weekDates[6]),
            };
        }

        return {
            from: toYmd(monthStart),
            to: toYmd(monthEnd),
        };
    }, [viewMode, weekDates, monthStart, monthEnd]);

    useEffect(() => {
        fetchMenus();
    }, [range.from, range.to]);

    const fetchMenus = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                menu_date_from: range.from,
                menu_date_to: range.to,
                per_page: '500',
            });
            const res = await axiosClient.get(`/meal-menus?${params.toString()}`);
            const d = res.data?.data ?? res.data;
            const raw = d?.menus;
            const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
            setMenus(list);
        } catch (error) {
            showToast('error', 'Menüler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const getMealTypeLabel = (type: string) => {
        switch (type) {
            case 'breakfast': return '🍳 Kahvaltı';
            case 'lunch': return '🍲 Öğle Yemeği';
            case 'dinner': return '🍽️ Akşam Yemeği';
            case 'snack': return '🍎 İkindi / Ara Öğün';
            default: return type;
        }
    };

    const getDishIcon = (text: string) => {
        const t = String(text || '').toLowerCase();
        if (!t) return '🍽️';
        if (t.includes('yumurta') || t.includes('omlet') || t.includes('menemen')) return '🍳';
        if (t.includes('peynir') || t.includes('kaşar')) return '🧀';
        if (t.includes('zeytin')) return '🫒';
        if (t.includes('bal') || t.includes('reçel')) return '🍯';
        if (t.includes('ekmek') || t.includes('simit') || t.includes('poğaça')) return '🥐';
        if (t.includes('çay') || t.includes('süt')) return '☕';
        if (t.includes('çorba')) return '🍲';
        if (t.includes('salata')) return '🥗';
        if (t.includes('tatlı') || t.includes('pasta') || t.includes('kek') || t.includes('sütlaç') || t.includes('muhallebi')) return '🍰';
        if (t.includes('meyve') || t.includes('elma') || t.includes('muz')) return '🍎';
        if (t.includes('pilav') || t.includes('makarna') || t.includes('börek')) return '🍚';
        if (t.includes('tavuk') || t.includes('köfte') || t.includes('et') || t.includes('balık')) return '🍗';
        if (t.includes('yoğurt') || t.includes('ayran')) return '🥛';
        return '🍽️';
    };

    const dayAccent = (idx: number) => {
        const colors = ['#93C5FD', '#60A5FA', '#A5B4FC', '#94A3B8', '#CBD5E1', '#7DD3FC', '#1D4ED8'];
        return colors[idx % colors.length];
    };

    const menuMap = useMemo(() => {
        const map: Record<string, MealMenu[]> = {};
        for (const m of menus) {
            const key = m.menu_date;
            if (!map[key]) map[key] = [];
            map[key].push(m);
        }
        return map;
    }, [menus]);

    const buildTextFromMenu = (menu?: MealMenu | null) => {
        if (!menu) return '';
        const lines = (menu.meals ?? []).map((x) => String(x?.name ?? '').trim()).filter(Boolean);
        return lines.join('\n');
    };

    const splitTextToMeals = (text: string) => {
        return String(text || '')
            .split(/\r?\n/)
            .map((x) => x.trim())
            .filter(Boolean)
            .map((name) => ({ name, description: null }));
    };

    const openQuickEdit = (ymd: string, targetType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'lunch') => {
        if (!canEdit) return;
        setQuickDate(ymd);
        setQuickMealType(targetType);
        setQuickBulkApply('single');
        const existing = (menuMap[ymd] ?? []).find((m) => m.meal_type === targetType && !m.classroom);
        setQuickText(buildTextFromMenu(existing));
        setShowQuickEditor(true);
    };

    const handleQuickMealTypeSelect = (newType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
        setQuickMealType(newType);
        const existing = (menuMap[quickDate] ?? []).find((m) => m.meal_type === newType && !m.classroom);
        setQuickText(buildTextFromMenu(existing));
    };

    const saveQuick = async () => {
        if (!quickDate) return;
        const meals = splitTextToMeals(quickText);
        if (meals.length === 0) {
            showToast('error', 'Lütfen en az bir yemek / içerik yazınız.');
            return;
        }

        try {
            setQuickSaving(true);

            if (quickBulkApply === 'single') {
                const existing = (menuMap[quickDate] ?? []).find((m) => m.meal_type === quickMealType && !m.classroom);
                const payload = {
                    menu_date: quickDate,
                    meal_type: quickMealType,
                    meals,
                    is_published: true,
                    classroom_id: null,
                    target_student_ids: [],
                    notes: null,
                    overwrite: true,
                };

                if (existing) {
                    await axiosClient.put(`/meal-menus/${existing.id}`, payload);
                } else {
                    await axiosClient.post('/meal-menus', payload);
                }
            } else {
                const targetDate = new Date(quickDate);
                const monday = startOfWeekMonday(targetDate);
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);

                const payload = {
                    start_date: toYmd(monday),
                    end_date: toYmd(sunday),
                    days_of_week: quickBulkApply === 'weekdays' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7],
                    meal_type: quickMealType,
                    meals,
                    is_published: true,
                    classroom_id: null,
                    overwrite: true,
                };

                await axiosClient.post('/meal-menus', payload);
            }

            showToast('success', 'Menü başarıyla kaydedildi');
            setShowQuickEditor(false);
            fetchMenus();
        } catch (e: any) {
            showToast('error', e?.response?.data?.message || 'Kaydetme başarısız');
        } finally {
            setQuickSaving(false);
        }
    };

    const handleDeleteMenu = async (menuId: number) => {
        if (!window.confirm('Bu öğün menüsünü silmek istediğinize emin misiniz?')) return;
        try {
            await axiosClient.delete(`/meal-menus/${menuId}`);
            showToast('success', 'Menü başarıyla silindi.');
            if (showQuickEditor) {
                setShowQuickEditor(false);
            }
            fetchMenus();
        } catch (e: any) {
            showToast('error', e?.response?.data?.message || 'Silme işlemi başarısız');
        }
    };

    const monthGrid = useMemo(() => {
        const firstDay = new Date(monthStart);
        const start = startOfWeekMonday(firstDay);

        const days: Date[] = [];
        for (let i = 0; i < 42; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    }, [monthStart]);

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
                <div>
                    <h3 className="fw-bold m-0">Yemek Menüsü Yönetimi</h3>
                    <p className="text-muted mb-0">Öğrenciler için günlük yemek listelerini yönetin.</p>
                </div>
                <div className="d-flex gap-2 align-items-center">
                    {canEdit && (
                        <>
                            <button
                                className="btn btn-outline-secondary d-flex align-items-center gap-2"
                                onClick={handleDownloadTemplate}
                            >
                                <i className="ti ti-download"></i> Şablon İndir
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                            />
                            <button
                                className="btn btn-success d-flex align-items-center gap-2"
                                onClick={handleImportClick}
                                disabled={isImporting}
                            >
                                {isImporting ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                    <i className="ti ti-upload"></i>
                                )}
                                Toplu Yükle
                            </button>
                            <button
                                className="btn btn-primary d-flex align-items-center gap-2"
                                onClick={() => navigate('/operations/meal-menus/create')}
                            >
                                <i className="ti ti-plus"></i> Menü Ekle
                            </button>
                        </>
                    )}
                    <div className="text-end d-none d-md-block ms-3">
                        <ol className="breadcrumb m-0 py-0">
                            <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
                            <li className="breadcrumb-item"><a href="/operations/duty-schedules" className="text-decoration-none text-muted">Operasyonel</a></li>
                            <li className="breadcrumb-item active fw-medium">Yemek Menüsü</li>
                        </ol>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body bg-light rounded p-3">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="btn-group" role="group">
                            <button
                                type="button"
                                className={`btn ${viewMode === 'weekly' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setViewMode('weekly')}
                            >
                                <i className="ti ti-calendar-week me-1"></i> Haftalık
                            </button>
                            <button
                                type="button"
                                className={`btn ${viewMode === 'monthly' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setViewMode('monthly')}
                            >
                                <i className="ti ti-calendar-month me-1"></i> Aylık
                            </button>
                        </div>

                        {viewMode === 'weekly' ? (
                            <div className="d-flex align-items-center gap-2">
                                <button className="btn btn-outline-primary" onClick={() => setWeekOffset((x) => x - 1)}>
                                    <i className="ti ti-chevron-left"></i>
                                </button>
                                <div className="fw-medium text-muted">
                                    {weekDates[0].toLocaleDateString('tr-TR')} - {weekDates[6].toLocaleDateString('tr-TR')}
                                </div>
                                <button className="btn btn-outline-primary" onClick={() => setWeekOffset((x) => x + 1)}>
                                    <i className="ti ti-chevron-right"></i>
                                </button>
                            </div>
                        ) : (
                            <div className="d-flex align-items-center gap-2">
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                                >
                                    <i className="ti ti-chevron-left"></i>
                                </button>
                                <div className="fw-medium text-muted">
                                    {monthStart.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                                </div>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                                >
                                    <i className="ti ti-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {viewMode === 'weekly' ? (
                <div className="weekly-menu-scroll" aria-label="Haftalık yemek menüsü">
                    {weekDates.map((d, idx) => {
                        const ymd = toYmd(d);
                        const today = toYmd(new Date()) === ymd;
                        const dayMenus = (menuMap[ymd] ?? []).filter((m) => !m.classroom);
                        const hasBreakfast = dayMenus.some(m => m.meal_type === 'breakfast');
                        const hasLunch = dayMenus.some(m => m.meal_type === 'lunch');

                        return (
                            <div
                                key={ymd}
                                className={`weekly-menu-card ${today ? 'is-today' : ''}`}
                                style={{ ['--accent' as any]: dayAccent(idx) }}
                                role="region"
                            >
                                <div 
                                    className="weekly-menu-card__header"
                                    onDoubleClick={() => openQuickEdit(ymd, hasBreakfast && !hasLunch ? 'lunch' : 'breakfast')}
                                    style={{ cursor: 'pointer' }}
                                    title="Çift tıkla hızlı düzenle"
                                >
                                    <div className="d-flex align-items-start justify-content-between">
                                        <div>
                                            <div className="weekly-menu-card__day text-capitalize">{d.toLocaleDateString('tr-TR', { weekday: 'long' })}</div>
                                            <div className="weekly-menu-card__date">{d.toLocaleDateString('tr-TR')}</div>
                                        </div>
                                        <div className="weekly-menu-card__icon" aria-hidden="true">
                                            <i className="ti ti-tools-kitchen-2" />
                                        </div>
                                    </div>
                                </div>

                                <div className="weekly-menu-card__body d-flex flex-column justify-content-between">
                                    {loading ? (
                                        <div className="text-center py-4">
                                            <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                        </div>
                                    ) : dayMenus.length === 0 ? (
                                        <div className="text-center py-4 text-muted">
                                            <i className="ti ti-salad fs-1 opacity-25 d-block mb-2"></i>
                                            <span className="small">Menü henüz girilmedi</span>
                                        </div>
                                    ) : (
                                        <div className="d-flex flex-column gap-3 mb-3">
                                            {dayMenus.map((menu) => {
                                                const lines = (menu?.meals ?? []).map((x) => String(x?.name ?? '').trim()).filter(Boolean);
                                                return (
                                                    <div key={menu.id} className="p-2 rounded bg-light bg-opacity-75 border">
                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                            <span className="badge weekly-menu-type-badge fw-bold">{getMealTypeLabel(menu.meal_type)}</span>
                                                            {canEdit && (
                                                                <div className="d-flex align-items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-link p-1 text-muted"
                                                                        title="Hızlı Düzenle"
                                                                        onClick={() => openQuickEdit(ymd, menu.meal_type)}
                                                                    >
                                                                        <i className="ti ti-pencil fs-sm" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-link p-1 text-danger"
                                                                        title="Öğünü Sil"
                                                                        onClick={() => handleDeleteMenu(menu.id)}
                                                                    >
                                                                        <i className="ti ti-trash fs-sm" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="weekly-menu-rows" aria-label="Yemek listesi">
                                                            {lines.map((t, mealIdx) => (
                                                                <div key={mealIdx} className="weekly-menu-row" title={t}>
                                                                    <span className="weekly-menu-row__icon" aria-hidden="true">{getDishIcon(t)}</span>
                                                                    <span className="weekly-menu-row__text">{t}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Hızlı Ekleme Butonları */}
                                    {canEdit && (
                                        <div className="pt-2 border-top mt-auto">
                                            <div className="d-flex flex-wrap gap-1 justify-content-center">
                                                {!hasBreakfast && (
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-xs btn-outline-warning py-1 px-2"
                                                        style={{ fontSize: 11 }}
                                                        onClick={() => openQuickEdit(ymd, 'breakfast')}
                                                    >
                                                        + 🍳 Kahvaltı
                                                    </button>
                                                )}
                                                {!hasLunch && (
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-xs btn-outline-primary py-1 px-2"
                                                        style={{ fontSize: 11 }}
                                                        onClick={() => openQuickEdit(ymd, 'lunch')}
                                                    >
                                                        + 🍲 Öğle
                                                    </button>
                                                )}
                                                <button 
                                                    type="button" 
                                                    className="btn btn-xs btn-outline-secondary py-1 px-2"
                                                    style={{ fontSize: 11 }}
                                                    onClick={() => openQuickEdit(ymd, 'dinner')}
                                                >
                                                    + Diğer
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="card-body">
                        <div className="row g-2">
                            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((h) => (
                                <div className="col" key={h}>
                                    <div className="text-center fw-medium text-muted">{h}</div>
                                </div>
                            ))}
                        </div>

                        <div className="row g-2 mt-2">
                            {monthGrid.map((d) => {
                                const ymd = toYmd(d);
                                const isCurrentMonth = d.getMonth() === monthStart.getMonth();
                                const dayMenus = (menuMap[ymd] ?? []).filter((m) => !m.classroom);
                                const hasMenus = dayMenus.length > 0;
                                const today = toYmd(new Date()) === ymd;

                                return (
                                    <div className="col-12 col-sm-6 col-md-4 col-lg-3 col-xxl-2" key={ymd}>
                                        <div
                                            className={`border rounded p-2 h-100 ${isCurrentMonth ? 'bg-white' : 'bg-light'} ${today ? 'border-primary' : ''}`}
                                            style={{ minHeight: 115, cursor: 'pointer' }}
                                            onDoubleClick={() => openQuickEdit(ymd, 'breakfast')}
                                            onClick={() => openQuickEdit(ymd, dayMenus[0]?.meal_type || 'lunch')}
                                            title="Öğünleri görmek ve düzenlemek için tıklayın"
                                        >
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <div className={`fw-medium ${isCurrentMonth ? 'text-dark' : 'text-muted'}`}>{d.getDate()}</div>
                                                {hasMenus ? (
                                                    <span className="badge bg-soft-success text-success">{dayMenus.length} Öğün</span>
                                                ) : (
                                                    <span className="badge bg-soft-secondary text-secondary">Boş</span>
                                                )}
                                            </div>

                                            {hasMenus ? (
                                                <div className="d-flex flex-column gap-1 mt-1">
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {dayMenus.map(m => (
                                                            <span key={m.id} className="badge bg-light text-dark border px-1 py-0" style={{ fontSize: 10 }}>
                                                                {m.meal_type === 'breakfast' ? '🍳 Kahvaltı' : m.meal_type === 'lunch' ? '🍲 Öğle' : m.meal_type === 'dinner' ? '🍽️ Akşam' : '🍎 Ara'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="text-muted text-truncate" style={{ fontSize: 11 }}>
                                                        {(dayMenus[0]?.meals ?? []).map(x => x.name).slice(0, 2).join(', ')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-muted mt-2" style={{ fontSize: 11 }}>
                                                    {canEdit ? '+ Menü ekle' : '-'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {canEdit && (
                            <small className="text-muted d-block mt-3">Aylık görünümde menü girmek veya düzenlemek için güne tıklayın.</small>
                        )}
                    </div>
                </div>
            )}

            {/* Hızlı Menü Düzenleyici Modal */}
            {canEdit && showQuickEditor && (
                <>
                    <div className="modal fade show" style={{ display: 'block', zIndex: 1055 }} tabIndex={-1}>
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title d-flex align-items-center gap-2">
                                        <i className="ti ti-tools-kitchen-2 text-primary"></i>
                                        <span>Menü Düzenle ({quickDate})</span>
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowQuickEditor(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {/* Öğün Türü Seçici Sekmeleri */}
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Öğün Türü Seçiniz</label>
                                        <div className="btn-group w-100" role="group">
                                            {[
                                                { id: 'breakfast', label: '🍳 Kahvaltı' },
                                                { id: 'lunch', label: '🍲 Öğle Yemeği' },
                                                { id: 'dinner', label: '🍽️ Akşam Yemeği' },
                                                { id: 'snack', label: '🍎 Ara Öğün' },
                                            ].map((t) => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    className={`btn ${quickMealType === t.id ? 'btn-primary' : 'btn-outline-primary'}`}
                                                    onClick={() => handleQuickMealTypeSelect(t.id as any)}
                                                >
                                                    {t.label}
                                                    {(menuMap[quickDate] ?? []).some(m => m.meal_type === t.id && !m.classroom) && (
                                                        <span className="badge bg-white text-primary ms-1" style={{ fontSize: 10 }}>Dolu</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Menü Yemek Listesi Metin Alanı */}
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold d-flex justify-content-between">
                                            <span>{getMealTypeLabel(quickMealType)} Yemek Listesi</span>
                                            <span className="text-muted small">Her satıra bir yemek / ürün</span>
                                        </label>
                                        <textarea
                                            className="form-control"
                                            rows={6}
                                            placeholder={
                                                quickMealType === 'breakfast'
                                                    ? "Örn:\nHaşlanmış Yumurta\nKaşar ve Beyaz Peynir\nSiyah ve Yeşil Zeytin\nDomates, Salatalık\nBal, Tereyağı\nEkmek, Çay / Süt"
                                                    : "Örn:\nMercimek Çorbası\nOrman Kebabı\nPirinç Pilavı\nCacık\nMevsim Meyvesi"
                                            }
                                            value={quickText}
                                            onChange={(e) => setQuickText(e.target.value)}
                                        />
                                    </div>

                                    {/* Uygulama Kapsamı */}
                                    <div className="p-3 bg-light rounded border">
                                        <label className="form-label fw-semibold mb-2">
                                            <i className="ti ti-calendar-repeat text-primary me-1"></i>
                                            Bu Menüyü Hangi Günlere Kaydetmek İstiyorsunuz?
                                        </label>
                                        <div className="d-flex flex-column gap-2">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="quickBulkOption"
                                                    id="applySingle"
                                                    checked={quickBulkApply === 'single'}
                                                    onChange={() => setQuickBulkApply('single')}
                                                />
                                                <label className="form-check-label" htmlFor="applySingle">
                                                    Yalnızca bu seçili güne kaydet (<strong>{quickDate}</strong>)
                                                </label>
                                            </div>
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="quickBulkOption"
                                                    id="applyWeekdays"
                                                    checked={quickBulkApply === 'weekdays'}
                                                    onChange={() => setQuickBulkApply('weekdays')}
                                                />
                                                <label className="form-check-label" htmlFor="applyWeekdays">
                                                    <strong>Bu haftanın hafta içi günlerine</strong> uygula (Pazartesi - Cuma)
                                                </label>
                                            </div>
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="quickBulkOption"
                                                    id="applyAllWeek"
                                                    checked={quickBulkApply === 'all_week'}
                                                    onChange={() => setQuickBulkApply('all_week')}
                                                />
                                                <label className="form-check-label" htmlFor="applyAllWeek">
                                                    <strong>Bu haftanın her gününe</strong> uygula (Pazartesi - Pazar)
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer d-flex justify-content-between">
                                    <div>
                                        {/* Var olan menüyü silme butonu */}
                                        {(() => {
                                            const existingMenu = (menuMap[quickDate] ?? []).find(m => m.meal_type === quickMealType && !m.classroom);
                                            if (existingMenu) {
                                                return (
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-outline-danger" 
                                                        onClick={() => handleDeleteMenu(existingMenu.id)}
                                                    >
                                                        <i className="ti ti-trash me-1"></i> Bu Öğünü Sil
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-soft-secondary" onClick={() => setShowQuickEditor(false)}>
                                            İptal
                                        </button>
                                        <button className="btn btn-primary px-4" onClick={saveQuick} disabled={quickSaving}>
                                            {quickSaving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    Kaydediliyor...
                                                </>
                                            ) : 'Menüyü Kaydet'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => setShowQuickEditor(false)}></div>
                </>
            )}
            <style>{`
                .bg-soft-success { background-color: rgba(25, 135, 84, 0.1); }
                .bg-soft-warning { background-color: rgba(255, 193, 7, 0.1); }
                .bg-soft-info { background-color: rgba(13, 202, 240, 0.1); }
                .bg-soft-secondary { background-color: rgba(108, 117, 125, 0.1); }

                .weekly-menu-scroll {
                    display: flex;
                    gap: 14px;
                    overflow-x: auto;
                    padding: 4px 2px 10px;
                    scroll-snap-type: x mandatory;
                    -webkit-overflow-scrolling: touch;
                }
                .weekly-menu-scroll::-webkit-scrollbar { height: 10px; }
                .weekly-menu-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.6); border-radius: 999px; }

                .weekly-menu-card {
                    scroll-snap-align: start;
                    min-width: 300px;
                    max-width: 360px;
                    width: 340px;
                    border-radius: 16px;
                    background: linear-gradient(to bottom, #f1f5f9, #ffffff);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    border: 2px solid #94a3b8;
                    overflow: hidden;
                    transition: transform 160ms ease, box-shadow 160ms ease;
                    cursor: pointer;
                    outline: none;
                    min-height: 500px;
                }
                .weekly-menu-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 18px 34px -8px rgba(0, 0, 0, 0.18), 0 10px 14px -8px rgba(0, 0, 0, 0.12);
                    border-color: #93c5fd;
                }
                .weekly-menu-card.is-today {
                    border-color: #60a5fa;
                    box-shadow: 0 18px 34px -10px rgba(96, 165, 250, 0.22), 0 10px 14px -10px rgba(96, 165, 250, 0.14);
                }
                .weekly-menu-card__header {
                    padding: 18px 18px 16px;
                    background: #1e293b;
                }
                .weekly-menu-card__day {
                    font-weight: 800;
                    font-size: 18px;
                    letter-spacing: 0.2px;
                    color: #ffffff;
                    line-height: 1.2;
                }
                .weekly-menu-card__date {
                    color: rgba(255, 255, 255, 0.78);
                    font-size: 12px;
                    margin-top: 2px;
                }
                .weekly-menu-card__icon {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.16);
                    border: 1px solid rgba(255, 255, 255, 0.22);
                    color: #ffffff;
                    font-size: 18px;
                }
                .weekly-menu-card__body {
                    padding: 18px;
                }
                .weekly-menu-type-badge {
                    background: rgba(148, 163, 184, 0.12);
                    color: #0f172a;
                    border: 1px solid rgba(148, 163, 184, 0.55);
                    font-weight: 700;
                }
                .weekly-menu-rows {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .weekly-menu-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 10px 12px;
                    border-radius: 12px;
                    background: rgba(241, 245, 249, 0.9);
                    border: 1px solid rgba(148, 163, 184, 0.55);
                }
                .weekly-menu-row__icon {
                    width: 30px;
                    height: 30px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(96, 165, 250, 0.16);
                    color: #2563eb;
                    font-size: 16px;
                    flex: 0 0 auto;
                }
                .weekly-menu-row__text {
                    font-size: 13.5px;
                    font-weight: 700;
                    color: #0f172a;
                    line-height: 1.35;
                    flex: 1 1 auto;
                    word-break: break-word;
                }
            `}</style>
        </div>
    );
};

export default MealMenuList;
