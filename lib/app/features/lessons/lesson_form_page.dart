import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../campuses/campuses_providers.dart';
import '../education_levels/education_levels_providers.dart'
    as education_levels_providers;
import 'lessons_providers.dart';

class LessonFormPage extends ConsumerStatefulWidget {
  const LessonFormPage({super.key, this.lessonId});

  final int? lessonId;

  bool get isEdit => lessonId != null && lessonId! > 0;

  @override
  ConsumerState<LessonFormPage> createState() => _LessonFormPageState();
}

class _LessonFormPageState extends ConsumerState<LessonFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _codeController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _weeklyHoursController = TextEditingController();

  int? _selectedEducationLevelId;
  int? _selectedCampusId;
  bool _isSaving = false;
  bool _prefilled = false;

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _descriptionController.dispose();
    _weeklyHoursController.dispose();
    super.dispose();
  }

  void _prefillFromData(Map<String, dynamic> lesson) {
    if (_prefilled) return;
    _nameController.text = (lesson['name'] ?? '').toString();
    _codeController.text = (lesson['code'] ?? '').toString();
    _descriptionController.text = (lesson['description'] ?? '').toString();
    _weeklyHoursController.text = (lesson['weekly_hours'] ?? '').toString();
    final levelId = lesson['education_level_id'] ?? lesson['educationLevelId'];
    if (levelId != null) {
      _selectedEducationLevelId = int.tryParse(levelId.toString());
    }
    final campusId = lesson['campus_id'] ?? lesson['campusId'];
    if (campusId != null) {
      _selectedCampusId = int.tryParse(campusId.toString());
    }
    _prefilled = true;
  }

  Future<void> _save() async {
    if (_isSaving) return;
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) return;

    // Kampüs zorunlu kontrolü
    if (_selectedCampusId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Lütfen kampüs seçin')));
      return;
    }

    setState(() => _isSaving = true);

    debugPrint('Ders kaydetme - ID: ${widget.lessonId}');
    debugPrint('campusId: $_selectedCampusId');
    debugPrint('educationLevelId: $_selectedEducationLevelId');
    debugPrint('name: ${_nameController.text.trim()}');

    try {
      final repo = ref.read(lessonsRepositoryProvider);

      if (widget.isEdit) {
        await repo.update(
          id: widget.lessonId!,
          name: _nameController.text.trim(),
          code: _codeController.text.trim().isEmpty
              ? null
              : _codeController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          weeklyHours: int.tryParse(_weeklyHoursController.text.trim()),
          educationLevelId: _selectedEducationLevelId,
          campusId: _selectedCampusId,
        );
        ref.invalidate(lessonDetailProvider(widget.lessonId!));
      } else {
        await repo.create(
          name: _nameController.text.trim(),
          code: _codeController.text.trim().isEmpty
              ? null
              : _codeController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          weeklyHours: int.tryParse(_weeklyHoursController.text.trim()),
          educationLevelId: _selectedEducationLevelId,
          campusId: _selectedCampusId,
        );
      }

      ref.invalidate(lessonsListProvider);

      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Kaydetme hatası: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.isEdit ? 'Ders Düzenle' : 'Yeni Ders';

    final detail = widget.isEdit
        ? ref.watch(lessonDetailProvider(widget.lessonId!))
        : const AsyncValue<Map<String, dynamic>>.data(<String, dynamic>{});

    final educationLevels = ref.watch(
      education_levels_providers.educationLevelsListProvider,
    );

    final campuses = ref.watch(campusesListProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Kaydet'),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: detail.when(
          data: (lesson) {
            if (widget.isEdit) _prefillFromData(lesson);

            return Form(
              key: _formKey,
              child: ListView(
                children: [
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextFormField(
                          controller: _nameController,
                          decoration: const InputDecoration(
                            labelText: 'Ders Adı *',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) => v == null || v.trim().isEmpty
                              ? 'Ad gerekli'
                              : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _codeController,
                          decoration: const InputDecoration(
                            labelText: 'Kod',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _descriptionController,
                          decoration: const InputDecoration(
                            labelText: 'Açıklama',
                            border: OutlineInputBorder(),
                          ),
                          maxLines: 3,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _weeklyHoursController,
                          decoration: const InputDecoration(
                            labelText: 'Haftalık Saat',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                        const SizedBox(height: 12),
                        // Kampüs Seçimi
                        campuses.when(
                          data: (campusList) {
                            if (campusList.isEmpty) {
                              return const Text('Kampüs bulunamadı');
                            }
                            return DropdownButtonFormField<int>(
                              initialValue: _selectedCampusId,
                              decoration: const InputDecoration(
                                labelText: 'Kampüs *',
                                border: OutlineInputBorder(),
                              ),
                              items: campusList.map((campus) {
                                final id = campus['id'] as int? ?? 0;
                                final name = campus['name']?.toString() ?? '';
                                return DropdownMenuItem<int>(
                                  value: id,
                                  child: Text(name),
                                );
                              }).toList(),
                              onChanged: (value) {
                                setState(() {
                                  _selectedCampusId = value;
                                });
                              },
                            );
                          },
                          loading: () => const LinearProgressIndicator(),
                          error: (_, _) => const Text('Kampüs yüklenemedi'),
                        ),
                        const SizedBox(height: 12),
                        // Kademe Seçimi
                        educationLevels.when(
                          data: (levels) {
                            if (levels.isEmpty) {
                              return const Text('Kademe bulunamadı');
                            }
                            return DropdownButtonFormField<int>(
                              initialValue: _selectedEducationLevelId,
                              decoration: const InputDecoration(
                                labelText: 'Kademe',
                                border: OutlineInputBorder(),
                              ),
                              items: [
                                const DropdownMenuItem<int>(
                                  value: null,
                                  child: Text('Kademe Seçin'),
                                ),
                                ...levels.map((level) {
                                  final id = level['id'] as int? ?? 0;
                                  final name = level['name']?.toString() ?? '';
                                  return DropdownMenuItem<int>(
                                    value: id,
                                    child: Text(name),
                                  );
                                }),
                              ],
                              onChanged: (value) {
                                setState(() {
                                  _selectedEducationLevelId = value;
                                });
                              },
                            );
                          },
                          loading: () => const LinearProgressIndicator(),
                          error: (_, _) => const Text('Kademe yüklenemedi'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Hata: $e')),
        ),
      ),
    );
  }
}
