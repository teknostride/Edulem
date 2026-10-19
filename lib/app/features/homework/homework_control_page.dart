import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import 'homework_providers.dart';

final homeworkControlProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, id) async {
      final repo = ref.read(homeworkRepositoryProvider);
      return repo.control(id);
    });

class HomeworkControlPage extends ConsumerStatefulWidget {
  const HomeworkControlPage({super.key, required this.homeworkId});

  final int homeworkId;

  @override
  ConsumerState<HomeworkControlPage> createState() =>
      _HomeworkControlPageState();
}

class _HomeworkControlPageState extends ConsumerState<HomeworkControlPage> {
  bool _isSaving = false;
  bool _initialized = false;

  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _statusFilter = 'all';

  // student_id -> status
  final Map<int, String?> _status = {};
  final Map<int, TextEditingController> _notes = {};

  @override
  void dispose() {
    _searchController.dispose();
    for (final c in _notes.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _initFromData(Map<String, dynamic> data) {
    if (_initialized) return;

    final students = data['students'];
    if (students is! List) {
      _initialized = true;
      return;
    }

    for (final s in students) {
      if (s is! Map) continue;
      final m = Map<String, dynamic>.from(s);
      final id = (m['student_id'] is int)
          ? m['student_id'] as int
          : int.tryParse('${m['student_id']}') ?? -1;
      if (id <= 0) continue;

      const validStatuses = {'done', 'not_done', 'partial', 'completed', 'absent', 'missing'};
      final rawStatus = m['review_status']?.toString().trim();
      final validStatus = (rawStatus != null && validStatuses.contains(rawStatus))
          ? rawStatus
          : null;

      _status.putIfAbsent(id, () => validStatus);
      _notes.putIfAbsent(
        id,
        () => TextEditingController(text: (m['teacher_note'] ?? '').toString()),
      );
    }
    _initialized = true;
  }

  Future<void> _save(Map<String, dynamic> data) async {
    FocusScope.of(context).unfocus();
    if (_isSaving) return;
    setState(() => _isSaving = true);

    try {
      final entries = <Map<String, dynamic>>[];
      const validStatuses = {'done', 'not_done', 'partial', 'completed', 'absent', 'missing'};
      for (final e in _status.entries) {
        final id = e.key;
        final rawVal = e.value?.trim();
        final statusVal = (rawVal != null && validStatuses.contains(rawVal))
            ? rawVal
            : null;
        final noteText = _notes[id]?.text.trim();
        entries.add({
          'student_id': id,
          'review_status': statusVal,
          'teacher_note': (noteText != null && noteText.isNotEmpty) ? noteText : null,
        });
      }

      await ref
          .read(homeworkRepositoryProvider)
          .saveControl(homeworkId: widget.homeworkId, entries: entries);

      ref.invalidate(homeworkControlProvider(widget.homeworkId));

      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Kontrol kaydedildi.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Kontrol kaydetme hatası: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Validate homework ID
    if (widget.homeworkId <= 0) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ödev Kontrol')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              const Text(
                'Geçersiz ödev ID',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text('ID: ${widget.homeworkId}'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => GoRouter.of(context).pop(),
                child: const Text('Geri Dön'),
              ),
            ],
          ),
        ),
      );
    }

    final async = ref.watch(homeworkControlProvider(widget.homeworkId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ödev Kontrol'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FilledButton.icon(
              onPressed: _isSaving
                  ? null
                  : () {
                      final data = async.valueOrNull;
                      if (data != null) {
                        _save(data);
                      }
                    },
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: Theme.of(context).primaryColor,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              icon: _isSaving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.check, size: 18),
              label: const Text(
                'Kaydet',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: async.maybeWhen(
        data: (data) {
          final students = data['students'];
          if (students is! List || students.isEmpty) return const SizedBox.shrink();
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 8,
                  offset: const Offset(0, -3),
                ),
              ],
            ),
            child: SafeArea(
              child: FilledButton.icon(
                onPressed: _isSaving ? null : () => _save(data),
                style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                icon: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.save),
                label: Text(
                  _isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          );
        },
        orElse: () => const SizedBox.shrink(),
      ),
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => FocusScope.of(context).unfocus(),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: async.when(
            data: (data) {
              _initFromData(data);

              const statusOptions = <Map<String, dynamic>>[
                {'key': 'done', 'label': 'Yaptı', 'color': Color(0xFF16A34A), 'icon': Icons.check_circle},
                {'key': 'not_done', 'label': 'Yapılmadı', 'color': Color(0xFFDC2626), 'icon': Icons.cancel},
                {'key': 'partial', 'label': 'Eksik', 'color': Color(0xFFEA580C), 'icon': Icons.timelapse},
                {'key': 'completed', 'label': 'Tamamlandı', 'color': Color(0xFF0D9488), 'icon': Icons.task_alt},
                {'key': 'absent', 'label': 'Gelmedi', 'color': Color(0xFF475569), 'icon': Icons.person_off_outlined},
              ];

              final allStudents = data['students'];
              if (allStudents is! List || allStudents.isEmpty) {
                return const Center(child: Text('Öğrenci bulunamadı'));
              }

              // Arama ve Durum Filtreleme
              final query = _searchQuery.trim().toLowerCase();
              final filteredStudents = allStudents.where((s) {
                if (s is! Map) return false;
                final m = Map<String, dynamic>.from(s);
                final id = (m['student_id'] is int)
                    ? m['student_id'] as int
                    : int.tryParse('${m['student_id']}') ?? -1;
                if (id <= 0) return false;

                final name = (m['student_name'] ?? '').toString().toLowerCase();
                final schoolNo = (m['school_no'] ?? '').toString().toLowerCase();

                final matchesSearch = query.isEmpty ||
                    name.contains(query) ||
                    schoolNo.contains(query);
                if (!matchesSearch) return false;

                if (_statusFilter != 'all') {
                  final currentStatus = _status[id];
                  if (_statusFilter == 'unreviewed') {
                    return currentStatus == null || currentStatus.isEmpty;
                  }
                  return currentStatus == _statusFilter;
                }
                return true;
              }).toList();

              return Column(
                children: [
                  // Arama Çubuğu
                  TextField(
                    controller: _searchController,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'Öğrenci ara (isim veya okul no)...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      isDense: true,
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onChanged: (val) {
                      setState(() => _searchQuery = val);
                    },
                  ),
                  const SizedBox(height: 8),

                  // Durum Filtresi ve Öğrenci Sayacı
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: FilterChip(
                            label: Text('Tümü (${allStudents.length})'),
                            selected: _statusFilter == 'all',
                            onSelected: (_) => setState(() => _statusFilter = 'all'),
                            visualDensity: VisualDensity.compact,
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: FilterChip(
                            label: const Text('Değerlendirilmemiş'),
                            selected: _statusFilter == 'unreviewed',
                            onSelected: (_) => setState(() => _statusFilter = 'unreviewed'),
                            visualDensity: VisualDensity.compact,
                          ),
                        ),
                        ...statusOptions.map((opt) {
                          final key = opt['key'] as String;
                          final label = opt['label'] as String;
                          final count = _status.values.where((st) => st == key).length;
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: FilterChip(
                              label: Text('$label ($count)'),
                              selected: _statusFilter == key,
                              onSelected: (_) => setState(() => _statusFilter = key),
                              visualDensity: VisualDensity.compact,
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Liste Durum Bilgisi
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${filteredStudents.length} / ${allStudents.length} öğrenci listeleniyor',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (_searchQuery.isNotEmpty || _statusFilter != 'all')
                          GestureDetector(
                            onTap: () {
                              _searchController.clear();
                              setState(() {
                                _searchQuery = '';
                                _statusFilter = 'all';
                              });
                            },
                            child: Text(
                              'Filtreleri Temizle',
                              style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).primaryColor,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Öğrenci Listesi
                  Expanded(
                    child: filteredStudents.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.search_off, size: 48, color: Colors.grey.shade400),
                                const SizedBox(height: 12),
                                Text(
                                  'Arama kriterlerine uygun öğrenci bulunamadı.',
                                  style: TextStyle(color: Colors.grey.shade600),
                                ),
                                const SizedBox(height: 8),
                                TextButton(
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() {
                                      _searchQuery = '';
                                      _statusFilter = 'all';
                                    });
                                  },
                                  child: const Text('Tüm Öğrencileri Göster'),
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            keyboardDismissBehavior:
                                ScrollViewKeyboardDismissBehavior.onDrag,
                            padding: const EdgeInsets.only(bottom: 24),
                            itemCount: filteredStudents.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final s = filteredStudents[index];
                              final m = s is Map
                                  ? Map<String, dynamic>.from(s)
                                  : <String, dynamic>{};

                              final id = (m['student_id'] is int)
                                  ? m['student_id'] as int
                                  : int.tryParse('${m['student_id']}') ?? -1;

                              final name = (m['student_name'] ?? '').toString();
                              final schoolNo = (m['school_no'] ?? '').toString();

                              if (id <= 0 || !_notes.containsKey(id)) {
                                return const SizedBox.shrink();
                              }

                              final controller = _notes[id]!;
                              final currentStatus = _status[id];

                              return AppCard(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                name.isEmpty ? 'Öğrenci' : name,
                                                style: const TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                              if (schoolNo.isNotEmpty) ...[
                                                const SizedBox(height: 2),
                                                Text(
                                                  'No: $schoolNo',
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    color: Colors.grey.shade600,
                                                    fontWeight: FontWeight.w500,
                                                  ),
                                                ),
                                              ],
                                            ],
                                          ),
                                        ),
                                        if (currentStatus != null && currentStatus.isNotEmpty)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: _getStatusColor(currentStatus).withValues(alpha: 0.12),
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(
                                                color: _getStatusColor(currentStatus).withValues(alpha: 0.4),
                                              ),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(
                                                  _getStatusIcon(currentStatus),
                                                  size: 14,
                                                  color: _getStatusColor(currentStatus),
                                                ),
                                                const SizedBox(width: 4),
                                                Text(
                                                  _getStatusLabel(currentStatus),
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.bold,
                                                    color: _getStatusColor(currentStatus),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    const Text(
                                      'Ödev Durumu:',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.black87,
                                      ),
                                    ),
                                    const SizedBox(height: 8),

                                    // 5 Belirgin Seçenek Butonu
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: statusOptions.map((opt) {
                                        final key = opt['key'] as String;
                                        final label = opt['label'] as String;
                                        final color = opt['color'] as Color;
                                        final icon = opt['icon'] as IconData;
                                        final isSelected = currentStatus == key;

                                        return InkWell(
                                          onTap: () {
                                            FocusScope.of(context).unfocus();
                                            setState(() {
                                              if (isSelected) {
                                                _status[id] = null; // Seçimi kaldır
                                              } else {
                                                _status[id] = key;
                                              }
                                            });
                                          },
                                          borderRadius: BorderRadius.circular(8),
                                          child: AnimatedContainer(
                                            duration: const Duration(milliseconds: 180),
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 12,
                                              vertical: 8,
                                            ),
                                            decoration: BoxDecoration(
                                              color: isSelected ? color : color.withValues(alpha: 0.08),
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(
                                                color: isSelected ? color : color.withValues(alpha: 0.3),
                                                width: isSelected ? 2 : 1.2,
                                              ),
                                              boxShadow: isSelected
                                                  ? [
                                                      BoxShadow(
                                                        color: color.withValues(alpha: 0.35),
                                                        blurRadius: 6,
                                                        offset: const Offset(0, 2),
                                                      ),
                                                    ]
                                                  : null,
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(
                                                  icon,
                                                  size: 16,
                                                  color: isSelected ? Colors.white : color,
                                                ),
                                                const SizedBox(width: 6),
                                                Text(
                                                  label,
                                                  style: TextStyle(
                                                    fontSize: 13,
                                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                                    color: isSelected ? Colors.white : color,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        );
                                      }).toList(),
                                    ),

                                    const SizedBox(height: 12),
                                    TextField(
                                      controller: controller,
                                      textInputAction: TextInputAction.done,
                                      onTapOutside: (_) => FocusScope.of(context).unfocus(),
                                      decoration: InputDecoration(
                                        labelText: 'Not (opsiyonel)',
                                        hintText: 'Öğrenciye veya veliye not yazın...',
                                        isDense: true,
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        filled: true,
                                        fillColor: Colors.grey.shade50,
                                      ),
                                      maxLines: 2,
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Hata: $e')),
          ),
        ),
      ),
    );
  }
}

String _getStatusLabel(String status) {
  final labels = {
    'done': 'Yaptı',
    'not_done': 'Yapılmadı',
    'partial': 'Eksik',
    'completed': 'Tamamlandı',
    'absent': 'Gelmedi',
    'missing': 'Gelmedi',
  };
  return labels[status.toLowerCase()] ?? status;
}

Color _getStatusColor(String status) {
  switch (status.toLowerCase()) {
    case 'done':
      return const Color(0xFF16A34A);
    case 'not_done':
      return const Color(0xFFDC2626);
    case 'partial':
      return const Color(0xFFEA580C);
    case 'completed':
      return const Color(0xFF0D9488);
    case 'absent':
    case 'missing':
      return const Color(0xFF475569);
    default:
      return Colors.blue;
  }
}

IconData _getStatusIcon(String status) {
  switch (status.toLowerCase()) {
    case 'done':
      return Icons.check_circle;
    case 'not_done':
      return Icons.cancel;
    case 'partial':
      return Icons.timelapse;
    case 'completed':
      return Icons.task_alt;
    case 'absent':
    case 'missing':
      return Icons.person_off_outlined;
    default:
      return Icons.help_outline;
  }
}
