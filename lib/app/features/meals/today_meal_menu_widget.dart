import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client_provider.dart';
import '../auth/auth_providers.dart';

/// Reusable widget that displays today's meal menu on any dashboard.
///
/// Supports multiple meal types (breakfast / lunch / dinner / snack)
/// with animated tab switching.
///
/// When [menus] is empty/null AND [legacyMenu] is null, auto-fetches
/// from the backend API (/meal-menus?menu_date_from=today&published_only=1).
/// If still no menu data after fetch, the widget disappears (SizedBox.shrink).
///
/// Usage (data already fetched – multiple menus):
///   TodayMealMenuWidget(menus: data['today_menus'])
///
/// Usage (legacy single menu):
///   TodayMealMenuWidget(legacyMenu: data['today_menu'])
///
/// Usage (auto-fetch, e.g. teacher/admin dashboards):
///   const TodayMealMenuWidget()
class TodayMealMenuWidget extends ConsumerStatefulWidget {
  final List<dynamic>? menus;
  final Map<String, dynamic>? legacyMenu;
  final String menuRoute;

  const TodayMealMenuWidget({
    super.key,
    this.menus,
    this.legacyMenu,
    this.menuRoute = '/meal-menus',
  });

  @override
  ConsumerState<TodayMealMenuWidget> createState() =>
      _TodayMealMenuWidgetState();
}

class _TodayMealMenuWidgetState extends ConsumerState<TodayMealMenuWidget> {
  int _selectedIndex = 0;
  List<Map<String, dynamic>> _fetchedMenus = [];
  bool _fetching = false;

  // ── Meal type config ────────────────────────────────────────────────────────
  static const _mealTypeConfig = {
    'breakfast': _MealTypeCfg(
      label: 'Kahvaltı',
      icon: Icons.coffee_outlined,
      color: Color(0xFFD97706),
      bgColor: Color(0xFFFFFBEB),
    ),
    'lunch': _MealTypeCfg(
      label: 'Öğle',
      icon: Icons.lunch_dining_outlined,
      color: Color(0xFF059669),
      bgColor: Color(0xFFECFDF5),
    ),
    'dinner': _MealTypeCfg(
      label: 'Akşam',
      icon: Icons.dinner_dining_outlined,
      color: Color(0xFF4F46E5),
      bgColor: Color(0xFFEEF2FF),
    ),
    'snack': _MealTypeCfg(
      label: 'Ara Öğün',
      icon: Icons.apple_outlined,
      color: Color(0xFFEA580C),
      bgColor: Color(0xFFFFF7ED),
    ),
  };

  _MealTypeCfg _configFor(String type) =>
      _mealTypeConfig[type.toLowerCase()] ??
      const _MealTypeCfg(
        label: 'Menü',
        icon: Icons.restaurant_outlined,
        color: Color(0xFF059669),
        bgColor: Color(0xFFECFDF5),
      );

  // ── Auto-fetch logic ─────────────────────────────────────────────────────────
  bool get _needsFetch => widget.menus == null && widget.legacyMenu == null;

  @override
  void initState() {
    super.initState();
    if (_needsFetch) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _autoFetch());
    }
  }

  Future<void> _autoFetch() async {
    if (!mounted || _fetching) return;
    setState(() => _fetching = true);
    try {
      final api = ref.read(apiClientProvider);
      final today = _todayString();
      final session = ref.read(authSessionProvider).valueOrNull;
      final role = session?.role.toLowerCase() ?? '';
      final isPortal = role.contains('student') ||
          role.contains('ogrenci') ||
          role.contains('öğrenci') ||
          role.contains('guardian') ||
          role.contains('parent') ||
          role.contains('veli');

      dynamic data;
      if (isPortal) {
        try {
          data = await api.getJson('/portal/student/meal-menus', queryParameters: {
            'start_date': today,
            'end_date': today,
            'menu_date_from': today,
            'menu_date_to': today,
          });
        } catch (_) {
          data = await api.getJson('/meal-menus', queryParameters: {
            'menu_date_from': today,
            'menu_date_to': today,
            'published_only': '1',
          });
        }
      } else {
        data = await api.getJson('/meal-menus', queryParameters: {
          'menu_date_from': today,
          'menu_date_to': today,
          'published_only': '1',
        });
      }
      final raw = _extractList(data);
      if (mounted) {
        setState(() {
          _fetchedMenus = raw
              .where((m) {
                final meals = m['meals'];
                return meals is List && meals.isNotEmpty;
              })
              .toList();
        });
      }
    } catch (e) {
      debugPrint('TodayMealMenuWidget auto-fetch error: $e');
    } finally {
      if (mounted) setState(() => _fetching = false);
    }
  }

  List<Map<String, dynamic>> _extractList(dynamic data) {
    if (data == null) return [];
    if (data is List) {
      return data
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    if (data is Map) {
      // Try common keys
      for (final key in ['menus', 'data']) {
        final val = data[key];
        if (val is List) {
          return val
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        }
        if (val is Map) {
          for (final k2 in ['menus', 'data']) {
            final v2 = val[k2];
            if (v2 is List) {
              return v2
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList();
            }
          }
        }
      }
    }
    return [];
  }

  String _todayString() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  // ── Dish emoji helper ────────────────────────────────────────────────────────
  String _getDishEmoji(String text) {
    final t = text.toLowerCase();
    if (t.contains('çorba')) { return '🍲'; }
    if (t.contains('salata')) { return '🥗'; }
    if (t.contains('tatlı') ||
        t.contains('pasta') ||
        t.contains('kek') ||
        t.contains('sütlaç') ||
        t.contains('muhallebi') ||
        t.contains('puding')) { return '🍮'; }
    if (t.contains('meyve') ||
        t.contains('elma') ||
        t.contains('muz') ||
        t.contains('portakal')) { return '🍎'; }
    if (t.contains('pilav') ||
        t.contains('makarna') ||
        t.contains('bulgur') ||
        t.contains('börek')) { return '🍚'; }
    if (t.contains('tavuk') ||
        t.contains('köfte') ||
        t.contains('et') ||
        t.contains('balık') ||
        t.contains('kavurma')) { return '🍖'; }
    if (t.contains('yoğurt') ||
        t.contains('ayran') ||
        t.contains('cacık')) { return '🥣'; }
    if (t.contains('peynir') ||
        t.contains('zeytin') ||
        t.contains('yumurta') ||
        t.contains('omlet') ||
        t.contains('reçel') ||
        t.contains('bal')) { return '🍳'; }
    if (t.contains('çay') || t.contains('süt') || t.contains('komposto')) {
      return '☕';
    }
    return '🍽️';
  }

  // ── Build ────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    // Build unified active menus list
    List<Map<String, dynamic>> activeMenus;

    if (_needsFetch) {
      activeMenus = List<Map<String, dynamic>>.from(_fetchedMenus);
    } else if (widget.menus != null && widget.menus!.isNotEmpty) {
      activeMenus = widget.menus!
          .whereType<Map>()
          .map((m) => Map<String, dynamic>.from(m))
          .where((m) {
            final meals = m['meals'];
            return meals is List && meals.isNotEmpty;
          })
          .toList();
    } else if (widget.legacyMenu != null) {
      final meals = widget.legacyMenu!['meals'];
      activeMenus = (meals is List && meals.isNotEmpty)
          ? [widget.legacyMenu!]
          : [];
    } else {
      activeMenus = [];
    }

    // İlk gelen öğünün kahvaltı değil, öğle yemeği olması için sıralama
    int mealScore(String t) {
      final lower = t.toLowerCase();
      if (lower.contains('öğle') || lower.contains('lunch') || lower.contains('ogle')) return 1;
      if (lower.contains('kahvaltı') || lower.contains('breakfast') || lower.contains('kahvalti')) return 2;
      if (lower.contains('ikindi') || lower.contains('ara') || lower.contains('snack')) return 3;
      if (lower.contains('akşam') || lower.contains('dinner') || lower.contains('aksam')) return 4;
      return 5;
    }

    if (activeMenus.length > 1) {
      activeMenus.sort((a, b) {
        return mealScore(a['meal_type']?.toString() ?? '')
            .compareTo(mealScore(b['meal_type']?.toString() ?? ''));
      });
    }

    // Loading skeleton (only during auto-fetch)
    if (_fetching && activeMenus.isEmpty) {
      return _buildLoadingSkeleton();
    }

    // Nothing to show
    if (activeMenus.isEmpty) return const SizedBox.shrink();

    final idx = _selectedIndex.clamp(0, activeMenus.length - 1);
    final current = activeMenus[idx];
    final mealType = current['meal_type']?.toString() ?? 'lunch';
    final cfg = _configFor(mealType);
    final rawMeals = current['meals'] as List;
    final notes = current['notes']?.toString();
    final todayStr = _formatToday();

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──────────────────────────────────────────────────────────
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: cfg.bgColor,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: cfg.color.withValues(alpha: 0.3)),
                  ),
                  child: Icon(cfg.icon, color: cfg.color, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Günün Menüsü',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1E293B),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: cfg.bgColor,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: cfg.color.withValues(alpha: 0.3)),
                            ),
                            child: Text(
                              cfg.label,
                              style: TextStyle(
                                color: cfg.color,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      Text(
                        todayStr,
                        style: const TextStyle(
                            fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => context.push(widget.menuRoute),
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.grey.shade100,
                    foregroundColor: Colors.grey.shade700,
                    shape: const StadiumBorder(),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    textStyle: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  child: const Text('Tüm Menü'),
                ),
              ],
            ),
          ),

          // ── Meal type tabs (only when multiple meal types exist) ──────────
          if (activeMenus.length > 1)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: List.generate(activeMenus.length, (i) {
                    final m = activeMenus[i];
                    final type = m['meal_type']?.toString() ?? 'lunch';
                    final c = _configFor(type);
                    final isSelected = i == idx;
                    return Padding(
                      padding: EdgeInsets.only(
                          right: i < activeMenus.length - 1 ? 8 : 0),
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedIndex = i),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? c.color
                                : Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            c.label,
                            style: TextStyle(
                              color: isSelected
                                  ? Colors.white
                                  : Colors.grey.shade600,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ),

          // ── Dishes list ──────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                ...rawMeals.map((item) {
                  final name = item is Map
                      ? (item['name'] ?? item['description'] ?? '')
                          .toString()
                      : item.toString();
                  final desc = item is Map && item['name'] != null
                      ? item['description']?.toString()
                      : null;
                  if (name.trim().isEmpty) return const SizedBox.shrink();
                  final emoji = _getDishEmoji(name);

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: cfg.bgColor,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(
                            child: Text(emoji,
                                style: const TextStyle(fontSize: 18)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF1E293B),
                                ),
                              ),
                              if (desc != null && desc.isNotEmpty)
                                Text(
                                  desc,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),

                // Notes
                if (notes != null && notes.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border:
                          Border(left: BorderSide(color: cfg.color, width: 3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline,
                            size: 14, color: Colors.grey),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            notes,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.black87,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingSkeleton() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                        height: 14,
                        width: 120,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(6),
                        )),
                    const SizedBox(height: 6),
                    Container(
                        height: 10,
                        width: 80,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(6),
                        )),
                  ],
                ),
              ),
            ]),
            const SizedBox(height: 12),
            ...List.generate(
              3,
              (i) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(
                  children: [
                    Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(10),
                        )),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                          height: 14,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(6),
                          )),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatToday() {
    final now = DateTime.now();
    const months = [
      '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    const weekdays = [
      '', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma',
      'Cumartesi', 'Pazar'
    ];
    return '${weekdays[now.weekday]}, ${now.day} ${months[now.month]}';
  }
}

// ── Private config class ─────────────────────────────────────────────────────
class _MealTypeCfg {
  final String label;
  final IconData icon;
  final Color color;
  final Color bgColor;

  const _MealTypeCfg({
    required this.label,
    required this.icon,
    required this.color,
    required this.bgColor,
  });
}
