import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'sms_providers.dart';

class SmsBulkSendPage extends ConsumerStatefulWidget {
  const SmsBulkSendPage({super.key});

  @override
  ConsumerState<SmsBulkSendPage> createState() => _SmsBulkSendPageState();
}

class _SmsBulkSendPageState extends ConsumerState<SmsBulkSendPage> {
  String _targetType = 'classroom';
  final List<int> _selectedTargets = [];
  final _titleController = TextEditingController();
  final _messageController = TextEditingController();
  final _scheduledAtController = TextEditingController();
  final _manualPhonesController = TextEditingController();
  String? _selectedTemplateId;
  bool _isSending = false;
  int _charCount = 0;
  int _smsCount = 1;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _messageController.addListener(_updateCharCount);
  }

  @override
  void dispose() {
    _messageController.removeListener(_updateCharCount);
    _titleController.dispose();
    _messageController.dispose();
    _scheduledAtController.dispose();
    _manualPhonesController.dispose();
    super.dispose();
  }

  void _updateCharCount() {
    final text = _messageController.text;
    final count = text.length;
    setState(() {
      _charCount = count;
      _smsCount = count <= 160 ? 1 : ((count / 153).ceil());
    });
  }

  List<String> _parseManualPhones() {
    return _manualPhonesController.text
        .split(RegExp(r'[\n,;]+'))
        .map((p) => p.replaceAll(RegExp(r'[^0-9]'), '').trim())
        .where((p) => p.length >= 10)
        .toList();
  }

  Future<void> _sendSms() async {
    if (_messageController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lütfen mesaj yazın')),
      );
      return;
    }

    List<int> recipientIds = [];
    List<String> recipientPhones = [];

    if (_targetType == 'all') {
      // no ids needed
    } else if (_targetType == 'phones') {
      recipientPhones = _parseManualPhones();
      if (recipientPhones.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Lütfen geçerli en az bir telefon numarası girin (örn: 905XXXXXXXXX)'),
          ),
        );
        return;
      }
    } else {
      if (_selectedTargets.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lütfen en az bir hedef seçin')),
        );
        return;
      }
      recipientIds = _selectedTargets;
    }

    setState(() => _isSending = true);

    try {
      final repo = ref.read(smsRepositoryProvider);

      await repo.sendBulkSms(
        title: _titleController.text.trim().isNotEmpty
            ? _titleController.text.trim()
            : null,
        message: _messageController.text.trim(),
        recipientType: _targetType,
        recipientIds: recipientIds,
        recipientPhones: recipientPhones,
        scheduledAt: _scheduledAtController.text.isEmpty
            ? null
            : _scheduledAtController.text,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('SMS gönderim işlemi başarıyla başlatıldı'),
            backgroundColor: Colors.green,
          ),
        );
        // Reset form
        _titleController.clear();
        _messageController.clear();
        _scheduledAtController.clear();
        _manualPhonesController.clear();
        setState(() {
          _selectedTargets.clear();
          _selectedTemplateId = null;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gönderim hatası: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  void _selectAll(List<Map<String, dynamic>> targets) {
    setState(() {
      _selectedTargets.clear();
      for (final t in targets) {
        final id = t['id'];
        if (id != null) {
          _selectedTargets.add(id is int ? id : int.parse(id.toString()));
        }
      }
    });
  }

  void _toggleTarget(int id) {
    setState(() {
      if (_selectedTargets.contains(id)) {
        _selectedTargets.remove(id);
      } else {
        _selectedTargets.add(id);
      }
    });
  }

  String _getTargetName(Map<String, dynamic> item) {
    final firstName = item['first_name']?.toString() ?? '';
    final lastName = item['last_name']?.toString() ?? '';
    if (firstName.isNotEmpty || lastName.isNotEmpty) {
      return '$firstName $lastName'.trim();
    }
    return item['name']?.toString() ?? 'İsimsiz';
  }

  String _getTargetSubtext(Map<String, dynamic> item) {
    if (item['branch'] != null) {
      return 'Branş: ${item['branch']['name'] ?? ''}';
    }
    if (item['classroom'] != null) {
      return item['classroom']['name']?.toString() ?? '';
    }
    if (item['phone'] != null) {
      return 'Tel: ${item['phone']}';
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final sections = ref.watch(drawerSectionsProvider);
    final profile = ref.watch(profileProvider);
    final templatesAsync = ref.watch(smsTemplatesProvider);

    AsyncValue<List<Map<String, dynamic>>> targetsAsync;
    switch (_targetType) {
      case 'classroom':
        targetsAsync = ref.watch(smsClassroomsProvider);
        break;
      case 'students':
        targetsAsync = ref.watch(smsStudentsProvider);
        break;
      case 'users':
        targetsAsync = ref.watch(smsTeachersProvider);
        break;
      default:
        targetsAsync = const AsyncValue.data([]);
    }

    final showTargetList =
        _targetType != 'all' && _targetType != 'phones';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Toplu SMS Gönderimi'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'SMS Geçmişi',
            onPressed: () => Navigator.pushReplacementNamed(context, '/sms/history'),
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 1. Alıcı Grubu ──────────────────────────────────────────
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.people, color: colorScheme.primary, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        '1. Alıcı Grubu Seçimi',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Gönderim Türü
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: _targetType,
                    decoration: InputDecoration(
                      labelText: 'Gönderim Türü',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'classroom',
                        child: Text(
                          'Sınıf Bazlı (Tüm Sınıf Velileri & Öğrencileri)',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      DropdownMenuItem(
                        value: 'students',
                        child: Text(
                          'Öğrenci & Veli Bazlı',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      DropdownMenuItem(
                        value: 'users',
                        child: Text(
                          'Öğretmen & Personel Bazlı',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      DropdownMenuItem(
                        value: 'all',
                        child: Text(
                          'Tüm Okul (Tüm Veliler & Öğrenciler)',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      DropdownMenuItem(
                        value: 'phones',
                        child: Text(
                          'Manuel Telefon Numaraları',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _targetType = value;
                          _selectedTargets.clear();
                          _searchQuery = '';
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 12),

                  // Tüm Okul info
                  if (_targetType == 'all')
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.blue.shade200),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.info_outline,
                              color: Colors.blue.shade700, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Bu seçenek sistemde kayıtlı olan tüm velilere ve öğrencilere toplu SMS gönderecektir. Ek hedef seçimi gerekmez.',
                              style: TextStyle(
                                  color: Colors.blue.shade800, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Manuel Telefon
                  if (_targetType == 'phones') ...[
                    const Text(
                      'Telefon Numaraları',
                      style: TextStyle(fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _manualPhonesController,
                      maxLines: 6,
                      decoration: InputDecoration(
                        hintText:
                            'Her satıra bir numara veya virgülle ayırarak yazın:\n905XXXXXXXXX\n905YYYYYYYYY',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Format: 905XXXXXXXXX (Başında 90 veya 0 olabilir).',
                      style: TextStyle(
                          fontSize: 11, color: Colors.grey.shade600),
                    ),
                  ],

                  // Liste Bazlı Seçim
                  if (showTargetList) ...[
                    // Arama + Tümünü Seç
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            decoration: InputDecoration(
                              hintText: 'Ara...',
                              prefixIcon: const Icon(Icons.search, size: 18),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 8),
                              isDense: true,
                            ),
                            onChanged: (v) =>
                                setState(() => _searchQuery = v.toLowerCase()),
                          ),
                        ),
                        const SizedBox(width: 8),
                        TextButton(
                          onPressed: () => targetsAsync.when(
                            data: (targets) => _selectAll(_filterTargets(targets)),
                            loading: () {},
                            error: (_, _) {},
                          ),
                          child: Text(
                            _selectedTargets.isNotEmpty
                                ? 'Temizle'
                                : 'Tümünü Seç',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        targetsAsync.when(
                          data: (t) => Text(
                            '${_filterTargets(t).length} kayıt',
                            style: TextStyle(
                                fontSize: 11, color: Colors.grey.shade600),
                          ),
                          loading: () => const SizedBox(),
                          error: (_, _) => const SizedBox(),
                        ),
                        Text(
                          'Seçilen: ${_selectedTargets.length}',
                          style: TextStyle(
                              fontSize: 11, color: colorScheme.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    Container(
                      height: 220,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: targetsAsync.when(
                        data: (targets) {
                          final filtered = _filterTargets(targets);
                          if (filtered.isEmpty) {
                            return Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.search_off,
                                      color: Colors.grey.shade400, size: 32),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Kayıt bulunamadı',
                                    style: TextStyle(
                                        color: Colors.grey.shade500),
                                  ),
                                ],
                              ),
                            );
                          }
                          return ListView.builder(
                            itemCount: filtered.length,
                            itemBuilder: (context, index) {
                              final target = filtered[index];
                              final id = target['id'] is int
                                  ? target['id'] as int
                                  : int.parse(target['id'].toString());
                              final isSelected =
                                  _selectedTargets.contains(id);
                              final subtext = _getTargetSubtext(target);

                              return InkWell(
                                onTap: () => _toggleTarget(id),
                                child: Container(
                                  color: isSelected
                                      ? colorScheme.primary.withAlpha(20)
                                      : null,
                                  child: CheckboxListTile(
                                    value: isSelected,
                                    onChanged: (_) => _toggleTarget(id),
                                    dense: true,
                                    title: Text(
                                      _getTargetName(target),
                                      style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w500),
                                    ),
                                    subtitle: subtext.isNotEmpty
                                        ? Text(
                                            subtext,
                                            style: TextStyle(
                                                fontSize: 11,
                                                color:
                                                    Colors.grey.shade600),
                                          )
                                        : null,
                                    activeColor: colorScheme.primary,
                                  ),
                                ),
                              );
                            },
                          );
                        },
                        loading: () => const Center(
                            child: CircularProgressIndicator()),
                        error: (e, _) => Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.error_outline,
                                  color: Colors.red.shade300),
                              const SizedBox(height: 8),
                              Text('Hata: $e',
                                  style: const TextStyle(fontSize: 12)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // ── 2. Mesaj İçeriği ─────────────────────────────────────────
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.mail_outline,
                          color: colorScheme.primary, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        '2. Mesaj İçeriği & Planlama',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Görev Başlığı
                  TextField(
                    controller: _titleController,
                    decoration: InputDecoration(
                      labelText: 'Görev Başlığı (Takip İçin)',
                      hintText: 'Örn: 1. Dönem Veli Toplantısı Duyurusu',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Şablon Seçimi
                  templatesAsync.when(
                    data: (data) {
                      final rawTemplates = data['templates'] ??
                          data['data']?['templates'] ??
                          data['data'] ??
                          (data is List ? data : []);
                      final templates = List<Map<String, dynamic>>.from(
                          (rawTemplates is List ? rawTemplates : [])
                              .whereType<Map<String, dynamic>>());
                      if (templates.isEmpty) return const SizedBox.shrink();

                      return DropdownButtonFormField<String>(
                        isExpanded: true,
                        initialValue: _selectedTemplateId,
                        decoration: InputDecoration(
                          labelText: 'SMS Şablonu (Opsiyonel)',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        items: [
                          const DropdownMenuItem(
                            value: null,
                            child: Text(
                              'Manuel Mesaj Yaz',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          ...templates.map<DropdownMenuItem<String>>((t) {
                            return DropdownMenuItem(
                              value: t['id'].toString(),
                              child: Text(
                                t['name']?.toString() ?? 'İsimsiz',
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }),
                        ],
                        onChanged: (value) {
                          setState(() {
                            _selectedTemplateId = value;
                            if (value != null) {
                              final template = templates.firstWhere(
                                (t) => t['id'].toString() == value,
                                orElse: () => {},
                              );
                              if (template.isNotEmpty) {
                                _messageController.text =
                                    template['content']?.toString() ?? '';
                                if (_titleController.text.isEmpty) {
                                  _titleController.text =
                                      template['name']?.toString() ?? '';
                                }
                              }
                            } else {
                              _messageController.clear();
                            }
                          });
                        },
                      );
                    },
                    loading: () => const SizedBox.shrink(),
                    error: (_, _) => const SizedBox.shrink(),
                  ),
                  const SizedBox(height: 12),

                  // Mesaj Metni
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Mesaj Metni *',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _charCount > 160
                              ? Colors.orange.shade100
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: _charCount > 160
                                ? Colors.orange.shade300
                                : Colors.grey.shade300,
                          ),
                        ),
                        child: Text(
                          '$_charCount Karakter / $_smsCount SMS',
                          style: TextStyle(
                            fontSize: 11,
                            color: _charCount > 160
                                ? Colors.orange.shade800
                                : Colors.grey.shade700,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _messageController,
                    maxLines: 7,
                    decoration: InputDecoration(
                      hintText: 'Göndermek istediğiniz SMS mesajını buraya yazın...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline,
                            size: 14, color: colorScheme.primary),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Türkçe karakterler İleti Bilgi Türkçe Encoding standardında iletilir.',
                            style: TextStyle(
                                fontSize: 11, color: Colors.grey.shade600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Gönderim Zamanı
                  TextField(
                    controller: _scheduledAtController,
                    readOnly: true,
                    decoration: InputDecoration(
                      labelText: 'Gönderim Zamanı (İleri Tarihli Planlama)',
                      hintText: 'Boş bırakılırsa hemen gönderilir',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      suffixIcon: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_scheduledAtController.text.isNotEmpty)
                            IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              tooltip: 'Hemen Gönder',
                              onPressed: () => setState(
                                  () => _scheduledAtController.clear()),
                            ),
                          const Icon(Icons.calendar_month),
                        ],
                      ),
                    ),
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now()
                            .add(const Duration(days: 365)),
                      );
                      if (date != null && mounted) {
                        final time = await showTimePicker(
                          // ignore: use_build_context_synchronously
                          context: context,
                          initialTime: TimeOfDay.now(),
                        );
                        if (time != null && mounted) {
                          final scheduled = DateTime(date.year, date.month,
                              date.day, time.hour, time.minute);
                          setState(() {
                            _scheduledAtController.text =
                                scheduled.toIso8601String().substring(0, 16);
                          });
                        }
                      }
                    },
                  ),
                  if (_scheduledAtController.text.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Boş bırakılırsa SMS hemen gönderilir.',
                        style: TextStyle(
                            fontSize: 11, color: Colors.grey.shade600),
                      ),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Gönder Butonu
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _isSending ? null : _sendSms,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: _isSending
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.send),
                label: Text(
                  _isSending
                      ? 'Gönderim Başlatılıyor...'
                      : (_scheduledAtController.text.isNotEmpty
                          ? 'SMS Görevini Planla'
                          : "SMS'leri Hemen Gönder"),
                  style: const TextStyle(fontSize: 16),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _filterTargets(
      List<Map<String, dynamic>> targets) {
    if (_searchQuery.isEmpty) return targets;
    return targets.where((t) {
      final name = _getTargetName(t).toLowerCase();
      final sub = _getTargetSubtext(t).toLowerCase();
      return name.contains(_searchQuery) || sub.contains(_searchQuery);
    }).toList();
  }
}
