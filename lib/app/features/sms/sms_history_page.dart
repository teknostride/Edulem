import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'sms_providers.dart';

class SmsHistoryPage extends ConsumerStatefulWidget {
  const SmsHistoryPage({super.key});

  @override
  ConsumerState<SmsHistoryPage> createState() => _SmsHistoryPageState();
}

class _SmsHistoryPageState extends ConsumerState<SmsHistoryPage> {
  final _searchController = TextEditingController();
  String _selectedStatus = '';
  Map<String, String>? _filters;

  @override
  void initState() {
    super.initState();
    _updateFilters();
  }

  void _updateFilters() {
    final filters = <String, String>{};
    if (_searchController.text.isNotEmpty) {
      filters['title'] = _searchController.text.trim();
    }
    if (_selectedStatus.isNotEmpty) {
      filters['status'] = _selectedStatus;
    }
    setState(() {
      _filters = filters.isEmpty ? null : filters;
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _deleteSms(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('SMS Sil'),
        content: const Text('Bu SMS kaydını silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Sil'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final repo = ref.read(smsRepositoryProvider);
        await repo.deleteSms(id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('SMS kaydı silindi')),
          );
        }
        ref.invalidate(smsHistoryProvider);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Silme hatası: $e')),
          );
        }
      }
    }
  }

  void _showDetail(Map<String, dynamic> item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(20),
        child: DraggableScrollableSheet(
          initialChildSize: 0.75,
          maxChildSize: 0.95,
          minChildSize: 0.5,
          expand: false,
          builder: (context, scrollController) {
            final errorMessage = item['error_message']?.toString();
            return ListView(
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
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item['title']?.toString() ?? 'Başlıksız',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const Divider(height: 24),
                _buildDetailRow(
                  'Durum',
                  _getStatusWidget(item['status']?.toString() ?? ''),
                ),
                _buildDetailRow(
                  'Alıcı Tipi',
                  _getRecipientLabel(item['recipient_type']?.toString() ?? ''),
                ),
                _buildDetailRow(
                  'Gönderim Zamanı',
                  _formatDate(item['scheduled_at']?.toString()),
                ),
                _buildDetailRow(
                  'Oluşturulma',
                  _formatDate(item['created_at']?.toString()),
                ),
                _buildDetailRow(
                  'Başarılı / Toplam',
                  '${item['sent_count'] ?? 0} / ${(item['sent_count'] ?? 0) + (item['failed_count'] ?? 0)} alıcı',
                ),
                if ((item['failed_count'] ?? 0) > 0)
                  _buildDetailRow(
                    'Başarısız',
                    Text(
                      '${item['failed_count']} kişi',
                      style: const TextStyle(
                        color: Colors.red,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                if (item['creator'] != null)
                  _buildDetailRow(
                    'Gönderen Kullanıcı',
                    item['creator']['name']?.toString() ?? '',
                  ),
                if (errorMessage != null && errorMessage.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.error_outline,
                            color: Colors.red.shade700, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Hata Mesajı:',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.red.shade800,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                errorMessage,
                                style: TextStyle(
                                  color: Colors.red.shade700,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                const Text(
                  'Mesaj İçeriği:',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: SelectableText(
                    item['message']?.toString() ?? '',
                    style: const TextStyle(height: 1.4, fontSize: 13),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              '$label:',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey.shade600,
                fontSize: 13,
              ),
            ),
          ),
          Expanded(
            child: value is Widget
                ? value
                : Text(
                    value?.toString() ?? '-',
                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _getStatusWidget(String status) {
    Color color;
    String label;
    IconData icon;

    switch (status) {
      case 'completed':
        color = Colors.green;
        label = 'Tamamlandı';
        icon = Icons.check_circle;
        break;
      case 'processing':
        color = Colors.blue;
        label = 'İşleniyor';
        icon = Icons.sync;
        break;
      case 'failed':
        color = Colors.red;
        label = 'Başarısız';
        icon = Icons.error;
        break;
      case 'pending':
        color = Colors.orange;
        label = 'Bekliyor';
        icon = Icons.schedule;
        break;
      case 'cancelled':
        color = Colors.grey;
        label = 'İptal Edildi';
        icon = Icons.cancel;
        break;
      default:
        color = Colors.grey;
        label = status;
        icon = Icons.help;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withAlpha(25),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withAlpha(80)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  String _getRecipientLabel(String type) {
    switch (type) {
      case 'classroom':
        return 'Sınıflar';
      case 'students':
        return 'Öğrenciler & Veliler';
      case 'guardians':
        return 'Veliler';
      case 'users':
        return 'Personel';
      case 'all':
        return 'Tüm Okul';
      case 'phones':
        return 'Manuel Numaralar';
      case 'test':
        return 'Test SMS';
      default:
        return type;
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '-';
    try {
      final date = DateTime.parse(dateStr);
      final day = date.day.toString().padLeft(2, '0');
      final month = date.month.toString().padLeft(2, '0');
      final year = date.year;
      final hour = date.hour.toString().padLeft(2, '0');
      final minute = date.minute.toString().padLeft(2, '0');
      return '$day.$month.$year $hour:$minute';
    } catch (_) {
      return dateStr;
    }
  }

  Widget _buildStatChip(String title, dynamic count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        decoration: BoxDecoration(
          color: color.withAlpha(15),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withAlpha(50)),
        ),
        child: Column(
          children: [
            Text(
              '${count ?? 0}',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              style: TextStyle(
                fontSize: 10,
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sections = ref.watch(drawerSectionsProvider);
    final profile = ref.watch(profileProvider);
    final historyAsync = ref.watch(smsHistoryProvider(_filters));

    return Scaffold(
      appBar: AppBar(
        title: const Text('SMS Gönderim Geçmişi'),
        actions: [
          IconButton(
            onPressed: () => ref.invalidate(smsHistoryProvider),
            icon: const Icon(Icons.refresh),
            tooltip: 'Yenile',
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
          // İstatistik Kartları (Web'deki gibi)
          historyAsync.when(
            data: (data) {
              final stats = (data['statistics'] ?? data['data']?['statistics']) as Map<String, dynamic>?;
              if (stats == null) return const SizedBox.shrink();

              return Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Row(
                  children: [
                    _buildStatChip('Toplam', stats['total'], Colors.indigo),
                    const SizedBox(width: 6),
                    _buildStatChip('Tamamlanan', stats['completed'], Colors.green),
                    const SizedBox(width: 6),
                    _buildStatChip('Bekleyen', stats['pending'], Colors.orange),
                    const SizedBox(width: 6),
                    _buildStatChip('İşlenen', stats['processing'], Colors.blue),
                    const SizedBox(width: 6),
                    _buildStatChip('Hatalı', stats['failed'], Colors.red),
                  ],
                ),
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, _) => const SizedBox.shrink(),
          ),

          // Filtreler
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Başlık veya mesaj ara...',
                      prefixIcon: const Icon(Icons.search, size: 18),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      isDense: true,
                    ),
                    onSubmitted: (_) => _updateFilters(),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: DropdownButtonFormField<String>(
                    initialValue: _selectedStatus,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 10,
                      ),
                      isDense: true,
                    ),
                    items: const [
                      DropdownMenuItem(value: '', child: Text('Tümü', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 'completed', child: Text('Tamamlandı', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 'processing', child: Text('İşleniyor', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 'pending', child: Text('Bekliyor', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 'failed', child: Text('Hatalı', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 'cancelled', child: Text('İptal', style: TextStyle(fontSize: 13))),
                    ],
                    onChanged: (value) {
                      _selectedStatus = value ?? '';
                      _updateFilters();
                    },
                  ),
                ),
              ],
            ),
          ),

          // Liste
          Expanded(
            child: historyAsync.when(
              data: (data) {
                final rawList = data['scheduled_sms'] ??
                    data['data']?['scheduled_sms'] ??
                    data['data'] ??
                    (data is List ? data : []);
                final history = List<Map<String, dynamic>>.from(
                    (rawList is List ? rawList : []).whereType<Map<String, dynamic>>());

                if (history.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.sms_failed_outlined,
                            size: 48, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        Text(
                          'SMS geçmişi bulunamadı',
                          style: TextStyle(
                              color: Colors.grey.shade600, fontSize: 15),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(smsHistoryProvider);
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: history.length,
                    itemBuilder: (context, index) {
                      final item = history[index];
                      final isFailed = item['status'] == 'failed';

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: AppCard(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () => _showDetail(item),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          item['title']?.toString() ?? 'Başlıksız',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      _getStatusWidget(
                                        item['status']?.toString() ?? '',
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    item['message']?.toString() ?? '',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: Colors.grey.shade700,
                                      fontSize: 12,
                                    ),
                                  ),
                                  if (isFailed && item['error_message'] != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      'Hata: ${item['error_message']}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: Colors.red.shade700,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.people_outline,
                                        size: 13,
                                        color: Colors.grey.shade500,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        _getRecipientLabel(
                                          item['recipient_type']?.toString() ?? '',
                                        ),
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                      const SizedBox(width: 14),
                                      Icon(
                                        Icons.schedule,
                                        size: 13,
                                        color: Colors.grey.shade500,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        _formatDate(
                                          item['scheduled_at']?.toString(),
                                        ),
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                      const Spacer(),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline,
                                            size: 18, color: Colors.red),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                        onPressed: () => _deleteSms(item['id']),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Hata: $e'),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => ref.invalidate(smsHistoryProvider),
                      child: const Text('Tekrar Dene'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/sms/bulk-send'),
        icon: const Icon(Icons.send),
        label: const Text('Yeni SMS'),
      ),
    );
  }
}
