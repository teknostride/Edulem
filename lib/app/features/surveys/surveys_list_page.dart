import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client_provider.dart';
import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'surveys_providers.dart';

class SurveysListPage extends ConsumerStatefulWidget {
  const SurveysListPage({super.key});

  @override
  ConsumerState<SurveysListPage> createState() => _SurveysListPageState();
}

class _SurveysListPageState extends ConsumerState<SurveysListPage> {
  @override
  Widget build(BuildContext context) {
    final surveysAsync = ref.watch(surveysProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    // Role can be a String or a Map with 'name' key
    final rawRole = profile.valueOrNull?['role'];
    final role =
        (rawRole is Map
            ? rawRole['name']?.toString() ??
                  rawRole['key']?.toString() ??
                  rawRole['slug']?.toString()
            : rawRole?.toString()) ??
        '';
    final canManage =
        role == 'owner' ||
        role == 'Admin' ||
        role == 'Genel Müdür' ||
        role == 'Müdür' ||
        role == 'Müdür Yardımcısı';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Anketler'),
        actions: [
          if (canManage)
            IconButton(
              onPressed: () => context.push('/surveys/create'),
              icon: const Icon(Icons.add),
            ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: surveysAsync.when(
        data: (surveys) {
          if (surveys.isEmpty) {
            return _buildEmptyState();
          }

          final now = DateTime.now();
          final activeSurveys = surveys.where((s) {
            if (s['end_date'] == null) return true;
            final endDate = DateTime.tryParse(s['end_date'].toString());
            return endDate == null || endDate.isAfter(now);
          }).toList();

          final pastSurveys = surveys.where((s) {
            if (s['end_date'] == null) return false;
            final endDate = DateTime.tryParse(s['end_date'].toString());
            return endDate != null && endDate.isBefore(now);
          }).toList();

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(surveysProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (activeSurveys.isNotEmpty) ...[
                  _buildSectionTitle(
                    'Aktif Anketler',
                    Icons.play_circle_outline,
                  ),
                  const SizedBox(height: 12),
                  ...activeSurveys.map((s) => _buildSurveyCard(s, canManage)),
                  const SizedBox(height: 24),
                ],
                if (pastSurveys.isNotEmpty) ...[
                  _buildSectionTitle('Geçmiş Anketler', Icons.history),
                  const SizedBox(height: 12),
                  ...pastSurveys.map((s) => _buildSurveyCard(s, canManage)),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Hata: $e')),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.celebration, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          const Text(
            'Harika! Şu an cevaplamanız gereken\nbir anket bulunmuyor.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey[600]),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Colors.grey[800],
          ),
        ),
      ],
    );
  }

  Widget _buildSurveyCard(Map<String, dynamic> survey, bool canManage) {
    final title = (survey['title'] ?? 'Anket').toString();
    final description = (survey['description'] ?? '').toString();
    final endDate = survey['end_date']?.toString();
    final hasResponded = survey['has_user_responded'] == true;
    final isActive = survey['is_active'] == true;
    final id = survey['id'] as int?;
    final totalResponses = survey['total_responses'] ?? 0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.assignment, color: Colors.blue),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              title,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (hasResponded)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.green.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                'Cevaplandı',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.green,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      if (endDate != null)
                        Text(
                          'Son tarih: ${_formatDate(endDate)}',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (description.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 14, color: Colors.grey[600]),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                if (canManage) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '$totalResponses yanıt',
                      style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                    ),
                  ),
                  const Spacer(),
                  _buildStatusChip(isActive),
                  IconButton(
                    onPressed: () => _showSurveyMenu(survey),
                    icon: const Icon(Icons.more_vert),
                  ),
                ] else ...[
                  const Spacer(),
                  SizedBox(
                    width: 140,
                    child: ElevatedButton(
                      onPressed: hasResponded
                          ? null
                          : () => context.push('/surveys/$id'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: hasResponded
                            ? Colors.grey
                            : Colors.blue,
                      ),
                      child: Text(
                        hasResponded ? 'Tamamlandı' : 'Ankete Katıl',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isActive
            ? Colors.green.withValues(alpha: 0.1)
            : Colors.red.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        isActive ? 'Aktif' : 'Pasif',
        style: TextStyle(
          fontSize: 12,
          color: isActive ? Colors.green : Colors.red,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  void _showSurveyMenu(Map<String, dynamic> survey) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.edit),
              title: const Text('Düzenle'),
              onTap: () {
                Navigator.pop(context);
                context.push('/surveys/${survey['id']}/edit');
              },
            ),
            ListTile(
              leading: const Icon(Icons.bar_chart),
              title: const Text('Analiz'),
              onTap: () {
                Navigator.pop(context);
                context.push('/surveys/online/${survey['id']}/analysis');
              },
            ),
            ListTile(
              leading: const Icon(Icons.toggle_on),
              title: Text(
                survey['is_active'] == true ? 'Pasif Yap' : 'Aktif Yap',
              ),
              onTap: () {
                Navigator.pop(context);
                _toggleSurveyStatus(survey);
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete, color: Colors.red),
              title: const Text('Sil', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(context);
                _deleteSurvey(survey);
              },
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String dateStr) {
    final date = DateTime.tryParse(dateStr);
    if (date == null) return dateStr;
    return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
  }

  Future<void> _toggleSurveyStatus(Map<String, dynamic> survey) async {
    final id = survey['id'] as int?;
    if (id == null) return;

    final currentStatus = survey['is_active'] == true;
    final newStatus = !currentStatus;

    try {
      final api = ref.read(apiClientProvider);
      await api.putJson('/surveys/online/$id', data: {'is_active': newStatus});

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              newStatus ? 'Anket aktif edildi' : 'Anket pasif edildi',
            ),
            backgroundColor: newStatus ? Colors.green : Colors.orange,
          ),
        );
      }

      // Refresh list
      ref.invalidate(surveysProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Durum güncellenemedi: $e')));
      }
    }
  }

  Future<void> _deleteSurvey(Map<String, dynamic> survey) async {
    final id = survey['id'] as int?;
    final title = (survey['title'] ?? 'Anket').toString();
    if (id == null) return;

    // Confirm dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Anket Sil'),
        content: Text('"$title" anketini silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sil', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final api = ref.read(apiClientProvider);
      await api.deleteJson('/surveys/online/$id');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Anket başarıyla silindi'),
            backgroundColor: Colors.green,
          ),
        );
      }

      // Refresh list
      ref.invalidate(surveysProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Silme işlemi başarısız: $e')));
      }
    }
  }
}
