import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../auth/auth_providers.dart';
import '../campuses/campuses_providers.dart';
import '../education_levels/education_levels_providers.dart';
import '../profile/profile_providers.dart';
import 'attendances_providers.dart';

// Rol sabitleri - Web sitesi ile aynı
const teacherOnlyRoles = [
  'Öğretmen',
  'Sınıf Öğretmeni',
  'Rehberlik',
  'teacher',
  'guidance',
];
const trackingRolesWithKademe = [
  'owner',
  'kurucu',
  'Kurucu',
  'admin',
  'Admin',
  'superadmin',
  'Superadmin',
  'Genel Müdür',
  'Kampüs Müdürü',
  'Müdür',
  'müdür',
  'Mudur',
  'mudur',
  'Müdür Yardımcısı',
  'Öğrenci İşleri',
  'ogrenci_isleri',
  'student_affairs',
];

final attendancesDailyProvider =
    FutureProvider.family<
      Map<String, dynamic>,
      ({String date, int? educationLevelId})
    >((ref, params) async {
      final repo = ref.read(attendancesRepositoryProvider);
      return repo.daily(
        date: params.date,
        educationLevelId: params.educationLevelId,
      );
    });

class AttendancesDailyPage extends ConsumerStatefulWidget {
  const AttendancesDailyPage({super.key});

  @override
  ConsumerState<AttendancesDailyPage> createState() =>
      _AttendancesDailyPageState();
}

class _AttendancesDailyPageState extends ConsumerState<AttendancesDailyPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _date = '';
  int? _selectedCampusId;
  int? _selectedEducationLevelId;
  bool _levelsLoaded = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _date = _today();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String _today() {
    final now = DateTime.now();
    return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  String _dayNameFromDate(String isoDate) {
    final d = DateTime.tryParse('${isoDate}T12:00:00');
    if (d == null) return '';
    const days = [
      'Pazartesi',
      'Salı',
      'Çarşamba',
      'Perşembe',
      'Cuma',
      'Cumartesi',
      'Pazar',
    ];
    // weekday is 1-7 (Mon-Sun), so subtract 1 for index
    return days[d.weekday - 1];
  }

  bool _isTeacherView(String? role) {
    if (role == null) return false;
    return teacherOnlyRoles.any((r) => r.toLowerCase() == role.toLowerCase());
  }

  bool _isTrackingWithKademe(String? role) {
    if (role == null) return false;
    return trackingRolesWithKademe.any(
      (r) => r.toLowerCase().trim() == role.toLowerCase().trim(),
    );
  }

  String _formatTarih(String t) {
    try {
      final dt = DateTime.parse('${t}T12:00:00');
      return '${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')}.${dt.year}';
    } catch (_) {
      return t;
    }
  }

  String _durumEtiket(String durum) {
    switch (durum.toLowerCase()) {
      case 'gelmedi':
        return 'Gelmedi';
      case 'izinli':
        return 'İzinli';
      case 'raporlu':
        return 'Raporlu';
      case 'gc':
      case 'gec':
        return 'Geç Geldi';
      case 'geldi':
        return 'Geldi';
      default:
        return durum;
    }
  }

  Color _durumRenk(String durum) {
    switch (durum.toLowerCase()) {
      case 'gelmedi':
        return Colors.red;
      case 'izinli':
        return Colors.orange;
      case 'raporlu':
        return Colors.purple;
      case 'gc':
      case 'gec':
        return Colors.amber;
      case 'geldi':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role;
    final isTeacherView = _isTeacherView(userRole);
    final isTrackingWithKademe = _isTrackingWithKademe(userRole);

    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final campusesAsync = ref.watch(campusesListProvider);
    final educationLevelsAsync = ref.watch(educationLevelsListProvider);

    // Eğitim seviyelerini yükle
    educationLevelsAsync.when(
      data: (levels) {
        if (!_levelsLoaded && levels.isNotEmpty) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            setState(() {
              _levelsLoaded = true;
              if (_selectedEducationLevelId == null && levels.length == 1) {
                _selectedEducationLevelId = levels.first['id'] as int?;
              }
            });
          });
        }
      },
      loading: () {},
      error: (_, _) {},
    );

    final campuses =
        campusesAsync.valueOrNull ?? const <Map<String, dynamic>>[];

    List<Map<String, dynamic>> asLevelList(
      AsyncValue<List<Map<String, dynamic>>> a,
    ) {
      return a.valueOrNull ?? const [];
    }

    final allLevels = asLevelList(educationLevelsAsync);

    // Kampüse göre kademe filtreleme (senkron)
    // Seviyenin campus_id'si null ise (tüm kampüsler için) veya seçili kampüsle eşleşiyorsa al
    final filteredLevels = () {
      if (_selectedCampusId == null || _selectedCampusId == 0) {
        return allLevels;
      }
      final matching = allLevels.where((l) {
        final cId = l['campus_id'];
        return cId == null || cId == 0 || cId.toString() == '$_selectedCampusId';
      }).toList();
      return matching.isNotEmpty ? matching : allLevels;
    }();

    // Filtrelenen seviyelerden tek seçenek varsa otomatik seç
    if (_selectedEducationLevelId == null && filteredLevels.length == 1) {
      final onlyId = filteredLevels.first['id'] as int?;
      if (onlyId != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _selectedEducationLevelId == null) {
            setState(() {
              _selectedEducationLevelId = onlyId;
            });
          }
        });
      }
    }

    // Öğretmen görünümünde tarih her zaman bugün
    final effectiveDate = isTeacherView ? _today() : _date;
    final canFetch =
        isTeacherView ||
        !isTrackingWithKademe ||
        _selectedEducationLevelId != null;
    final needsKademeSelection =
        isTrackingWithKademe &&
        _levelsLoaded &&
        _selectedEducationLevelId == null;

    final dailyAsync = canFetch
        ? ref.watch(
            attendancesDailyProvider((
              date: effectiveDate,
              educationLevelId: _selectedEducationLevelId,
            )),
          )
        : const AsyncValue<Map<String, dynamic>>.data({});

    return Scaffold(
      appBar: AppBar(
        title: const Text('Yoklama'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Özet', icon: Icon(Icons.dashboard)),
            Tab(text: 'Gelmeyen', icon: Icon(Icons.person_off)),
          ],
        ),
        actions: [
          if (!isTeacherView)
            IconButton(
              onPressed: () => context.push('/attendances/stats'),
              icon: const Icon(Icons.bar_chart),
            ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Column(
        children: [
          // Filtreler
          if (!isTeacherView) ...[
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Tarih seçici (Öğretmen hariç)
                  InkWell(
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: DateTime.tryParse(_date) ?? DateTime.now(),
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (date != null) {
                        setState(() {
                          _date =
                              '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                        });
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today, size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _formatTarih(_date),
                              style: const TextStyle(fontSize: 16),
                            ),
                          ),
                          const Icon(Icons.arrow_drop_down),
                        ],
                      ),
                    ),
                  ),
                  // Kademe seçimi (Kademe gerektiren roller için)
                  if (isTrackingWithKademe) ...[
                    const SizedBox(height: 12),
                    // Kampüs (web ile aynı)
                    campusesAsync.when(
                      data: (campusList) {
                        if (campusList.isEmpty) return const SizedBox.shrink();
                        final normalized = campusList
                            .map(
                              (c) => {
                                'id': int.tryParse(c['id']?.toString() ?? ''),
                                'name': c['name']?.toString() ?? '',
                              },
                            )
                            .where((c) => (c['id'] as int?) != null)
                            .toList();
                        if (normalized.length <= 1) {
                          // Tek kampüs varsa dropdown gösterme, auto-select.
                          final onlyId = normalized.first['id'] as int?;
                          if (onlyId != null && _selectedCampusId == null) {
                            WidgetsBinding.instance.addPostFrameCallback((_) {
                              setState(() {
                                _selectedCampusId = onlyId;
                              });
                            });
                          }
                          return const SizedBox.shrink();
                        }

                        return DropdownButtonFormField<int>(
                          initialValue: _selectedCampusId,
                          decoration: InputDecoration(
                            labelText: 'Kampüs',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                            ),
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: null,
                              child: Text('— Kampüs seçin —'),
                            ),
                            ...normalized.map((c) {
                              return DropdownMenuItem(
                                value: c['id'] as int?,
                                child: Text(c['name']?.toString() ?? ''),
                              );
                            }),
                          ],
                          onChanged: (val) {
                            setState(() {
                              _selectedCampusId = val;
                              _selectedEducationLevelId = null;
                            });
                          },
                        );
                      },
                      loading: () => const LinearProgressIndicator(),
                      error: (_, _) => const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 12),
                    Builder(
                      builder: (context) {
                        if (educationLevelsAsync.isLoading) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8.0),
                            child: LinearProgressIndicator(),
                          );
                        }

                        final campusSelectionRequired =
                            (campuses.length > 1) && _selectedCampusId == null;
                        final list = filteredLevels;

                        if (campusSelectionRequired) {
                          return DropdownButtonFormField<int>(
                            key: ValueKey(_selectedEducationLevelId),
                            initialValue: _selectedEducationLevelId,
                            decoration: InputDecoration(
                              labelText: 'Eğitim Seviyesi *',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: null,
                                child: Text('Önce kampüs seçin'),
                              ),
                            ],
                            onChanged: null,
                          );
                        }
                        if (list.isEmpty) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8.0),
                            child: Text(
                              'Eğitim seviyesi bulunamadı',
                              style: TextStyle(color: Colors.red),
                            ),
                          );
                        }

                        final currentVal = list.any((l) => l['id'] == _selectedEducationLevelId)
                            ? _selectedEducationLevelId
                            : null;

                        return DropdownButtonFormField<int>(
                          key: ValueKey(currentVal),
                          initialValue: currentVal,
                          decoration: InputDecoration(
                            labelText: 'Eğitim Seviyesi *',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                            ),
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: null,
                              child: Text('Seçiniz'),
                            ),
                            ...list.map((l) {
                              final name = l['name']?.toString() ?? '';
                              final campusName = l['campus_name']?.toString();
                              final displayName = campusName != null
                                  ? '$name ($campusName)'
                                  : name;
                              return DropdownMenuItem(
                                value: l['id'] as int?,
                                child: Text(displayName),
                              );
                            }),
                          ],
                          onChanged: (val) {
                            setState(() {
                              _selectedEducationLevelId = val;
                            });
                          },
                        );
                      },
                    ),
                  ],
                  const SizedBox(height: 12),
                  // Dün / Bugün butonları (web ile aynı)
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            final dt =
                                DateTime.tryParse(_date) ?? DateTime.now();
                            final d = dt.subtract(const Duration(days: 1));
                            setState(() {
                              _date =
                                  '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
                            });
                          },
                          icon: const Icon(Icons.arrow_back),
                          label: const Text('Dün'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            setState(() {
                              _date = _today();
                            });
                          },
                          icon: const Icon(Icons.today),
                          label: const Text('Bugün'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ] else ...[
            // Öğretmen görünümü - sadece tarih göster
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.today, color: Colors.blue),
                    const SizedBox(width: 12),
                    Text(
                      '${_dayNameFromDate(_today())} • ${_formatTarih(_today())}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          // Kademe seçimi gerekli uyarısı
          if (needsKademeSelection) ...[
            const Padding(
              padding: EdgeInsets.all(16),
              child: Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Icon(Icons.info_outline, size: 48, color: Colors.orange),
                      SizedBox(height: 12),
                      Text(
                        'Lütfen bir eğitim seviyesi seçin',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
          // İçerik
          Expanded(
            child: dailyAsync.when(
              data: (data) {
                final haftaSonu = data['hafta_sonu'] == true;
                final kademeSecimiGerekli =
                    data['kademe_secimi_gerekli'] == true;

                final dersler = data['dersler'] is List
                    ? data['dersler'] as List
                    : <dynamic>[];
                final gelmeyenOgrenciler = data['gelmeyen_ogrenciler'] is List
                    ? data['gelmeyen_ogrenciler'] as List
                    : <dynamic>[];
                final istatistikler = data['istatistikler'] is Map
                    ? data['istatistikler'] as Map<String, dynamic>
                    : <String, dynamic>{};

                if (kademeSecimiGerekli) {
                  return const Center(
                    child: Text('Lütfen bir eğitim seviyesi seçin'),
                  );
                }

                return TabBarView(
                  controller: _tabController,
                  children: [
                    // Özet Sekmesi - Dersler
                    RefreshIndicator(
                      onRefresh: () async {
                        ref.invalidate(attendancesDailyProvider);
                      },
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          // Hafta sonu etiketi (gerekirse)
                          if (haftaSonu)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.orange.shade100,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Text(
                                      'Hafta Sonu',
                                      style: TextStyle(color: Colors.orange),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          // İstatistikler (öğretmen için gizli)
                          if (!isTeacherView && istatistikler.isNotEmpty) ...[
                            AppCard(
                              child: Row(
                                children: [
                                  Expanded(
                                    child: _statBox(
                                      'Toplam Ders',
                                      (istatistikler['toplam_ders'] ?? 0)
                                          .toString(),
                                      Colors.blue,
                                    ),
                                  ),
                                  Expanded(
                                    child: _statBox(
                                      'Alınan Yoklama',
                                      (istatistikler['alinan_yoklama'] ?? 0)
                                          .toString(),
                                      Colors.green,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],
                          // Dersler listesi
                          if (dersler.isEmpty)
                            const Center(
                              child: Padding(
                                padding: EdgeInsets.all(32),
                                child: Text(
                                  'Bugün için ders bulunamadı',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ),
                            )
                          else
                            ...dersler.map((ders) {
                              final d = ders is Map
                                  ? ders
                                  : <String, dynamic>{};
                              final scheduleId = int.tryParse(
                                d['schedule_id']?.toString() ?? '',
                              );
                              final dersAdi = (d['ders_adi'] ?? '').toString();
                              final sinifTamAdi = (d['sinif_tam_adi'] ?? '')
                                  .toString();
                              // final sinifMevcudu = d['sinif_mevcudu'] ?? 0; // Gelecekte kullanılabilir
                              final ogretmenAdi = (d['ogretmen_adi'] ?? '')
                                  .toString();
                              final yoklamaAlindi = d['yoklama_alindi'] == true;
                              final ozet = d['yoklama_ozet'] is Map
                                  ? d['yoklama_ozet'] as Map<String, dynamic>
                                  : <String, dynamic>{};

                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: AppCard(
                                  child: InkWell(
                                    onTap: scheduleId != null
                                        ? () async {
                                            if (isTeacherView) {
                                              final res = await context.push(
                                                '/attendances/take/$scheduleId?date=$effectiveDate',
                                              );
                                              if (res == true || mounted) {
                                                ref.invalidate(attendancesDailyProvider);
                                              }
                                            } else {
                                              List<dynamic> gelmeyenler =
                                                  (d['gelmeyenler'] as List?) ??
                                                  (d['yoklama_detay']?['gelmeyenler'] as List?) ??
                                                  [];
                                              if (gelmeyenler.isEmpty && gelmeyenOgrenciler.isNotEmpty) {
                                                gelmeyenler = gelmeyenOgrenciler
                                                    .where((g) => g is Map && (g['schedule_id'] == scheduleId || g['schedule_id'] == d['schedule_id']))
                                                    .toList();
                                              }
                                              _showAttendanceDetail(
                                                context,
                                                ders: dersAdi,
                                                classroom: sinifTamAdi,
                                                teacher: ogretmenAdi,
                                                ozet: ozet,
                                                gelmeyenler: gelmeyenler,
                                              );
                                            }
                                          }
                                        : null,
                                    borderRadius: BorderRadius.circular(12),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                sinifTamAdi.isEmpty
                                                    ? 'Sınıf'
                                                    : sinifTamAdi,
                                                style: const TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                            ),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 8,
                                                    vertical: 4,
                                                  ),
                                              decoration: BoxDecoration(
                                                color: yoklamaAlindi
                                                    ? Colors.green.shade100
                                                    : Colors.orange.shade100,
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                              ),
                                              child: Text(
                                                yoklamaAlindi
                                                    ? 'Alındı'
                                                    : 'Bekliyor',
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  color: yoklamaAlindi
                                                      ? Colors.green
                                                      : Colors.orange,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          dersAdi.isEmpty ? '' : dersAdi,
                                          style: const TextStyle(
                                            color: Colors.grey,
                                          ),
                                        ),
                                        if (ogretmenAdi.isNotEmpty) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            'Öğretmen: $ogretmenAdi',
                                            style: const TextStyle(
                                              color: Colors.grey,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                        // Yoklama özeti
                                        if (yoklamaAlindi &&
                                            ozet.isNotEmpty) ...[
                                          const SizedBox(height: 12),
                                          const Divider(height: 1),
                                          const SizedBox(height: 12),
                                          Row(
                                            children: [
                                              _ozetBadge(
                                                'Geldi',
                                                ozet['geldi_sayisi'] ?? 0,
                                                Colors.green,
                                              ),
                                              _ozetBadge(
                                                'Gelmedi',
                                                ozet['gelmedi_sayisi'] ?? 0,
                                                Colors.red,
                                              ),
                                              _ozetBadge(
                                                'İzinli',
                                                ozet['izinli_sayisi'] ?? 0,
                                                Colors.orange,
                                              ),
                                              _ozetBadge(
                                                'Raporlu',
                                                ozet['raporlu_sayisi'] ?? 0,
                                                Colors.purple,
                                              ),
                                              _ozetBadge(
                                                'Geç',
                                                ozet['gec_sayisi'] ?? 0,
                                                Colors.amber,
                                              ),
                                            ],
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }),
                        ],
                      ),
                    ),
                    // Gelmeyen Öğrenciler Sekmesi
                    RefreshIndicator(
                      onRefresh: () async {
                        ref.invalidate(attendancesDailyProvider);
                      },
                      child: gelmeyenOgrenciler.isEmpty
                          ? const Center(
                              child: Text(
                                'Bugün gelmeyen öğrenci yok',
                                style: TextStyle(color: Colors.grey),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: gelmeyenOgrenciler.length,
                              itemBuilder: (context, index) {
                                final o = gelmeyenOgrenciler[index] is Map
                                    ? gelmeyenOgrenciler[index]
                                          as Map<String, dynamic>
                                    : <String, dynamic>{};
                                final ogrenciAdi = (o['ogrenci_adi'] ?? '')
                                    .toString();
                                final okulNo = (o['okul_no'] ?? '').toString();
                                final sinifTamAdi = (o['sinif_tam_adi'] ?? '')
                                    .toString();
                                final dersAdi = (o['ders_adi'] ?? '')
                                    .toString();
                                final dersSaati = o['ders_saati'] ?? 0;
                                final durum = (o['durum'] ?? '').toString();
                                final veliAdi = o['veli_adi']?.toString();
                                final veliTelefon = o['veli_telefon']
                                    ?.toString();

                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: AppCard(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                ogrenciAdi.isEmpty
                                                    ? 'Öğrenci'
                                                    : ogrenciAdi,
                                                style: const TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                            ),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 8,
                                                    vertical: 4,
                                                  ),
                                              decoration: BoxDecoration(
                                                color: _durumRenk(
                                                  durum,
                                                ).withValues(alpha: 0.1),
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                              ),
                                              child: Text(
                                                _durumEtiket(durum),
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  color: _durumRenk(durum),
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        if (okulNo.isNotEmpty)
                                          Text(
                                            'Okul No: $okulNo',
                                            style: const TextStyle(
                                              color: Colors.grey,
                                            ),
                                          ),
                                        Text(
                                          sinifTamAdi,
                                          style: const TextStyle(
                                            color: Colors.grey,
                                          ),
                                        ),
                                        Text(
                                          '$dersAdi • $dersSaati. Saat',
                                          style: const TextStyle(
                                            color: Colors.grey,
                                          ),
                                        ),
                                        if (veliAdi != null &&
                                            veliAdi.isNotEmpty) ...[
                                          const SizedBox(height: 8),
                                          const Divider(height: 1),
                                          const SizedBox(height: 8),
                                          Row(
                                            children: [
                                              const Icon(
                                                Icons.person_outline,
                                                size: 16,
                                                color: Colors.grey,
                                              ),
                                              const SizedBox(width: 6),
                                              Expanded(
                                                child: Text(
                                                  'Veli: $veliAdi',
                                                  style: const TextStyle(
                                                    fontSize: 13,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                        if (veliTelefon != null &&
                                            veliTelefon.isNotEmpty) ...[
                                          const SizedBox(height: 4),
                                          Row(
                                            children: [
                                              const Icon(
                                                Icons.phone,
                                                size: 16,
                                                color: Colors.grey,
                                              ),
                                              const SizedBox(width: 6),
                                              Text(
                                                veliTelefon,
                                                style: const TextStyle(
                                                  fontSize: 13,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 48,
                      color: Colors.red,
                    ),
                    const SizedBox(height: 16),
                    Text('Hata: $e'),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => ref.invalidate(attendancesDailyProvider),
                      child: const Text('Yeniden Dene'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statBox(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: color.withValues(alpha: 0.8)),
          ),
        ],
      ),
    );
  }

  Widget _ozetBadge(String label, int count, Color color) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.only(right: 4),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Column(
          children: [
            Text(
              count.toString(),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: color.withValues(alpha: 0.8),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAttendanceDetail(
    BuildContext context, {
    required String ders,
    required String classroom,
    required String teacher,
    required Map<String, dynamic> ozet,
    required List<dynamic> gelmeyenler,
  }) {
    final int geldi = (ozet['geldi_sayisi'] ?? ozet['mevcut'] ?? ozet['geldi'] ?? 0) as int;
    final int gelmedi = (ozet['gelmedi_sayisi'] ?? ozet['gelmeyen'] ?? ozet['gelmedi'] ?? 0) as int;
    final int izinli = (ozet['izinli_sayisi'] ?? ozet['izinli'] ?? 0) as int;
    final int raporlu = (ozet['raporlu_sayisi'] ?? ozet['raporlu'] ?? 0) as int;
    final int gec = (ozet['gec_sayisi'] ?? ozet['gec'] ?? 0) as int;
    final int toplam = (ozet['toplam'] ?? (geldi + gelmedi + izinli + raporlu + gec)) as int;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('$ders - $classroom'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Öğretmen: $teacher'),
              const Divider(height: 24),
              // Özet
              Row(
                children: [
                  _ozetBadge('Geldi', geldi, Colors.green),
                  _ozetBadge('Gelmedi', gelmedi, Colors.red),
                  _ozetBadge('İzinli', izinli, Colors.orange),
                  if (raporlu > 0) _ozetBadge('Raporlu', raporlu, Colors.purple),
                  if (gec > 0) _ozetBadge('Geç', gec, Colors.amber.shade800),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Toplam: $toplam öğrenci',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const Divider(height: 24),
              // Gelmeyenler listesi
              if (gelmeyenler.isNotEmpty) ...[
                const Text(
                  'Gelmeyen / İzinli Öğrenciler:',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 8),
                ...gelmeyenler.map((g) {
                  final ad = (g['ogrenci_adi'] ?? g['student_name'] ?? 'Öğrenci').toString();
                  final okulNo = (g['okul_no'] ?? g['school_no'] ?? '').toString();
                  final durumRaw = (g['durum'] ?? g['status'] ?? '').toString().toLowerCase();
                  final veliAdi = (g['veli_adi'] ?? g['parent_name'] ?? '').toString();
                  final veliTelefon = (g['veli_telefon'] ?? g['parent_phone'] ?? '').toString();

                  String durumLabel = 'Gelmedi';
                  Color durumColor = Colors.red;
                  IconData durumIcon = Icons.cancel;

                  if (durumRaw == 'izinli' || durumRaw == 'excused') {
                    durumLabel = 'İzinli';
                    durumColor = Colors.orange;
                    durumIcon = Icons.medical_services;
                  } else if (durumRaw == 'raporlu' || durumRaw == 'sick') {
                    durumLabel = 'Raporlu';
                    durumColor = Colors.purple;
                    durumIcon = Icons.local_hospital;
                  } else if (durumRaw == 'gec' || durumRaw == 'late') {
                    durumLabel = 'Geç Kaldı';
                    durumColor = Colors.amber.shade800;
                    durumIcon = Icons.access_time;
                  }

                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: durumColor.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: durumColor.withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(durumIcon, size: 16, color: durumColor),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                ad,
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: durumColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                durumLabel,
                                style: TextStyle(color: durumColor, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        if (okulNo.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Padding(
                            padding: const EdgeInsets.only(left: 24),
                            child: Text(
                              'Okul No: $okulNo',
                              style: const TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                          ),
                        ],
                        if (veliAdi.isNotEmpty || veliTelefon.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Padding(
                            padding: const EdgeInsets.only(left: 24),
                            child: Text(
                              'Veli: ${veliAdi.isNotEmpty ? veliAdi : ''}${veliTelefon.isNotEmpty ? ' ($veliTelefon)' : ''}',
                              style: const TextStyle(fontSize: 11, color: Colors.black54),
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                }),
              ] else if (gelmedi == 0 && izinli == 0 && raporlu == 0) ...[
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      'Tüm öğrenciler mevcut ✓',
                      style: TextStyle(color: Colors.green, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ] else ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Detaylı öğrenci listesi bulunamadı',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Kapat'),
          ),
        ],
      ),
    );
  }
}
