import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../students/students_providers.dart';
import 'templates_providers.dart';
import 'bulletins_providers.dart';

class BulletinFormPage extends ConsumerStatefulWidget {
  final int? id;

  const BulletinFormPage({super.key, this.id});

  @override
  ConsumerState<BulletinFormPage> createState() => _BulletinFormPageState();
}

class _BulletinFormPageState extends ConsumerState<BulletinFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  final _dateController = TextEditingController();
  String _category = 'Academic';
  String? _studentId;
  String? _templateId;
  bool _isPublishedToGuardian = false;
  bool _isAddedToPortfolio = false;
  bool _isLoading = false;
  bool _isFetching = false;

  @override
  void initState() {
    super.initState();
    _dateController.text = DateTime.now().toString().split('T')[0];
    if (widget.id != null) {
      _fetchBulletin();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  Future<void> _fetchBulletin() async {
    setState(() => _isFetching = true);
    try {
      final bulletin = await ref.read(
        bulletinDetailProvider(widget.id!).future,
      );
      _titleController.text = bulletin['title']?.toString() ?? '';
      _contentController.text = bulletin['content']?.toString() ?? '';
      _dateController.text = bulletin['bulletin_date']?.toString() ?? '';
      _category = bulletin['category']?.toString() ?? 'Academic';
      _studentId = bulletin['student_id']?.toString();
      _templateId = bulletin['template_id']?.toString();
      _isPublishedToGuardian = bulletin['is_published_to_guardian'] == true;
      _isAddedToPortfolio = bulletin['is_added_to_portfolio'] == true;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Bülten bilgileri yüklenemedi: $e')),
        );
        context.pop();
      }
    } finally {
      setState(() => _isFetching = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      final data = {
        'title': _titleController.text,
        'content': _contentController.text,
        'bulletin_date': _dateController.text,
        'category': _category,
        'student_id': _studentId,
        'template_id': _templateId,
        'is_published_to_guardian': _isPublishedToGuardian,
        'is_added_to_portfolio': _isAddedToPortfolio,
      };

      if (widget.id != null) {
        await ref
            .read(bulletinsRepositoryProvider)
            .updateBulletin(widget.id!, data);
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Bülten güncellendi')));
        }
      } else {
        await ref.read(bulletinsRepositoryProvider).createBulletin(data);
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Bülten oluşturuldu')));
        }
      }
      if (mounted) {
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('İşlem sırasında bir hata oluştu: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final studentsAsync = ref.watch(studentsListProvider);
    final templatesAsync = ref.watch(templatesListProvider);

    if (_isFetching) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.id != null ? 'Bülteni Düzenle' : 'Yeni Bülten Oluştur',
        ),
        actions: [
          IconButton(
            onPressed: _isLoading ? null : _submit,
            icon: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.save),
            tooltip: 'Kaydet',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Bülten Başlığı',
                  hintText: 'Örn: 1. Dönem Sosyal Gelişim Bülteni',
                  border: OutlineInputBorder(),
                ),
                validator: (value) =>
                    value?.isEmpty ?? true ? 'Başlık zorunludur' : null,
              ),
              const SizedBox(height: 16),

              // Date
              TextFormField(
                controller: _dateController,
                decoration: const InputDecoration(
                  labelText: 'Tarih',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.calendar_today),
                ),
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime(2020),
                    lastDate: DateTime(2030),
                  );
                  if (date != null) {
                    _dateController.text =
                        '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                  }
                },
                validator: (value) =>
                    value?.isEmpty ?? true ? 'Tarih zorunludur' : null,
              ),
              const SizedBox(height: 16),

              // Category
              DropdownButtonFormField<String>(
                initialValue: _category,
                decoration: const InputDecoration(
                  labelText: 'Kategori',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(
                    value: 'Academic',
                    child: Text('Akademik Değerlendirme'),
                  ),
                  DropdownMenuItem(
                    value: 'Social',
                    child: Text('Sosyal Gelişim'),
                  ),
                  DropdownMenuItem(
                    value: 'Institutional',
                    child: Text('Kurumsal Haber'),
                  ),
                ],
                onChanged: (value) =>
                    setState(() => _category = value ?? 'Academic'),
              ),
              const SizedBox(height: 16),

              // Student
              DropdownButtonFormField<String>(
                initialValue: _studentId,
                decoration: const InputDecoration(
                  labelText: 'İlgili Öğrenci (Genel ise boş bırakın)',
                  border: OutlineInputBorder(),
                ),
                hint: const Text('-- Genel Bülten --'),
                items: studentsAsync.when(
                  data: (students) => [
                    const DropdownMenuItem(
                      value: '',
                      child: Text('-- Genel Bülten --'),
                    ),
                    ...students.map(
                      (s) => DropdownMenuItem(
                        value: s['id']?.toString(),
                        child: Text(s['name']?.toString() ?? ''),
                      ),
                    ),
                  ],
                  loading: () => [],
                  error: (_, _) => [],
                ),
                onChanged: (value) => setState(() => _studentId = value),
              ),
              const SizedBox(height: 16),

              // Template
              DropdownButtonFormField<String>(
                initialValue: _templateId,
                decoration: const InputDecoration(
                  labelText: 'Bülten Şablonu (Opsiyonel)',
                  border: OutlineInputBorder(),
                ),
                hint: const Text('Düz Metin'),
                items: templatesAsync.when(
                  data: (templates) => [
                    const DropdownMenuItem(value: '', child: Text('Düz Metin')),
                    ...templates.map(
                      (t) => DropdownMenuItem(
                        value: t['id']?.toString(),
                        child: Text(t['name']?.toString() ?? ''),
                      ),
                    ),
                  ],
                  loading: () => [],
                  error: (_, _) => [],
                ),
                onChanged: (value) => setState(() => _templateId = value),
              ),
              const SizedBox(height: 16),

              // Content
              TextFormField(
                controller: _contentController,
                maxLines: 12,
                decoration: const InputDecoration(
                  labelText: 'Bülten İçeriği',
                  hintText: 'Detaylı bülten içeriğini buraya girin...',
                  border: OutlineInputBorder(),
                ),
                validator: (value) =>
                    value?.isEmpty ?? true ? 'İçerik zorunludur' : null,
              ),
              const SizedBox(height: 24),

              // Checkboxes
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      CheckboxListTile(
                        title: const Text('Velilere Yayınla'),
                        value: _isPublishedToGuardian,
                        onChanged: (value) => setState(
                          () => _isPublishedToGuardian = value ?? false,
                        ),
                      ),
                      CheckboxListTile(
                        title: const Text('Portfolyoya Ekle'),
                        value: _isAddedToPortfolio,
                        onChanged: _studentId != null && _studentId!.isNotEmpty
                            ? (value) => setState(
                                () => _isAddedToPortfolio = value ?? false,
                              )
                            : null,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Submit button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          widget.id != null
                              ? 'Bilgileri Güncelle'
                              : 'Bülteni Kaydet',
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
