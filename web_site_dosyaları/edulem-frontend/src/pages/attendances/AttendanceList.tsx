import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ensureTurkishFont, toAsciiTurkish } from '../../utils/pdfFont';

interface DersItem {
  schedule_id: number;
  ders_adi: string;
  sinif_tam_adi: string;
  sinif_mevcudu: number;
  ogretmen_adi: string;
  saat: number;
  yoklama_alindi: boolean;
  start_time: string;
  end_time: string;
  yoklama_ozet?: {
    geldi_sayisi: number;
    gelmedi_sayisi: number;
    izinli_sayisi: number;
    raporlu_sayisi: number;
    gec_sayisi: number;
  };
}

interface GelmeyenOgrenci {
  student_id?: number;
  ogrenci_adi: string;
  okul_no: string;
  sinif_tam_adi: string;
  ders_adi: string;
  ders_saati: number;
  durum: string;
  veli_adi: string | null;
  veli_telefon: string | null;
}

interface DailyData {
  gun: string;
  tarih: string;
  hafta_sonu: boolean;
  dersler: DersItem[];
  istatistikler: { toplam_ders: number; alinan_yoklama: number; toplam_devamsiz_ogrenci?: number };
  toplam_devamsiz_ogrenci?: number;
  gelmeyen_ogrenciler: GelmeyenOgrenci[];
  kademe_secimi_gerekli?: boolean;
}

interface EducationLevelOption {
  id: number;
  name: string;
  code?: string;
  campus_id?: number;
  campus_name?: string;
}

interface Campus {
  id: number;
  name: string;
}

const TEACHER_ONLY_ROLES = ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'teacher', 'guidance'];
const TRACKING_ROLES_WITH_KADEME = ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs'];

const getTodayISO = () => new Date().toISOString().split('T')[0];

function formatTarih(t: string) {
  try {
    return new Date(t + 'T12:00:00').toLocaleDateString('tr-TR');
  } catch {
    return t;
  }
}

const DURUM_ETIKET: Record<string, string> = {
  gelmedi: 'Gelmedi',
  izinli: 'İzinli',
  raporlu: 'Raporlu',
  gc: 'Geç Geldi',
};

const LS_KEYS = {
  date: 'attendance_filter_date',
  tab: 'attendance_filter_tab',
  campusId: 'attendance_filter_campus_id',
  educationLevelId: 'attendance_filter_education_level_id',
};

const AttendanceList = () => {
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>(() => {
    // Kaydedilmiş tarih varsa onu yükle; yoksa bugünü kullan
    const saved = localStorage.getItem(LS_KEYS.date);
    return saved || getTodayISO();
  });
  const [tab, setTab] = useState<'ozet' | 'gelmeyen'>(() => {
    const saved = localStorage.getItem(LS_KEYS.tab);
    return (saved === 'ozet' || saved === 'gelmeyen') ? saved : 'ozet';
  });
  const [data, setData] = useState<DailyData | null>(null);
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [educationLevels, setEducationLevels] = useState<EducationLevelOption[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<number | null>(() => {
    const saved = localStorage.getItem(LS_KEYS.campusId);
    return saved ? Number(saved) : null;
  });
  const [selectedEducationLevelId, setSelectedEducationLevelId] = useState<number | null>(() => {
    const saved = localStorage.getItem(LS_KEYS.educationLevelId);
    return saved ? Number(saved) : null;
  });
  const [levelsLoaded, setLevelsLoaded] = useState(false);
  const [exporting, setExporting] = useState<false | 'excel' | 'pdf'>(false);
  const [detailModalData, setDetailModalData] = useState<{ ders: DersItem; students: GelmeyenOgrenci[] } | null>(null);

  // Filtre değerlerini localStorage'a kaydet
  const saveDate = (val: string) => {
    localStorage.setItem(LS_KEYS.date, val);
    setDate(val);
  };
  const saveTab = (val: 'ozet' | 'gelmeyen') => {
    localStorage.setItem(LS_KEYS.tab, val);
    setTab(val);
  };
  const saveCampusId = (val: number | null) => {
    if (val !== null) localStorage.setItem(LS_KEYS.campusId, String(val));
    else localStorage.removeItem(LS_KEYS.campusId);
    setSelectedCampusId(val);
  };
  const saveEducationLevelId = (val: number | null) => {
    if (val !== null) localStorage.setItem(LS_KEYS.educationLevelId, String(val));
    else localStorage.removeItem(LS_KEYS.educationLevelId);
    setSelectedEducationLevelId(val);
  };

  const isTeacherView =
    userRole !== null && TEACHER_ONLY_ROLES.some((r) => r === userRole);
  const isTrackingWithKademe =
    userRole !== null && TRACKING_ROLES_WITH_KADEME.some((r) => r === userRole);
  const needsKademeSelection =
    isTrackingWithKademe && levelsLoaded && educationLevels.length > 0 && selectedEducationLevelId === null;
  const noKademeAssigned =
    isTrackingWithKademe && levelsLoaded && educationLevels.length === 0;
  const canFetchDaily =
    isTeacherView || !isTrackingWithKademe || selectedEducationLevelId !== null;
  const showTrackingContent = !needsKademeSelection && !noKademeAssigned;

  const fetchDaily = async (tarih: string, educationLevelId: number | null) => {
    try {
      setLoading(true);
      const params: { date: string; education_level_id?: number } = { date: tarih };
      if (educationLevelId != null) params.education_level_id = educationLevelId;
      const res = await axiosClient.get('/attendances/daily', { params });
      const raw = res.data?.data ?? res.data;
      if (raw.kademe_secimi_gerekli) {
        setData({
          gun: raw.gun ?? '',
          tarih: raw.tarih ?? tarih,
          hafta_sonu: raw.hafta_sonu ?? false,
          dersler: [],
          istatistikler: { toplam_ders: 0, alinan_yoklama: 0 },
          gelmeyen_ogrenciler: [],
          kademe_secimi_gerekli: true,
        });
        return;
      }
      setData({
        gun: raw.gun ?? '',
        tarih: raw.tarih ?? tarih,
        hafta_sonu: raw.hafta_sonu ?? false,
        dersler: Array.isArray(raw.dersler) ? raw.dersler : [],
        istatistikler: raw.istatistikler ?? { toplam_ders: 0, alinan_yoklama: 0 },
        gelmeyen_ogrenciler: Array.isArray(raw.gelmeyen_ogrenciler) ? raw.gelmeyen_ogrenciler : [],
      });
    } catch (e) {
      console.error(e);
      showToast('error', 'Yoklama takip verisi yüklenemedi');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role =
      localStorage.getItem('USER_ROLE') ||
      (() => {
        try {
          return JSON.parse(localStorage.getItem('USER_DATA') || '{}').role ?? null;
        } catch {
          return null;
        }
      })();
    setUserRole(role);
  }, []);

  useEffect(() => {
    if (!isTrackingWithKademe) {
      setLevelsLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosClient.get('/education-levels');
        const list =
          res.data?.data?.education_levels ?? res.data?.education_levels ?? res.data?.data ?? [];
        const arr: EducationLevelOption[] = Array.isArray(list) ? list : [];
        if (cancelled) return;
        setEducationLevels(arr);

        // Derive campuses
        const campusMap = new Map<number, Campus>();
        arr.forEach((level) => {
          if (level.campus_id && !campusMap.has(level.campus_id)) {
            campusMap.set(level.campus_id, {
              id: level.campus_id,
              name: level.campus_name || `Kampüs #${level.campus_id}`,
            });
          }
        });
        const derivedCampuses = Array.from(campusMap.values());
        setCampuses(derivedCampuses);

        if (derivedCampuses.length === 1 && selectedCampusId === null) {
          saveCampusId(derivedCampuses[0].id);
          const campusLevels = arr.filter(l => l.campus_id === derivedCampuses[0].id);
          if (campusLevels.length === 1) {
            saveEducationLevelId(campusLevels[0].id);
          }
        }
      } catch {
        if (!cancelled) {
          setEducationLevels([]);
          setCampuses([]);
        }
      } finally {
        if (!cancelled) setLevelsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTrackingWithKademe]);

  const toUpperTr = (value: string) => {
    const v = (value ?? '').toString();
    return v ? v.toLocaleUpperCase('tr-TR') : '';
  };

  useEffect(() => {
    if (!levelsLoaded) return;
    if (isTeacherView) {
      const today = getTodayISO();
      if (date !== today) {
        setDate(today);  // iç senkronizasyon – kaydetme gerekmez
        return;
      }
      fetchDaily(today, null);
      return;
    }
    if (isTrackingWithKademe && selectedEducationLevelId === null && educationLevels.length > 0) {
      setData(null);
      setLoading(false);
      return;
    }
    if (canFetchDaily) {
      fetchDaily(date, selectedEducationLevelId);
    }
  }, [date, levelsLoaded, isTeacherView, isTrackingWithKademe, selectedEducationLevelId, educationLevels.length]);

  const filteredEducationLevels = selectedCampusId
    ? educationLevels.filter(lev => lev.campus_id === selectedCampusId)
    : educationLevels;

  const orgName = 'Ak İrfan Koleji';

  // Ders saatleri (en az 1..8, daha fazla saat varsa dinamik)
  const maxLessonHour = useMemo(() => {
    const hours = (data?.dersler ?? []).map((d) => d.saat);
    return hours.length > 0 ? Math.max(8, ...hours) : 8;
  }, [data?.dersler]);

  const lessonHours = useMemo(() => {
    return Array.from({ length: maxLessonHour }, (_, i) => i + 1);
  }, [maxLessonHour]);

  // Sayfadaki tablonun birebir dışa aktarımı: Öğrencinin geldiği ve gelmediği tüm derslerin analizi
  const exportStudents = useMemo(() => {
    const gelmeyenler = data?.gelmeyen_ogrenciler ?? [];
    if (gelmeyenler.length === 0) return [];

    // Sınıf ve saat bazında ders var mı ve yoklama alındı mı haritası
    const lessonTakenMap = new Map<string, boolean>();
    (data?.dersler ?? []).forEach((dl) => {
      const k = `${dl.sinif_tam_adi}_${dl.saat}`;
      if (dl.yoklama_alindi) {
        lessonTakenMap.set(k, true);
      } else if (!lessonTakenMap.has(k)) {
        lessonTakenMap.set(k, false);
      }
    });

    // Öğrencileri tekilleştirelim
    const studentMap = new Map<string, {
      student_id?: number;
      okul_no: string;
      ogrenci_adi: string;
      sinif: string;
      veli_adi: string;
      veli_telefon: string;
      absentMap: Record<number, string>;
    }>();

    gelmeyenler.forEach((g) => {
      const key = g.student_id
        ? String(g.student_id)
        : (g.okul_no ? `${g.sinif_tam_adi}_${g.okul_no}` : g.ogrenci_adi);

      if (!studentMap.has(key)) {
        studentMap.set(key, {
          student_id: g.student_id,
          okul_no: g.okul_no || '',
          ogrenci_adi: g.ogrenci_adi || '',
          sinif: g.sinif_tam_adi || '',
          veli_adi: g.veli_adi || '',
          veli_telefon: g.veli_telefon || '',
          absentMap: {},
        });
      }
      studentMap.get(key)!.absentMap[g.ders_saati] = g.durum;
    });

    return Array.from(studentMap.values())
      .sort((a, b) => {
        const classComp = a.sinif.localeCompare(b.sinif, 'tr-TR');
        if (classComp !== 0) return classComp;
        return a.ogrenci_adi.localeCompare(b.ogrenci_adi, 'tr-TR');
      })
      .map((st) => {
        const hourly: Record<number, string> = {};
        const unexcusedAbsentHours: number[] = [];
        const izinliHours: number[] = [];
        const raporluHours: number[] = [];
        const gecHours: number[] = [];
        let attendedHoursCount = 0;
        let totalTakenLessonsForStudent = 0;

        lessonHours.forEach((h) => {
          const lKey = `${st.sinif}_${h}`;
          const isTaken = lessonTakenMap.get(lKey);

          if (st.absentMap[h]) {
            const rawDurum = st.absentMap[h];
            if (rawDurum === 'gelmedi') {
              hourly[h] = 'Gelmedi';
              unexcusedAbsentHours.push(h);
            } else if (rawDurum === 'izinli') {
              hourly[h] = 'İzinli';
              izinliHours.push(h);
            } else if (rawDurum === 'raporlu') {
              hourly[h] = 'Raporlu';
              raporluHours.push(h);
            } else if (rawDurum === 'gc') {
              hourly[h] = 'Geç';
              gecHours.push(h);
            } else {
              hourly[h] = DURUM_ETIKET[rawDurum] || rawDurum;
            }
            totalTakenLessonsForStudent++;
          } else if (isTaken === true) {
            // Sınıfta yoklama alınmış ve öğrenci devamsız listesinde yoksa o derse gelmiştir
            hourly[h] = 'Geldi';
            attendedHoursCount++;
            totalTakenLessonsForStudent++;
          } else if (isTaken === false) {
            hourly[h] = '-'; // Yoklama henüz alınmadı
          } else {
            hourly[h] = '-'; // O saatte ders yok
          }
        });

        // Detaylı özet metni
        const summaryParts: string[] = [];
        if (unexcusedAbsentHours.length > 0) {
          if (totalTakenLessonsForStudent > 0 && unexcusedAbsentHours.length === totalTakenLessonsForStudent) {
            summaryParts.push('Tüm Gün Gelmedi');
          } else {
            summaryParts.push(`${unexcusedAbsentHours.length} Ders Gelmedi (${unexcusedAbsentHours.map((x) => `${x}. Ders`).join(', ')})`);
          }
        }
        if (izinliHours.length > 0) {
          summaryParts.push(`İzinli (${izinliHours.map((x) => `${x}. Ders`).join(', ')})`);
        }
        if (raporluHours.length > 0) {
          summaryParts.push(`Raporlu (${raporluHours.map((x) => `${x}. Ders`).join(', ')})`);
        }
        if (gecHours.length > 0) {
          summaryParts.push(`Geç (${gecHours.map((x) => `${x}. Ders`).join(', ')})`);
        }
        if (attendedHoursCount > 0 && unexcusedAbsentHours.length > 0) {
          summaryParts.push(`${attendedHoursCount} Derse Katıldı`);
        }

        const summary = summaryParts.length > 0 ? summaryParts.join(' | ') : 'Devamsızlık Yok';

        return {
          ...st,
          hourly,
          summary,
          unexcusedCount: unexcusedAbsentHours.length,
          attendedCount: attendedHoursCount,
        };
      });
  }, [data?.gelmeyen_ogrenciler, data?.dersler, lessonHours]);

  const exportExcel = async () => {
    try {
      setExporting('excel');
      if (!exportStudents.length) {
        showToast('error', 'Dışa aktarılacak kayıt bulunamadı');
        return;
      }

      const rows = exportStudents.map((st) => {
        const row: Record<string, any> = {
          'Sınıf': st.sinif,
          'Öğrenci No': st.okul_no,
          'Ad Soyad': st.ogrenci_adi,
        };

        lessonHours.forEach((h) => {
          row[`${h}. Ders`] = st.hourly[h] || '-';
        });

        row['Devamsızlık Özeti'] = st.summary;
        row['Veli Adı'] = st.veli_adi || '-';
        row['Veli Telefon'] = st.veli_telefon || '-';
        row['Tarih'] = formatTarih(date);

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Devamsızlık Raporu');

      const safeDate = String(date || '').replace(/\//g, '-');
      XLSX.writeFile(wb, `${orgName}_Yoklama_${safeDate}.xlsx`);
    } catch (e) {
      console.error(e);
      showToast('error', 'Excel dışa aktarma başarısız');
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    try {
      setExporting('pdf');
      if (!exportStudents.length) {
        showToast('error', 'Dışa aktarılacak kayıt bulunamadı');
        return;
      }

      let doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      let pdfFont: string | null = null;
      try {
        pdfFont = await ensureTurkishFont(doc);
      } catch (e) {
        console.error(e);
        pdfFont = null;
      }
      if (!pdfFont) {
        doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        showToast('warning', 'PDF Türkçe karakterler için uygun TTF font yüklenemedi. Varsayılan font ile devam ediliyor.');
      }
      const title = `${orgName} - Günlük Devamsızlık Takip Raporu`;
      const subtitle = `Tarih: ${formatTarih(date)} | Toplam Devamsız Öğrenci: ${exportStudents.length}`;

      doc.setFontSize(13);
      const titleForPdf = pdfFont ? title : toAsciiTurkish(title);
      doc.text(titleForPdf, 40, 36);
      doc.setFontSize(9);
      const subtitleForPdf = pdfFont ? subtitle : toAsciiTurkish(subtitle);
      doc.text(subtitleForPdf, 40, 52);

      const headColumns = [
        'Sınıf',
        'No',
        'Ad Soyad',
        ...lessonHours.map((h) => `${h}.D`),
        'Devamsızlık Özeti',
        'Veli Bilgisi',
      ];

      const headForPdf = [pdfFont ? headColumns : headColumns.map((col) => toAsciiTurkish(col))];

      const body = exportStudents.map((st) => {
        const veliInfo = st.veli_adi
          ? `${st.veli_adi}${st.veli_telefon ? ` (${st.veli_telefon})` : ''}`
          : '-';

        return [
          st.sinif,
          st.okul_no,
          st.ogrenci_adi,
          ...lessonHours.map((h) => st.hourly[h] || '-'),
          st.summary,
          veliInfo,
        ];
      });

      const bodyForPdf = pdfFont
        ? body
        : body.map((row) => row.map((cell) => toAsciiTurkish(String(cell))));

      const autoTableFn: any =
        (autoTable as any)?.autoTable ||
        (autoTable as any)?.default?.autoTable ||
        (autoTable as any)?.default ||
        autoTable;

      if (typeof autoTableFn !== 'function') {
        throw new Error('jspdf-autotable is not a function');
      }

      // Sütun stilleri
      const columnStyles: Record<number, any> = {
        0: { cellWidth: 55 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 105 },
      };

      lessonHours.forEach((_, idx) => {
        columnStyles[3 + idx] = { cellWidth: 32, halign: 'center' };
      });

      const summaryColIdx = 3 + lessonHours.length;
      const veliColIdx = summaryColIdx + 1;
      columnStyles[summaryColIdx] = { cellWidth: 'auto' };
      columnStyles[veliColIdx] = { cellWidth: 95 };

      autoTableFn(doc, {
        head: headForPdf,
        body: bodyForPdf,
        startY: 65,
        styles: {
          font: pdfFont || undefined,
          fontSize: 7.5,
          cellPadding: 3.5,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles,
        didParseCell: (cellData: any) => {
          if (cellData.section === 'body') {
            const raw = String(cellData.cell.raw ?? '').toLowerCase();
            if (raw === 'gelmedi') {
              cellData.cell.styles.textColor = [220, 38, 38]; // Kırmızı
              cellData.cell.styles.fontStyle = 'bold';
            } else if (raw === 'geldi') {
              cellData.cell.styles.textColor = [22, 101, 52]; // Yeşil
            } else if (raw === 'izinli') {
              cellData.cell.styles.textColor = [14, 116, 144]; // Mavi
            } else if (raw === 'raporlu') {
              cellData.cell.styles.textColor = [180, 83, 9]; // Kehribar/Turuncu
            } else if (raw === 'geç' || raw === 'gec') {
              cellData.cell.styles.textColor = [100, 116, 139]; // Gri
            }
          }
        },
        margin: { left: 30, right: 30 },
      });

      const safeDate = String(date || '').replace(/\//g, '-');
      doc.save(`${orgName}_Yoklama_${safeDate}.pdf`);
    } catch (e) {
      console.error(e);
      const msg = String((e as any)?.message ?? '');
      const missingLib =
        msg.toLowerCase().includes('failed to resolve module') ||
        msg.toLowerCase().includes('cannot find module');
      showToast(
        'error',
        missingLib
          ? 'PDF için gerekli paketler eksik (jspdf, jspdf-autotable)'
          : 'PDF dışa aktarma başarısız'
      );
    } finally {
      setExporting(false);
    }
  };

  const yesterday = (() => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  const today = getTodayISO();

  const dersler = data?.dersler ?? [];
  const istatistikler = data?.istatistikler ?? { toplam_ders: 0, alinan_yoklama: 0, toplam_devamsiz_ogrenci: 0 };
  const gelmeyenOgrenciler = data?.gelmeyen_ogrenciler ?? [];

  const devamsizOgrenciSayisi = useMemo(() => {
    if (typeof data?.toplam_devamsiz_ogrenci === 'number') {
      return data.toplam_devamsiz_ogrenci;
    }
    if (typeof istatistikler?.toplam_devamsiz_ogrenci === 'number') {
      return istatistikler.toplam_devamsiz_ogrenci;
    }
    const studentKeys = new Set(
      gelmeyenOgrenciler.map(g => (g.student_id ? String(g.student_id) : (g.okul_no ? `${g.sinif_tam_adi}_${g.okul_no}` : g.ogrenci_adi)))
    );
    return studentKeys.size;
  }, [gelmeyenOgrenciler, data?.toplam_devamsiz_ogrenci, istatistikler?.toplam_devamsiz_ogrenci]);


  const toggleSlot = (key: string) => {
    setExpandedSlots((prev) => ({ ...prev, [key]: !prev[key] }));
  };


  if (loading && !data && !needsKademeSelection) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
          <div className="flex-grow-1">
            <h3 className="fw-bold m-0">Yoklama Takibi</h3>
          </div>
        </div>
        <div className="text-center py-5 w-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Yoklama Takibi</h3>
          <p className="text-muted mb-0">
            {isTeacherView
              ? 'Derslerinizde gelmeyen öğrencileri görüntüleyin.'
              : 'Günlük yoklama durumunu takip edin ve raporlayın.'}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="btn-group" role="group">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={exportExcel}
              disabled={exporting !== false || loading || !showTrackingContent}
            >
              <i className="ti ti-file-spreadsheet me-1"></i>
              {exporting === 'excel' ? 'Rapor hazırlanıyor...' : 'Excel'}
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={exportPdf}
              disabled={exporting !== false || loading || !showTrackingContent}
            >
              <i className="ti ti-file-type-pdf me-1"></i>
              {exporting === 'pdf' ? 'Rapor hazırlanıyor...' : 'PDF'}
            </button>
          </div>
        </div>
        <div className="text-end d-none d-md-block ms-3">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
            <li className="breadcrumb-item active fw-medium">Yoklama Takibi</li>
          </ol>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="row g-3 align-items-end"
          >
            {isTrackingWithKademe && campuses.length > 0 && (
              <div className="col-12 col-md-3">
                <label htmlFor="campus" className="form-label fw-semibold">
                  <i className="ti ti-building me-1"></i>Kampüs
                </label>
                <select
                  id="campus"
                  className="form-select"
                  value={selectedCampusId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    saveCampusId(val);
                    saveEducationLevelId(null);
                  }}
                >
                  {campuses.length > 1 && (
                    <option value="">— Kampüs seçin —</option>
                  )}
                  {campuses.map((camp) => (
                    <option key={camp.id} value={camp.id}>
                      {camp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isTrackingWithKademe && educationLevels.length > 0 && (
              <div className="col-12 col-md-3">
                <label htmlFor="kademe" className="form-label fw-semibold">
                  <i className="ti ti-school me-1"></i>Kademe
                </label>
                <select
                  id="kademe"
                  className="form-select"
                  value={selectedEducationLevelId ?? ''}
                  onChange={(e) =>
                    saveEducationLevelId(e.target.value ? Number(e.target.value) : null)
                  }
                  disabled={campuses.length > 1 && !selectedCampusId}
                >
                  <option value="">— Kademe seçin —</option>
                  {filteredEducationLevels.map((lev) => (
                    <option key={lev.id} value={lev.id}>
                      {lev.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isTeacherView ? (
              <div className="col-12">
                <div className="d-flex align-items-center mb-2">
                  <i className="ti ti-calendar text-primary fs-4 me-2"></i>
                  <span className="fs-5">
                    <strong>{data?.gun ?? '-'}</strong>, {formatTarih(date)}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="col-md-3">
                  <label htmlFor="tarih" className="form-label fw-semibold">
                    <i className="ti ti-calendar me-1"></i>Tarih Seçin
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    id="tarih"
                    value={date}
                    onChange={(e) => saveDate(e.target.value)}
                  />
                </div>
                <div className="col-md-8">
                  <div className="d-flex gap-2 flex-wrap align-items-center">
                    <button
                      type="button"
                      className={`btn ${date === yesterday ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => saveDate(yesterday)}
                    >
                      <i className="ti ti-arrow-left me-1"></i>Dün
                    </button>
                    <button
                      type="button"
                      className={`btn ${date === today ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => saveDate(today)}
                    >
                      <i className="ti ti-calendar-check me-1"></i>Bugün
                    </button>
                    <span className="text-muted ms-3">
                      <strong>{data?.gun ?? '-'}</strong>, {formatTarih(date)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {isTrackingWithKademe && levelsLoaded && educationLevels.length === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="ti ti-school-off fs-1 text-muted mb-3 d-block"></i>
            <h5 className="text-dark">Atanmış kademe bulunamadı</h5>
            <p className="text-muted mb-0">Yoklama takibi için size atanmış bir kademe bulunmuyor.</p>
          </div>
        </div>
      )}

      {needsKademeSelection && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="ti ti-school fs-1 text-muted mb-3 d-block"></i>
            <h5 className="text-dark">Yoklama takibi için kademe seçin</h5>
            <p className="text-muted mb-0">
              Birden fazla kademede görevlisiniz. Hangi kademenin yoklama takibini görmek istediğinizi yukarıdaki listeden seçin.
            </p>
          </div>
        </div>
      )}

      {showTrackingContent && (
        <>
          {data?.hafta_sonu ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="ti ti-calendar-off fs-1 text-muted mb-3 d-block"></i>
                <h5 className="text-dark">{data.gun} – Hafta Sonu</h5>
                <p className="text-muted mb-0">Hafta sonları ders programı bulunmamaktadır.</p>
              </div>
            </div>
          ) : (
            <>
              {!isTeacherView && (
                <div className="row g-3 mb-4">
                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <div className="rounded-3 bg-primary bg-opacity-10 p-3 me-3">
                            <i className="ti ti-book fs-4 text-primary"></i>
                          </div>
                          <div>
                            <h4 className="mb-0 fw-bold">{istatistikler.toplam_ders}</h4>
                            <small className="text-muted">Toplam Ders</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <div className="rounded-3 bg-success bg-opacity-10 p-3 me-3">
                            <i className="ti ti-circle-check fs-4 text-success"></i>
                          </div>
                          <div>
                            <h4 className="mb-0 fw-bold">{istatistikler.alinan_yoklama}</h4>
                            <small className="text-muted">Yoklama Alındı</small>
                          </div>
                        </div>
                        {istatistikler.toplam_ders > 0 && (
                          <div className="progress mt-2" style={{ height: 6 }}>
                            <div
                              className="progress-bar bg-success"
                              style={{
                                width: `${Math.round((istatistikler.alinan_yoklama / istatistikler.toplam_ders) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <div className="rounded-3 bg-danger bg-opacity-10 p-3 me-3">
                            <i className="ti ti-clock fs-4 text-danger"></i>
                          </div>
                          <div>
                            <h4 className="mb-0 fw-bold">{istatistikler.toplam_ders - istatistikler.alinan_yoklama}</h4>
                            <small className="text-muted">Bekleyen</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <div className="rounded-3 bg-warning bg-opacity-10 p-3 me-3">
                            <i className="ti ti-user-off fs-4 text-warning"></i>
                          </div>
                          <div>
                            <h4 className="mb-0 fw-bold">{devamsizOgrenciSayisi}</h4>
                            <small className="text-muted">Devamsız</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isTeacherView && (
                <ul className="nav nav-pills nav-card bg-light p-2 rounded-3 mb-4">
                  <li className="nav-item">
                    <button
                      className={`nav-link rounded-3 ${tab === 'ozet' ? 'active' : ''}`}
                      onClick={() => saveTab('ozet')}
                    >
                      <i className="ti ti-layout-grid me-1"></i>Genel Bakış
                    </button>
                  </li>

                  <li className="nav-item">
                    <button
                      className={`nav-link rounded-3 ${tab === 'gelmeyen' ? 'active' : ''}`}
                      onClick={() => saveTab('gelmeyen')}
                    >
                      <i className="ti ti-user-x me-1"></i>Devamsız
                      {devamsizOgrenciSayisi > 0 && (
                        <span className="badge bg-warning text-dark ms-1">{devamsizOgrenciSayisi}</span>
                      )}
                    </button>
                  </li>

                </ul>
              )}

              {!isTeacherView && tab === 'ozet' && (
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-header bg-white border-0 py-3">
                    <h5 className="mb-0 fw-bold">
                      <i className="ti ti-layout-grid me-2 text-primary"></i>Günlük Yoklama Panosu
                    </h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive p-2">
                      <table className="table table-borderless align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: '10px 8px', tableLayout: 'fixed', width: '100%', minWidth: 1100 }}>
                        <thead>
                          <tr>
                            <th style={{ width: 80 }} className="text-muted small text-uppercase fw-bold">Sınıf</th>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                              <th key={s} className="text-muted small text-uppercase fw-bold text-center">{s}. Ders</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const siniflar = Array.from(new Set(dersler.map(d => d.sinif_tam_adi))).sort();
                            const now = new Date();
                            const isToday = date === getTodayISO();

                            return siniflar.map(s => (
                              <tr key={s}>
                                <td className="fw-bold text-center" style={{ fontSize: '0.9rem', color: '#334155' }}>
                                  {s.split(' - ')[0]}
                                </td>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(saat => {
                                  const ders = dersler.find(d => d.sinif_tam_adi === s && d.saat === saat);
                                  if (!ders) return <td key={saat} className="text-center"><div className="rounded-0" style={{ height: 100, border: '1px dashed #e2e8f0', background: '#f8fafc' }}></div></td>;

                                  let bgColor = '#fee2e2'; // Light Red
                                  let textColor = '#991b1b';
                                  let statusText = 'Yoklama Alınmadı';

                                  if (ders.yoklama_alindi) {
                                    bgColor = '#f0fdf4'; // Light Green
                                    textColor = '#166534';
                                    statusText = 'Yoklama Alındı';
                                  } else {
                                    if (!isToday) {
                                      if (date > getTodayISO()) {
                                        bgColor = '#fffbeb'; // Light Orange
                                        textColor = '#92400e';
                                        statusText = 'Ders Bekleniyor';
                                      }
                                    } else {
                                      const [h, m] = (ders.start_time || '00:00').split(':').map(Number);
                                      const sTime = new Date();
                                      sTime.setHours(h, m, 0, 0);
                                      if (now < sTime) {
                                        bgColor = '#fffbeb';
                                        textColor = '#92400e';
                                        statusText = 'Ders Bekleniyor';
                                      }
                                    }
                                  }

                                  const devamsizlar = gelmeyenOgrenciler.filter(g => g.sinif_tam_adi === s && g.ders_saati === saat);
                                  const devamsizListesiStr = devamsizlar.length > 0
                                    ? `Gelmeyenler:\n${devamsizlar.map(g => `• ${g.ogrenci_adi}`).join('\n')}`
                                    : (ders.yoklama_alindi ? 'Tam Katılım' : statusText);

                                  return (
                                    <td key={saat} className="p-0">
                                      <div
                                        className="rounded-0 p-3 shadow-sm transition-all card-hover"
                                        title={devamsizListesiStr}
                                        onClick={() => {
                                          if (devamsizlar.length > 0) {
                                            setDetailModalData({ ders, students: devamsizlar });
                                          }
                                        }}
                                        style={{
                                          backgroundColor: bgColor,
                                          height: 110, // Reduced height since list is moved to tooltip
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '4px',
                                          cursor: devamsizlar.length > 0 ? 'pointer' : 'default'
                                        }}
                                      >
                                        {/* Header: Lesson & Teacher */}
                                        <div className="pb-1 mb-1">
                                          <div className="fw-bold text-truncate" style={{ fontSize: '0.8rem', color: textColor, lineHeight: 1.2 }}>
                                            {toUpperTr(ders.ders_adi)}
                                          </div>
                                          <div className="opacity-80 text-truncate mt-1" style={{ fontSize: '0.7rem', color: textColor, fontWeight: '500' }}>
                                            <i className="ti ti-user me-1" style={{ fontSize: '0.8rem' }}></i>{ders.ogretmen_adi}
                                          </div>
                                        </div>

                                        {/* Body: Summary Status Only */}
                                        <div className="flex-grow-1 overflow-hidden d-flex flex-column justify-content-center">
                                          {ders.yoklama_alindi ? (
                                            <div className="text-center">
                                              {devamsizlar.length > 0 ? (
                                                <div className="fw-bold" style={{ fontSize: '0.75rem', color: textColor }}>
                                                  {devamsizlar.length} Devamsız
                                                </div>
                                              ) : (
                                                <div className="small fw-bold text-uppercase" style={{ fontSize: '0.65rem', color: textColor, opacity: 0.6, letterSpacing: '0.5px' }}>
                                                  Tam Katılım
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="text-center text-uppercase fw-bold" style={{ fontSize: '0.6rem', letterSpacing: '0.5px', color: textColor, opacity: 0.6 }}>
                                              {statusText}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="card-footer bg-white border-0 py-3">
                    <div className="d-flex gap-4 justify-content-center small text-muted">
                      <div className="d-flex align-items-center gap-1">
                        <span className="d-inline-block rounded-1 bg-success" style={{ width: 12, height: 12 }}></span> Yoklama Alındı
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <span className="d-inline-block rounded-1 bg-warning" style={{ width: 12, height: 12 }}></span> Bekliyor
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <span className="d-inline-block rounded-1 bg-danger" style={{ width: 12, height: 12 }}></span> Alınmadı
                      </div>
                    </div>
                  </div>
                </div>
              )}



              {(tab === 'gelmeyen' || isTeacherView) && (
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 py-3">
                    <h5 className="mb-0 fw-bold d-flex align-items-center">
                      <i className="ti ti-user-x text-danger me-2 fs-4"></i>
                      <span>Devamsız Öğrenci Takibi (Tablo Görünümü)</span>
                      <span className="ms-auto badge bg-danger rounded-pill fw-normal" style={{ fontSize: '0.75rem' }}>
                        {devamsizOgrenciSayisi} Toplam
                      </span>
                    </h5>
                  </div>
                  <div className="card-body p-0 pb-3">
                    {devamsizOgrenciSayisi === 0 ? (
                      <div className="text-center py-5 text-muted">
                        <i className="ti ti-mood-smile fs-1 d-block mb-3 opacity-50"></i>
                        <h5 className="fw-bold">Harika!</h5>
                        <p className="mb-0">Tüm öğrenciler katıldı, herhangi bir devamsızlık yok.</p>
                      </div>
                    ) : (() => {
                      const groupedByClass = gelmeyenOgrenciler.reduce((acc, curr) => {
                        if (!acc[curr.sinif_tam_adi]) acc[curr.sinif_tam_adi] = [];
                        acc[curr.sinif_tam_adi].push(curr);
                        return acc;
                      }, {} as Record<string, GelmeyenOgrenci[]>);

                      const sortedClasses = Object.keys(groupedByClass).sort();

                      return (
                        <div className="px-3">
                          {sortedClasses.map((className) => {
                            const studentsInClass = groupedByClass[className];
                            const key = `class-absent-${className}`;
                            const isOpen = expandedSlots[key] === true; // Default to closed

                            // Sınıftaki öğrencileri tekilleştir
                            const groupedByStudent = studentsInClass.reduce((acc, s) => {
                              const stKey = s.student_id ? String(s.student_id) : (s.okul_no ? `${s.sinif_tam_adi}_${s.okul_no}` : s.ogrenci_adi);
                              if (!acc[stKey]) {
                                acc[stKey] = {
                                  student_id: s.student_id,
                                  ogrenci_adi: s.ogrenci_adi,
                                  okul_no: s.okul_no,
                                  veli_adi: s.veli_adi,
                                  veli_telefon: s.veli_telefon,
                                  durumlar: {} as Record<number, string>
                                };
                              }
                              acc[stKey].durumlar[s.ders_saati] = s.durum;
                              return acc;
                            }, {} as Record<string, any>);

                            const classStudents = Object.values(groupedByStudent);

                            // Öğrenci bazında birincil duruma göre adetler (aynı öğrenci 4 derste gelmedi yazıldıysa 1 gelmedi sayılır)
                            const counts = classStudents.reduce((acc, s) => {
                              const durumlar = Object.values(s.durumlar) as string[];
                              const primaryDurum = durumlar.includes('gelmedi')
                                ? 'gelmedi'
                                : durumlar.includes('raporlu')
                                ? 'raporlu'
                                : durumlar.includes('izinli')
                                ? 'izinli'
                                : durumlar.includes('gc')
                                ? 'gc'
                                : durumlar[0] || 'gelmedi';

                              acc[primaryDurum] = (acc[primaryDurum] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);

                            return (
                              <div className="border border-light rounded-2 mb-3 overflow-hidden shadow-sm" key={key}>
                                <div
                                  className="bg-white p-3 d-flex align-items-center justify-content-between cursor-pointer hover-bg-light"
                                  onClick={() => toggleSlot(key)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div>
                                    <span className="fw-bold text-dark fs-6">{className}</span>
                                    <div className="mt-1 d-flex gap-2">
                                      {counts.gelmedi > 0 && <span className="small text-danger fw-bold">{counts.gelmedi} Gelmedi</span>}
                                      {counts.izinli > 0 && <span className="small text-info fw-bold">{counts.izinli} İzinli</span>}
                                      {counts.raporlu > 0 && <span className="small text-warning fw-bold">{counts.raporlu} Raporlu</span>}
                                      {counts.gc > 0 && <span className="small text-secondary fw-bold">{counts.gc} Geç</span>}
                                    </div>
                                  </div>
                                  <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'} text-muted`}></i>
                                </div>

                                {isOpen && (
                                  <div className="bg-white border-top border-light p-0">
                                    <div className="table-responsive">
                                      <table className="table table-bordered align-middle mb-0" style={{ fontSize: '0.8rem', tableLayout: 'fixed' }}>
                                        <thead className="bg-light">
                                          <tr>
                                            <th className="ps-3 py-2" style={{ width: '250px' }}>Öğrenci</th>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                                              <th key={h} className="text-center py-2 px-1" style={{ width: '60px' }}>{h}. Ders</th>
                                            ))}
                                            <th className="pe-3 py-2 text-end" style={{ width: '200px' }}>Veli & İşlem</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {classStudents
                                            .sort((a: any, b: any) => a.ogrenci_adi.localeCompare(b.ogrenci_adi, 'tr-TR'))
                                            .map((s: any, sIdx) => {
                                                return (
                                                  <tr key={sIdx}>
                                                    <td className="ps-3 py-2">
                                                      <div className="fw-bold text-dark">{s.ogrenci_adi}</div>
                                                      <div className="text-muted small">No: {s.okul_no}</div>
                                                    </td>
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(h => {
                                                      const durum = s.durumlar[h];
                                                      if (!durum) return <td key={h} className="bg-light bg-opacity-25"></td>;

                                                      // Kayıp Tespiti
                                                      const allEarlierLessons = (data?.dersler ?? []).filter(dl =>
                                                        dl.sinif_tam_adi === className &&
                                                        dl.saat < h &&
                                                        dl.yoklama_alindi
                                                      );
                                                      const wasAbsentEarlier = allEarlierLessons.some(el =>
                                                        gelmeyenOgrenciler.some(go => go.okul_no === s.okul_no && go.ders_saati === el.saat && go.durum !== 'gc')
                                                      );
                                                      const isEscapee = allEarlierLessons.length > 0 && !wasAbsentEarlier && durum !== 'izinli' && durum !== 'raporlu' && durum !== 'gc';

                                                      const statusLabel = DURUM_ETIKET[durum] || durum;
                                                      let bgColor = 'bg-danger';
                                                      if (durum === 'izinli') bgColor = 'bg-info';
                                                      if (durum === 'raporlu') bgColor = 'bg-warning';
                                                      if (durum === 'gc') bgColor = 'bg-secondary';

                                                      return (
                                                        <td key={h} className={`text-center p-1 ${isEscapee ? 'bg-danger bg-opacity-25' : ''}`} title={isEscapee ? 'Kritik: Kayıp Öğrenci' : ''}>
                                                          <span
                                                            className={`badge ${bgColor} text-uppercase d-block py-1`}
                                                            style={{ fontSize: '0.6rem', letterSpacing: '0.5px' }}
                                                          >
                                                            {isEscapee ? 'KAYIP' : statusLabel}
                                                          </span>
                                                        </td>
                                                      );
                                                    })}
                                                    <td className="pe-3 text-end py-2">
                                                      {s.veli_adi ? (
                                                        <div className="d-flex flex-column align-items-end">
                                                          <span className="fw-bold text-dark small">{s.veli_adi}</span>
                                                          {s.veli_telefon && (
                                                            <a href={`tel:${s.veli_telefon}`} className="text-primary text-decoration-none fw-medium d-block mt-1" style={{ fontSize: '0.7rem' }}>
                                                              <i className="ti ti-phone me-1"></i>{s.veli_telefon}
                                                            </a>
                                                          )}
                                                        </div>
                                                      ) : (
                                                        <span className="text-muted small">-</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}


            </>
          )}
        </>
      )}

      {/* Detaylı Yoklama Modalı */}
      {detailModalData && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-0 pb-0">
                <div className="flex-grow-1">
                  <h5 className="modal-title fw-bold text-primary">{toUpperTr(detailModalData.ders.ders_adi)}</h5>
                  <p className="text-muted small mb-0">{detailModalData.ders.sinif_tam_adi} — {detailModalData.ders.ogretmen_adi}</p>
                </div>
                <button type="button" className="btn-close shadow-none" onClick={() => setDetailModalData(null)} aria-label="Kapat"></button>
              </div>
              <div className="modal-body py-4">
                <div className="mb-3 d-flex align-items-center justify-content-between">
                  <span className="fw-semibold"><i className="ti ti-user-off me-1"></i>Gelmeyen Öğrenciler</span>
                  <span className="badge bg-danger rounded-pill px-2">{detailModalData.students.length} Kişi</span>
                </div>
                <div className="list-group list-group-flush border-top border-bottom" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {/* Header Row */}
                  <div className="list-group list-group-flush border-top border-bottom" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {/* Header Row */}
                    <div className="list-group-item bg-light py-2 border-0 d-none d-md-block">
                      <div className="row g-0 align-items-center opacity-75 fw-bold" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <div className="col-2 text-center">Okul No</div>
                        <div className="col-7">Ad Soyad</div>
                        <div className="col-3 text-end">Durum</div>
                      </div>
                    </div>

                    {detailModalData.students
                      .slice()
                      .sort((a, b) => {
                        const order: Record<string, number> = { gelmedi: 0, izinli: 1, raporlu: 2, gc: 3 };
                        const orderA = order[a.durum] ?? 99;
                        const orderB = order[b.durum] ?? 99;
                        if (orderA !== orderB) return orderA - orderB;
                        return a.ogrenci_adi.localeCompare(b.ogrenci_adi, 'tr-TR');
                      })
                      .map((devamsiz, idx) => (
                        <div key={idx} className="list-group-item px-0 py-2 border-light">
                          <div className="row g-0 align-items-center">
                            <div className="col-2 fw-medium text-muted text-center" style={{ fontSize: '0.8rem' }}>
                              {devamsiz.okul_no}
                            </div>
                            <div className="col-7 fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
                              {devamsiz.ogrenci_adi}
                            </div>
                            <div className="col-3 text-end">
                              {(() => {
                                const statusLabel = DURUM_ETIKET[devamsiz.durum] || devamsiz.durum;
                                let badgeClass = 'bg-danger';
                                if (devamsiz.durum === 'izinli') badgeClass = 'bg-info';
                                if (devamsiz.durum === 'raporlu') badgeClass = 'bg-warning text-dark';
                                if (devamsiz.durum === 'gc') badgeClass = 'bg-secondary';

                                return <span className={`badge ${badgeClass} text-uppercase px-2 py-1 rounded-0 text-center`} style={{ fontSize: '0.6rem', letterSpacing: '0.5px', width: '85px', display: 'inline-block' }}>{statusLabel}</span>;
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-light w-100 fw-bold" onClick={() => setDetailModalData(null)}>Kapat</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceList;
