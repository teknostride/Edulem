import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';

type ScheduleItem = {
  id: number;
  day_of_week: number | string;
  start_time: string;
  end_time: string;
  lesson?: { id: number; name: string } | null;
  teacher?: { id: number; name: string } | null;
};

type TimeSlot = {
  id: number;
  name?: string;
  start_time: string;
  end_time: string;
  order?: number;
};

const weekdays = [
  { index: 1, label: 'Pazartesi' },
  { index: 2, label: 'Salı' },
  { index: 3, label: 'Çarşamba' },
  { index: 4, label: 'Perşembe' },
  { index: 5, label: 'Cuma' },
];

const toHHmm = (value?: string | null): string => {
  if (!value) return '-';
  const raw = String(value);
  const match = raw.match(/(\d{2}:\d{2})/);
  return match ? match[1] : raw;
};

const toDayIndex = (value: number | string): number => {
  if (typeof value === 'number') {
    return value;
  }

  const lowered = String(value).toLowerCase();
  const map: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    pazar: 0,
    pazartesi: 1,
    sali: 2,
    salı: 2,
    carsamba: 3,
    çarşamba: 3,
    persembe: 4,
    perşembe: 4,
    cuma: 5,
    cumartesi: 6,
  };

  if (Object.prototype.hasOwnProperty.call(map, lowered)) {
    return map[lowered];
  }

  const maybeNumber = Number(value);
  return Number.isNaN(maybeNumber) ? 0 : maybeNumber;
};

const normalizeScheduleDay = (value: number | string, useZeroBasedWeekdays: boolean): number => {
  const mapped = toDayIndex(value);

  if (useZeroBasedWeekdays && mapped >= 0 && mapped <= 4) {
    return mapped + 1;
  }

  return mapped;
};

const isBreakSlot = (name?: string | null) => {
  if (!name) return false;
  const normalized = name.toLocaleLowerCase('tr-TR');
  return normalized.includes('tenef') || normalized.includes('break');
};

const StudentSchedulePage = () => {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get('/portal/student/schedule');
        setItems(res.data?.data?.schedules ?? []);
        setTimeSlots(res.data?.data?.time_slots ?? []);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  const grouped = useMemo(() => {
    const initial: Record<number, ScheduleItem[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };

    const numericDays = items
      .map((item) => {
        if (typeof item.day_of_week === 'number') {
          return item.day_of_week;
        }

        const asNumber = Number(item.day_of_week);
        return Number.isNaN(asNumber) ? null : asNumber;
      })
      .filter((value): value is number => value !== null);

    const useZeroBasedWeekdays =
      numericDays.length > 0 &&
      Math.max(...numericDays) <= 4 &&
      Math.min(...numericDays) >= 0;

    items.forEach((item) => {
      const dayIndex = normalizeScheduleDay(item.day_of_week, useZeroBasedWeekdays);
      if (dayIndex >= 1 && dayIndex <= 5) {
        initial[dayIndex].push(item);
      }
    });

    Object.keys(initial).forEach((key) => {
      initial[Number(key)] = initial[Number(key)].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return initial;
  }, [items]);

  const displaySlots = useMemo(() => {
    if (timeSlots.length > 0) {
      return [...timeSlots]
        .filter((slot) => !isBreakSlot(slot.name))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((slot) => ({
          key: `slot-${slot.id}`,
          start: toHHmm(slot.start_time),
          end: toHHmm(slot.end_time),
          slotName: slot.name ?? null,
        }));
    }

    const uniqueFromSchedules = new Set<string>();
    items.forEach((item) => {
      uniqueFromSchedules.add(`${toHHmm(item.start_time)}-${toHHmm(item.end_time)}`);
    });

    return Array.from(uniqueFromSchedules)
      .sort((a, b) => a.localeCompare(b))
      .map((slot) => {
        const [start, end] = slot.split('-');
        return { key: `fallback-${slot}`, start, end, slotName: null };
      });
  }, [items, timeSlots]);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h4 className="page-title mb-1">Ders Programım</h4>
        <p className="text-muted mb-0">Sınıfına ait haftalık ders çizelgesi</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent fw-bold">Haftalık Ders Programı</div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th style={{ minWidth: 110 }}>Saat</th>
                  {weekdays.map((day) => (
                    <th key={day.index} className="text-center" style={{ minWidth: 180 }}>{day.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displaySlots.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">Henüz tanımlı ders programı bulunmuyor.</td>
                  </tr>
                ) : (
                  displaySlots.map((slot) => {
                    return (
                      <tr key={slot.key}>
                        <td className="fw-semibold">
                          <div>{slot.start} - {slot.end}</div>
                          {slot.slotName ? <small className="text-muted">{slot.slotName}</small> : null}
                        </td>
                        {weekdays.map((day) => {
                          const lesson = grouped[day.index]?.find((item) =>
                            toHHmm(item.start_time) === slot.start && toHHmm(item.end_time) === slot.end
                          );
                          return (
                            <td key={`${slot.key}-${day.index}`}>
                              {lesson ? (
                                <div>
                                  <div className="fw-semibold">{lesson.lesson?.name ?? '-'}</div>
                                  <small className="text-muted">{lesson.teacher?.name ?? '-'}</small>
                                </div>
                              ) : (
                                <span className="text-muted">Ders yok</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSchedulePage;
