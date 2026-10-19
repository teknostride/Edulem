import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import '../auth/auth_providers.dart';
import '../campuses/campuses_providers.dart';
import '../education_levels/education_levels_providers.dart';
import '../classrooms/classrooms_providers.dart';
import 'conversations_providers.dart';
import 'counseling_providers.dart';
import 'conversation_form_page.dart';

class CounselingPage extends ConsumerStatefulWidget {
  const CounselingPage({super.key});

  @override
  ConsumerState<CounselingPage> createState() => _CounselingPageState();
}

class _CounselingPageState extends ConsumerState<CounselingPage> {
  final _searchController = TextEditingController();
  bool _isFilterExpanded = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sections = ref.watch(drawerSectionsProvider);
    final profile = ref.watch(profileProvider);
    final sessionAsync = ref.watch(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role.toLowerCase() ?? '';
    
    // Check if user is a guidance teacher or admin/kurucu
    final isRehber = userRole.contains('rehber') || userRole.contains('counselor');

    final filters = ref.watch(counselingFilterProvider);
    final recordsAsync = ref.watch(counselingRecordsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rehberlik Servisi'),
        actions: [
          IconButton(
            icon: Icon(_isFilterExpanded ? Icons.filter_list_off : Icons.filter_list),
            onPressed: () => setState(() => _isFilterExpanded = !_isFilterExpanded),
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
          if (_isFilterExpanded) _buildFilterPanel(filters),
          _buildSearchAndDateBar(filters),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => ref.invalidate(counselingRecordsProvider),
              child: recordsAsync.when(
                data: (records) => _buildRecordsList(records),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Center(child: Text('Hata: $err')),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: isRehber ? FloatingActionButton.extended(
        onPressed: () => context.push('/conversations/new'),
        icon: const Icon(Icons.add),
        label: const Text('Yeni Görüşme'),
      ) : null,
    );
  }

  Widget _buildFilterPanel(Map<String, String> filters) {
    final campusesAsync = ref.watch(campusesListProvider);
    final levelsAsync = ref.watch(educationLevelsListProvider);
    final classroomsAsync = ref.watch(classroomsListProvider);

    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.blue.shade50.withAlpha(50),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildDropdown(
                  label: 'Kampüs',
                  value: filters['campus_id']?.isEmpty == true ? null : filters['campus_id'],
                  items: campusesAsync.maybeWhen(
                    data: (list) => [
                      const DropdownMenuItem(value: null, child: Text('Tümü')),
                      ...list.map((e) => DropdownMenuItem(value: e['id'].toString(), child: Text(e['name'] ?? ''))),
                    ],
                    orElse: () => [const DropdownMenuItem(value: null, child: Text('Yükleniyor...'))],
                  ),
                  onChanged: (v) => _updateFilter('campus_id', v ?? ''),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildDropdown(
                  label: 'Kademe',
                  value: filters['education_level_id']?.isEmpty == true ? null : filters['education_level_id'],
                  items: levelsAsync.maybeWhen(
                    data: (list) => [
                      const DropdownMenuItem(value: null, child: Text('Tümü')),
                      ...list.map((e) => DropdownMenuItem(value: e['id'].toString(), child: Text(e['name'] ?? ''))),
                    ],
                    orElse: () => [const DropdownMenuItem(value: null, child: Text('Yükleniyor...'))],
                  ),
                  onChanged: (v) => _updateFilter('education_level_id', v ?? ''),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildDropdown(
            label: 'Sınıf',
            value: filters['classroom_id']?.isEmpty == true ? null : filters['classroom_id'],
            items: classroomsAsync.maybeWhen(
              data: (list) => [
                const DropdownMenuItem(value: null, child: Text('Tüm Sınıflar')),
                ...list.map((e) => DropdownMenuItem(value: e['id'].toString(), child: Text(e['name'] ?? ''))),
              ],
              orElse: () => [const DropdownMenuItem(value: null, child: Text('Yükleniyor...'))],
            ),
            onChanged: (v) => _updateFilter('classroom_id', v ?? ''),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndDateBar(Map<String, String> filters) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Öğrenci ara...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty ? IconButton(
                icon: const Icon(Icons.clear),
                onPressed: () {
                  _searchController.clear();
                  _updateFilter('search', '');
                },
              ) : null,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: true,
              fillColor: Colors.grey.shade100,
            ),
            onChanged: (v) => _updateFilter('search', v),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildDateField('Başlangıç', filters['start_date'] ?? '', (d) => _updateFilter('start_date', d)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildDateField('Bitiş', filters['end_date'] ?? '', (d) => _updateFilter('end_date', d)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRecordsList(List<Map<String, dynamic>> records) {
    if (records.isEmpty) {
      return const Center(child: Text('Kayıt bulunamadı.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
      itemCount: records.length,
      itemBuilder: (context, index) {
        final r = records[index];
        final studentName = r['student_name'] ?? 'İsimsiz';
        final counselorName = r['counselor_name'] ?? '-';
        final classroomName = r['classroom_name']?.toString() ?? '';
        final subject = (r['subject'] ?? r['title'] ?? '').toString();
        final date = r['date'] ?? '-';
        final time = (r['time'] ?? '').toString();
        final isPrivate = r['is_private'] == true;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => _showRecordDetailSheet(r),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        backgroundColor: Colors.blue.shade50,
                        child: const Icon(Icons.school, color: Colors.blue, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              studentName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            if (classroomName.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.blue.shade50,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  classroomName,
                                  style: TextStyle(fontSize: 11, color: Colors.blue.shade800, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isPrivate ? Colors.amber.shade50 : Colors.green.shade50,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: isPrivate ? Colors.amber.shade300 : Colors.green.shade300),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(isPrivate ? Icons.lock : Icons.lock_open, size: 12, color: isPrivate ? Colors.amber.shade900 : Colors.green.shade900),
                            const SizedBox(width: 4),
                            Text(
                              isPrivate ? 'Özel' : 'Paylaşıldı',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isPrivate ? Colors.amber.shade900 : Colors.green.shade900),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (subject.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      subject,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black87),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 10),
                  const Divider(height: 1),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.person_outline, size: 14, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text(counselorName, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                        ],
                      ),
                      Row(
                        children: [
                          const Icon(Icons.calendar_today, size: 13, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text('$date${time.isNotEmpty ? ' $time' : ''}', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showRecordDetailSheet(Map<String, dynamic> initialRecord) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return FutureBuilder<Map<String, dynamic>>(
          future: ref.read(conversationsRepositoryProvider).getCounselingRecord(initialRecord['id']),
          initialData: initialRecord,
          builder: (context, snapshot) {
            final r = snapshot.data ?? initialRecord;
            final student = r['student'] is Map ? r['student'] : {};
            final studentName = r['student_name'] ?? student['name'] ?? 'İsimsiz';
            final schoolNo = student['school_no']?.toString() ?? '';
            final classroomName = r['classroom_name']?.toString() ?? student['classroom']?['name']?.toString() ?? '';
            final counselorName = r['counselor_name'] ?? '-';
            final date = r['date'] ?? r['meeting_date'] ?? '-';
            final time = (r['time'] ?? r['meeting_time'] ?? '').toString();
            final subject = (r['subject'] ?? r['title'] ?? '').toString();
            final content = (r['content'] ?? r['notes'] ?? '').toString();
            final isPrivate = r['is_private'] == true;

            return DraggableScrollableSheet(
              initialChildSize: 0.7,
              minChildSize: 0.4,
              maxChildSize: 0.95,
              expand: false,
              builder: (_, scrollController) {
                return Padding(
                  padding: const EdgeInsets.all(20),
                  child: ListView(
                    controller: scrollController,
                    children: [
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade300,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  studentName,
                                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    if (classroomName.isNotEmpty) ...[
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.blue.shade50,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(classroomName, style: TextStyle(fontSize: 12, color: Colors.blue.shade800, fontWeight: FontWeight.bold)),
                                      ),
                                      const SizedBox(width: 8),
                                    ],
                                    if (schoolNo.isNotEmpty)
                                      Text('No: $schoolNo', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isPrivate ? Colors.amber.shade50 : Colors.green.shade50,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: isPrivate ? Colors.amber.shade300 : Colors.green.shade300),
                            ),
                            child: Text(
                              isPrivate ? 'Gizli Not' : 'Kuruma Açık',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isPrivate ? Colors.amber.shade900 : Colors.green.shade900),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.calendar_today, size: 16, color: Colors.grey.shade600),
                          const SizedBox(width: 6),
                          Text('$date ${time.isNotEmpty ? time : ''}', style: TextStyle(color: Colors.grey.shade800, fontSize: 13)),
                          const Spacer(),
                          Icon(Icons.person, size: 16, color: Colors.grey.shade600),
                          const SizedBox(width: 6),
                          Text(counselorName, style: TextStyle(color: Colors.grey.shade800, fontSize: 13)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      if (subject.isNotEmpty) ...[
                        const Text('Konu', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey)),
                        const SizedBox(height: 4),
                        Text(subject, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 16),
                      ],
                      const Text('Görüşme Notları / Detayı', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Text(
                          content.isNotEmpty ? content : 'Not içeriği bulunmuyor.',
                          style: const TextStyle(fontSize: 14, height: 1.5),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              icon: const Icon(Icons.edit, size: 18),
                              label: const Text('Düzenle'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              onPressed: () {
                                Navigator.pop(ctx);
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ConversationFormPage(
                                      meetingId: r['id'],
                                      initialRecord: r,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                              label: const Text('Sil', style: TextStyle(color: Colors.red)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.red.shade50,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              onPressed: () async {
                                final scaffoldMessenger = ScaffoldMessenger.of(context);
                                final rootNavigator = Navigator.of(ctx);
                                final confirm = await showDialog<bool>(
                                  context: ctx,
                                  builder: (dCtx) => AlertDialog(
                                    title: const Text('Kayıt Silinecek'),
                                    content: const Text('Bu danışma notunu silmek istediğinize emin misiniz?'),
                                    actions: [
                                      TextButton(onPressed: () => Navigator.pop(dCtx, false), child: const Text('İptal')),
                                      ElevatedButton(
                                        style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                                        onPressed: () => Navigator.pop(dCtx, true),
                                        child: const Text('Sil', style: TextStyle(color: Colors.white)),
                                      ),
                                    ],
                                  ),
                                );

                                if (confirm == true) {
                                  try {
                                    await ref.read(conversationsRepositoryProvider).deleteCounselingRecord(r['id']);
                                    ref.invalidate(counselingRecordsProvider);
                                    if (mounted) {
                                      rootNavigator.pop();
                                      scaffoldMessenger.showSnackBar(
                                        const SnackBar(content: Text('Danışma notu silindi'), backgroundColor: Colors.green),
                                      );
                                    }
                                  } catch (e) {
                                    if (mounted) {
                                      scaffoldMessenger.showSnackBar(
                                        SnackBar(content: Text('Hata: $e'), backgroundColor: Colors.red),
                                      );
                                    }
                                  }
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildDropdown({required String label, required String? value, required List<DropdownMenuItem<String>> items, required ValueChanged<String?> onChanged}) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      items: items,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        isDense: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  Widget _buildDateField(String label, String value, ValueChanged<String> onChanged) {
    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: DateTime.now(),
          firstDate: DateTime(2020),
          lastDate: DateTime(2030),
        );
        if (picked != null) {
          onChanged(picked.toIso8601String().substring(0, 10));
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade400),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Expanded(child: Text(value.isEmpty ? label : value, style: TextStyle(color: value.isEmpty ? Colors.grey.shade600 : Colors.black))),
            const Icon(Icons.calendar_today, size: 16, color: Colors.blue),
          ],
        ),
      ),
    );
  }

  void _updateFilter(String key, String value) {
    ref.read(counselingFilterProvider.notifier).update((state) => {...state, key: value});
  }
}
