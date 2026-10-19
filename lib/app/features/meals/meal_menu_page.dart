import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import '../auth/auth_providers.dart';
import '../../core/network/api_client_provider.dart';

class MealMenuPage extends ConsumerStatefulWidget {
  const MealMenuPage({super.key});

  @override
  ConsumerState<MealMenuPage> createState() => _MealMenuPageState();
}

class _MealMenuPageState extends ConsumerState<MealMenuPage> {
  List<Map<String, dynamic>> _menus = [];
  bool _loading = false;
  String _range = 'weekly'; // weekly | monthly

  int _weekOffset = 0;
  DateTime _monthDate = DateTime.now();
  DateTime _selectedDate = DateTime.now();
  String _monthlyViewType = 'calendar'; // 'calendar' | 'list'

  @override
  void initState() {
    super.initState();
    _fetchMenus();
  }

  Future<void> _fetchMenus() async {
    setState(() => _loading = true);
    try {
      final start = _range == 'weekly' ? _weekDates.first : _monthGridDates.first;
      final end = _range == 'weekly' ? _weekDates.last : _monthGridDates.last;
      final startStr = _formatDate(start);
      final endStr = _formatDate(end);

      final api = ref.read(apiClientProvider);
      final session = ref.read(authSessionProvider).valueOrNull;
      final role = session?.role.toLowerCase() ?? '';
      final isPortalUser = role.contains('student') ||
          role.contains('ogrenci') ||
          role.contains('öğrenci') ||
          role.contains('guardian') ||
          role.contains('parent') ||
          role.contains('veli');

      Map<String, dynamic> data = {};
      final params = {
        'menu_date_from': startStr,
        'menu_date_to': endStr,
        'start_date': startStr,
        'end_date': endStr,
        'per_page': '150',
      };

      if (isPortalUser) {
        try {
          debugPrint('MealMenuPage: Portal deneniyor...');
          data = await api.getJson('/portal/student/meal-menus', queryParameters: params);
        } catch (e) {
          debugPrint('MealMenuPage: Portal hatası, standarta geçiliyor: $e');
          data = await api.getJson('/meal-menus', queryParameters: params);
        }
      } else {
        data = await api.getJson('/meal-menus', queryParameters: params);
      }

      debugPrint('MealMenuPage: Ham Veri: $data');
      final menusRaw = _extractList(data, 'menus');
      debugPrint('MealMenuPage: Ayrıştırılmış Menü Sayısı: ${menusRaw.length}');
      
      if (mounted) setState(() => _menus = menusRaw);
    } catch (e) {
      debugPrint('Meal menus error: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> _extractList(dynamic data, String key) {
    if (data == null) return [];
    
    // Eğer veri doğrudan bir liste ise (ApiClient bazen bunu yapar)
    if (data is List) {
      return data.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    }
    
    if (data is Map) {
      // Olası tüm anahtarları kontrol et
      final possibleKeys = [key, 'meal_menus', 'mealMenus', 'items', 'data', 'value', 'menus'];
      for (final k in possibleKeys) {
        if (data[k] is List) {
          return (data[k] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
      
      // Eğer 'data' veya 'value' içinde başka bir Map varsa derinlemesine bak
      if (data['data'] is Map) return _extractList(data['data'], key);
      if (data['value'] is Map) return _extractList(data['value'], key);

      // Eğer Map'in içindeki değerlerden biri List ise onu döndür (fallback)
      for (final val in data.values) {
        if (val is List) {
          return val.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    }
    return [];
  }

  // ==================== Date Helpers ====================
  DateTime get _weekStart {
    final base = DateTime.now();
    final day = base.weekday;
    final monday = DateTime(base.year, base.month, base.day - day + 1);
    return DateTime(monday.year, monday.month, monday.day + (_weekOffset * 7));
  }

  List<DateTime> get _weekDates {
    final start = _weekStart;
    return List.generate(7, (i) => DateTime(start.year, start.month, start.day + i));
  }

  DateTime get _monthStart => DateTime(_monthDate.year, _monthDate.month, 1);
  DateTime get _monthEnd => DateTime(_monthDate.year, _monthDate.month + 1, 0, 23, 59, 59);

  List<DateTime> get _monthGridDates {
    final firstDayOfMonth = _monthStart;
    final day = firstDayOfMonth.weekday; // 1 = Pazartesi ... 7 = Pazar
    final start = DateTime(firstDayOfMonth.year, firstDayOfMonth.month, firstDayOfMonth.day - (day - 1));
    final lastDayOfMonth = _monthEnd;
    final totalDays = lastDayOfMonth.difference(start).inDays + 1;
    final totalCells = ((totalDays + 6) ~/ 7) * 7;
    return List.generate(totalCells, (i) => DateTime(start.year, start.month, start.day + i));
  }

  void _sortDayMenus(List<Map<String, dynamic>> dayMenus) {
    dayMenus.sort((a, b) {
      int score(String t) {
        final lower = t.toLowerCase();
        if (lower.contains('kahvaltı') || lower.contains('breakfast') || lower.contains('kahvalti')) return 1;
        if (lower.contains('öğle') || lower.contains('lunch') || lower.contains('ogle')) return 2;
        if (lower.contains('ikindi') || lower.contains('ara') || lower.contains('snack')) return 3;
        if (lower.contains('akşam') || lower.contains('dinner') || lower.contains('aksam')) return 4;
        return 5;
      }
      return score(a['meal_type']?.toString() ?? '')
          .compareTo(score(b['meal_type']?.toString() ?? ''));
    });
  }

  String _formatDate(DateTime d) {
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  String _formatDateTimeTr(DateTime d) {
    return '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
  }

  String _getMonthName(int month) {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return months[month - 1];
  }

  String _weekdayLabelFromDate(DateTime d) {
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    return days[d.weekday - 1];
  }

  String _mealTypeLabel(String type) {
    final t = type.toLowerCase();
    if (t == 'breakfast' || t == 'kahvaltı') return 'Kahvaltı';
    if (t == 'lunch' || t == 'öğle' || t == 'öğle yemeği') return 'Öğle Yemeği';
    if (t == 'dinner' || t == 'akşam' || t == 'akşam yemeği') return 'Akşam Yemeği';
    if (t == 'snack' || t == 'ikindi' || t == 'ara öğün') return 'İkindi / Ara Öğün';
    return type;
  }

  String _dishIcon(String text) {
    final t = text.toLowerCase();
    if (t.contains('çorba')) return '🍲';
    if (t.contains('salata')) return '🥗';
    if (t.contains('tatlı') || t.contains('pasta') || t.contains('kek') || t.contains('sütlaç') || t.contains('muhallebi') || t.contains('helva') || t.contains('puding')) return '🍰';
    if (t.contains('meyve') || t.contains('elma') || t.contains('portakal') || t.contains('muz') || t.contains('karpuz') || t.contains('kavun')) return '🍎';
    if (t.contains('pilav') || t.contains('makarna') || t.contains('börek') || t.contains('erişte') || t.contains('mantı')) return '🍚';
    if (t.contains('tavuk') || t.contains('köfte') || t.contains('et') || t.contains('balık') || t.contains('kavurma') || t.contains('döner')) return '🍗';
    if (t.contains('yoğurt') || t.contains('ayran') || t.contains('cacık')) return '🥛';
    if (t.contains('yumurta') || t.contains('omlet') || t.contains('menemen')) return '🍳';
    if (t.contains('peynir') || t.contains('zeytin') || t.contains('kaşar')) return '🧀';
    if (t.contains('ekmek') || t.contains('simit') || t.contains('poğaça') || t.contains('tost') || t.contains('sandviç')) return '🥖';
    if (t.contains('çay') || t.contains('kahve') || t.contains('süt') || t.contains('meyve suyu') || t.contains('komposto')) return '☕';
    return '🍽️';
  }

  String _renderMealText(dynamic meal) {
    if (meal is String) return meal;
    if (meal is Map) return meal['name']?.toString() ?? meal['description']?.toString() ?? '-';
    return '-';
  }

  String _normalizeDateKey(String d) {
    if (d.isEmpty) return '';
    // YYYY-MM-DD... formatı
    if (RegExp(r'^\d{4}-\d{2}-\d{2}').hasMatch(d)) {
      return d.substring(0, 10);
    }
    // DD.MM.YYYY... formatı
    if (RegExp(r'^\d{2}\.\d{2}\.\d{4}').hasMatch(d)) {
      final parts = d.split('.');
      return '${parts[2]}-${parts[1]}-${parts[0]}';
    }
    return d;
  }

  Map<String, List<Map<String, dynamic>>> get _menusByDate {
    final map = <String, List<Map<String, dynamic>>>{};
    for (final m in _menus) {
      final key = _normalizeDateKey(m['menu_date']?.toString() ?? '');
      if (key.isEmpty) continue;
      map.putIfAbsent(key, () => []).add(m);
    }
    return map;
  }

  Color _dayAccent(int idx) {
    const colors = [Colors.blue, Colors.indigo, Colors.purple, Colors.teal, Colors.orange, Colors.cyan, Colors.deepPurple];
    return colors[idx % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Yemek Menüsü'),
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Column(
        children: [
          // Header with Title and Mode Toggle
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))
                    ]
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(child: _buildRangeChip('Haftalık', 'weekly')),
                          const SizedBox(width: 8),
                          Expanded(child: _buildRangeChip('Aylık', 'monthly')),
                        ],
                      ),
                      const SizedBox(height: 8),
                      _buildDateNavigation(),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Content
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _range == 'weekly'
                    ? _buildWeeklyView()
                    : _buildMonthlyView(),
          ),
        ],
      ),
    );
  }

  Widget _buildRangeChip(String label, String value) {
    final active = _range == value;
    return GestureDetector(
      onTap: () {
        setState(() => _range = value);
        _fetchMenus();
      },
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: active ? Theme.of(context).colorScheme.primary : Colors.transparent,
          border: Border.all(
            color: active ? Theme.of(context).colorScheme.primary : Colors.grey.shade300,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: active ? Colors.white : Colors.grey.shade700,
          ),
        ),
      ),
    );
  }

  Widget _buildDateNavigation() {
    if (_range == 'weekly') {
      final start = _weekDates.first;
      final end = _weekDates.last;
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left), 
            onPressed: () { setState(() => _weekOffset--); _fetchMenus(); },
            visualDensity: VisualDensity.compact,
          ),
          Text(
            '${_formatDateTimeTr(start)} - ${_formatDateTimeTr(end)}', 
            style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey.shade700, fontSize: 13)
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right), 
            onPressed: () { setState(() => _weekOffset++); _fetchMenus(); },
            visualDensity: VisualDensity.compact,
          ),
          if (_weekOffset != 0) ...[
            const SizedBox(width: 4),
            InkWell(
              onTap: () {
                setState(() => _weekOffset = 0);
                _fetchMenus();
              },
              borderRadius: BorderRadius.circular(6),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Bu Hafta',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blue.shade700),
                ),
              ),
            ),
          ],
        ],
      );
    } else {
      final now = DateTime.now();
      final isCurrentMonth = _monthDate.year == now.year && _monthDate.month == now.month;
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left), 
            onPressed: () { 
              setState(() {
                _monthDate = DateTime(_monthDate.year, _monthDate.month - 1, 1);
                if (_monthDate.year == now.year && _monthDate.month == now.month) {
                  _selectedDate = now;
                } else {
                  _selectedDate = DateTime(_monthDate.year, _monthDate.month, 1);
                }
              }); 
              _fetchMenus(); 
            },
            visualDensity: VisualDensity.compact,
          ),
          Text(
            '${_getMonthName(_monthDate.month)} ${_monthDate.year}', 
            style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey.shade700, fontSize: 13)
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right), 
            onPressed: () { 
              setState(() {
                _monthDate = DateTime(_monthDate.year, _monthDate.month + 1, 1);
                if (_monthDate.year == now.year && _monthDate.month == now.month) {
                  _selectedDate = now;
                } else {
                  _selectedDate = DateTime(_monthDate.year, _monthDate.month, 1);
                }
              }); 
              _fetchMenus(); 
            },
            visualDensity: VisualDensity.compact,
          ),
          if (!isCurrentMonth) ...[
            const SizedBox(width: 4),
            InkWell(
              onTap: () {
                setState(() {
                  _monthDate = DateTime(now.year, now.month, 1);
                  _selectedDate = now;
                });
                _fetchMenus();
              },
              borderRadius: BorderRadius.circular(6),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Bugün',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blue.shade700),
                ),
              ),
            ),
          ],
        ],
      );
    }
  }

  // ==================== Weekly View ====================
  Widget _buildWeeklyView() {
    final menusByDate = _menusByDate;
    final today = _formatDate(DateTime.now());

    return ListView.builder(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _weekDates.length,
      itemBuilder: (ctx, idx) {
        final d = _weekDates[idx];
        final ymd = _formatDate(d);
        final dayMenus = List<Map<String, dynamic>>.from(menusByDate[ymd] ?? []);
        _sortDayMenus(dayMenus);
        final isToday = today == ymd;
        final accent = _dayAccent(idx);
        final menusToShow = dayMenus;

        return Container(
          width: 320,
          margin: const EdgeInsets.only(right: 16, bottom: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isToday ? Colors.blue.shade300 : Colors.grey.shade300,
              width: isToday ? 2 : 1,
            ),
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.white, Colors.blueGrey.shade50.withValues(alpha: 0.3)]
            ),
            boxShadow: isToday
                ? [BoxShadow(color: Colors.blue.withValues(alpha: 0.15), blurRadius: 12, offset: const Offset(0, 4))]
                : [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6, offset: const Offset(0, 2))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B), // Dark slate like web
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _weekdayLabelFromDate(d),
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Colors.white, letterSpacing: 0.2),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _formatDateTimeTr(d),
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.78), fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.16),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.restaurant, color: Colors.white, size: 18),
                    ),
                  ],
                ),
              ),
              // Body
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: menusToShow.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.only(top: 40),
                            child: Column(
                              children: [
                                Icon(Icons.no_meals, size: 48, color: Colors.grey.shade300),
                                const SizedBox(height: 12),
                                Text('Menü yok', style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
                              ],
                            ),
                          ),
                        )
                      : Column(
                          children: menusToShow.map((menu) => _buildMenuSection(menu, accent)).toList(),
                        ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMenuSection(Map<String, dynamic> menu, Color accent) {
    final meals = menu['meals'];
    final mealsList = meals is List ? meals : <dynamic>[];
    final note = menu['notes']?.toString().trim() ?? '';
    final calorie = menu['calorie']?.toString().trim() ?? '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blueGrey.shade50,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.blueGrey.shade100),
                ),
                child: Text(
                  _mealTypeLabel(menu['meal_type']?.toString() ?? 'Öğle Yemeği'),
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Colors.blueGrey.shade800),
                ),
              ),
              if (calorie.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.orange.shade200),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.local_fire_department, size: 13, color: Colors.deepOrange),
                      const SizedBox(width: 3),
                      Text(
                        '$calorie kcal',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11, color: Colors.deepOrange),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          ...mealsList.map((meal) {
            final txt = _renderMealText(meal);
            final icon = _dishIcon(txt);
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.blue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(icon, style: const TextStyle(fontSize: 16)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      txt,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: Color(0xFF0F172A)),
                    ),
                  ),
                ],
              ),
            );
          }),
          if (note.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 2),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 15, color: Colors.amber.shade900),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      note,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF78350F)),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // ==================== Monthly View ====================
  Widget _buildMonthlyView() {
    return _monthlyViewType == 'calendar'
        ? _buildMonthlyCalendarView()
        : _buildMonthlyAgendaView();
  }

  Widget _buildSubViewToggle() {
    final primaryColor = Theme.of(context).colorScheme.primary;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _monthlyViewType = 'calendar'),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: _monthlyViewType == 'calendar' ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _monthlyViewType == 'calendar'
                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 1))]
                      : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.calendar_month,
                      size: 16,
                      color: _monthlyViewType == 'calendar' ? primaryColor : Colors.grey.shade600,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Takvim & Günlük',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: _monthlyViewType == 'calendar' ? FontWeight.w700 : FontWeight.w500,
                        color: _monthlyViewType == 'calendar' ? primaryColor : Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _monthlyViewType = 'list'),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: _monthlyViewType == 'list' ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _monthlyViewType == 'list'
                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 1))]
                      : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.view_agenda_outlined,
                      size: 16,
                      color: _monthlyViewType == 'list' ? primaryColor : Colors.grey.shade600,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Aylık Liste',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: _monthlyViewType == 'list' ? FontWeight.w700 : FontWeight.w500,
                        color: _monthlyViewType == 'list' ? primaryColor : Colors.grey.shade600,
                      ),
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

  Widget _buildMonthlyCalendarView() {
    final menusByDate = _menusByDate;
    final today = _formatDate(DateTime.now());
    final selectedDateStr = _formatDate(_selectedDate);
    final selectedDayMenus = List<Map<String, dynamic>>.from(menusByDate[selectedDateStr] ?? []);
    _sortDayMenus(selectedDayMenus);

    const dayHeaders = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    final gridDates = _monthGridDates;
    final primaryColor = Theme.of(context).colorScheme.primary;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      children: [
        _buildSubViewToggle(),
        const SizedBox(height: 12),

        // Calendar Card
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            children: [
              // Day headers
              Row(
                children: dayHeaders.map((d) {
                  final isWeekend = d == 'Cmt' || d == 'Paz';
                  return Expanded(
                    child: Center(
                      child: Text(
                        d,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                          color: isWeekend ? Colors.red.shade400 : Colors.grey.shade600,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 8),
              // Calendar grid
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  childAspectRatio: 1.08,
                  crossAxisSpacing: 4,
                  mainAxisSpacing: 4,
                ),
                itemCount: gridDates.length,
                itemBuilder: (ctx, idx) {
                  final d = gridDates[idx];
                  final ymd = _formatDate(d);
                  final isCurrentMonth = d.month == _monthDate.month;
                  final isToday = today == ymd;
                  final isSelected = selectedDateStr == ymd;
                  final dayMenus = menusByDate[ymd] ?? [];
                  final hasMenu = dayMenus.isNotEmpty;

                  return InkWell(
                    onTap: () {
                      setState(() {
                        _selectedDate = d;
                        if (d.month != _monthDate.month) {
                          _monthDate = DateTime(d.year, d.month, 1);
                          _fetchMenus();
                        }
                      });
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 160),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? primaryColor
                            : isToday
                                ? primaryColor.withValues(alpha: 0.08)
                                : isCurrentMonth
                                    ? (hasMenu ? Colors.green.shade50.withValues(alpha: 0.5) : Colors.transparent)
                                    : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isSelected
                              ? primaryColor
                              : isToday
                                  ? primaryColor
                                  : Colors.transparent,
                          width: isToday && !isSelected ? 1.5 : 1,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            d.day.toString(),
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isSelected || isToday ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected
                                  ? Colors.white
                                  : isCurrentMonth
                                      ? (isToday ? primaryColor : const Color(0xFF1E293B))
                                      : Colors.grey.shade400,
                            ),
                          ),
                          const SizedBox(height: 2),
                          if (hasMenu)
                            Container(
                              width: 5,
                              height: 5,
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? Colors.white
                                    : const Color(0xFF10B981),
                                shape: BoxShape.circle,
                              ),
                            )
                          else
                            const SizedBox(height: 5),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 8),
              // Legend
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: Color(0xFF10B981),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Menü var',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(width: 16),
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      border: Border.all(color: primaryColor, width: 1.5),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Bugün',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Selected Day Header Card
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.restaurant_menu, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_selectedDate.day} ${_getMonthName(_selectedDate.month)} ${_weekdayLabelFromDate(_selectedDate)}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _formatDateTimeTr(_selectedDate),
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12),
                    ),
                  ],
                ),
              ),
              if (selectedDateStr == today)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.blue,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('Bugün', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                ),
              if (selectedDayMenus.isNotEmpty) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${selectedDayMenus.length} Öğün',
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Selected Day Meals
        if (selectedDayMenus.isEmpty)
          Container(
            padding: const EdgeInsets.all(28),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                Icon(Icons.no_meals_outlined, size: 44, color: Colors.grey.shade400),
                const SizedBox(height: 10),
                Text(
                  'Bu tarih için yemek menüsü bulunmamaktadır',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 13.5, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Text(
                  'Yeşil noktalı günleri seçerek menüleri görebilirsiniz.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                ),
              ],
            ),
          )
        else
          ...selectedDayMenus.map((menu) => _buildMenuSection(menu, primaryColor)),

        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildMonthlyAgendaView() {
    final menusByDate = _menusByDate;
    final today = _formatDate(DateTime.now());
    final primaryColor = Theme.of(context).colorScheme.primary;

    final daysInMonth = <DateTime>[];
    final lastDay = DateTime(_monthDate.year, _monthDate.month + 1, 0).day;
    for (int day = 1; day <= lastDay; day++) {
      daysInMonth.add(DateTime(_monthDate.year, _monthDate.month, day));
    }

    final daysWithMenus = daysInMonth.where((d) {
      final ymd = _formatDate(d);
      return (menusByDate[ymd] ?? []).isNotEmpty;
    }).toList();

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      children: [
        _buildSubViewToggle(),
        const SizedBox(height: 12),
        if (daysWithMenus.isEmpty)
          Container(
            padding: const EdgeInsets.all(36),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                Icon(Icons.restaurant_outlined, size: 52, color: Colors.grey.shade400),
                const SizedBox(height: 12),
                Text(
                  '${_getMonthName(_monthDate.month)} ${_monthDate.year} için kayıtlı menü bulunamadı',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 15, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Text(
                  'Farklı bir ay seçebilir veya haftalık görünümü inceleyebilirsiniz.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                ),
              ],
            ),
          )
        else
          ...daysWithMenus.map((d) {
            final ymd = _formatDate(d);
            final dayMenus = List<Map<String, dynamic>>.from(menusByDate[ymd] ?? []);
            _sortDayMenus(dayMenus);
            final isToday = today == ymd;

            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isToday ? primaryColor : Colors.grey.shade200,
                  width: isToday ? 1.5 : 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  )
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Day header
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isToday ? const Color(0xFF1E293B) : Colors.grey.shade100,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(
                              '${d.day} ${_getMonthName(d.month)} ${_weekdayLabelFromDate(d)}',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                                color: isToday ? Colors.white : const Color(0xFF1E293B),
                              ),
                            ),
                            if (isToday) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.blue,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text('Bugün', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ],
                        ),
                        Text(
                          '${dayMenus.length} Öğün',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isToday ? Colors.white70 : Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Day Meals
                  Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      children: dayMenus.map((menu) => _buildMenuSection(menu, primaryColor)).toList(),
                    ),
                  ),
                ],
              ),
            );
          }),
        const SizedBox(height: 24),
      ],
    );
  }
}
