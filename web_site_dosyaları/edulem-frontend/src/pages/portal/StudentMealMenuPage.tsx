import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';

type MealMenu = {
  id: number;
  menu_date: string;
  meal_type: string;
  meals: Array<string | { name?: string; description?: string }>; 
  notes?: string | null;
};

const renderMealText = (meal: string | { name?: string; description?: string }) => {
  if (typeof meal === 'string') {
    return meal;
  }

  if (meal && typeof meal === 'object') {
    return meal.name || meal.description || '-';
  }

  return '-';
};

const getWeekdayLabel = (dateValue: string) => {
  const date = new Date(dateValue);
  return date.toLocaleDateString('tr-TR', { weekday: 'long' });
};

const getWeekdayLabelFromDate = (date: Date) => {
  return date.toLocaleDateString('tr-TR', { weekday: 'long' });
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDishIcon = (text: string) => {
  const t = String(text || '').toLowerCase();
  if (!t) return '🍽️';
  if (t.includes('çorba')) return '🍲';
  if (t.includes('salata')) return '🥗';
  if (t.includes('tatlı') || t.includes('pasta') || t.includes('kek') || t.includes('sütlaç') || t.includes('muhallebi')) return '🍰';
  if (t.includes('meyve')) return '🍎';
  if (t.includes('pilav') || t.includes('makarna') || t.includes('börek')) return '🍚';
  if (t.includes('tavuk') || t.includes('köfte') || t.includes('et') || t.includes('balık')) return '🍗';
  if (t.includes('yoğurt') || t.includes('ayran')) return '🥛';
  return '🍽️';
};

const getMealTypeLabel = (type: string) => {
  const t = String(type || '').toLowerCase();
  if (t === 'breakfast' || t === 'kahvaltı') return 'Kahvaltı';
  if (t === 'lunch' || t === 'öğle' || t === 'öğle yemeği') return 'Öğle Yemeği';
  if (t === 'snack' || t === 'ikindi') return 'İkindi';
  return type;
};

const getStartOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diffToMonday);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getEndOfWeek = (date: Date) => {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

const getStartOfMonth = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfMonth = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

const StudentMealMenuPage = () => {
  const [menus, setMenus] = useState<MealMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly');

  const weekDates = useMemo(() => {
    const now = new Date();
    const start = getStartOfWeek(now);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const menusByDate = useMemo(() => {
    const map: Record<string, MealMenu[]> = {};
    (menus || []).forEach((m) => {
      const key = String(m.menu_date || '');
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [menus]);

  const dayAccent = (idx: number) => {
    const colors = ['#93C5FD', '#60A5FA', '#A5B4FC', '#94A3B8', '#CBD5E1', '#7DD3FC', '#1D4ED8'];
    return colors[idx % colors.length];
  };

  const fetchMenus = async (selectedRange: 'weekly' | 'monthly') => {
    const now = new Date();
    const start = selectedRange === 'weekly' ? getStartOfWeek(now) : getStartOfMonth(now);
    const end = selectedRange === 'weekly' ? getEndOfWeek(now) : getEndOfMonth(now);

    try {
      setLoading(true);
      const res = await axiosClient.get('/portal/student/meal-menus', {
        params: {
          start_date: formatDate(start),
          end_date: formatDate(end),
        },
      });
      setMenus(res.data?.data?.menus ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus(range);
  }, [range]);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="page-title mb-1">Yemek Menüsü</h4>
          <p className="text-muted mb-0">Haftalık ve aylık yemek planı</p>
        </div>
        <div className="btn-group">
          <button className={`btn btn-sm ${range === 'weekly' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setRange('weekly')}>Haftalık</button>
          <button className={`btn btn-sm ${range === 'monthly' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setRange('monthly')}>Aylık</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : menus.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center text-muted">Bu aralıkta yayınlanmış menü bulunamadı.</div>
      ) : (
        range === 'weekly' ? (
          <div className="weekly-menu-scroll" aria-label="Haftalık yemek menüsü">
            {weekDates.map((d: Date, idx: number) => {
              const ymd = formatDate(d);
              const dayMenus = menusByDate[ymd] ?? [];
              const isToday = formatDate(new Date()) === ymd;

              return (
                <div
                  key={ymd}
                  className={`weekly-menu-card ${isToday ? 'is-today' : ''}`}
                  style={{ ['--accent' as any]: dayAccent(idx) }}
                >
                  <div className="weekly-menu-card__header">
                    <div className="d-flex align-items-start justify-content-between">
                      <div>
                        <div className="weekly-menu-card__day text-capitalize">{getWeekdayLabelFromDate(d)}</div>
                        <div className="weekly-menu-card__date">{d.toLocaleDateString('tr-TR')}</div>
                      </div>
                      <div className="weekly-menu-card__icon" aria-hidden="true">
                        <i className="ti ti-calendar-event" />
                      </div>
                    </div>
                  </div>

                  <div className="weekly-menu-card__body">
                    {dayMenus.length === 0 ? (
                      <div className="text-muted">Bu gün için menü yok.</div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {dayMenus.map((menu: MealMenu) => (
                          <div key={menu.id}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <span className="badge weekly-menu-type-badge">{getMealTypeLabel(menu.meal_type)}</span>
                              <span className="text-muted" style={{ fontSize: 12 }}>
                                <i className="ti ti-tools-kitchen-2 me-1" />
                                Menü
                              </span>
                            </div>

                            <div className="weekly-menu-rows" aria-label="Yemek listesi">
                              {(menu.meals ?? []).map((meal: MealMenu['meals'][number], mealIdx: number) => {
                                const txt = renderMealText(meal);
                                const icon = getDishIcon(txt);
                                return (
                                  <div key={`${menu.id}-${mealIdx}`} className="weekly-menu-row" title={txt}>
                                    <span className="weekly-menu-row__icon" aria-hidden="true">{icon}</span>
                                    <span className="weekly-menu-row__text">{txt}</span>
                                  </div>
                                );
                              })}
                            </div>

                            {menu.notes ? (
                              <div className="weekly-menu-notes">
                                <i className="ti ti-info-circle me-1" />
                                {menu.notes}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="row g-3">
            {menus.map((menu: MealMenu) => (
              <div className="col-md-6 col-lg-4" key={menu.id}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <small className="text-muted d-block text-capitalize">{getWeekdayLabel(menu.menu_date)}</small>
                        <h6 className="mb-0 fw-bold">{new Date(menu.menu_date).toLocaleDateString('tr-TR')}</h6>
                      </div>
                      <span className="badge bg-light text-dark">{menu.meal_type}</span>
                    </div>
                    <ul className="mb-2 ps-3">
                      {(menu.meals ?? []).map((meal: MealMenu['meals'][number], index: number) => (
                        <li key={`${menu.id}-${index}`}>{renderMealText(meal)}</li>
                      ))}
                    </ul>
                    {menu.notes ? <small className="text-muted">Not: {menu.notes}</small> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <style>{`
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
        .weekly-menu-notes {
          margin-top: 10px;
          color: #64748b;
          font-size: 12px;
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(226, 232, 240, 0.95);
          padding: 8px 10px;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
};

export default StudentMealMenuPage;
