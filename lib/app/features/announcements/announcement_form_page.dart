import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'announcements_providers.dart';

class Role {
  final int id;
  final String name;
  final String displayName;
  final int userCount;

  Role({
    required this.id,
    required this.name,
    required this.displayName,
    required this.userCount,
  });
}

class AnnouncementFormPage extends ConsumerStatefulWidget {
  const AnnouncementFormPage({super.key});

  @override
  ConsumerState<AnnouncementFormPage> createState() =>
      _AnnouncementFormPageState();
}

class _AnnouncementFormPageState extends ConsumerState<AnnouncementFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _messageController = TextEditingController();
  bool _isLoading = false;
  List<Role> _roles = [];
  final List<int> _selectedRoleIds = [];
  bool _rolesLoading = true;

  // Schedule
  bool _isScheduled = false;
  DateTime? _scheduledDate;
  TimeOfDay? _scheduledTime;

  @override
  void initState() {
    super.initState();
    _fetchRoles();
  }

  Future<void> _fetchRoles() async {
    try {
      final repo = ref.read(announcementsRepositoryProvider);
      final response = await repo.getRoles();
      final data = response['value'] ?? response['data'] ?? [];
      final List<dynamic> rolesList = data is List ? data : [];

      if (mounted) {
        setState(() {
          _roles = rolesList
              .map(
                (r) => Role(
                  id: r['id'] as int,
                  name: r['name']?.toString() ?? '',
                  displayName:
                      r['display_name']?.toString() ??
                      r['name']?.toString() ??
                      '',
                  userCount: r['users_count'] ?? r['user_count'] ?? 0,
                ),
              )
              .toList();
          _rolesLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _rolesLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Roller yüklenemedi: $e')));
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit({required String status}) async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedRoleIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lütfen en az bir rol seçin')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final repo = ref.read(announcementsRepositoryProvider);

      String? scheduledAt;
      if (_isScheduled && _scheduledDate != null && _scheduledTime != null) {
        final dt = DateTime(
          _scheduledDate!.year,
          _scheduledDate!.month,
          _scheduledDate!.day,
          _scheduledTime!.hour,
          _scheduledTime!.minute,
        );
        scheduledAt = dt.toIso8601String();
      }

      await repo.create(
        title: _titleController.text.trim(),
        message: _messageController.text.trim(),
        roleIds: _selectedRoleIds,
        status: status,
        scheduledAt: scheduledAt,
      );

      if (mounted) {
        ref.invalidate(announcementsListProvider);
        Navigator.of(context).pop();
        final message = status == 'draft'
            ? 'Taslak kaydedildi'
            : status == 'scheduled'
            ? 'Duyuru planlandı'
            : 'Duyuru gönderildi';
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Hata: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _pickSchedule() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      helpText: 'Yayın Tarihi',
      cancelText: 'İptal',
      confirmText: 'Tamam',
    );
    if (date == null) return;
    if (!mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 9, minute: 0),
      helpText: 'Yayın Saati',
      cancelText: 'İptal',
      confirmText: 'Tamam',
    );
    if (time == null) return;
    if (!mounted) return;

    setState(() {
      _isScheduled = true;
      _scheduledDate = date;
      _scheduledTime = time;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Yeni Duyuru'),
        actions: [
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            )
          else
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'schedule') {
                  _pickSchedule().then((_) {
                    if (_isScheduled) _submit(status: 'scheduled');
                  });
                } else if (value == 'draft') {
                  _submit(status: 'draft');
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'schedule',
                  child: Row(
                    children: [
                      Icon(Icons.schedule, size: 20),
                      SizedBox(width: 8),
                      Text('Zamanla gönder'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'draft',
                  child: Row(
                    children: [
                      Icon(Icons.save, size: 20),
                      SizedBox(width: 8),
                      Text('Taslak kaydet'),
                    ],
                  ),
                ),
              ],
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Icon(Icons.more_vert),
              ),
            ),
          if (!_isLoading)
            TextButton.icon(
              onPressed: () => _submit(status: 'published'),
              icon: const Icon(Icons.send, color: Colors.white),
              label: const Text(
                'Gönder',
                style: TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Başlık
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Başlık',
                hintText: 'Duyuru başlığı',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.title),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Başlık gereklidir';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Mesaj
            TextFormField(
              controller: _messageController,
              decoration: const InputDecoration(
                labelText: 'Mesaj',
                hintText: 'Duyuru içeriği...',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
                prefixIcon: Icon(Icons.message),
              ),
              maxLines: 8,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Mesaj gereklidir';
                }
                return null;
              },
            ),
            const SizedBox(height: 24),

            // Rol Seçimi
            Text(
              'Kimlere Gönderilsin? (Duyuru)',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'En az bir rol seçmelisiniz',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: Colors.grey),
            ),
            const SizedBox(height: 8),

            if (_rolesLoading)
              const Center(child: CircularProgressIndicator())
            else if (_roles.isEmpty)
              const Text('Roller yüklenemedi')
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _roles.map((role) {
                  final isSelected = _selectedRoleIds.contains(role.id);
                  return FilterChip(
                    label: Text('${role.displayName} (${role.userCount})'),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        if (selected) {
                          _selectedRoleIds.add(role.id);
                        } else {
                          _selectedRoleIds.remove(role.id);
                        }
                      });
                    },
                    selectedColor: Theme.of(context).primaryColor.withAlpha(32),
                    checkmarkColor: Theme.of(context).primaryColor,
                  );
                }).toList(),
              ),

            const SizedBox(height: 24),

            // Zamanlı Gönderim Bilgisi
            if (_isScheduled &&
                _scheduledDate != null &&
                _scheduledTime != null)
              Card(
                color: Colors.blue.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Icon(Icons.schedule, color: Colors.blue.shade700),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Planlanan yayın: ${_scheduledDate!.day}.${_scheduledDate!.month}.${_scheduledDate!.year} ${_scheduledTime!.hour.toString().padLeft(2, '0')}:${_scheduledTime!.minute.toString().padLeft(2, '0')}',
                          style: TextStyle(color: Colors.blue.shade700),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () {
                          setState(() {
                            _isScheduled = false;
                            _scheduledDate = null;
                            _scheduledTime = null;
                          });
                        },
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
}
