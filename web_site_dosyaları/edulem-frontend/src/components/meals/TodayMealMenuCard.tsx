import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export interface MealItem {
    name?: string;
    description?: string | null;
}

export interface TodayMealMenu {
    id: number;
    menu_date?: string | null;
    meal_type: string; // 'breakfast' | 'lunch' | 'dinner' | 'snack' | string
    meals?: Array<string | MealItem>;
    notes?: string | null;
    classroom?: { id: number; name: string } | null;
}

interface TodayMealMenuCardProps {
    menus?: TodayMealMenu[];
    portalMode?: boolean;
    className?: string;
}

const MEAL_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
    breakfast: {
        label: 'Sabah Kahvaltısı',
        icon: 'ti ti-coffee',
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
    },
    lunch: {
        label: 'Öğle Yemeği',
        icon: 'ti ti-tools-kitchen-2',
        color: '#059669',
        bg: '#ecfdf5',
        border: '#a7f3d0',
    },
    dinner: {
        label: 'Akşam Yemeği',
        icon: 'ti ti-soup',
        color: '#4f46e5',
        bg: '#eef2ff',
        border: '#c7d2fe',
    },
    snack: {
        label: 'İkindi / Ara Öğün',
        icon: 'ti ti-apple',
        color: '#ea580c',
        bg: '#fff7ed',
        border: '#fed7aa',
    },
};

const getDishIcon = (text: string) => {
    const t = String(text || '').toLowerCase();
    if (!t) return '🍽️';
    if (t.includes('çorba')) return '🍲';
    if (t.includes('salata')) return '🥗';
    if (t.includes('tatlı') || t.includes('pasta') || t.includes('kek') || t.includes('sütlaç') || t.includes('muhallebi') || t.includes('puding')) return '🍮';
    if (t.includes('meyve') || t.includes('elma') || t.includes('muz') || t.includes('portakal')) return '🍎';
    if (t.includes('pilav') || t.includes('makarna') || t.includes('bulgur') || t.includes('börek')) return '🍚';
    if (t.includes('tavuk') || t.includes('köfte') || t.includes('et') || t.includes('balık') || t.includes('şinitzel') || t.includes('kavurma')) return '🍖';
    if (t.includes('yoğurt') || t.includes('ayran') || t.includes('cacık')) return '🥣';
    if (t.includes('peynir') || t.includes('zeytin') || t.includes('yumurta') || t.includes('omlet') || t.includes('reçel') || t.includes('bal')) return '🍳';
    if (t.includes('çay') || t.includes('süt') || t.includes('meyve suyu') || t.includes('komposto')) return '☕';
    return '🍽️';
};

export const TodayMealMenuCard: React.FC<TodayMealMenuCardProps> = ({
    menus: propMenus,
    portalMode = false,
    className = '',
}) => {
    const [fetchedMenus, setFetchedMenus] = useState<TodayMealMenu[]>([]);
    const [loading, setLoading] = useState(propMenus === undefined);
    const [selectedMealType, setSelectedMealType] = useState<string>('');

    // If menus not provided via props, auto-fetch from backend
    useEffect(() => {
        if (propMenus !== undefined) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        const fetchTodayMenus = async () => {
            try {
                setLoading(true);
                const today = new Date().toISOString().split('T')[0];

                if (portalMode) {
                    const res = await axiosClient.get('/portal/student/dashboard');
                    const d = res.data?.data;
                    const items: TodayMealMenu[] = [];
                    if (Array.isArray(d?.today_menus) && d.today_menus.length > 0) {
                        items.push(...d.today_menus);
                    } else if (d?.today_menu) {
                        items.push(d.today_menu);
                    }
                    if (isMounted) setFetchedMenus(items);
                } else {
                    // Try dashboard stats or meal-menus
                    const res = await axiosClient.get('/meal-menus', {
                        params: {
                            menu_date_from: today,
                            menu_date_to: today,
                            published_only: 1,
                        },
                    });
                    const rawList = res.data?.data?.menus ?? res.data?.data ?? res.data?.menus ?? [];
                    const list: TodayMealMenu[] = Array.isArray(rawList) ? rawList : [];
                    if (isMounted) setFetchedMenus(list);
                }
            } catch (err) {
                console.error('Günün menüsü alınamadı:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchTodayMenus();

        return () => {
            isMounted = false;
        };
    }, [propMenus, portalMode]);

    const activeMenus = (propMenus !== undefined ? propMenus : fetchedMenus).filter((m) => {
        const meals = Array.isArray(m?.meals) ? m.meals : [];
        return meals.length > 0;
    });

    // Automatically select the first available meal type if current selection is invalid
    useEffect(() => {
        if (activeMenus.length > 0) {
            const exists = activeMenus.some((m) => m.meal_type === selectedMealType);
            if (!exists) {
                // Prioritize lunch if present, otherwise take first
                const lunch = activeMenus.find((m) => m.meal_type === 'lunch');
                setSelectedMealType(lunch ? lunch.meal_type : activeMenus[0].meal_type);
            }
        }
    }, [activeMenus, selectedMealType]);

    // If still loading and no menus yet, return minimal skeleton or null
    if (loading && activeMenus.length === 0) {
        return null;
    }

    // Rule: "eklenenler görünmesi önemli eklenmedi ise görünmesine gerek yok"
    // If no meals are entered for today, completely hide to save space!
    if (activeMenus.length === 0) {
        return null;
    }

    const currentMenu = activeMenus.find((m) => m.meal_type === selectedMealType) || activeMenus[0];
    const rawMeals = Array.isArray(currentMenu?.meals) ? currentMenu.meals : [];
    const config = MEAL_TYPE_CONFIG[currentMenu.meal_type] || {
        label: currentMenu.meal_type,
        icon: 'ti ti-tools-kitchen-2',
        color: '#059669',
        bg: '#ecfdf5',
        border: '#a7f3d0',
    };

    const todayDateFormatted = new Date().toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
    });

    const targetUrl = portalMode ? '/portal/meal-menus' : '/operations/meal-menus';

    return (
        <div
            className={`card border-0 shadow-sm ${className}`}
            style={{
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                border: '1px solid #eef2f6',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div
                className="px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
                style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: 'rgba(248, 250, 252, 0.7)',
                }}
            >
                <div className="d-flex align-items-center gap-2">
                    <div
                        className="d-flex align-items-center justify-content-center"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            backgroundColor: config.bg,
                            color: config.color,
                            border: `1px solid ${config.border}`,
                        }}
                    >
                        <i className={`${config.icon} fs-5`} />
                    </div>
                    <div>
                        <div className="d-flex align-items-center gap-2">
                            <h6 className="fw-bold mb-0" style={{ color: '#1e293b', fontSize: '1rem' }}>
                                Günün Menüsü
                            </h6>
                            <span
                                className="badge text-capitalize"
                                style={{
                                    backgroundColor: config.bg,
                                    color: config.color,
                                    border: `1px solid ${config.border}`,
                                    fontWeight: 600,
                                    fontSize: '0.72rem',
                                }}
                            >
                                {config.label}
                            </span>
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.78rem' }}>
                            {todayDateFormatted}
                        </small>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    {/* Meal Type Switcher (ONLY if more than 1 meal type is added for today) */}
                    {activeMenus.length > 1 && (
                        <div className="btn-group btn-group-sm p-1 rounded-pill bg-light" role="group">
                            {activeMenus.map((m) => {
                                const cfg = MEAL_TYPE_CONFIG[m.meal_type] || {
                                    label: m.meal_type,
                                    color: '#475569',
                                    bg: '#f1f5f9',
                                    border: '#cbd5e1',
                                };
                                const isSelected = m.meal_type === currentMenu.meal_type;
                                return (
                                    <button
                                        key={m.id || m.meal_type}
                                        type="button"
                                        onClick={() => setSelectedMealType(m.meal_type)}
                                        className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold transition-all ${
                                            isSelected ? 'shadow-sm' : 'text-muted border-0 bg-transparent'
                                        }`}
                                        style={
                                            isSelected
                                                ? {
                                                      backgroundColor: cfg.color,
                                                      color: '#ffffff',
                                                      border: 'none',
                                                      fontSize: '0.75rem',
                                                  }
                                                : {
                                                      fontSize: '0.75rem',
                                                  }
                                        }
                                    >
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <Link
                        to={targetUrl}
                        className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-inline-flex align-items-center gap-1"
                        style={{ fontSize: '0.78rem', borderColor: '#e2e8f0' }}
                    >
                        <span>Tüm Menü</span>
                        <i className="ti ti-chevron-right fs-xs" />
                    </Link>
                </div>
            </div>

            {/* Dishes Grid */}
            <div className="p-4">
                <div className="row g-3">
                    {rawMeals.map((item, idx) => {
                        const name = typeof item === 'string' ? item : item?.name || item?.description || '';
                        const desc = typeof item === 'object' && item?.name && item?.description ? item.description : null;
                        const icon = getDishIcon(name);

                        if (!name.trim()) return null;

                        return (
                            <div key={idx} className="col-12 col-sm-6 col-lg-3">
                                <div
                                    className="p-3 rounded-3 h-100 d-flex align-items-center gap-3 transition-all"
                                    style={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #edf2f7',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                    }}
                                >
                                    <div
                                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: '12px',
                                            backgroundColor: config.bg,
                                            fontSize: '1.35rem',
                                        }}
                                    >
                                        <span>{icon}</span>
                                    </div>
                                    <div className="flex-grow-1 overflow-hidden">
                                        <div
                                            className="fw-bold text-truncate"
                                            style={{ color: '#1e293b', fontSize: '0.9rem' }}
                                            title={name}
                                        >
                                            {name}
                                        </div>
                                        {desc ? (
                                            <div
                                                className="text-muted text-truncate"
                                                style={{ fontSize: '0.75rem' }}
                                                title={desc}
                                            >
                                                {desc}
                                            </div>
                                        ) : (
                                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                {config.label}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Optional Notes */}
                {currentMenu.notes && (
                    <div
                        className="mt-3 p-2 px-3 rounded-2 text-muted d-flex align-items-center gap-2"
                        style={{ backgroundColor: '#f8fafc', fontSize: '0.78rem', border: '1px dashed #e2e8f0' }}
                    >
                        <i className="ti ti-info-circle text-primary" />
                        <span>{currentMenu.notes}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TodayMealMenuCard;
