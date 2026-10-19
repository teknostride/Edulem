import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';




import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'admin_meetings_providers.dart';

class AdminMeetingsPage extends ConsumerStatefulWidget {
  const AdminMeetingsPage({super.key});

  @override
  ConsumerState<AdminMeetingsPage> createState() => _AdminMeetingsPageState();
}

class _AdminMeetingsPageState extends ConsumerState<AdminMeetingsPage> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sections = ref.watch(drawerSectionsProvider);
    final profile = ref.watch(profileProvider);

    final statsAsync = ref.watch(adminMeetingsStatsProvider);
    final meetingsAsync = ref.watch(adminMeetingsProvider);
    final filters = ref.watch(adminMeetingsFilterProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Görüşmeler'),
        actions: const [],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Başlık, öğretmen veya öğrenci ara...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      contentPadding: EdgeInsets.zero,
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onChanged: (val) {
                      ref.read(adminMeetingsFilterProvider.notifier).update(
                            (state) => {...state, 'search': val},
                          );
                    },
                    onSubmitted: (val) {
                      ref.invalidate(adminMeetingsProvider);
                      ref.invalidate(adminMeetingsStatsProvider);
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Column(
        children: [
          _buildHorizontalFilters(filters, statsAsync.valueOrNull),
          _buildActiveFilters(filters, statsAsync.valueOrNull),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(adminMeetingsStatsProvider);
                ref.invalidate(adminMeetingsProvider);
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // İstatistik Kartları
                    statsAsync.when(
                      data: (stats) => _buildStatsRow(stats),
                      loading: () => const Center(child: CircularProgressIndicator()),
                      error: (err, _) => Text('Hata: $err', style: const TextStyle(color: Colors.red)),
                    ),
                    const SizedBox(height: 24),
                    // Görüşme Listesi
                    const Text(
                      'Görüşme Kayıtları',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    meetingsAsync.when(
                      data: (meetings) {
                        if (meetings.isEmpty) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(32),
                              child: Text('Kayıt bulunamadı.'),
                            ),
                          );
                        }
                        return ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: meetings.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 12),
                          itemBuilder: (ctx, i) => _buildMeetingCard(meetings[i]),
                        );
                      },
                      loading: () => const Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: CircularProgressIndicator(),
                        ),
                      ),
                      error: (err, _) => Text('Hata: $err', style: const TextStyle(color: Colors.red)),
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

  Widget _buildHorizontalFilters(Map<String, String> filters, Map<String, dynamic>? stats) {
    final teachers = (stats?['by_teacher'] as List?) ?? [];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // Öğretmen Filtresi
          _buildFilterDropdown<String>(
            label: 'Öğretmen',
            value: filters['teacher_id']?.isEmpty == true ? null : filters['teacher_id'],
            items: [
              const DropdownMenuItem(value: null, child: Text('Tüm Öğretmenler')),
              ...teachers.map((t) => DropdownMenuItem(
                    value: t['teacher_id']?.toString(),
                    child: Text(t['teacher_name']?.toString() ?? ''),
                  )),
            ],
            onChanged: (v) {
              ref.read(adminMeetingsFilterProvider.notifier).update(
                    (state) => {...state, 'teacher_id': v ?? ''},
                  );
            },
          ),
          const SizedBox(width: 8),
          // Tür Filtresi
          _buildFilterDropdown<String>(
            label: 'Tür',
            value: filters['type']?.isEmpty == true ? null : filters['type'],
            items: const [
              DropdownMenuItem(value: null, child: Text('Tüm Türler')),
              DropdownMenuItem(value: 'meeting', child: Text('Görüşme')),
              DropdownMenuItem(value: 'appointment', child: Text('Randevu')),
            ],
            onChanged: (v) {
              ref.read(adminMeetingsFilterProvider.notifier).update(
                    (state) => {...state, 'type': v ?? ''},
                  );
            },
          ),
          const SizedBox(width: 8),
          // Kiminle Filtresi
          _buildFilterDropdown<String>(
            label: 'Kiminle',
            value: filters['with']?.isEmpty == true ? null : filters['with'],
            items: const [
              DropdownMenuItem(value: null, child: Text('Tümü')),
              DropdownMenuItem(value: 'student', child: Text('Öğrenci')),
              DropdownMenuItem(value: 'parent', child: Text('Veli')),
            ],
            onChanged: (v) {
              ref.read(adminMeetingsFilterProvider.notifier).update(
                    (state) => {...state, 'with': v ?? ''},
                  );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFilterDropdown<T>({
    required String label,
    required T? value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
  }) {
    return Container(
      height: 36,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          items: items,
          onChanged: onChanged,
          hint: Text(label, style: const TextStyle(fontSize: 12)),
          style: const TextStyle(fontSize: 12, color: Colors.black),
          icon: const Icon(Icons.arrow_drop_down, size: 18),
        ),
      ),
    );
  }
  Widget _buildActiveFilters(Map<String, String> filters, Map<String, dynamic>? stats) {
    final activeFilters = <_FilterChipData>[];

    if (filters['teacher_id']?.isNotEmpty == true && stats != null) {
      final teachers = (stats['by_teacher'] as List?) ?? [];
      final teacher = teachers.firstWhere(
        (t) => t['teacher_id']?.toString() == filters['teacher_id'],
        orElse: () => null,
      );
      if (teacher != null) {
        activeFilters.add(_FilterChipData('Öğretmen: ${teacher['teacher_name']}', 'teacher_id'));
      }
    }

    if (filters['type']?.isNotEmpty == true) {
      final typeLabel = filters['type'] == 'meeting' ? 'Görüşme' : 'Randevu';
      activeFilters.add(_FilterChipData('Tür: $typeLabel', 'type'));
    }

    if (filters['with']?.isNotEmpty == true) {
      final withLabel = filters['with'] == 'student' ? 'Öğrenci' : 'Veli';
      activeFilters.add(_FilterChipData('Kiminle: $withLabel', 'with'));
    }

    if (activeFilters.isEmpty) return const SizedBox.shrink();

    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: activeFilters.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          final filter = activeFilters[i];
          return Chip(
            label: Text(filter.label, style: const TextStyle(fontSize: 10)),
            onDeleted: () {
              ref.read(adminMeetingsFilterProvider.notifier).update(
                    (state) => {...state, filter.key: ''},
                  );
            },
            deleteIconColor: Colors.red.shade400,
            padding: EdgeInsets.zero,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          );
        },
      ),
    );
  }

  Widget _buildStatsRow(Map<String, dynamic> stats) {
    final totals = stats['totals'] ?? {};
    final breakdown = stats['by_teacher'] as List? ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _buildStatCard('Toplam', totals['total_records']?.toString() ?? '0', Colors.blue),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildStatCard('Öğrenci', totals['student_meetings']?.toString() ?? '0', Colors.purple),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildStatCard('Veli', totals['parent_meetings']?.toString() ?? '0', Colors.orange),
            ),
          ],
        ),
        const SizedBox(height: 24),
        const Text(
          'Öğretmen Bazlı Kırılım',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                ),
                child: const Row(
                  children: [
                    Expanded(flex: 3, child: Text('Öğretmen', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                    Expanded(child: Text('Toplam', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                    Expanded(child: Text('Öğr.', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                    Expanded(child: Text('Veli', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                  ],
                ),
              ),
              if (breakdown.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Veri bulunamadı', style: TextStyle(fontSize: 12, color: Colors.grey)),
                )
              else
                ...breakdown.map((t) {
                  final isLast = breakdown.indexOf(t) == breakdown.length - 1;
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    decoration: BoxDecoration(
                      border: isLast ? null : Border(bottom: BorderSide(color: Colors.grey.shade100)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: Text(
                            t['teacher_name']?.toString() ?? '',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                          ),
                        ),
                        Expanded(
                          child: Text(
                            t['total_records']?.toString() ?? 
                            t['total_count']?.toString() ?? 
                            t['total']?.toString() ?? 
                            t['count']?.toString() ?? '0',
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                        Expanded(
                          child: Text(
                            t['student_meetings']?.toString() ?? 
                            t['student_count']?.toString() ?? 
                            t['student']?.toString() ?? '0',
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 12, color: Colors.purple),
                          ),
                        ),
                        Expanded(
                          child: Text(
                            t['parent_meetings']?.toString() ?? 
                            t['parent_count']?.toString() ?? 
                            t['parent']?.toString() ?? '0',
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 12, color: Colors.orange),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 24, color: color, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildMeetingCard(Map<String, dynamic> rec) {
    final student = rec['student'] as Map<String, dynamic>?;
    final teacher = rec['teacher'] as Map<String, dynamic>?;

    final type = rec['type'] == 'appointment' ? 'Randevu' : 'Görüşme';
    final meetingWith = rec['meeting_with'] == 'student' ? 'Öğrenci' : 'Veli';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  student?['name']?.toString() ?? rec['title']?.toString() ?? 'İsimsiz',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: type == 'Randevu' ? Colors.cyan.shade100 : Colors.blue.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  type,
                  style: TextStyle(
                    fontSize: 12,
                    color: type == 'Randevu' ? Colors.cyan.shade800 : Colors.blue.shade800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Öğretmen: ${teacher?['name']?.toString() ?? 'Bilinmiyor'}',
            style: TextStyle(fontSize: 13, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
              const SizedBox(width: 4),
              Text(
                rec['meeting_date']?.toString() ?? '',
                style: const TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(width: 12),
              const Icon(Icons.people, size: 16, color: Colors.grey),
              const SizedBox(width: 4),
              Text(
                meetingWith,
                style: const TextStyle(fontSize: 13, color: Colors.grey),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.people, size: 14, color: Colors.orange.shade300),
                    const SizedBox(width: 4),
                    Text(
                      meetingWith,
                      style: TextStyle(fontSize: 12, color: Colors.orange.shade700),
                    ),
                  ],
                ),
              ),
            ],
          ),
          // İçerik (Varsa)
          if (rec['content'] != null && rec['content'].toString().isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Text(
                rec['content'].toString(),
                style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterChipData {
  final String label;
  final String key;
  _FilterChipData(this.label, this.key);
}

