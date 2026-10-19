import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'scholarship_providers.dart';

/// Bursluluk Sınavı Formu
/// Web sitesindeki ScholarshipExamForm.tsx ile birebir aynı
class ScholarshipFormPage extends ConsumerStatefulWidget {
  final int? examId;

  const ScholarshipFormPage({super.key, this.examId});

  @override
  ConsumerState<ScholarshipFormPage> createState() =>
      _ScholarshipFormPageState();
}

class _ScholarshipFormPageState extends ConsumerState<ScholarshipFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  final _maxCapacityController = TextEditingController();

  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  bool _isActive = true;
  bool _isLoading = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    if (widget.examId != null) {
      _loadExam();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    _maxCapacityController.dispose();
    super.dispose();
  }

  Future<void> _loadExam() async {
    setState(() => _isLoading = true);

    try {
      final repo = ref.read(scholarshipRepositoryProvider);
      final exam = await repo.getExamById(widget.examId!);

      _titleController.text = exam['title']?.toString() ?? '';
      _descriptionController.text = exam['description']?.toString() ?? '';
      _locationController.text = exam['location']?.toString() ?? '';
      _maxCapacityController.text = exam['max_capacity']?.toString() ?? '';
      _isActive = exam['is_active'] ?? true;

      final examDate = exam['exam_date']?.toString();
      if (examDate != null && examDate.isNotEmpty) {
        _selectedDate = DateTime.tryParse(examDate);
      }

      final examTime = exam['exam_time']?.toString();
      if (examTime != null && examTime.isNotEmpty) {
        final parts = examTime.split(':');
        if (parts.length >= 2) {
          _selectedTime = TimeOfDay(
            hour: int.tryParse(parts[0]) ?? 0,
            minute: int.tryParse(parts[1]) ?? 0,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Sınav yüklenirken hata: $e')));
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _selectTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime ?? const TimeOfDay(hour: 9, minute: 0),
    );
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final repo = ref.read(scholarshipRepositoryProvider);

      final examDate = _selectedDate != null
          ? '${_selectedDate!.year.toString().padLeft(4, '0')}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}'
          : null;

      final examTime = _selectedTime != null
          ? '${_selectedTime!.hour.toString().padLeft(2, '0')}:${_selectedTime!.minute.toString().padLeft(2, '0')}'
          : null;

      if (widget.examId != null) {
        // Güncelle
        await repo.updateExam(
          id: widget.examId!,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          examDate: examDate,
          examTime: examTime,
          location: _locationController.text.trim().isEmpty
              ? null
              : _locationController.text.trim(),
          maxCapacity: _maxCapacityController.text.isEmpty
              ? null
              : int.tryParse(_maxCapacityController.text),
          isActive: _isActive,
        );
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Sınav güncellendi')));
        }
      } else {
        // Oluştur
        await repo.createExam(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          examDate: examDate,
          examTime: examTime,
          location: _locationController.text.trim().isEmpty
              ? null
              : _locationController.text.trim(),
          maxCapacity: _maxCapacityController.text.isEmpty
              ? null
              : int.tryParse(_maxCapacityController.text),
          isActive: _isActive,
        );
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Sınav oluşturuldu')));
        }
      }

      if (mounted) {
        context.pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Kaydetme hatası: $e')));
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.examId != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Sınavı Düzenle' : 'Yeni Sınav Oluştur'),
        actions: [
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.all(16),
              child: CircularProgressIndicator(color: Colors.white),
            )
          else
            TextButton(
              onPressed: _save,
              child: const Text(
                'Kaydet',
                style: TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Sınav Adı
                    TextFormField(
                      controller: _titleController,
                      decoration: const InputDecoration(
                        labelText: 'Sınav Adı *',
                        hintText: 'Örn: 2024 Bursluluk ve Giriş Sınavı',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Sınav adı gereklidir';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Açıklama
                    TextFormField(
                      controller: _descriptionController,
                      decoration: const InputDecoration(
                        labelText: 'Açıklama',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 16),

                    // Sınav Tarihi ve Saati
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: _selectDate,
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: 'Sınav Tarihi',
                                border: OutlineInputBorder(),
                              ),
                              child: Text(
                                _selectedDate != null
                                    ? '${_selectedDate!.day.toString().padLeft(2, '0')}.${_selectedDate!.month.toString().padLeft(2, '0')}.${_selectedDate!.year}'
                                    : 'Seçiniz',
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: InkWell(
                            onTap: _selectTime,
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: 'Sınav Saati',
                                border: OutlineInputBorder(),
                              ),
                              child: Text(
                                _selectedTime != null
                                    ? '${_selectedTime!.hour.toString().padLeft(2, '0')}:${_selectedTime!.minute.toString().padLeft(2, '0')}'
                                    : 'Seçiniz',
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Sınav Yeri
                    TextFormField(
                      controller: _locationController,
                      decoration: const InputDecoration(
                        labelText: 'Sınav Yeri',
                        hintText: 'Örn: Ana Kampüs - Konferans Salonu',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Kontenjan
                    TextFormField(
                      controller: _maxCapacityController,
                      decoration: const InputDecoration(
                        labelText: 'Kontenjan (Maksimum Başvuru)',
                        hintText: 'Boş bırakılırsa sınırsız',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 16),

                    // Aktif/Pasif
                    SwitchListTile(
                      title: const Text('Sınav Aktif'),
                      subtitle: const Text('Pasif sınavlara başvuru yapılamaz'),
                      value: _isActive,
                      onChanged: (value) => setState(() => _isActive = value),
                    ),
                    const SizedBox(height: 24),

                    // Kaydet Butonu
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _isSaving ? null : _save,
                        icon: _isSaving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.save),
                        label: Text(isEdit ? 'Güncelle' : 'Oluştur'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
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
