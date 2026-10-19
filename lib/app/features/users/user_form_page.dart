import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../roles/roles_providers.dart';
import 'users_paging_controller.dart';
import 'users_providers.dart';

class UserFormPage extends ConsumerStatefulWidget {
  const UserFormPage({super.key, this.userId});

  final int? userId;

  bool get isEdit => userId != null && userId! > 0;

  @override
  ConsumerState<UserFormPage> createState() => _UserFormPageState();
}

class _UserFormPageState extends ConsumerState<UserFormPage> {
  final _formKey = GlobalKey<FormState>();

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  String? _selectedRole;
  bool _isActive = true;

  bool _isSaving = false;
  bool _prefilled = false;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _prefillFromDetail(Map<String, dynamic> m) {
    if (_prefilled) return;

    final name =
        (m['name'] ?? '${m['first_name'] ?? ''} ${m['last_name'] ?? ''}')
            .toString()
            .trim();
    final nameParts = name.split(' ');
    _firstNameController.text = nameParts.first;
    _lastNameController.text = nameParts.length > 1
        ? nameParts.sublist(1).join(' ')
        : '';

    _emailController.text = (m['email'] ?? '').toString();
    _phoneController.text = (m['phone'] ?? '').toString();
    _selectedRole = (m['role'] ?? m['role_name'] ?? '').toString();
    _isActive = m['is_active'] ?? m['active'] ?? true;

    _prefilled = true;
  }

  Future<void> _save() async {
    if (_isSaving) return;
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) return;

    setState(() => _isSaving = true);

    try {
      final repo = ref.read(usersRepositoryProvider);
      final payload = <String, dynamic>{
        'first_name': _firstNameController.text.trim(),
        'last_name': _lastNameController.text.trim(),
        'name':
            '${_firstNameController.text.trim()} ${_lastNameController.text.trim()}'
                .trim(),
        'email': _emailController.text.trim(),
        'phone': _phoneController.text.trim(),
        'role': _selectedRole,
        'is_active': _isActive,
      };

      final password = _passwordController.text;
      if (!widget.isEdit || password.isNotEmpty) {
        payload['password'] = password;
      }

      if (widget.isEdit) {
        await repo.update(widget.userId!, payload);
        ref.invalidate(userDetailProvider(widget.userId!));
      } else {
        await repo.create(payload);
      }

      ref.invalidate(usersPagingControllerProvider);

      if (mounted) {
        context.pop();
      }
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
    final title = widget.isEdit ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı';

    final detail = widget.isEdit
        ? ref.watch(userDetailProvider(widget.userId!))
        : const AsyncValue<Map<String, dynamic>>.data(<String, dynamic>{});

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
          data: (m) {
            if (widget.isEdit) {
              _prefillFromDetail(m);
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
                          'Kullanıcı Bilgileri',
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
                          controller: _emailController,
                          decoration: const InputDecoration(
                            labelText: 'E-posta *',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.emailAddress,
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) {
                              return 'E-posta gerekli';
                            }
                            if (!v.contains('@')) {
                              return 'Geçerli e-posta girin';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
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
                        Consumer(
                          builder: (context, ref, child) {
                            final rolesAsync = ref.watch(rolesListProvider);
                            return rolesAsync.when(
                              data: (roles) {
                                // Normalize role value to match dropdown items
                                String? normalizedRole = _selectedRole;
                                final roleValues = roles
                                    .map((r) => r['name']?.toString())
                                    .where((v) => v != null)
                                    .toList();
                                if (normalizedRole != null &&
                                    !roleValues.contains(normalizedRole)) {
                                  // Try to find by display_name
                                  final matchingRole = roles.firstWhere(
                                    (r) =>
                                        r['display_name']?.toString() ==
                                            normalizedRole ||
                                        r['name']?.toString() == normalizedRole,
                                    orElse: () => <String, dynamic>{},
                                  );
                                  if (matchingRole.isNotEmpty) {
                                    normalizedRole = matchingRole['name']
                                        ?.toString();
                                  } else {
                                    normalizedRole = null;
                                  }
                                }

                                return DropdownButtonFormField<String>(
                                  initialValue: normalizedRole,
                                  decoration: const InputDecoration(
                                    labelText: 'Rol',
                                    border: OutlineInputBorder(),
                                  ),
                                  items: [
                                    const DropdownMenuItem(
                                      value: null,
                                      child: Text('Rol Seçin'),
                                    ),
                                    ...roles.map((role) {
                                      final name =
                                          role['name']?.toString() ?? '';
                                      final displayName =
                                          role['display_name']?.toString() ??
                                          name;
                                      return DropdownMenuItem(
                                        value: name,
                                        child: Text(displayName),
                                      );
                                    }),
                                  ],
                                  onChanged: (val) =>
                                      setState(() => _selectedRole = val),
                                );
                              },
                              loading: () => const TextField(
                                decoration: InputDecoration(
                                  labelText: 'Rol',
                                  border: OutlineInputBorder(),
                                  suffixIcon: SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: Padding(
                                      padding: EdgeInsets.all(8.0),
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    ),
                                  ),
                                ),
                                enabled: false,
                              ),
                              error: (_, _) => TextField(
                                decoration: const InputDecoration(
                                  labelText: 'Rol',
                                  border: OutlineInputBorder(),
                                  errorText: 'Roller yüklenemedi',
                                ),
                                enabled: false,
                                controller: TextEditingController(
                                  text: _selectedRole ?? '',
                                ),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _passwordController,
                          decoration: InputDecoration(
                            labelText: widget.isEdit
                                ? 'Şifre (opsiyonel)'
                                : 'Şifre *',
                            border: const OutlineInputBorder(),
                            hintText: widget.isEdit
                                ? 'Değiştirmek için doldurun'
                                : 'En az 6 karakter',
                          ),
                          obscureText: true,
                          validator: (v) {
                            if (!widget.isEdit) {
                              if (v == null || v.isEmpty) {
                                return 'Şifre gerekli';
                              }
                              if (v.length < 6) {
                                return 'En az 6 karakter';
                              }
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        SwitchListTile(
                          value: _isActive,
                          onChanged: (v) => setState(() => _isActive = v),
                          title: const Text('Aktif Kullanıcı'),
                          contentPadding: EdgeInsets.zero,
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
                              widget.isEdit ? 'Güncelle' : 'Kullanıcı Oluştur',
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
}
