import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'sms_providers.dart';

class SmsTemplatesPage extends ConsumerStatefulWidget {
  const SmsTemplatesPage({super.key});

  @override
  ConsumerState<SmsTemplatesPage> createState() => _SmsTemplatesPageState();
}

class _SmsTemplatesPageState extends ConsumerState<SmsTemplatesPage> {
  @override
  Widget build(BuildContext context) {
    final sections = ref.watch(drawerSectionsProvider);
    final profile = ref.watch(profileProvider);
    final templatesAsync = ref.watch(smsTemplatesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('SMS Şablonları'),
        actions: [
          IconButton(
            onPressed: () => _showTemplateForm(context),
            icon: const Icon(Icons.add),
            tooltip: 'Yeni Şablon',
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: templatesAsync.when(
        data: (data) {
          final rawList = data['templates'] ??
              data['data']?['templates'] ??
              data['data'] ??
              (data is List ? data : []);
          final templates = List<Map<String, dynamic>>.from(
              (rawList is List ? rawList : []).whereType<Map<String, dynamic>>());
          if (templates.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.message_outlined,
                    size: 64,
                    color: Colors.grey.shade400,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Henüz şablon yok',
                    style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton.icon(
                    onPressed: () => _showTemplateForm(context),
                    icon: const Icon(Icons.add),
                    label: const Text('Şablon Oluştur'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(smsTemplatesProvider);
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: templates.length,
              itemBuilder: (context, index) {
                final template = templates[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: AppCard(
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(16),
                      title: Row(
                        children: [
                          Expanded(
                            child: Text(
                              template['name']?.toString() ?? 'İsimsiz',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          if (template['is_active'] == false)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                'Pasif',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ),
                        ],
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 8),
                          Text(
                            template['content']?.toString() ?? '',
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '${template['content']?.toString().length ?? 0} karakter',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            onPressed: () =>
                                _showTemplateForm(context, template: template),
                            icon: const Icon(Icons.edit),
                          ),
                          IconButton(
                            onPressed: () => _deleteTemplate(template['id']),
                            icon: const Icon(Icons.delete, color: Colors.red),
                          ),
                        ],
                      ),
                      onTap: () => _showTemplatePreview(context, template),
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
                onPressed: () => ref.invalidate(smsTemplatesProvider),
                child: const Text('Tekrar Dene'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showTemplatePreview(
    BuildContext context,
    Map<String, dynamic> template,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(template['name']?.toString() ?? 'Şablon'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(template['content']?.toString() ?? ''),
              ),
              const SizedBox(height: 16),
              Text(
                '${template['content']?.toString().length ?? 0} karakter',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Kapat'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _showTemplateForm(context, template: template);
            },
            child: const Text('Düzenle'),
          ),
        ],
      ),
    );
  }

  void _showTemplateForm(
    BuildContext context, {
    Map<String, dynamic>? template,
  }) {
    final isEditing = template != null;
    final nameController = TextEditingController(
      text: template?['name']?.toString() ?? '',
    );
    final contentController = TextEditingController(
      text: template?['content']?.toString() ?? '',
    );
    var isActive = template?['is_active'] ?? true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return DraggableScrollableSheet(
              initialChildSize: 0.8,
              maxChildSize: 0.9,
              minChildSize: 0.5,
              expand: false,
              builder: (context, scrollController) {
                return Container(
                  padding: const EdgeInsets.all(16),
                  child: ListView(
                    controller: scrollController,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            isEditing ? 'Şablonu Düzenle' : 'Yeni Şablon',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: nameController,
                        decoration: const InputDecoration(
                          labelText: 'Şablon Adı',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: contentController,
                        decoration: const InputDecoration(
                          labelText: 'Mesaj İçeriği',
                          border: OutlineInputBorder(),
                          counterText: 'Maksimum 160 karakter önerilir',
                        ),
                        maxLines: 6,
                      ),
                      const SizedBox(height: 16),
                      SwitchListTile(
                        title: const Text('Aktif'),
                        subtitle: const Text(
                          'Pasif şablonlar listede görünmez',
                        ),
                        value: isActive,
                        onChanged: (value) => setState(() => isActive = value),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () async {
                            final name = nameController.text.trim();
                            final content = contentController.text.trim();

                            if (name.isEmpty || content.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Tüm alanları doldurun'),
                                ),
                              );
                              return;
                            }

                            try {
                              final repo = ref.read(smsRepositoryProvider);
                              if (isEditing) {
                                await repo.updateSmsTemplate(
                                  template['id'],
                                  name: name,
                                  content: content,
                                  isActive: isActive,
                                );
                              } else {
                                await repo.createSmsTemplate(
                                  name: name,
                                  content: content,
                                  isActive: isActive,
                                );
                              }

                              if (mounted && context.mounted) {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      isEditing
                                          ? 'Şablon güncellendi'
                                          : 'Şablon oluşturuldu',
                                    ),
                                  ),
                                );
                                ref.invalidate(smsTemplatesProvider);
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Hata: $e')),
                                );
                              }
                            }
                          },
                          child: Text(isEditing ? 'Güncelle' : 'Oluştur'),
                        ),
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

  Future<void> _deleteTemplate(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Şablon Sil'),
        content: const Text('Bu şablonu silmek istediğinize emin misiniz?'),
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
        await repo.deleteSmsTemplate(id);
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Şablon silindi')));
        }
        ref.invalidate(smsTemplatesProvider);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Silme hatası: $e')));
        }
      }
    }
  }
}
