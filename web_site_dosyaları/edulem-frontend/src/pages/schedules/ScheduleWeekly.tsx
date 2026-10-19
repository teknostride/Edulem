import { useEffect, useMemo, useState } from 'react';

import axiosClient from '../../api/axiosClient';

import { showToast } from '../../utils/toast';

import { jsPDF } from 'jspdf';


import { toAsciiTurkish } from '../../utils/pdfFont';

import * as XLSX from 'xlsx';



const DAYS = [

  { key: 'monday', label: 'Pazartesi' },

  { key: 'tuesday', label: 'Salı' },

  { key: 'wednesday', label: 'Çarşamba' },

  { key: 'thursday', label: 'Perşembe' },

  { key: 'friday', label: 'Cuma' },

] as const;



type DayKey = (typeof DAYS)[number]['key'];



interface TimeSlot {

  id: number;

  name: string;

  start_time: string;

  end_time: string;

  order: number;

}



interface Classroom {

  id: number;

  name: string;

  code?: string;

  campus_id?: number;

  education_level_id?: number;

}



interface EducationLevel {

  id: number;

  name: string;

  campus_id?: number;

}



interface Campus {

  id: number;

  name: string;

}



interface Lesson {

  id: number;

  name: string;

  code?: string;

  color?: string;

  is_active?: boolean;

  education_level_id?: number | null;

  education_level_ids?: number[];

}



interface Teacher {

  id: number;

  first_name: string;

  last_name: string;

}



interface ScheduleItem {

  id: number;

  classroom_id: number;

  lesson_id: number;

  teacher_id: number;

  assistant_teacher_ids?: number[] | null;

  assistant_teachers?: { id: number; first_name?: string; last_name?: string; name?: string }[];

  day_of_week: string;

  start_time: string;

  end_time: string;

  time_slot_id?: number;

  classroom?: { id: number; name: string };

  lesson?: { id: number; name: string };

  teacher?: { id: number; first_name: string; last_name: string };

}



const ScheduleWeekly = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .assistant-remove-btn {
        opacity: 0;
        transition: opacity 0.2s;
      }
      .assistant-group:hover .assistant-remove-btn {
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);


  const userData = (() => {

    try {

      return JSON.parse(localStorage.getItem('USER_DATA') || '{}');

    } catch {

      return {};

    }

  })();

  const userRole = localStorage.getItem('USER_ROLE') || userData.role || userData.role_name || null;

  const isTeacher =

    userRole === 'Öğretmen' ||

    userRole === 'Sınıf Öğretmeni' ||

    userRole === 'teacher' ||

    userRole === 'Rehber Öğretmen' ||

    userRole === 'rehber_teacher' ||

    userRole === 'guidance_teacher' ||

    userRole === 'Rehberlik' ||

    userRole === 'guidance' ||

    userRole === '5' ||

    userRole === '6';

  const teacherId = userData.id as number | undefined;
  const currentTeacherName = (
    userData.name ||
    `${userData.first_name || ''} ${userData.last_name || ''}`.trim() ||
    'Öğretmen'
  );



  const SW_LS = {
    campus: 'schedule_filter_campus',
    level: 'schedule_filter_level',
    classroom: 'schedule_filter_classroom',
    viewMode: 'schedule_filter_viewmode',
  };

  const [campuses, setCampuses] = useState<Campus[]>([]);

  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  const [teachers, setTeachers] = useState<Teacher[]>([]);



  const [selectedCampus, setSelectedCampus] = useState<number | ''>(() => {
    const s = localStorage.getItem(SW_LS.campus); return s ? Number(s) : '';
  });

  const [selectedLevel, setSelectedLevel] = useState<number | ''>(() => {
    const s = localStorage.getItem(SW_LS.level); return s ? Number(s) : '';
  });

  const [selectedClassroom, setSelectedClassroom] = useState<number | ''>(() => {
    const s = localStorage.getItem(SW_LS.classroom); return s ? Number(s) : '';
  });

  const [editMode, setEditMode] = useState(false);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [viewMode, setViewMode] = useState<'my' | 'other'>(() => {
    if (isTeacher) return 'my';
    const s = localStorage.getItem(SW_LS.viewMode);
    return (s === 'my' || s === 'other') ? s : 'other';
  });

  useEffect(() => {
    if (isTeacher) {
      if (viewMode !== 'my') {
        setViewMode('my');
      }
      localStorage.setItem(SW_LS.viewMode, 'my');
    }
  }, [isTeacher, viewMode]);

  // Filtre persist yardımcıları
  const saveCampus = (v: number | '') => { v !== '' ? localStorage.setItem(SW_LS.campus, String(v)) : localStorage.removeItem(SW_LS.campus); setSelectedCampus(v); };
  const saveLevel = (v: number | '') => { v !== '' ? localStorage.setItem(SW_LS.level, String(v)) : localStorage.removeItem(SW_LS.level); setSelectedLevel(v); };
  const saveClassroom = (v: number | '') => { v !== '' ? localStorage.setItem(SW_LS.classroom, String(v)) : localStorage.removeItem(SW_LS.classroom); setSelectedClassroom(v); };




  const [draggingScheduleId, setDraggingScheduleId] = useState<number | null>(null);

  const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null);



  const [modalOpen, setModalOpen] = useState(false);

  const [modalCell, setModalCell] = useState<{ day: DayKey; timeSlot: TimeSlot } | null>(null);

  const [modalLessonId, setModalLessonId] = useState<number | ''>('');

  const [modalTeacherId, setModalTeacherId] = useState<number | ''>('');

  const [modalNoTeacher, setModalNoTeacher] = useState(false);

  const [modalTeachers, setModalTeachers] = useState<Teacher[]>([]);

  const [modalAssistantTeacherIds, setModalAssistantTeacherIds] = useState<number[]>([]);

  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);



  const [exportOpen, setExportOpen] = useState(false);

  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

  const [exportScope, setExportScope] = useState<'teacher' | 'education_level' | 'campus'>('teacher');

  const [exportTeacherIds, setExportTeacherIds] = useState<number[]>([]);

  const [exportCampusId, setExportCampusId] = useState<number | ''>('');

  const [exportEducationLevelId, setExportEducationLevelId] = useState<number | ''>('');

  const [exportClassroomIds, setExportClassroomIds] = useState<number[]>([]);

  const [exportClassrooms, setExportClassrooms] = useState<Classroom[]>([]);

  const [exportTeachers, setExportTeachers] = useState<Teacher[]>([]);

  const [exporting, setExporting] = useState(false);



  const availableLevels = selectedCampus

    ? educationLevels.filter((el) => el.campus_id != null && el.campus_id === selectedCampus)

    : educationLevels;



  const sortEducationLevels = (list: EducationLevel[]) => {

    const rankOf = (name: unknown) => {

      const s = String(name ?? '').trim().toLocaleLowerCase('tr-TR');

      if (!s) return 999;

      if (s.includes('ana') && (s.includes('okul') || s.includes('sınıf'))) return 0; // anaokulu

      if (s.includes('ilk')) return 1; // ilkokul

      if (s.includes('orta')) return 2; // ortaokul

      if (s.includes('lise')) return 3; // lise

      return 900;

    };



    return [...list].sort((a, b) => {

      const ra = rankOf(a.name);

      const rb = rankOf(b.name);

      if (ra !== rb) return ra - rb;

      return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'tr-TR', { numeric: true, sensitivity: 'base' });

    });

  };



  const campusNameById = useMemo(() => {

    const m = new Map<number, string>();

    campuses.forEach((c) => m.set(Number(c.id), c.name));

    return m;

  }, [campuses]);



  const educationLevelNameById = useMemo(() => {

    const m = new Map<number, string>();

    educationLevels.forEach((l) => m.set(Number(l.id), l.name));

    return m;

  }, [educationLevels]);



  const dayLabel = (day: DayKey) => DAYS.find((d) => d.key === day)?.label ?? String(day);



  const buildMatrix = (slots: TimeSlot[], items: ScheduleItem[]) => {

    const rows = slots.map((slot) => {

      const row: Record<string, string> = { Saat: `${formatTime(slot.start_time)}-${formatTime(slot.end_time)}` };

      DAYS.forEach((d) => {

        const dayKey = d.key as DayKey;

        const start = normTime(slot.start_time);

        const s = items.find((x) => x.day_of_week === dayKey && normTime(x.start_time) === start);

        if (!s) {

          row[dayLabel(dayKey)] = '';

          return;

        }

        // Ders adı büyük harf, öğretmen adı normal - Türkçe karakterler Latin'e çevriliyor
        const lessonNameRaw = toUpperTr((s.lesson as any)?.name || '');
        const lessonName = toAsciiTurkish(lessonNameRaw);

        const mainTeacherRaw = s.teacher ? teacherName(s.teacher as any) : '';
        const mainTeacher = toAsciiTurkish(mainTeacherRaw);

        const assistants = assistantTeacherNames(s);
        const allTeachersRaw = [mainTeacher, ...assistants.map(a => toAsciiTurkish(a.name))].filter(Boolean).join(', ');

        // Ders adı ve öğretmen adı ayrı satırlarda
        row[dayLabel(dayKey)] = allTeachersRaw ? `${lessonName}\n${allTeachersRaw}` : lessonName;

      });

      return row;

    });

    return rows;

  };



  const fetchSchedulesForClassroom = async (classroomId: number) => {

    const res = await axiosClient.get(`/schedules?classroom_id=${classroomId}`);

    const raw = res.data?.data ?? res.data?.schedules ?? res.data;

    const data = Array.isArray(raw) ? raw : [];

    return data as ScheduleItem[];

  };



  const fetchSchedulesForTeacher = async (tid: number) => {

    const res = await axiosClient.get(`/schedules?teacher_id=${tid}`);

    const raw = res.data?.data ?? res.data?.schedules ?? res.data;

    const data = Array.isArray(raw) ? raw : [];

    return data as ScheduleItem[];

  };



  const fetchTimeSlotsForEducationLevel = async (educationLevelId: number) => {

    const res = await axiosClient.get(`/time-slots?education_level_id=${educationLevelId}`);

    const data = res.data?.data ?? [];

    const all = (Array.isArray(data) ? data : []).sort((a: TimeSlot, b: TimeSlot) => (a.order || 0) - (b.order || 0));

    return all.filter((s: TimeSlot) => !(s.name || '').toLowerCase().includes('tenefüs')) as TimeSlot[];

  };



  const exportExcel = async (opts: {

    title: string;

    subtitle?: string;

    sheets: { name: string; slots: TimeSlot[]; items: ScheduleItem[] }[];

  }) => {

    const wb = XLSX.utils.book_new();

    opts.sheets.forEach((sh) => {

      const rows = buildMatrix(sh.slots, sh.items);

      const header = {

        Saat: 'Saat',

        Pazartesi: 'Pazartesi',

        Salı: 'Salı',

        Çarşamba: 'Çarşamba',

        Perşembe: 'Perşembe',

        Cuma: 'Cuma',

      } as any;

      const ws = XLSX.utils.json_to_sheet([header, ...rows], { skipHeader: true });

      XLSX.utils.book_append_sheet(wb, ws, sh.name.substring(0, 31) || 'Program');

    });



    const safe = opts.title.replace(/[\\/:*?\[\]]/g, '-').trim() || 'Ders_Programi';

    XLSX.writeFile(wb, `${safe}.xlsx`);

  };



  const exportPdf = async (opts: {
    title: string;
    subtitle?: string;
    sections: { name: string; slots: TimeSlot[]; items: ScheduleItem[] }[];
  }) => {
    // Ekrandaki tabloyu bul ve html2canvas ile PDF'e çevir
    const html2canvas = (await import('html2canvas')).default;
    
    // Tablo elementini bul
    const tableElement = document.querySelector('.table-responsive table') as HTMLElement;
    if (!tableElement) {
      showToast('error', 'Tablo bulunamadı');
      return;
    }

    // Başlık elementini oluştur
    const headerDiv = document.createElement('div');
    headerDiv.style.padding = '20px';
    headerDiv.style.textAlign = 'center';
    headerDiv.style.fontFamily = 'Arial, sans-serif';
    headerDiv.style.backgroundColor = 'white';
    headerDiv.innerHTML = `
      <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #333;">${opts.title}</h2>
      <p style="margin: 0; font-size: 14px; color: #666;">${opts.subtitle || ''}</p>
    `;

    // Canvas oluştur
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Tablo canvas'ını al
    const tableCanvas = await html2canvas(tableElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    // Canvas boyutlarını ayarla
    const headerHeight = 80;
    const padding = 40;
    canvas.width = tableCanvas.width + (padding * 2);
    canvas.height = tableCanvas.height + headerHeight + (padding * 2);

    // Beyaz arka plan
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Başlığı çiz
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.fillText(opts.title, canvas.width / 2, 40);

    if (opts.subtitle) {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(opts.subtitle, canvas.width / 2, 65);
    }

    // Tabloyu çiz
    ctx.drawImage(tableCanvas, padding, headerHeight);

    // PDF oluştur
    const doc = new jsPDF({ 
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', 
      unit: 'pt', 
      format: 'a4' 
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Görseli sayfaya sığdır
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pageWidth - 40; // 20pt margin her iki taraftan
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 20; // Üst margin

    // İlk sayfa
    doc.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 40); // Sayfa yüksekliği eksi margin'ler

    // Eğer görsel birden fazla sayfaya sığmıyorsa, ek sayfalar ekle
    while (heightLeft > 0) {
      doc.addPage();
      doc.addImage(imgData, 'PNG', 20, position - (imgHeight - heightLeft), imgWidth, imgHeight);
      heightLeft -= (pageHeight - 40);
    }

    const safe = opts.title.replace(/[\\/:*?\[\]]/g, '-').trim() || 'Ders_Programi';
    doc.save(`${safe}.pdf`);
  };



  // Öğretmen için sadece kendi programını Excel veya PDF olarak indirme
  const handleTeacherExport = async (format: 'excel' | 'pdf' = 'excel') => {
    if (!teacherId) {
      showToast('error', 'Öğretmen bilgisi bulunamadı');
      return;
    }
    try {
      setExporting(true);
      const orgName = 'Ak İrfan Koleji';
      const dateStr = new Date().toLocaleDateString('tr-TR');
      const items = await fetchSchedulesForTeacher(Number(teacherId));
      const slotMap = new Map<string, TimeSlot>();
      items.forEach((s: any) => {
        const st = normTime(String(s.start_time || ''));
        const en = normTime(String(s.end_time || ''));
        if (!st || !en) return;
        const key = `${st}-${en}`;
        if (!slotMap.has(key)) {
          slotMap.set(key, { id: 0, name: `${st}–${en}`, start_time: st, end_time: en, order: 0 });
        }
      });
      const slots = Array.from(slotMap.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
      const myName = currentTeacherName;
      const sectionsOrSheets = [{ name: myName, slots, items }];
      const subtitle = dateStr;

      if (format === 'excel') {
        await exportExcel({
          title: `${orgName}_${myName.replace(/\s+/g, '_')}_Programi_${dateStr}`,
          subtitle,
          sheets: sectionsOrSheets,
        });
      } else {
        await exportPdf({
          title: `${orgName} - Öğretmen Programı`,
          subtitle,
          sections: sectionsOrSheets,
        });
      }
    } catch (e) {
      console.error('Export error:', e);
      showToast('error', 'Dışa aktarma sırasında hata oluştu');
    } finally {
      setExporting(false);
    }
  };

  const handleExport = async () => {

    try {

      setExporting(true);



      const orgName = 'Ak İrfan Koleji';

      const today = new Date();

      const dateStr = today.toLocaleDateString('tr-TR');

      // Öğretmen sadece kendi ders programını indirebilir
      if (isTeacher) {
        if (!teacherId) {
          showToast('error', 'Öğretmen bilgisi bulunamadı');
          return;
        }

        const title = `${orgName} - Öğretmen Programı`;
        const items = await fetchSchedulesForTeacher(Number(teacherId));
        const slotMap = new Map<string, TimeSlot>();
        items.forEach((s: any) => {
          const st = normTime(String(s.start_time || ''));
          const en = normTime(String(s.end_time || ''));
          if (!st || !en) return;
          const key = `${st}-${en}`;
          if (!slotMap.has(key)) {
            slotMap.set(key, { id: 0, name: `${st}–${en}`, start_time: st, end_time: en, order: 0 });
          }
        });
        const slots = Array.from(slotMap.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));

        const myName = currentTeacherName;
        const sectionsOrSheets = [{
          name: myName,
          slots,
          items,
        }];

        const subtitle = `${dateStr}`;
        if (exportFormat === 'excel') {
          await exportExcel({
            title: `${orgName}_${myName.replace(/\s+/g, '_')}_Programi_${dateStr}`,
            subtitle,
            sheets: sectionsOrSheets,
          });
        } else {
          await exportPdf({
            title,
            subtitle,
            sections: sectionsOrSheets,
          });
        }
        return;
      }

      if (exportScope === 'teacher') {

        const selected = (exportTeacherIds || []).filter((id) => Number.isFinite(id) && id > 0);

        if (selected.length === 0) {

          showToast('error', 'En az 1 öğretmen seçiniz');

          return;

        }

        const title = `${orgName} - Öğretmen Programı`;

        const sectionsOrSheets: { name: string; slots: TimeSlot[]; items: ScheduleItem[] }[] = [];

        for (const tid of selected) {

          const t = exportTeachers.find((x) => Number(x.id) === Number(tid))

            || teachers.find((x) => Number(x.id) === Number(tid));

          const items = await fetchSchedulesForTeacher(Number(tid));

          const slotMap = new Map<string, TimeSlot>();

          items.forEach((s: any) => {

            const st = normTime(String(s.start_time || ''));

            const en = normTime(String(s.end_time || ''));

            if (!st || !en) return;

            const key = `${st}-${en}`;

            if (!slotMap.has(key)) {

              slotMap.set(key, { id: 0, name: `${st}–${en}`, start_time: st, end_time: en, order: 0 });

            }

          });

          const slots = Array.from(slotMap.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));

          sectionsOrSheets.push({

            name: t ? teacherName(t as any) : `Öğretmen ${tid}`,

            slots,

            items,

          });

        }

        const subtitle = `${dateStr}`;

        if (exportFormat === 'excel') {

          await exportExcel({

            title: `${orgName}_Ogretmen_Programi_${dateStr}`,

            subtitle,

            sheets: sectionsOrSheets,

          });

        } else {

          await exportPdf({

            title,

            subtitle,

            sections: sectionsOrSheets,

          });

        }

        return;

      }



      if (exportScope === 'education_level') {

        const levelId = Number(exportEducationLevelId || 0);

        if (!levelId) {

          showToast('error', 'Kademe seçiniz');

          return;

        }

        const levelName = educationLevelNameById.get(levelId) || `Kademe ${levelId}`;

        const slots = await fetchTimeSlotsForEducationLevel(levelId);

        const title = `${orgName} - Kademe Programları`;

        const subtitle = `${levelName} • ${dateStr}`;



        // Seçilen sınıflar (checkbox)

        const selected = (exportClassroomIds || []).filter((id) => Number.isFinite(id) && id > 0);

        if (selected.length === 0) {

          showToast('error', 'En az 1 sınıf seçiniz');

          return;

        }

        const map = new Map<number, Classroom>();

        (exportClassrooms || []).forEach((c) => map.set(Number(c.id), c));

        const sorted = sortClassrooms(selected.map((id) => map.get(Number(id))).filter(Boolean) as Classroom[]);



        const sheetsOrSections: { name: string; slots: TimeSlot[]; items: ScheduleItem[] }[] = [];

        for (const c of sorted) {

          const items = await fetchSchedulesForClassroom(Number(c.id));

          // Sınıf adı olarak name kullan (code yerine) - örn: "5A" yerine "5A56"
          const classroomDisplayName = c.name || c.code || `Sınıf ${c.id}`;
          sheetsOrSections.push({ name: classroomDisplayName, slots, items });

        }



        if (exportFormat === 'excel') {

          await exportExcel({

            title: `${orgName}_Kademe_${levelName}_${dateStr}`,

            subtitle,

            sheets: sheetsOrSections,

          });

        } else {

          await exportPdf({

            title,

            subtitle,

            sections: sheetsOrSections,

          });

        }

        return;

      }



      // campus

      const campusId = Number(exportCampusId || 0);

      if (!campusId) {

        showToast('error', 'Kampüs seçiniz');

        return;

      }

      const campusName = campusNameById.get(campusId) || `Kampüs ${campusId}`;

      const title = `${orgName} - Kampüs Programları`;

      const subtitle = `${campusName} • ${dateStr}`;



      // Kampüsteki kademeleri çekip her kademenin sınıflarını sheet/page yapalım

      const levels = sortEducationLevels(educationLevels.filter((l) => Number(l.campus_id || 0) === campusId));

      const sheetsOrSections: { name: string; slots: TimeSlot[]; items: ScheduleItem[] }[] = [];

      for (const lvl of levels) {

        const slots = await fetchTimeSlotsForEducationLevel(Number(lvl.id));

        const res = await axiosClient.get(`/classrooms?education_level_id=${lvl.id}`);

        const raw = res.data?.data?.classrooms ?? res.data?.classrooms ?? res.data?.data ?? res.data;

        const cls = Array.isArray(raw) ? (raw as Classroom[]) : [];

        const inCampus = cls.filter((c) => Number((c as any).campus_id || 0) === campusId);

        const sorted = sortClassrooms(inCampus);

        for (const c of sorted) {
          const items = await fetchSchedulesForClassroom(Number(c.id));
          // Sınıf adı olarak name kullan (code yerine)
          const classroomDisplayName = c.name || c.code || `Sınıf ${c.id}`;
          const sheetName = `${lvl.name} - ${classroomDisplayName}`;
          sheetsOrSections.push({ name: sheetName, slots, items });
        }

      }



      if (sheetsOrSections.length === 0) {

        showToast('error', 'Bu kriterlere uygun sınıf bulunamadı');

        return;

      }



      if (exportFormat === 'excel') {

        await exportExcel({

          title: `${orgName}_Kampus_${campusName}_${dateStr}`,

          subtitle,

          sheets: sheetsOrSections,

        });

      } else {

        await exportPdf({

          title,

          subtitle,

          sections: sheetsOrSections,

        });

      }

    } catch (e: any) {

      console.error('Export error:', e);

      showToast('error', e?.message || 'Dışa aktarma başarısız');

    } finally {

      setExporting(false);

      setExportOpen(false);

    }

  };



  const sortedAvailableLevels = useMemo(() => sortEducationLevels(availableLevels), [availableLevels]);



  const sortClassrooms = (list: Classroom[]) => {

    const extractNum = (v: unknown) => {

      const s = String(v ?? '');

      const m = s.match(/\d+/);

      return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY;

    };

    return [...list].sort((a, b) => {

      const na = extractNum(a.code ?? a.name);

      const nb = extractNum(b.code ?? b.name);

      if (na !== nb) return na - nb;

      return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'tr-TR', { numeric: true, sensitivity: 'base' });

    });

  };



  const sortedClassrooms = useMemo(() => sortClassrooms(classrooms), [classrooms]);



  useEffect(() => {

    fetchCampuses();

    fetchEducationLevels();

    fetchAllTeachers();

  }, []);



  useEffect(() => {

    if (selectedLevel) {

      fetchLessons(selectedLevel);

    } else {

      fetchLessons('');

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [selectedLevel]);



  const visibleLessons = useMemo(() => {

    if (!selectedLevel) return lessons;

    const levelId = Number(selectedLevel);

    return lessons.filter((l) => {
      const ids = Array.isArray((l as any).education_level_ids)
        ? (l as any).education_level_ids
            .map((x: any) => Number(x))
            .filter((n: number) => Number.isFinite(n) && n > 0)
        : [];

      if (ids.length > 0) {
        return ids.includes(levelId);
      }

      return Number(l.education_level_id || 0) === levelId;
    });

  }, [lessons, selectedLevel]);



  const toUpperTr = (value: string) => {

    const v = (value ?? '').toString();

    return v ? v.toLocaleUpperCase('tr-TR') : '';

  };



  const cmpTr = (a: string, b: string) => {

    return (a ?? '').toString().localeCompare((b ?? '').toString(), 'tr-TR', { sensitivity: 'base' });

  };



  const sortedVisibleLessons = useMemo(() => {

    return [...visibleLessons].sort((a, b) => cmpTr(a.name, b.name));

  }, [visibleLessons]);



  const sortedModalTeachers = useMemo(() => {

    return [...modalTeachers].sort((a, b) => cmpTr(`${a.first_name || ''} ${a.last_name || ''}`.trim(), `${b.first_name || ''} ${b.last_name || ''}`.trim()));

  }, [modalTeachers]);



  useEffect(() => {

    if (isTeacher && viewMode === 'my') return;

    if (selectedLevel) {

      fetchClassrooms();

      fetchTimeSlots();

    } else {

      setClassrooms([]);

      setTimeSlots([]);

      setSelectedClassroom('');

    }

  }, [selectedLevel, isTeacher, viewMode]);



  useEffect(() => {

    if (isTeacher && viewMode === 'my') return;

    if (selectedClassroom && selectedLevel) {

      fetchSchedules();

    } else {

      setSchedules([]);

    }

  }, [selectedClassroom, selectedLevel, isTeacher, viewMode]);



  useEffect(() => {

    if (!isTeacher || viewMode === 'other') return;

    if (!teacherId) {

      showToast('error', 'Öğretmen bilgisi bulunamadı');

      setSchedules([]);

      setTimeSlots([]);

      setLoading(false);

      return;

    }

    fetchTeacherSchedules();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [isTeacher, teacherId]);



  const fetchCampuses = async () => {

    try {

      const res = await axiosClient.get('/campuses');

      const data = res.data?.data?.campuses ?? res.data?.campuses ?? res.data?.data ?? res.data;

      setCampuses(Array.isArray(data) ? data : []);

    } catch (e) {

      console.error(e);

    }

  };



  const fetchEducationLevels = async () => {

    try {

      const res = await axiosClient.get('/education-levels');

      const data = res.data?.data?.education_levels ?? res.data?.education_levels ?? res.data?.data ?? res.data;

      setEducationLevels(Array.isArray(data) ? sortEducationLevels(data) : []);

    } catch (e) {

      console.error(e);

    }

  };



  const fetchClassrooms = async () => {

    if (!selectedLevel) return;

    try {

      const res = await axiosClient.get(`/classrooms?education_level_id=${selectedLevel}`);

      const data = res.data?.data?.classrooms ?? res.data?.classrooms ?? res.data?.data ?? res.data;

      setClassrooms(Array.isArray(data) ? sortClassrooms(data) : []);

    } catch (e) {

      console.error(e);

      setClassrooms([]);

    }

  };



  const fetchTimeSlots = async () => {

    if (!selectedLevel) return;

    try {

      const res = await axiosClient.get(`/time-slots?education_level_id=${selectedLevel}`);

      const data = res.data?.data ?? [];

      const all = (Array.isArray(data) ? data : []).sort((a: TimeSlot, b: TimeSlot) => (a.order || 0) - (b.order || 0));

      const withoutBreaks = all.filter((s: TimeSlot) => !(s.name || '').toLowerCase().includes('tenefüs'));

      setTimeSlots(withoutBreaks);

    } catch (e) {

      console.error(e);

      setTimeSlots([]);

    }

  };



  const fetchLessons = async (educationLevelId?: number | '') => {

    try {

      const params: any = { per_page: 500 };

      if (educationLevelId) params.education_level_id = educationLevelId;

      const res = await axiosClient.get('/lessons', { params });

      const raw = res.data?.data;

      const list = raw?.lessons ?? (Array.isArray(raw) ? raw : raw?.data) ?? res.data?.lessons ?? [];

      setLessons(Array.isArray(list) ? list : []);

    } catch (e) {

      console.error(e);

      setLessons([]);

    }

  };



  const fetchAllTeachers = async () => {

    try {

      const res = await axiosClient.get('/users', {

        params: { role: 'Öğretmen', per_page: 100 },

      });

      const raw = res.data?.data;

      const list = raw?.users ?? res.data?.users ?? raw ?? res.data;

      setTeachers(Array.isArray(list) ? list : []);

    } catch (e) {

      console.error(e);

      setTeachers([]);

    }

  };



  const fetchExportTeachers = async (educationLevelId?: number | '') => {

    try {

      const params: any = { role: 'Öğretmen', per_page: 200 };

      if (educationLevelId) params.education_level_id = educationLevelId;

      const res = await axiosClient.get('/users', { params });

      const raw = res.data?.data;

      const list = raw?.users ?? res.data?.users ?? raw ?? res.data;

      setExportTeachers(Array.isArray(list) ? list : []);

    } catch (e) {

      console.error(e);

      setExportTeachers([]);

    }

  };



  const fetchExportClassrooms = async (educationLevelId?: number | '') => {

    try {

      if (!educationLevelId) {

        setExportClassrooms([]);

        return;

      }

      const res = await axiosClient.get('/classrooms', { params: { education_level_id: educationLevelId } });

      const raw = res.data?.data?.classrooms ?? res.data?.classrooms ?? res.data?.data ?? res.data;

      const cls = Array.isArray(raw) ? (raw as Classroom[]) : [];

      setExportClassrooms(sortClassrooms(cls));

    } catch (e) {

      console.error(e);

      setExportClassrooms([]);

    }

  };



  useEffect(() => {

    if (!exportOpen) return;

    if (exportScope === 'teacher') {

      fetchExportTeachers(exportEducationLevelId);

    }

    if (exportScope === 'education_level') {

      fetchExportClassrooms(exportEducationLevelId);

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [exportOpen, exportScope, exportEducationLevelId]);



  const fetchSchedules = async () => {

    if (!selectedClassroom) return;

    setLoading(true);

    try {

      const res = await axiosClient.get(`/schedules?classroom_id=${selectedClassroom}`);

      const raw = res.data?.data ?? res.data?.schedules ?? res.data;

      const data = Array.isArray(raw) ? raw : [];

      setSchedules(data);

    } catch (e) {

      console.error(e);

      setSchedules([]);

    } finally {

      setLoading(false);

    }

  };



  const fetchTeacherSchedules = async () => {

    if (!teacherId) return;

    setLoading(true);

    try {

      const res = await axiosClient.get(`/schedules?teacher_id=${teacherId}`);

      const raw = res.data?.data ?? res.data?.schedules ?? res.data;

      const data = Array.isArray(raw) ? raw : [];

      setSchedules(data);



      const slotMap = new Map<string, TimeSlot>();

      data.forEach((s: any) => {

        const st = normTime(String(s.start_time || ''));

        const en = normTime(String(s.end_time || ''));

        if (!st || !en) return;

        const key = `${st}-${en}`;

        if (!slotMap.has(key)) {

          slotMap.set(key, {

            id: 0,

            name: `${st}–${en}`,

            start_time: st,

            end_time: en,

            order: 0,

          });

        }

      });



      const sorted = Array.from(slotMap.values())

        .sort((a, b) => a.start_time.localeCompare(b.start_time))

        .map((s, idx) => ({ ...s, id: idx + 1, order: idx + 1 }));

      setTimeSlots(sorted);

    } catch (e: any) {

      console.error(e);

      showToast('error', e.response?.data?.message ?? 'Ders programı yüklenemedi');

      setSchedules([]);

      setTimeSlots([]);

    } finally {

      setLoading(false);

    }

  };



  const normTime = (t: string) => {

    if (!t) return '';

    const s = String(t).trim();

    // "08:00" veya "08:00:00"

    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return s.substring(0, 5);

    // "2024-01-01 08:00:00"

    if (s.includes(' ')) return s.split(' ')[1].substring(0, 5);

    // "2024-01-01T08:00:00" veya ISO

    const iso = s.match(/T(\d{2}:\d{2})/);

    if (iso) return iso[1];

    return s.substring(0, 5);

  };



  // Dersin atanmış öğretmenlerini getir

  const fetchLessonTeachers = async (lessonId: number) => {

    if (!lessonId) {

      setModalTeachers([]);

      return;

    }

    try {

      const response = await axiosClient.get(`/lessons/${lessonId}/teachers`);

      setModalTeachers(response.data.data || []);

    } catch (error) {

      console.error('Öğretmenler yüklenemedi:', error);

      setModalTeachers([]);

    }

  };



  const getScheduleForCell = (day: DayKey, timeSlot: TimeSlot) => {

    const start = normTime(timeSlot.start_time);

    return schedules.find(

      (s) => s.day_of_week === day && normTime(s.start_time) === start

    );

  };



  const openCellModal = (day: DayKey, timeSlot: TimeSlot, existing?: ScheduleItem | null) => {

    setModalOpen(true);

    setModalCell({ day, timeSlot });

    setEditingScheduleId(existing?.id ?? null);

    setModalLessonId(existing?.lesson_id ?? '');

    setModalTeacherId(existing?.teacher_id ?? '');

    setModalNoTeacher(Boolean(existing?.lesson_id) && !existing?.teacher_id);

    setModalAssistantTeacherIds(() => {

      if (Array.isArray(existing?.assistant_teachers) && existing!.assistant_teachers!.length > 0) {

        return existing!.assistant_teachers!

          .map((t) => Number((t as any).id))

          .filter((n) => Number.isFinite(n) && n > 0);

      }

      return Array.isArray(existing?.assistant_teacher_ids)

        ? (existing?.assistant_teacher_ids as any[]).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)

        : [];

    });



    // Mevcut ders varsa öğretmenlerini yükle

    if (existing?.lesson_id) {

      fetchLessonTeachers(existing.lesson_id);

    } else {

      setModalTeachers([]);

    }



    setModalOpen(true);

  };



  const closeModal = () => {

    setModalOpen(false);

    setModalCell(null);

    setEditingScheduleId(null);

    setModalLessonId('');

    setModalTeacherId('');

    setModalNoTeacher(false);

    setModalTeachers([]);

    setModalAssistantTeacherIds([]);

  };



  const handleSaveCell = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!modalCell) {
      showToast('error', 'Seçim hatası');
      return;
    }

    if (!selectedClassroom) {
      showToast('error', 'Önce sınıf seçiniz');
      return;
    }

    if (modalLessonId === '') {
      showToast('error', 'Ders seçiniz');
      return;
    }

    if (!modalNoTeacher && modalTeacherId === '') {
      showToast('error', 'Öğretmen seçiniz');
      return;
    }

    setSaving(true);

    try {

      const payload = {

        classroom_id: selectedClassroom,

        lesson_id: Number(modalLessonId),

        teacher_id: modalNoTeacher ? null : Number(modalTeacherId),

        assistant_teacher_ids: modalNoTeacher

          ? []

          : modalAssistantTeacherIds.filter((id) => id > 0 && id !== Number(modalTeacherId)),

        day_of_week: modalCell.day,

        start_time: modalCell.timeSlot.start_time?.substring(0, 5) || '08:00',

        end_time: modalCell.timeSlot.end_time?.substring(0, 5) || '08:45',

        time_slot_id: modalCell.timeSlot.id,

      };

      if (editingScheduleId) {

        await axiosClient.post(`/schedules/${editingScheduleId}?_method=PUT`, payload);

        showToast('success', 'Ders programı güncellendi');

      } else {

        await axiosClient.post('/schedules', payload);

        showToast('success', 'Ders eklendi');

      }

      closeModal();

      await fetchSchedules();

    } catch (err: any) {

      const msg = err.response?.data?.message || 'İşlem başarısız';

      showToast('error', msg);

    } finally {

      setSaving(false);

    }

  };



  const handleDeleteCell = async () => {
    if (!editingScheduleId) return;
    setSaving(true);
    try {
      // Use URLSearchParams for more robust method spoofing on some server environments
      const params = new URLSearchParams();
      params.append('_method', 'DELETE');
      await axiosClient.post(`/schedules/${editingScheduleId}`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      showToast('success', 'Ders kaldırıldı');
      closeModal();
      fetchSchedules();
    } catch (e) {
      showToast('error', 'Silinemedi');
    } finally {
      setSaving(false);
    }
  };

  const canReset = !isTeacher && !!selectedClassroom;

  const handleResetClassroom = async () => {
    if (!selectedClassroom) return;
    setResetting(true);
    try {
      await axiosClient.put('/schedules/reset', { classroom_id: Number(selectedClassroom) });
      showToast('success', 'Ders programı sıfırlandı');
      setResetOpen(false);
      await fetchSchedules();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'İşlem başarısız';
      showToast('error', msg);
    } finally {
      setResetting(false);
    }
  };

  const handleRemoveAssistant = async (item: ScheduleItem, assistantId: number) => {
    setSaving(true);
    try {
      const currentIds = Array.isArray(item.assistant_teacher_ids) ? (item.assistant_teacher_ids as any[]).map(x => Number(x)) : [];
      const nextIds = currentIds.filter(id => id !== assistantId);

      await axiosClient.post(`/schedules/${item.id}?_method=PUT`, {
        assistant_teacher_ids: nextIds
      });

      showToast('success', 'Yardımcı öğretmen kaldırıldı');
      await fetchSchedules();
    } catch (err: any) {
      console.error('Yardımcı öğretmen kaldırılamadı:', err);
      showToast('error', 'Kaldırılamadı');
    } finally {
      setSaving(false);
    }
  };



  const formatTime = (t: string) => (t ? t.substring(0, 5) : '');

  const teacherName = (t: Teacher) => `${t.first_name || ''} ${t.last_name || ''}`.trim();



  const assistantTeacherNames = (s: ScheduleItem) => {
    if (Array.isArray(s.assistant_teachers) && s.assistant_teachers.length > 0) {
      return s.assistant_teachers
        .map((t) => {
          const fn = (t.first_name || '').trim();
          const ln = (t.last_name || '').trim();
          const full = `${fn} ${ln}`.trim();
          const name = (full || (t.name || '')).trim();
          return { id: t.id, name };
        })
        .filter(x => x.name);
    }

    const ids = Array.isArray(s.assistant_teacher_ids) ? s.assistant_teacher_ids : [];
    const clean = ids.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0 && n !== s.teacher_id);
    if (clean.length === 0) return [] as { id: number; name: string }[];

    const map = new Map<number, Teacher>();
    teachers.forEach((t) => map.set(t.id, t));
    return clean
      .map((id) => {
        const t = map.get(id);
        return t ? { id: t.id, name: teacherName(t) } : null;
      })
      .filter(Boolean) as { id: number; name: string }[];
  };


  const handleTeacherDragEnd = () => {

    setDraggingScheduleId(null);

    setDragOverCellKey(null);

  };



  const handleScheduleDragStart = (e: React.DragEvent, s: ScheduleItem) => {

    setDraggingScheduleId(s.id);

    try {

      e.dataTransfer.effectAllowed = 'copy';

      e.dataTransfer.setData(

        'application/json',

        JSON.stringify({

          type: 'schedule',

          schedule_id: s.id,

          lesson_id: s.lesson_id,

          teacher_id: s.teacher_id,

          assistant_teacher_ids: Array.isArray(s.assistant_teacher_ids) ? s.assistant_teacher_ids : [],

        })

      );

    } catch (err) {

      console.error('Drag data set error:', err);

    }

  };



  const cellKey = (day: DayKey, slot: TimeSlot) => `${day}__${normTime(slot.start_time)}`;



  const handleCellDragOver = (e: React.DragEvent, day: DayKey, slot: TimeSlot) => {

    if (isTeacher) return;

    e.preventDefault();

    e.dataTransfer.dropEffect = 'copy';

    setDragOverCellKey(cellKey(day, slot));

  };



  const handleCellDragLeave = (day: DayKey, slot: TimeSlot) => {

    const k = cellKey(day, slot);

    setDragOverCellKey((prev) => (prev === k ? null : prev));

  };



  const handleCellDrop = async (e: React.DragEvent, day: DayKey, slot: TimeSlot) => {

    if (isTeacher) return;

    e.preventDefault();

    setDragOverCellKey(null);



    if (!selectedClassroom) {

      showToast('error', 'Önce sınıf seçin');

      return;

    }



    let data: any = null;

    try {

      const raw = e.dataTransfer.getData('application/json');

      data = raw ? JSON.parse(raw) : null;

    } catch (err) {

      console.error('Drop parse error:', err);

    }

    const teacherIdRaw = (data as any)?.teacher_id;

    const teacherId = teacherIdRaw === null || teacherIdRaw === undefined || teacherIdRaw === ''

      ? null

      : Number(teacherIdRaw);

    const lessonIdFromDrag = Number(data?.lesson_id || 0);

    const isScheduleDrag = data?.type === 'schedule' || Number(data?.schedule_id || 0) > 0;

    const assistantIdsFromDrag: number[] = Array.isArray(data?.assistant_teacher_ids)

      ? (data.assistant_teacher_ids as any[]).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)

      : [];



    const lessonIdToUse = Number(lessonIdFromDrag || 0);

    if (!lessonIdToUse) {

      showToast('error', 'Önce ders seçin');

      return;

    }



    const existing = getScheduleForCell(day, slot);

    if (existing && !isScheduleDrag) {

      if (!teacherId || !Number.isFinite(teacherId) || teacherId <= 0) {

        showToast('error', 'Öğretmen seçin');

        return;

      }

      const current = Array.isArray(existing.assistant_teacher_ids) ? existing.assistant_teacher_ids : [];

      const next = Array.from(new Set([...current, teacherId]))

        .filter((id) => id > 0 && id !== existing.teacher_id);



      setSaving(true);

      try {

        await axiosClient.put(`/schedules/${existing.id}`, {

          assistant_teacher_ids: next,

        });

        showToast('success', 'Öğretmen eklendi');

        await fetchSchedules();

      } catch (err: any) {

        console.error('Öğretmen eklenemedi:', err);

        showToast('error', err.response?.data?.message ?? 'Öğretmen eklenemedi');

      } finally {

        setSaving(false);

      }

      return;

    }



    const payload = {

      classroom_id: selectedClassroom,

      lesson_id: lessonIdToUse,

      teacher_id: teacherId && Number.isFinite(teacherId) && teacherId > 0 ? teacherId : null,

      assistant_teacher_ids: isScheduleDrag

        ? (teacherId && Number.isFinite(teacherId) && teacherId > 0 ? assistantIdsFromDrag : [])

        : undefined,

      day_of_week: day,

      start_time: slot.start_time?.substring(0, 5) || '08:00',

      end_time: slot.end_time?.substring(0, 5) || '08:45',

      time_slot_id: slot.id,

    };



    setSaving(true);

    try {

      await axiosClient.post('/schedules', payload);

      showToast('success', 'Ders eklendi');

      await fetchSchedules();

    } catch (err: any) {

      console.error('Ders eklenemedi:', err);

      showToast('error', err.response?.data?.message ?? 'Ders eklenemedi');

    } finally {

      setSaving(false);

    }

  };



  return (

    <div className="container-fluid">

      <div className="page-title-head d-flex align-items-center mb-3">

        <div className="flex-grow-1">

          <h4 className="page-main-title m-0">Ders Programı</h4>
          <small className="text-muted">{isTeacher ? `${currentTeacherName} - Haftalık Ders Programı` : 'Haftalık program'}</small>
        </div>

        {canReset && (
          <div className="me-2">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => setResetOpen(true)}
              disabled={loading || saving}
            >
              <i className="ti ti-trash me-1"></i> Sıfırla
            </button>
          </div>
        )}

        {isTeacher ? (
          <div className="btn-group me-2">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm dropdown-toggle"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              disabled={loading || exporting}
            >
              {exporting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                  İndiriliyor...
                </>
              ) : (
                <>
                  <i className="ti ti-download me-1" /> Programımı İndir
                </>
              )}
            </button>
            <ul className="dropdown-menu">
              <li>
                <button
                  type="button"
                  className="dropdown-item d-flex align-items-center gap-2"
                  onClick={() => handleTeacherExport('excel')}
                >
                  <i className="ti ti-file-spreadsheet text-success" /> Excel Olarak İndir
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item d-flex align-items-center gap-2"
                  onClick={() => handleTeacherExport('pdf')}
                >
                  <i className="ti ti-file-type-pdf text-danger" /> PDF Olarak İndir
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div className="me-2">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                setExportOpen(true);
                setExportScope(viewMode === 'my' ? 'teacher' : 'education_level');
                setExportTeacherIds([]);
                setExportCampusId('');
                setExportEducationLevelId('');
                setExportClassroomIds([]);
                setExportTeachers([]);
                setExportClassrooms([]);
              }}
              disabled={loading}
            >
              <i className="ti ti-download me-1"></i> Dışa Aktar
            </button>
          </div>
        )}

        {!isTeacher && (
          <div className="me-2">
            <button
              type="button"
              className={`btn btn-sm ${editMode ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => {
                if (!selectedClassroom) return;
                if (editMode) {
                  setEditMode(false);
                  setModalOpen(false);
                  setModalCell(null);
                  setEditingScheduleId(null);
                } else {
                  setEditMode(true);
                }
              }}
              disabled={loading || !selectedClassroom}
            >
              <i className={`ti ${editMode ? 'ti-device-floppy' : 'ti-edit'} me-1`}></i> {editMode ? 'Kaydet' : 'Düzenle'}
            </button>
          </div>
        )}

      {resetOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Emin misiniz?</h5>
                <button type="button" className="btn-close" onClick={() => setResetOpen(false)} disabled={resetting}></button>
              </div>
              <div className="modal-body">
                Bu sınıfın haftalık ders programı tamamen silinecektir. Bu işlemi geri alamazsınız.
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setResetOpen(false)} disabled={resetting}>
                  İptal
                </button>
                <button type="button" className="btn btn-danger" onClick={handleResetClassroom} disabled={resetting}>
                  {resetting ? 'Rapor hazırlanıyor...' : 'Evet, Sıfırla'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {exportOpen && (

        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>

          <div className="modal-dialog">

            <div className="modal-content">

              <div className="modal-header">

                <h5 className="modal-title">Dışa Aktar</h5>

                <button type="button" className="btn-close" onClick={() => setExportOpen(false)}></button>

              </div>

              <div className="modal-body">

                <div className="mb-3">

                  <label className="form-label">Format</label>

                  <select

                    className="form-select"

                    value={exportFormat}

                    onChange={(e) => setExportFormat(e.target.value as any)}

                    disabled={exporting}

                  >

                    <option value="excel">Excel (.xlsx)</option>

                    <option value="pdf">PDF</option>

                  </select>

                  {exportFormat === 'pdf' && (

                    <div className="form-text">

                      PDF için paketler gerekli: <code>jspdf</code> ve <code>jspdf-autotable</code>

                    </div>

                  )}

                </div>



                <div className="mb-3">

                  <label className="form-label">Kapsam</label>

                  <select

                    className="form-select"

                    value={exportScope}

                    onChange={(e) => {

                      const next = e.target.value as any;

                      setExportScope(next);

                      setExportTeacherIds([]);

                      setExportClassroomIds([]);

                      setExportTeachers([]);

                      setExportClassrooms([]);

                    }}

                    disabled={exporting}

                  >

                    <option value="teacher">Öğretmen</option>

                    <option value="education_level">Kademe (Toplu)</option>

                    <option value="campus">Kampüs (Toplu)</option>

                  </select>

                </div>



                {exportScope === 'teacher' && (

                  <div className="mb-3">

                    <label className="form-label">Kademe</label>

                    <select

                      className="form-select"

                      value={exportEducationLevelId === '' ? '' : String(exportEducationLevelId)}

                      onChange={(e) => {

                        const v = e.target.value ? Number(e.target.value) : '';

                        setExportEducationLevelId(v);

                        setExportTeacherIds([]);

                      }}

                      disabled={exporting}

                    >

                      <option value="">Seçiniz</option>

                      {sortEducationLevels(educationLevels).map((l) => (

                        <option key={l.id} value={l.id}>{l.name}</option>

                      ))}

                    </select>

                  </div>

                )}



                {exportScope === 'teacher' && (

                  <div className="mb-3">

                    <label className="form-label">Öğretmenler</label>

                    <div className="border rounded p-2" style={{ maxHeight: 220, overflow: 'auto' }}>

                      {!exportEducationLevelId ? (

                        <div className="text-muted small">Önce kademe seçiniz</div>

                      ) : exportTeachers.length === 0 ? (

                        <div className="text-muted small">Öğretmen bulunamadı</div>

                      ) : (

                        [...exportTeachers]

                          .sort((a, b) => cmpTr(teacherName(a as any), teacherName(b as any)))

                          .map((t) => {

                            const checked = exportTeacherIds.includes(Number(t.id));

                            return (

                              <label key={t.id} className="d-flex align-items-center gap-2 small py-1" style={{ cursor: 'pointer' }}>

                                <input

                                  type="checkbox"

                                  className="form-check-input m-0"

                                  checked={checked}

                                  onChange={(e) => {

                                    const id = Number(t.id);

                                    setExportTeacherIds((prev) => {

                                      const set = new Set(prev);

                                      if (e.target.checked) set.add(id); else set.delete(id);

                                      return Array.from(set.values());

                                    });

                                  }}

                                  disabled={exporting}

                                />

                                <span>{toUpperTr(teacherName(t as any))}</span>

                              </label>

                            );

                          })

                      )}

                    </div>

                  </div>

                )}



                {exportScope === 'education_level' && (

                  <div className="mb-3">

                    <label className="form-label">Kademe</label>

                    <select

                      className="form-select"

                      value={exportEducationLevelId === '' ? '' : String(exportEducationLevelId)}

                      onChange={(e) => {

                        const v = e.target.value ? Number(e.target.value) : '';

                        setExportEducationLevelId(v);

                        setExportClassroomIds([]);

                      }}

                      disabled={exporting}

                    >

                      <option value="">Seçiniz</option>

                      {sortEducationLevels(educationLevels).map((l) => (

                        <option key={l.id} value={l.id}>{l.name}</option>

                      ))}

                    </select>

                  </div>

                )}



                {exportScope === 'education_level' && (

                  <div className="mb-3">

                    <label className="form-label">Sınıflar</label>

                    <div className="border rounded p-2" style={{ maxHeight: 220, overflow: 'auto' }}>

                      {!exportEducationLevelId ? (

                        <div className="text-muted small">Önce kademe seçiniz</div>

                      ) : exportClassrooms.length === 0 ? (

                        <div className="text-muted small">Sınıf bulunamadı</div>

                      ) : (

                        exportClassrooms.map((c) => {

                          const checked = exportClassroomIds.includes(Number(c.id));

                          return (

                            <label key={c.id} className="d-flex align-items-center gap-2 small py-1" style={{ cursor: 'pointer' }}>

                              <input

                                type="checkbox"

                                className="form-check-input m-0"

                                checked={checked}

                                onChange={(e) => {

                                  const id = Number(c.id);

                                  setExportClassroomIds((prev) => {

                                    const set = new Set(prev);

                                    if (e.target.checked) set.add(id); else set.delete(id);

                                    return Array.from(set.values());

                                  });

                                }}

                                disabled={exporting}

                              />

                              <span>{c.code || c.name}</span>

                            </label>

                          );

                        })

                      )}

                    </div>

                  </div>

                )}



                {exportScope === 'campus' && (

                  <div className="mb-3">

                    <label className="form-label">Kampüs</label>

                    <select

                      className="form-select"

                      value={exportCampusId === '' ? '' : String(exportCampusId)}

                      onChange={(e) => setExportCampusId(e.target.value ? Number(e.target.value) : '')}

                      disabled={exporting}

                    >

                      <option value="">Seçiniz</option>

                      {campuses.map((c) => (

                        <option key={c.id} value={c.id}>{c.name}</option>

                      ))}

                    </select>

                  </div>

                )}

              </div>

              <div className="modal-footer">

                <button type="button" className="btn btn-outline-secondary" onClick={() => setExportOpen(false)} disabled={exporting}>

                  İptal

                </button>

                <button type="button" className="btn btn-primary" onClick={handleExport} disabled={exporting}>

                  {exporting ? 'Hazırlanıyor...' : 'İndir'}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}



        <div className="text-end">

          <ol className="breadcrumb m-0 py-0">

            <li className="breadcrumb-item"><a href="javascript:void(0);">Akademik</a></li>

            <li className="breadcrumb-item active">Ders Programı</li>

          </ol>

        </div>

      </div>



      {(!isTeacher || viewMode === 'other') && (

        <div className="card mb-4">

          <div className="card-body">

            <div className="row g-3 align-items-end">

              <div className="col-md-3">

                <label className="form-label">Kampüs</label>

                <select

                  className="form-select"

                  value={selectedCampus === '' ? '' : selectedCampus}

                  onChange={(e) => {

                    const v = e.target.value;

                    saveCampus(v ? Number(v) : '');

                    saveLevel('');

                    saveClassroom('');

                    setEditMode(false);

                  }}

                >

                  <option value="">Kampüs seçin</option>

                  {campuses.map((c) => (

                    <option key={c.id} value={c.id}>{c.name}</option>

                  ))}

                </select>

              </div>



              <div className="col-md-3">

                <label className="form-label">Eğitim Kademesi</label>

                <select

                  className="form-select"

                  value={selectedLevel === '' ? '' : selectedLevel}

                  onChange={(e) => {

                    const v = e.target.value;

                    saveLevel(v ? Number(v) : '');

                    saveClassroom('');

                    setEditMode(false);

                  }}

                  disabled={!selectedCampus}

                >

                  <option value="">Kademe seçin</option>

                  {sortedAvailableLevels.map((l) => (

                    <option key={l.id} value={l.id}>{l.name}</option>

                  ))}

                </select>

              </div>



              <div className="col-md-3">

                <label className="form-label">Sınıf</label>

                <select

                  className="form-select"

                  value={selectedClassroom === '' ? '' : selectedClassroom}

                  onChange={(e) => {

                    saveClassroom(e.target.value ? Number(e.target.value) : '');

                    setEditMode(false);

                  }}

                  disabled={!selectedLevel}

                >

                  <option value="">Sınıf seçin</option>

                  {sortedClassrooms.map((c) => (

                    <option key={c.id} value={c.id}>{c.name}</option>

                  ))}

                </select>

              </div>

            </div>

          </div>

        </div>

      )}



      <div className="row g-3">
        <div className={!isTeacher && viewMode === 'other' ? 'col-lg-9' : 'col-12'}>

          <div className="card">

            <div className="card-body p-0">

              {(!isTeacher || viewMode === 'other') && !selectedClassroom ? (
                <div className="text-center py-5">
                  <div className="text-muted">
                    <i className="ti ti-school fs-1 d-block mb-2"></i>
                    <p className="mb-0">Lütfen sınıf seçiniz</p>
                  </div>
                </div>
              ) : (

              <div className="table-responsive">

                <table className="table table-bordered table-hover mb-0">

                  <thead>

                    <tr>

                      <th style={{ width: '120px' }} className="bg-light">Ders saati</th>

                      {DAYS.map((d) => (

                        <th key={d.key} className="text-center bg-light">{d.label}</th>

                      ))}

                    </tr>

                  </thead>

                  <tbody>

                    {timeSlots.length === 0 ? (

                      <tr>

                        <td colSpan={6} className="text-center py-4 text-muted">

                          {isTeacher

                            ? 'Bu hafta için ders programı bulunamadı.'

                            : 'Bu kademe için ders saati tanımlı değil. Önce Kurum Saatleri sayfasından ekleyin.'}

                        </td>

                      </tr>

                    ) : (

                      timeSlots.map((slot) => (

                        <tr key={slot.id}>

                          <td className="bg-light align-middle">

                            <div className="fw-medium">{slot.name}</div>

                            <small className="text-muted">

                              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}

                            </small>

                          </td>



                          {DAYS.map((d) => {

                            const item = getScheduleForCell(d.key, slot);

                            const k = cellKey(d.key, slot);

                            const isOver = dragOverCellKey === k;



                            return (

                              <td

                                key={d.key}

                                className={`align-middle p-2 cursor-pointer ${isOver ? 'bg-soft-warning' : ''}`}

                                style={{ minHeight: '60px', cursor: 'pointer', transition: 'background-color 120ms ease' }}

                                onClick={() => {

                                  if (!editMode) return;

                                  openCellModal(d.key, slot, item);

                                }}

                                onDragOver={(e) => {

                                  if (!editMode) return;

                                  handleCellDragOver(e, d.key, slot);

                                }}

                                onDragLeave={() => {

                                  if (!editMode) return;

                                  handleCellDragLeave(d.key, slot);

                                }}

                                onDrop={(e) => {

                                  if (!editMode) return;

                                  handleCellDrop(e, d.key, slot);

                                }}

                              >

                                {item ? (

                                  <div

                                    className={`small ${draggingScheduleId === item.id ? 'opacity-50' : ''}`}

                                    draggable={!isTeacher && editMode}

                                    onDragStart={(e) => {

                                      if (!editMode) return;

                                      handleScheduleDragStart(e, item);

                                    }}

                                    onDragEnd={handleTeacherDragEnd}

                                    style={!isTeacher ? { cursor: 'grab' } : undefined}

                                  >

                                    <div className="fw-semibold text-primary">{toUpperTr(item.lesson?.name ?? 'Ders')}</div>


                                    {item.teacher && (

                                      <div className="text-muted">

                                        {`${item.teacher.first_name || ''} ${item.teacher.last_name || ''}`.trim()}

                                      </div>

                                    )}

                                    {assistantTeacherNames(item).map((at) => (
                                      <div key={at.id} className="text-muted d-flex align-items-center gap-1 assistant-group">
                                        <span>{at.name}</span>
                                        {!isTeacher && (
                                          <i 
                                            className="ti ti-x text-danger cursor-pointer assistant-remove-btn"
                                            style={{ fontSize: '10px' }}
                                            title="Yardımcı öğretmeni kaldır"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveAssistant(item, at.id);
                                            }}
                                          />
                                        )}
                                      </div>
                                    ))}

                                    {isTeacher && (

                                      <div className="text-muted">{item.classroom?.name ?? ''}</div>

                                    )}

                                  </div>

                                ) : (

                                  <div className="text-muted text-center small">

                                    {!editMode ? (

                                      '—'

                                    ) : (

                                      <>

                                        <i className="ti ti-plus d-block mb-1" />

                                        {isTeacher ? '—' : isOver ? 'Bırak' : 'Ders ekle'}

                                      </>

                                    )}

                                  </div>

                                )}

                              </td>

                            );

                          })}

                        </tr>

                      ))

                    )}

                  </tbody>

                </table>

              </div>

              )}

            </div>

          </div>

        </div>

      </div>



      {modalOpen && modalCell && (

        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>

          <div className="modal-dialog modal-dialog-centered">

            <div className="modal-content">

              <form onSubmit={handleSaveCell}>

                <div className="modal-header">

                  <h5 className="modal-title">{editingScheduleId ? 'Dersi düzenle' : 'Ders ata'}</h5>

                  <button type="button" className="btn-close" onClick={closeModal} aria-label="Kapat" />

                </div>



                <div className="modal-body">

                  <p className="text-muted small mb-3">

                    {DAYS.find((d) => d.key === modalCell.day)?.label} – {modalCell.timeSlot.name} ({formatTime(modalCell.timeSlot.start_time)}–{formatTime(modalCell.timeSlot.end_time)})

                  </p>



                  <div className="mb-3">

                    <label className="form-label">Ders</label>

                    <select

                      className="form-select"

                      value={modalLessonId === '' ? '' : modalLessonId}

                      onChange={(e) => {

                        const lessonId = e.target.value ? Number(e.target.value) : '';

                        setModalLessonId(lessonId);

                        setModalNoTeacher(false);

                        setModalTeacherId('');

                        setModalAssistantTeacherIds([]);

                        if (lessonId !== '') {

                          fetchLessonTeachers(Number(lessonId));

                        } else {

                          setModalTeachers([]);

                        }

                      }}

                      required

                    >

                      <option value="">Ders seçin</option>

                      {sortedVisibleLessons.map((l) => (

                        <option key={l.id} value={l.id}>{toUpperTr(l.name)}</option>

                      ))}

                    </select>

                  </div>



                  <div className="mb-3">

                    <label className="form-label">Öğretmen</label>

                    <div className="d-flex justify-content-end mb-2">

                      <button

                        type="button"

                        className={`btn btn-sm ${modalNoTeacher ? 'btn-primary' : 'btn-outline-secondary'}`}

                        onClick={() => {

                          setModalNoTeacher((prev) => {

                            const next = !prev;

                            if (next) {

                              setModalTeacherId('');

                              setModalAssistantTeacherIds([]);

                            }

                            return next;

                          });

                        }}

                        disabled={modalLessonId === ''}

                      >

                        Öğretmen seçmek istemiyorum

                      </button>

                    </div>

                    <select

                      className="form-select"

                      value={modalTeacherId === '' ? '' : modalTeacherId}

                      onChange={(e) => setModalTeacherId(e.target.value ? Number(e.target.value) : '')}

                      disabled={modalNoTeacher}

                    >

                      <option value="">Öğretmen seçin</option>

                      {modalTeachers.length === 0 && modalLessonId !== '' && (

                        <option value="" disabled>Bu ders için öğretmen tanımlı değil</option>

                      )}

                      {sortedModalTeachers.map((t) => (

                        <option key={t.id} value={t.id}>{toUpperTr(teacherName(t))}</option>

                      ))}

                    </select>

                  </div>



                  <div className="mb-3">

                    <label className="form-label">Yardımcı Öğretmen(ler)</label>

                    <select

                      className="form-select"

                      multiple

                      value={modalAssistantTeacherIds.map(String)}

                      onChange={(e) => {

                        const ids = Array.from(e.target.selectedOptions)

                          .map((o) => Number(o.value))

                          .filter((n) => Number.isFinite(n) && n > 0);

                        setModalAssistantTeacherIds(ids);

                      }}

                      disabled={modalNoTeacher || modalTeachers.length === 0 || modalTeacherId === ''}

                    >

                      {modalTeachers

                        .filter((t) => Number(t.id) !== Number(modalTeacherId || 0))

                        .map((t) => (

                          <option key={t.id} value={t.id}>{teacherName(t)}</option>

                        ))}

                    </select>

                    <div className="form-text">Birden fazla seçim yapabilirsiniz.</div>

                  </div>

                </div>



                <div className="modal-footer">

                  {editingScheduleId && (

                    <button

                      type="button"

                      className="btn btn-outline-danger me-auto"

                      onClick={handleDeleteCell}

                      disabled={saving}

                    >

                      Kaldır

                    </button>

                  )}

                  <button type="button" className="btn btn-light" onClick={closeModal}>İptal</button>

                  <button type="submit" className="btn btn-primary" disabled={saving}>

                    {saving ? <span className="spinner-border spinner-border-sm" /> : 'Kaydet'}

                  </button>

                </div>

              </form>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};

export default ScheduleWeekly;

