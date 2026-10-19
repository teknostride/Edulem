import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../../core/network/api_client_provider.dart';
import '../profile/profile_providers.dart';
import 'tenant_providers.dart';

class TenantInfoPage extends ConsumerStatefulWidget {
  const TenantInfoPage({super.key});

  @override
  ConsumerState<TenantInfoPage> createState() => _TenantInfoPageState();
}

class _TenantInfoPageState extends ConsumerState<TenantInfoPage> {
  bool _isEditing = false;
  bool _isLoading = false;
  final _nameController = TextEditingController();
  final _domainController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _domainController.dispose();
    super.dispose();
  }

  Future<void> _saveChanges(Map<String, dynamic> institution) async {
    final name = _nameController.text.trim();
    final domain = _domainController.text.trim();

    if (name.isEmpty || domain.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Kurum adı ve domain zorunludur')),
        );
      }
      return;
    }

    setState(() => _isLoading = true);

    try {
      final api = ref.read(apiClientProvider);

      // Sadece metin güncelle (PUT /tenant/profile)
      await api.putJson(
        '/tenant/profile',
        data: {'name': name, 'domain': domain},
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kurum bilgileri güncellendi'),
            backgroundColor: Colors.green,
          ),
        );
        setState(() {
          _isEditing = false;
        });
        ref.invalidate(tenantProfileProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Güncelleme başarısız: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _cancelEdit(Map<String, dynamic> institution) {
    setState(() {
      _isEditing = false;
      _nameController.text = institution['name']?.toString() ?? '';
      _domainController.text = institution['domain']?.toString() ?? '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final institutionAsync = ref.watch(tenantProfileProvider);
    final statsAsync = ref.watch(tenantStatisticsProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final profile = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kurum Ayarları'),
        actions: [
          institutionAsync.when(
            data: (data) {
              final institution = data['data'] as Map<String, dynamic>? ?? data;
              if (_isEditing) {
                return Row(
                  children: [
                    IconButton(
                      onPressed: _isLoading
                          ? null
                          : () => _saveChanges(institution),
                      icon: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.check),
                    ),
                    IconButton(
                      onPressed: _isLoading
                          ? null
                          : () => _cancelEdit(institution),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                );
              } else {
                return IconButton(
                  onPressed: () {
                    setState(() {
                      _isEditing = true;
                      _nameController.text =
                          institution['name']?.toString() ?? '';
                      _domainController.text =
                          institution['domain']?.toString() ?? '';
                    });
                  },
                  icon: const Icon(Icons.edit),
                );
              }
            },
            loading: () => const SizedBox.shrink(),
            error: (_, _) => const SizedBox.shrink(),
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: institutionAsync.when(
        data: (data) {
          final institution = data['data'] as Map<String, dynamic>? ?? data;
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(tenantProfileProvider);
              ref.invalidate(tenantStatisticsProvider);
            },
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Kurum Bilgileri ve Logo
                  _buildInstitutionCard(institution),
                  const SizedBox(height: 20),

                  // İstatistikler
                  statsAsync.when(
                    data: (statsData) {
                      final stats =
                          statsData['data']?['statistics']
                              as Map<String, dynamic>? ??
                          {};
                      return _buildStatsCard(stats);
                    },
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (_, _) => const SizedBox.shrink(),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Kurum bilgileri yüklenemedi: $e'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(tenantProfileProvider),
                child: const Text('Tekrar Dene'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInstitutionCard(Map<String, dynamic> institution) {
    final name = institution['name']?.toString() ?? '';
    final domain = institution['domain']?.toString() ?? '';
    final isActive = institution['is_active'] == true;
    final studentCount = institution['student_count']?.toString() ?? '0';
    final logoUrl = institution['logo_url']?.toString();
    final subscriptionExpires = institution['subscription_expires_at']
        ?.toString();

    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Kurum Bilgileri',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),

            // Logo
            Row(
              children: [
                Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: logoUrl != null && logoUrl.isNotEmpty
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            logoUrl,
                            fit: BoxFit.contain,
                            errorBuilder: (_, _, _) =>
                                const Icon(Icons.school, size: 40),
                          ),
                        )
                      : const Icon(Icons.school, size: 40),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Kurum Adı
            if (_isEditing) ...[
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Kurum Adı',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _domainController,
                decoration: const InputDecoration(
                  labelText: 'Domain',
                  border: OutlineInputBorder(),
                  helperText: 'ornek.edulem.com',
                ),
              ),
            ] else ...[
              _buildInfoRow('Kurum Adı', name),
              _buildInfoRow('Domain', domain),
              _buildInfoRow(
                'Durum',
                isActive ? 'Aktif' : 'Pasif',
                valueColor: isActive ? Colors.green : Colors.grey,
              ),
              _buildInfoRow('Öğrenci Sayısı', studentCount),
              if (subscriptionExpires != null)
                _buildInfoRow(
                  'Abonelik Bitiş',
                  _formatDate(subscriptionExpires),
                ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatsCard(Map<String, dynamic> stats) {
    final campuses = stats['campuses'] ?? 0;
    final educationLevels = stats['education_levels'] ?? 0;
    final classrooms = stats['classrooms'] ?? 0;
    final students = stats['students'] ?? 0;
    final teachers = stats['teachers'] ?? 0;
    final staff = stats['staff'] ?? 0;

    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'İstatistikler',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 3,
              childAspectRatio: 1.0,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              children: [
                _buildStatItem(
                  Icons.apartment,
                  'Kampüs',
                  campuses.toString(),
                  Colors.blue,
                ),
                _buildStatItem(
                  Icons.school,
                  'Kademe',
                  educationLevels.toString(),
                  Colors.orange,
                ),
                _buildStatItem(
                  Icons.class_,
                  'Sınıf',
                  classrooms.toString(),
                  Colors.purple,
                ),
                _buildStatItem(
                  Icons.people,
                  'Öğrenci',
                  students.toString(),
                  Colors.green,
                ),
                _buildStatItem(
                  Icons.person_outline,
                  'Öğretmen',
                  teachers.toString(),
                  Colors.red,
                ),
                _buildStatItem(
                  Icons.work,
                  'Personel',
                  staff.toString(),
                  Colors.teal,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(
    IconData icon,
    String label,
    String value,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
          Text(
            label,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor}) {
    if (value.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: valueColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    final date = DateTime.tryParse(dateStr);
    if (date == null) return dateStr;
    return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
  }
}
