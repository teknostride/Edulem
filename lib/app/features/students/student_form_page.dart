import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../campuses/campuses_providers.dart';
import '../education_levels/education_levels_providers.dart'
    as education_levels_providers;
import '../classrooms/classrooms_providers.dart';
import 'students_providers.dart';
import 'students_paging_controller.dart';
import 'student_detail_page.dart';

class StudentFormPage extends ConsumerStatefulWidget {
  const StudentFormPage({super.key, this.studentId});

  final int? studentId;

  bool get isEdit => studentId != null && studentId! > 0;

  @override
  ConsumerState<StudentFormPage> createState() => _StudentFormPageState();
}

class _StudentFormPageState extends ConsumerState<StudentFormPage> {
  final _formKey = GlobalKey<FormState>();

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _tcNoController = TextEditingController();
  final _schoolNoController = TextEditingController();
  final _birthDateController = TextEditingController();
  String? _selectedGender;
  int? _selectedCampusId;
  int? _selectedEducationLevelId;
  int? _selectedClassroomId;
  bool _isActive = true;

  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _emergencyNameController = TextEditingController();
  final _emergencyPhoneController = TextEditingController();
  final _emergencyRelationController = TextEditingController();

  final _guardian1NameController = TextEditingController();
  final _guardian1TcNoController = TextEditingController();
  final _guardian1PhoneController = TextEditingController();
  final _guardian1EmailController = TextEditingController();
  final _guardian1JobController = TextEditingController();
  String _guardian1RelationType = 'mother';
  bool _guardian1IsLegalGuardian = false;
  final _guardian2NameController = TextEditingController();
  final _guardian2TcNoController = TextEditingController();
  final _guardian2PhoneController = TextEditingController();
  final _guardian2EmailController = TextEditingController();
  final _guardian2JobController = TextEditingController();
  String _guardian2RelationType = 'father';
  bool _guardian2IsLegalGuardian = false;

  List<Map<String, dynamic>> _selectedSiblings = [];

  bool _isSaving = false;
  bool _prefilled = false;

  String? _normalizeGender(dynamic value) {
    final raw = (value ?? '').toString().trim().toLowerCase();
    if (raw.isEmpty) return null;
    if (raw == 'male' || raw == 'm' || raw == 'erkek') return 'male';
    if (raw == 'female' || raw == 'f' || raw == 'kiz' || raw == 'kız') {
      return 'female';
    }
    if (raw == 'other' || raw == 'diger' || raw == 'diğer') return 'other';
    return null;
  }

  int? _normalizeInt(dynamic v) {
    if (v == null) return null;
    if (v is int) return v;
    return int.tryParse(v.toString());
  }

  bool _normalizeBool(dynamic v, {required bool fallback}) {
    if (v == null) return fallback;
    if (v is bool) return v;
    if (v is int) return v != 0;
    final raw = v.toString().trim().toLowerCase();
    if (raw == 'true' || raw == '1' || raw == 'yes' || raw == 'aktif') {
      return true;
    }
    if (raw == 'false' || raw == '0' || raw == 'no' || raw == 'pasif') {
      return false;
    }
    return fallback;
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _tcNoController.dispose();
    _schoolNoController.dispose();
    _birthDateController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _emergencyNameController.dispose();
    _emergencyPhoneController.dispose();
    _emergencyRelationController.dispose();
    _guardian1NameController.dispose();
    _guardian1TcNoController.dispose();
    _guardian1PhoneController.dispose();
    _guardian1EmailController.dispose();
    _guardian1JobController.dispose();
    _guardian2NameController.dispose();
    _guardian2TcNoController.dispose();
    _guardian2PhoneController.dispose();
    _guardian2EmailController.dispose();
    _guardian2JobController.dispose();
    super.dispose();
  }

  void _prefillFromDetail(Map<String, dynamic> s) {
    if (_prefilled) return;

    final classroom = (s['classroom'] is Map)
        ? Map<String, dynamic>.from(s['classroom'] as Map)
        : const <String, dynamic>{};
    final branch = (classroom['branch'] is Map)
        ? Map<String, dynamic>.from(classroom['branch'] as Map)
        : const <String, dynamic>{};
    final campus = (branch['campus'] is Map)
        ? Map<String, dynamic>.from(branch['campus'] as Map)
        : const <String, dynamic>{};
    final classroomEducationLevel = (classroom['education_level'] is Map)
        ? Map<String, dynamic>.from(classroom['education_level'] as Map)
        : const <String, dynamic>{};

    final name = (s['name'] ?? '').toString().trim();
    final nameParts = name.split(' ');
    _firstNameController.text = nameParts.first;
    _lastNameController.text = nameParts.length > 1
        ? nameParts.sublist(1).join(' ')
        : '';

    _tcNoController.text = (s['tc_no'] ?? '').toString();
    _schoolNoController.text = (s['school_no'] ?? s['student_number'] ?? '')
        .toString();
    _birthDateController.text = (s['birth_date'] ?? '').toString();
    _selectedGender = _normalizeGender(s['gender']);

    _selectedCampusId = _normalizeInt(s['campus_id'] ?? campus['id']);
    _selectedEducationLevelId = _normalizeInt(
      s['education_level_id'] ?? classroomEducationLevel['id'],
    );
    _selectedClassroomId = _normalizeInt(s['classroom_id'] ?? classroom['id']);
    _isActive = _normalizeBool(s['is_active'] ?? s['active'], fallback: true);

    _phoneController.text = (s['phone'] ?? '').toString();
    _emailController.text = (s['email'] ?? '').toString();
    _addressController.text = (s['address'] ?? '').toString();

    final emergency = (s['emergency_contact_info'] is Map)
        ? Map<String, dynamic>.from(s['emergency_contact_info'] as Map)
        : const <String, dynamic>{};
    _emergencyNameController.text = (emergency['name'] ?? '').toString();
    _emergencyPhoneController.text =
        (s['emergency_phone'] ?? (emergency['phone'] ?? '')).toString();
    _emergencyRelationController.text = (emergency['relation'] ?? '')
        .toString();

    final guardians = s['guardians'] as List? ?? [];
    if (guardians.isNotEmpty && guardians[0] is Map) {
      final g = Map<String, dynamic>.from(guardians[0] as Map);
      _guardian1NameController.text = (g['name'] ?? '').toString();
      _guardian1TcNoController.text = (g['tc_no'] ?? '').toString();
      _guardian1PhoneController.text = (g['phone'] ?? '').toString();
      _guardian1EmailController.text = (g['email'] ?? '').toString();
      _guardian1JobController.text = (g['job'] ?? '').toString();
      _guardian1RelationType = (g['relation_type'] ?? 'mother').toString();
      _guardian1IsLegalGuardian = _normalizeBool(
        g['is_legal_guardian'],
        fallback: false,
      );
    }
    if (guardians.length > 1 && guardians[1] is Map) {
      final g = Map<String, dynamic>.from(guardians[1] as Map);
      _guardian2NameController.text = (g['name'] ?? '').toString();
      _guardian2TcNoController.text = (g['tc_no'] ?? '').toString();
      _guardian2PhoneController.text = (g['phone'] ?? '').toString();
      _guardian2EmailController.text = (g['email'] ?? '').toString();
      _guardian2JobController.text = (g['job'] ?? '').toString();
      _guardian2RelationType = (g['relation_type'] ?? 'father').toString();
      _guardian2IsLegalGuardian = _normalizeBool(
        g['is_legal_guardian'],
        fallback: false,
      );
    }

    final siblings = s['siblings'] as List? ?? [];
    _selectedSiblings = siblings
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .toList();

    _prefilled = true;
  }

  Future<void> _save() async {
    if (_isSaving) return;
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) return;

    if (_selectedClassroomId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Sınıf seçimi zorunludur')));
      return;
    }

    if (_tcNoController.text.trim().length != 11) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Öğrenci TC Kimlik No zorunludur (11 hane).'),
        ),
      );
      return;
    }
    if (_birthDateController.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Doğum tarihi zorunludur.')));
      return;
    }
    if ((_selectedGender ?? '').trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Cinsiyet zorunludur.')));
      return;
    }

    setState(() => _isSaving = true);

    try {
      final repo = ref.read(studentsRepositoryProvider);

      final payload = <String, dynamic>{
        'student_name':
            '${_firstNameController.text.trim()} ${_lastNameController.text.trim()}'
                .trim(),
        'tc_no': _tcNoController.text.trim(),
        'school_no': _schoolNoController.text.trim(),
        'birth_date': _birthDateController.text.trim(),
        'gender': _selectedGender,
        'classroom_id': _selectedClassroomId,
        'is_active': _isActive,
        'phone': _phoneController.text.trim(),
        'email': _emailController.text.trim(),
        'address': _addressController.text.trim(),
      };

      if (_selectedCampusId != null) {
        payload['campus_id'] = _selectedCampusId;
      }
      if (_selectedEducationLevelId != null) {
        payload['education_level_id'] = _selectedEducationLevelId;
      }

      final emergencyName = _emergencyNameController.text.trim();
      final emergencyPhone = _emergencyPhoneController.text.trim();
      final emergencyRelation = _emergencyRelationController.text.trim();
      if (emergencyName.isNotEmpty ||
          emergencyPhone.isNotEmpty ||
          emergencyRelation.isNotEmpty) {
        payload['emergency_contact_info'] = {
          'name': emergencyName,
          'phone': emergencyPhone,
          'relation': emergencyRelation,
        };
      } else {
        payload['emergency_contact_info'] = null;
      }

      final guardians = <Map<String, dynamic>>[];
      final g1 = {
        'name': _guardian1NameController.text.trim(),
        'tc_no': _guardian1TcNoController.text.trim(),
        'relation_type': _guardian1RelationType,
        'phone': _guardian1PhoneController.text.trim(),
        'email': _guardian1EmailController.text.trim(),
        'job': _guardian1JobController.text.trim(),
        'is_legal_guardian': _guardian1IsLegalGuardian,
      };
      final g1HasAny =
          _guardian1NameController.text.trim().isNotEmpty ||
          _guardian1TcNoController.text.trim().isNotEmpty ||
          _guardian1PhoneController.text.trim().isNotEmpty ||
          _guardian1EmailController.text.trim().isNotEmpty ||
          _guardian1JobController.text.trim().isNotEmpty;
      if (g1HasAny) {
        if (_guardian1NameController.text.trim().isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('1. Veli için Ad Soyad alanı zorunludur.')),
          );
          return;
        }
        guardians.add(g1);
      }

      final g2 = {
        'name': _guardian2NameController.text.trim(),
        'tc_no': _guardian2TcNoController.text.trim(),
        'relation_type': _guardian2RelationType,
        'phone': _guardian2PhoneController.text.trim(),
        'email': _guardian2EmailController.text.trim(),
        'job': _guardian2JobController.text.trim(),
        'is_legal_guardian': _guardian2IsLegalGuardian,
      };
      final g2HasAny =
          _guardian2NameController.text.trim().isNotEmpty ||
          _guardian2TcNoController.text.trim().isNotEmpty ||
          _guardian2PhoneController.text.trim().isNotEmpty ||
          _guardian2EmailController.text.trim().isNotEmpty ||
          _guardian2JobController.text.trim().isNotEmpty;
      if (g2HasAny) {
        if (_guardian2NameController.text.trim().isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('2. Veli için Ad Soyad alanı zorunludur.')),
          );
          return;
        }
        guardians.add(g2);
      }

      if (guardians.isNotEmpty) {
        payload['guardians'] = guardians;
      }

      final siblingIds = _selectedSiblings
          .map((s) => s['id'] is int ? s['id'] as int : int.tryParse(s['id'].toString()))
          .whereType<int>()
          .toList();
      payload['sibling_ids'] = siblingIds;

      if (widget.isEdit) {
        await repo.update(widget.studentId!, payload);
        ref.invalidate(studentDetailProvider(widget.studentId!));
      } else {
        await repo.create(payload);
      }

      ref.invalidate(studentsPagingProvider);

      if (mounted) {
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        String msg = e.toString().replaceFirst('Exception: ', '').replaceFirst('ApiException: ', '');
        if (msg.contains('SQLSTATE') || msg.contains('Column') || msg.contains('violation:')) {
          if (msg.contains("'name'") || msg.contains('guardians')) {
            msg = 'Veli adı soyadı alanı boş bırakılamaz. Lütfen veli bilgilerini kontrol ediniz.';
          } else if (msg.contains('Duplicate entry')) {
            msg = 'Girdiğiniz bilgilerden biri sistemde zaten mevcuttur.';
          } else {
            msg = 'Öğrenci kaydedilirken bir hata oluştu. Lütfen bilgilerinizi kontrol ediniz.';
          }
        }
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(msg)));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _selectBirthDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().subtract(const Duration(days: 365 * 10)),
      firstDate: DateTime(1990),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      _birthDateController.text = picked.toIso8601String().split('T')[0];
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.isEdit ? 'Öğrenci Düzenle' : 'Yeni Öğrenci';

    final detail = widget.isEdit
        ? ref.watch(studentDetailProvider(widget.studentId!))
        : const AsyncValue<Map<String, dynamic>>.data(<String, dynamic>{});

    final campusesAsync = ref.watch(campusesListProvider);
    final educationLevelsAsync = ref.watch(
      education_levels_providers.educationLevelsListProvider,
    );

    // Kampüse göre kademe filtreleme ve sıralama
    final filteredLevels = educationLevelsAsync.when(
      data: (levels) {
        List<Map<String, dynamic>> filtered;
        if (_selectedCampusId == null) {
          filtered = List<Map<String, dynamic>>.from(levels);
        } else {
          filtered = levels
              .where((l) => l['campus_id']?.toString() == '$_selectedCampusId')
              .toList();
        }
        // Kademeleri anaokulu->ilkokul->ortaokul->lise sırasına göre sırala
        int getLevelOrder(String name) {
          final normalized = name
              .toLowerCase()
              .trim()
              .replaceAll('İ', 'i')
              .replaceAll('I', 'ı')
              .replaceAll('Ş', 'ş')
              .replaceAll('Ğ', 'ğ')
              .replaceAll('Ü', 'ü')
              .replaceAll('Ö', 'ö')
              .replaceAll('Ç', 'ç');
          // Debug için
          debugPrint('Kademe adı: $name -> normalized: $normalized');
          // Tam eşleşme veya kelime başı kontrolü
          if (normalized.contains('anaokul') || normalized.contains('kreş')) {
            return 1;
          }
          if (normalized.contains('ilkokul')) {
            return 2;
          }
          if (normalized.contains('ortaokul')) {
            return 3;
          }
          if (normalized.contains('lise') ||
              normalized.contains('ortaöğretim')) {
            return 4;
          }
          return 99;
        }

        filtered.sort((a, b) {
          final nameA = (a['name'] ?? '').toString();
          final nameB = (b['name'] ?? '').toString();
          final orderA = getLevelOrder(nameA);
          final orderB = getLevelOrder(nameB);
          debugPrint(
            'Sıralama: $nameA (order: $orderA) vs $nameB (order: $orderB)',
          );
          if (orderA != orderB) return orderA.compareTo(orderB);
          return nameA.toLowerCase().compareTo(nameB.toLowerCase());
        });
        return filtered;
      },
      loading: () => const <Map<String, dynamic>>[],
      error: (_, _) => const <Map<String, dynamic>>[],
    );
    // Sınıflar - kademe seçilince getir
    List<Map<String, dynamic>> filteredClassrooms = [];
    if (_selectedEducationLevelId != null) {
      final allClassrooms = ref.watch(classroomsListProvider);
      filteredClassrooms = allClassrooms.when(
        data: (items) {
          List<Map<String, dynamic>> filtered;
          if (_selectedCampusId != null) {
            filtered = items
                .where(
                  (c) =>
                      c['campus_id']?.toString() == '$_selectedCampusId' ||
                      c['education_level_id']?.toString() ==
                          '$_selectedEducationLevelId',
                )
                .toList();
          } else {
            filtered = items
                .where(
                  (c) =>
                      c['education_level_id']?.toString() ==
                      '$_selectedEducationLevelId',
                )
                .toList();
          }
          // Sınıfları doğal sıralama - önce sayı, sonra harf (1-A, 1-B, 2-A...)
          filtered.sort((a, b) {
            final nameA = (a['name'] ?? '').toString().toLowerCase().trim();
            final nameB = (b['name'] ?? '').toString().toLowerCase().trim();
            // Sayı ve harf parçalarını ayır
            final matchA = RegExp(r'^(\d+)?\s*[-.]?\s*(.*)').firstMatch(nameA);
            final matchB = RegExp(r'^(\d+)?\s*[-.]?\s*(.*)').firstMatch(nameB);
            final numA = int.tryParse(matchA?.group(1) ?? '') ?? 0;
            final numB = int.tryParse(matchB?.group(1) ?? '') ?? 0;
            final suffixA = matchA?.group(2) ?? nameA;
            final suffixB = matchB?.group(2) ?? nameB;
            if (numA != numB) return numA.compareTo(numB);
            return suffixA.compareTo(suffixB);
          });
          return filtered;
        },
        loading: () => const <Map<String, dynamic>>[],
        error: (_, _) => const <Map<String, dynamic>>[],
      );
    }

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
          data: (s) {
            if (widget.isEdit) {
              _prefillFromDetail(s);
            }

            return Form(
              key: _formKey,
              child: ListView(
                children: [
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Öğrenci Bilgileri',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _firstNameController,
                                decoration: const InputDecoration(
                                  labelText: 'Ad *',
                                  border: OutlineInputBorder(),
                                ),
                                validator: (v) => v == null || v.trim().isEmpty
                                    ? 'Ad gerekli'
                                    : null,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                controller: _lastNameController,
                                decoration: const InputDecoration(
                                  labelText: 'Soyad *',
                                  border: OutlineInputBorder(),
                                ),
                                validator: (v) => v == null || v.trim().isEmpty
                                    ? 'Soyad gerekli'
                                    : null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _tcNoController,
                          decoration: const InputDecoration(
                            labelText: 'TC Kimlik No',
                            border: OutlineInputBorder(),
                            hintText: '11 haneli TC numarası',
                          ),
                          keyboardType: TextInputType.number,
                          maxLength: 11,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _schoolNoController,
                          decoration: const InputDecoration(
                            labelText: 'Okul Numarası *',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) => v == null || v.trim().isEmpty
                              ? 'Okul numarası gerekli'
                              : null,
                        ),
                        const SizedBox(height: 12),
                        campusesAsync.when(
                          data: (campuses) {
                            return DropdownButtonFormField<int>(
                              initialValue: _selectedCampusId,
                              decoration: const InputDecoration(
                                labelText: 'Kampüs',
                                border: OutlineInputBorder(),
                              ),
                              items: campuses
                                  .map(
                                    (c) => DropdownMenuItem<int>(
                                      value: _normalizeInt(c['id']),
                                      child: Text((c['name'] ?? '').toString()),
                                    ),
                                  )
                                  .where((e) => e.value != null)
                                  .toList(),
                              onChanged: (v) {
                                setState(() {
                                  _selectedCampusId = v;
                                  _selectedEducationLevelId = null;
                                  _selectedClassroomId = null;
                                });
                              },
                            );
                          },
                          loading: () => const LinearProgressIndicator(),
                          error: (_, _) => const SizedBox.shrink(),
                        ),
                        const SizedBox(height: 12),
                        if (filteredLevels.isEmpty && _selectedCampusId != null)
                          const Text('Bu kampüs için kademe bulunamadı')
                        else if (filteredLevels.isEmpty)
                          const LinearProgressIndicator()
                        else
                          DropdownButtonFormField<int>(
                            initialValue: _selectedEducationLevelId,
                            decoration: const InputDecoration(
                              labelText: 'Kademe',
                              border: OutlineInputBorder(),
                            ),
                            items: filteredLevels
                                .map(
                                  (el) => DropdownMenuItem<int>(
                                    value: _normalizeInt(el['id']),
                                    child: Text((el['name'] ?? '').toString()),
                                  ),
                                )
                                .where((e) => e.value != null)
                                .toList(),
                            onChanged: (v) {
                              setState(() {
                                _selectedEducationLevelId = v;
                                _selectedClassroomId = null;
                              });
                            },
                          ),
                        const SizedBox(height: 12),
                        if (_selectedEducationLevelId == null)
                          DropdownButtonFormField<int>(
                            initialValue: null,
                            decoration: const InputDecoration(
                              labelText: 'Sınıf *',
                              border: OutlineInputBorder(),
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: null,
                                child: Text('Önce kademe seçin'),
                              ),
                            ],
                            onChanged: null,
                          )
                        else if (filteredClassrooms.isEmpty)
                          const Text('Sınıf bulunamadı')
                        else
                          Builder(
                            builder: (context) {
                              final classId = _selectedClassroomId;
                              final classIdExists =
                                  classId != null &&
                                  filteredClassrooms.any((c) {
                                    final id = _normalizeInt(c['id']);
                                    return id != null && id == classId;
                                  });

                              return DropdownButtonFormField<int>(
                                initialValue: classIdExists ? classId : null,
                                decoration: const InputDecoration(
                                  labelText: 'Sınıf *',
                                  border: OutlineInputBorder(),
                                ),
                                items: filteredClassrooms
                                    .map((c) {
                                      final id = _normalizeInt(c['id']);
                                      return DropdownMenuItem<int>(
                                        value: id,
                                        child: Text(
                                          c['name']?.toString() ??
                                              'Sınıf ${c["id"]}',
                                        ),
                                      );
                                    })
                                    .where((e) => e.value != null)
                                    .toList(),
                                onChanged: (val) =>
                                    setState(() => _selectedClassroomId = val),
                                validator: (val) =>
                                    val == null ? 'Sınıf seçimi zorunlu' : null,
                              );
                            },
                          ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: _selectBirthDate,
                                child: AbsorbPointer(
                                  child: TextFormField(
                                    controller: _birthDateController,
                                    decoration: const InputDecoration(
                                      labelText: 'Doğum Tarihi',
                                      border: OutlineInputBorder(),
                                      suffixIcon: Icon(Icons.calendar_today),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                initialValue: _selectedGender,
                                decoration: const InputDecoration(
                                  labelText: 'Cinsiyet',
                                  border: OutlineInputBorder(),
                                ),
                                items: const [
                                  DropdownMenuItem(
                                    value: 'male',
                                    child: Text('Erkek'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'female',
                                    child: Text('Kız'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'other',
                                    child: Text('Diğer'),
                                  ),
                                ],
                                onChanged: (val) =>
                                    setState(() => _selectedGender = val),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SwitchListTile(
                          value: _isActive,
                          onChanged: (v) => setState(() => _isActive = v),
                          title: const Text('Aktif Öğrenci'),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'İletişim Bilgileri',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _phoneController,
                          decoration: const InputDecoration(
                            labelText: 'Telefon',
                            border: OutlineInputBorder(),
                            hintText: '05XX XXX XX XX',
                          ),
                          keyboardType: TextInputType.phone,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _emailController,
                          decoration: const InputDecoration(
                            labelText: 'E-posta',
                            border: OutlineInputBorder(),
                            hintText: 'ogrenci@email.com',
                          ),
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _addressController,
                          decoration: const InputDecoration(
                            labelText: 'Adres',
                            border: OutlineInputBorder(),
                          ),
                          maxLines: 3,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _emergencyNameController,
                          decoration: const InputDecoration(
                            labelText: 'Acil Kişi Adı',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _emergencyPhoneController,
                          decoration: const InputDecoration(
                            labelText: 'Acil Kişi Telefonu',
                            border: OutlineInputBorder(),
                            hintText: 'Yakının telefon numarası',
                          ),
                          keyboardType: TextInputType.phone,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _emergencyRelationController,
                          decoration: const InputDecoration(
                            labelText: 'Acil Kişi Yakınlık',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Veli Bilgileri',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Anne Bilgileri (1. Veli)',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _guardian1NameController,
                          decoration: const InputDecoration(
                            labelText: 'Anne Adı Soyadı',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _guardian1TcNoController,
                          decoration: const InputDecoration(
                            labelText: 'Anne TC Kimlik No',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                          maxLength: 11,
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          initialValue: _guardian1RelationType,
                          decoration: const InputDecoration(
                            labelText: 'Yakınlık',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'mother',
                              child: Text('Anne'),
                            ),
                            DropdownMenuItem(
                              value: 'father',
                              child: Text('Baba'),
                            ),
                            DropdownMenuItem(
                              value: 'guardian',
                              child: Text('Vasi'),
                            ),
                            DropdownMenuItem(
                              value: 'other',
                              child: Text('Diğer'),
                            ),
                          ],
                          onChanged: (v) {
                            if (v == null) return;
                            setState(() => _guardian1RelationType = v);
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _guardian1PhoneController,
                          decoration: const InputDecoration(
                            labelText: 'Anne Telefon',
                            border: OutlineInputBorder(),
                            hintText: '05XX XXX XX XX',
                          ),
                          keyboardType: TextInputType.phone,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _guardian1EmailController,
                          decoration: const InputDecoration(
                            labelText: 'Anne E-posta',
                            border: OutlineInputBorder(),
                            hintText: 'Veli girişi için kullanılacak',
                          ),
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _guardian1JobController,
                          decoration: const InputDecoration(
                            labelText: 'Meslek',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SwitchListTile(
                          value: _guardian1IsLegalGuardian,
                          onChanged: (v) =>
                              setState(() => _guardian1IsLegalGuardian = v),
                          title: const Text('Yasal Veli'),
                          contentPadding: EdgeInsets.zero,
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Baba Bilgileri (2. Veli - Opsiyonel)',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _guardian2NameController,
                          decoration: const InputDecoration(
                            labelText: 'Baba Adı Soyadı',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _guardian2TcNoController,
                          decoration: const InputDecoration(
                            labelText: 'Baba TC Kimlik No',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                          maxLength: 11,
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          initialValue: _guardian2RelationType,
                          decoration: const InputDecoration(
                            labelText: 'Yakınlık',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'mother',
                              child: Text('Anne'),
                            ),
                            DropdownMenuItem(
                              value: 'father',
                              child: Text('Baba'),
                            ),
                            DropdownMenuItem(
                              value: 'guardian',
                              child: Text('Vasi'),
                            ),
                            DropdownMenuItem(
                              value: 'other',
                              child: Text('Diğer'),
                            ),
                          ],
                          onChanged: (v) {
                            if (v == null) return;
                            setState(() => _guardian2RelationType = v);
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _guardian2PhoneController,
                          decoration: const InputDecoration(
                            labelText: 'Baba Telefon',
                            border: OutlineInputBorder(),
                            hintText: '05XX XXX XX XX',
                          ),
                          keyboardType: TextInputType.phone,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _guardian2EmailController,
                          decoration: const InputDecoration(
                            labelText: 'Baba E-posta',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _guardian2JobController,
                          decoration: const InputDecoration(
                            labelText: 'Meslek',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SwitchListTile(
                          value: _guardian2IsLegalGuardian,
                          onChanged: (v) =>
                              setState(() => _guardian2IsLegalGuardian = v),
                          title: const Text('Yasal Veli'),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Kardeş Öğrenciler (Opsiyonel)',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Bu öğrencinin okuldaki kardeşlerini seçebilirsiniz.',
                                    style: TextStyle(fontSize: 12, color: Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _showSelectSiblingModal(context),
                              icon: const Icon(Icons.person_add, size: 18),
                              label: const Text('Kardeş Ekle'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        if (_selectedSiblings.isEmpty)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: const Text(
                              'Henüz kardeş öğrenci seçilmedi.',
                              style: TextStyle(color: Colors.grey, fontSize: 13),
                            ),
                          )
                        else
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _selectedSiblings.asMap().entries.map((entry) {
                              final idx = entry.key;
                              final sib = entry.value;
                              final sName = (sib['name'] ?? sib['student_name'] ?? 'Öğrenci').toString();
                              final sClass = (sib['classroom_name'] ?? (sib['classroom'] is Map ? sib['classroom']['name'] : null) ?? '').toString();

                              return Chip(
                                avatar: CircleAvatar(
                                  backgroundColor: const Color(0xFF1E3A8A),
                                  child: Text(
                                    sName.isNotEmpty ? sName[0].toUpperCase() : 'Ö',
                                    style: const TextStyle(fontSize: 10, color: Colors.white),
                                  ),
                                ),
                                label: Text(sClass.isNotEmpty ? '$sName ($sClass)' : sName),
                                deleteIcon: const Icon(Icons.close, size: 16),
                                onDeleted: () {
                                  setState(() {
                                    _selectedSiblings.removeAt(idx);
                                  });
                                },
                              );
                            }).toList(),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isSaving ? null : _save,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isSaving
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(
                              widget.isEdit ? 'Güncelle' : 'Öğrenci Oluştur',
                            ),
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

  Future<void> _showSelectSiblingModal(BuildContext context) async {
    final searchController = TextEditingController();
    List<Map<String, dynamic>> results = [];
    bool isSearching = false;
    String query = '';

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalContext, setModalState) {
            Future<void> doSearch(String q) async {
              if (q.trim().isEmpty) {
                setModalState(() {
                  results = [];
                  isSearching = false;
                });
                return;
              }
              setModalState(() => isSearching = true);
              try {
                final repo = ref.read(studentsRepositoryProvider);
                final res = await repo.list(page: 1, perPage: 25, search: q.trim());
                final students = (res['students'] as List? ?? []);
                setModalState(() {
                  results = students
                      .whereType<Map>()
                      .map((m) => Map<String, dynamic>.from(m))
                      .where((s) {
                    final sid = s['id'] is int ? s['id'] as int : int.tryParse(s['id'].toString()) ?? 0;
                    if (widget.studentId != null && sid == widget.studentId) return false;
                    if (_selectedSiblings.any((existing) => existing['id'] == sid)) return false;
                    return true;
                  }).toList();
                  isSearching = false;
                });
              } catch (_) {
                setModalState(() => isSearching = false);
              }
            }

            return DraggableScrollableSheet(
              initialChildSize: 0.7,
              minChildSize: 0.5,
              maxChildSize: 0.9,
              expand: false,
              builder: (_, scrollController) {
                return Padding(
                  padding: EdgeInsets.only(
                    left: 16,
                    right: 16,
                    top: 16,
                    bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 40,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const Text(
                        'Kardeş Öğrenci Seç',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: searchController,
                        autofocus: true,
                        decoration: InputDecoration(
                          hintText: 'Öğrenci adı, soyadı veya okul no ile ara...',
                          prefixIcon: const Icon(Icons.search),
                          suffixIcon: query.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear),
                                  onPressed: () {
                                    searchController.clear();
                                    query = '';
                                    doSearch('');
                                  },
                                )
                              : null,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                        onChanged: (val) {
                          query = val;
                          doSearch(val);
                        },
                      ),
                      const SizedBox(height: 12),
                      if (isSearching)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: CircularProgressIndicator(),
                        )
                      else if (query.trim().isNotEmpty && results.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Text('Eşleşen öğrenci bulunamadı.', style: TextStyle(color: Colors.grey)),
                        )
                      else if (query.trim().isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Text('Aramak istediğiniz öğrencinin adını veya numarasını yazın.', style: TextStyle(color: Colors.grey)),
                        )
                      else
                        Expanded(
                          child: ListView.separated(
                            controller: scrollController,
                            itemCount: results.length,
                            separatorBuilder: (_, _) => const Divider(height: 1),
                            itemBuilder: (c, idx) {
                              final st = results[idx];
                              final name = (st['name'] ?? st['student_name'] ?? 'Öğrenci').toString();
                              final sNo = (st['school_no'] ?? '').toString();
                              final classroom = (st['classroom_name'] ?? (st['classroom'] is Map ? st['classroom']['name'] : null) ?? '').toString();

                              return ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: const Color(0xFF1E3A8A),
                                  child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'Ö', style: const TextStyle(color: Colors.white)),
                                ),
                                title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: Text([if (classroom.isNotEmpty) classroom, if (sNo.isNotEmpty) 'No: $sNo'].join(' • ')),
                                trailing: const Icon(Icons.add_circle_outline, color: Color(0xFF2563EB)),
                                onTap: () {
                                  setState(() {
                                    _selectedSiblings.add(st);
                                  });
                                  Navigator.of(ctx).pop();
                                },
                              );
                            },
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
}
