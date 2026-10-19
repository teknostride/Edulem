import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/storage/secure_storage_provider.dart';
import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'sms_providers.dart';

class SmsApiSettingsPage extends ConsumerStatefulWidget {
  const SmsApiSettingsPage({super.key});

  @override
  ConsumerState<SmsApiSettingsPage> createState() => _SmsApiSettingsPageState();
}

class _SmsApiSettingsPageState extends ConsumerState<SmsApiSettingsPage> {
  final _formKey = GlobalKey<FormState>();

  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _baseUrlCtrl = TextEditingController(text: 'https://panel.iletibilgi.com.tr:9588');
  final _senderCtrl = TextEditingController(text: 'AK IRFAN');

  final _testPhoneCtrl = TextEditingController();
  final _testMsgCtrl = TextEditingController(
    text: 'EduLem SMS entegrasyon test mesajıdır.',
  );

  bool _showPassword = false;
  bool _isEnabled = true;
  bool _isSaving = false;
  bool _isTesting = false;
  bool _isLoadingInfo = false;
  bool _isLoaded = false;
  String? _testResult;
  bool _testSuccess = false;

  Map<String, dynamic>? _userInfo;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    try {
      final repo = ref.read(smsRepositoryProvider);
      final res = await repo.getSettings();
      final data = (res['username'] != null || res['sender'] != null || res['base_url'] != null)
          ? res
          : (res['data'] as Map<String, dynamic>? ?? res);

      if (data.isNotEmpty) {
        _usernameCtrl.text = data['username']?.toString() ?? '';
        _passwordCtrl.text = data['password']?.toString() ?? '';
        _baseUrlCtrl.text = (data['base_url']?.toString().isNotEmpty == true)
            ? data['base_url'].toString()
            : 'https://panel.iletibilgi.com.tr:9588';
        _senderCtrl.text = (data['sender']?.toString().isNotEmpty == true)
            ? data['sender'].toString()
            : 'AK IRFAN';
        _isEnabled = data['enabled'] == true || data['enabled'] == '1' || data['enabled'] == 1;
      }
    } catch (_) {
      // Fallback: local storage
      final storage = ref.read(secureStorageProvider);
      _usernameCtrl.text = (await storage.read(key: 'iletibilgi_username')) ?? '';
      _passwordCtrl.text = (await storage.read(key: 'iletibilgi_password')) ?? '';
      _senderCtrl.text = (await storage.read(key: 'iletibilgi_sender')) ?? 'AK IRFAN';
    }

    if (mounted) {
      setState(() => _isLoaded = true);
      if (_usernameCtrl.text.isNotEmpty && _passwordCtrl.text.isNotEmpty) {
        _fetchUserInfo();
      }
    }
  }

  Future<void> _fetchUserInfo() async {
    if (_usernameCtrl.text.isEmpty || _passwordCtrl.text.isEmpty) return;
    setState(() => _isLoadingInfo = true);
    try {
      final repo = ref.read(smsRepositoryProvider);
      final res = await repo.getUserInfo(
        username: _usernameCtrl.text.trim(),
        password: _passwordCtrl.text.trim(),
        baseUrl: _baseUrlCtrl.text.trim(),
      );
      if (mounted) {
        setState(() {
          _userInfo = (res['credit'] != null || res['usedCredit'] != null || res['balance'] != null)
              ? res
              : (res['data'] as Map<String, dynamic>? ?? res);
        });
      }
    } catch (_) {
      // ignored
    } finally {
      if (mounted) setState(() => _isLoadingInfo = false);
    }
  }

  Future<void> _saveSettings() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);
    try {
      final repo = ref.read(smsRepositoryProvider);
      await repo.saveSettings(
        username: _usernameCtrl.text.trim(),
        password: _passwordCtrl.text.trim(),
        baseUrl: _baseUrlCtrl.text.trim(),
        sender: _senderCtrl.text.trim(),
        enabled: _isEnabled,
      );

      // Also save locally as cache
      final storage = ref.read(secureStorageProvider);
      await storage.write(key: 'iletibilgi_username', value: _usernameCtrl.text.trim());
      await storage.write(key: 'iletibilgi_password', value: _passwordCtrl.text.trim());
      await storage.write(key: 'iletibilgi_sender', value: _senderCtrl.text.trim());
      await storage.write(key: 'iletibilgi_base_url', value: _baseUrlCtrl.text.trim());

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 10),
                Text('SMS API ayarları başarıyla kaydedildi'),
              ],
            ),
            backgroundColor: Colors.green.shade700,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        _fetchUserInfo();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Kayıt hatası: $e'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _sendTestSms() async {
    final phone = _testPhoneCtrl.text.trim();
    final message = _testMsgCtrl.text.trim();
    final username = _usernameCtrl.text.trim();
    final password = _passwordCtrl.text.trim();
    final baseUrl = _baseUrlCtrl.text.trim();
    final sender = _senderCtrl.text.trim();

    if (phone.isEmpty) {
      setState(() {
        _testResult = 'Lütfen test telefon numarası girin.';
        _testSuccess = false;
      });
      return;
    }
    if (username.isEmpty || password.isEmpty) {
      setState(() {
        _testResult = 'Lütfen önce API kullanıcı adı ve şifresini doldurun.';
        _testSuccess = false;
      });
      return;
    }
    if (sender.isEmpty) {
      setState(() {
        _testResult = 'Lütfen Gönderen Başlığını (Sender) doldurun.';
        _testSuccess = false;
      });
      return;
    }

    setState(() {
      _isTesting = true;
      _testResult = null;
    });

    try {
      final repo = ref.read(smsRepositoryProvider);
      final res = await repo.testSms(
        username: username,
        password: password,
        baseUrl: baseUrl,
        sender: sender,
        phone: phone,
        message: message,
      );

      final msg = res['message']?.toString() ?? 'Test SMS başarıyla gönderildi!';
      setState(() {
        _testSuccess = true;
        _testResult = msg;
      });
      ref.invalidate(smsHistoryProvider);
    } catch (e) {
      setState(() {
        _testSuccess = false;
        _testResult = 'Gönderim hatası: $e';
      });
    } finally {
      if (mounted) setState(() => _isTesting = false);
    }
  }

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    _baseUrlCtrl.dispose();
    _senderCtrl.dispose();
    _testPhoneCtrl.dispose();
    _testMsgCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sections = ref.watch(drawerSectionsProvider);
    final profile = ref.watch(profileProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('SMS API Ayarları'),
        actions: [
          if (_isLoaded)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilledButton.icon(
                onPressed: _isSaving ? null : _saveSettings,
                icon: _isSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.save, size: 18),
                label: const Text('Kaydet'),
              ),
            ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: !_isLoaded
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Kredi Bilgi Kartı (Web ile tam uyumlu)
                    if (_userInfo != null || _isLoadingInfo)
                      AppCard(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.account_balance_wallet_outlined,
                                      color: cs.primary, size: 20),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'İleti Bilgi Hesap & Kredi Durumu',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  const Spacer(),
                                  if (_isLoadingInfo)
                                    const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  else
                                    IconButton(
                                      icon: const Icon(Icons.refresh, size: 18),
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(),
                                      onPressed: _fetchUserInfo,
                                    ),
                                ],
                              ),
                              const Divider(height: 20),
                              Row(
                                children: [
                                  Expanded(
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.green.shade50,
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: Colors.green.shade200),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '${_userInfo?['credit'] ?? _userInfo?['balance'] ?? '—'}',
                                            style: TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.green.shade800,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Kalan SMS Kredisi',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: Colors.green.shade700,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.blue.shade50,
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: Colors.blue.shade200),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '${_userInfo?['usedCredit'] ?? '0'}',
                                            style: TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.blue.shade800,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Sistemden Gönderilen',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: Colors.blue.shade700,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    if (_userInfo != null) const SizedBox(height: 16),

                    // Servis Aktifliği
                    AppCard(
                      child: SwitchListTile(
                        value: _isEnabled,
                        onChanged: (v) => setState(() => _isEnabled = v),
                        title: const Text('SMS Servisi Aktif',
                            style: TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text(
                          _isEnabled
                              ? 'Sistem SMS gönderimlerini İleti Bilgi üzerinden yapacak'
                              : 'SMS gönderimi devre dışı',
                          style: TextStyle(
                            color: _isEnabled ? Colors.green.shade700 : Colors.grey,
                            fontSize: 12,
                          ),
                        ),
                        secondary: CircleAvatar(
                          backgroundColor: _isEnabled ? Colors.green.shade100 : Colors.grey.shade100,
                          child: Icon(Icons.sms,
                              color: _isEnabled ? Colors.green.shade700 : Colors.grey),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Kimlik Bilgileri
                    _sectionHeader(Icons.lock_outline, 'API Kimlik Bilgileri', cs.primary),
                    const SizedBox(height: 8),
                    AppCard(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _usernameCtrl,
                              decoration: const InputDecoration(
                                labelText: 'API Kullanıcı Adı',
                                prefixIcon: Icon(Icons.person_outline),
                                helperText: 'İleti Bilgi panel kullanıcı adınız',
                              ),
                              validator: (v) => (v == null || v.trim().isEmpty)
                                  ? 'Kullanıcı adı zorunludur'
                                  : null,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _passwordCtrl,
                              obscureText: !_showPassword,
                              decoration: InputDecoration(
                                labelText: 'API Şifresi',
                                prefixIcon: const Icon(Icons.key_outlined),
                                helperText: 'İleti Bilgi panel şifreniz',
                                suffixIcon: IconButton(
                                  icon: Icon(_showPassword
                                      ? Icons.visibility_off
                                      : Icons.visibility),
                                  onPressed: () =>
                                      setState(() => _showPassword = !_showPassword),
                                ),
                              ),
                              validator: (v) => (v == null || v.trim().isEmpty)
                                  ? 'Şifre zorunludur'
                                  : null,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Bağlantı & Başlık Ayarları
                    _sectionHeader(Icons.link, 'Gönderen & Sunucu Ayarları', Colors.orange.shade700),
                    const SizedBox(height: 8),
                    AppCard(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _senderCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Gönderen Başlığı (Sender)',
                                prefixIcon: Icon(Icons.badge_outlined),
                                helperText: "SMS'lerde görünecek onaylı başlık (örn: AK IRFAN)",
                              ),
                              validator: (v) => (v == null || v.trim().isEmpty)
                                  ? 'Gönderen başlığı zorunludur'
                                  : null,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _baseUrlCtrl,
                              decoration: const InputDecoration(
                                labelText: 'API Base URL',
                                prefixIcon: Icon(Icons.dns_outlined),
                                helperText: 'Varsayılan: https://panel.iletibilgi.com.tr:9588',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Test SMS
                    _sectionHeader(Icons.science_outlined, 'Bağlantı Testi — Tekli SMS', Colors.teal.shade700),
                    const SizedBox(height: 4),
                    Text(
                      'Kaydetmeden veya kaydettikten sonra tekil SMS gönderimini test edebilirsiniz.',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                    ),
                    const SizedBox(height: 8),
                    AppCard(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: _testPhoneCtrl,
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                labelText: 'Test Telefon Numarası',
                                prefixIcon: Icon(Icons.phone_outlined),
                                hintText: '905XXXXXXXXX',
                                helperText: 'Başında 90 veya 0 ile Türkiye numarası',
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _testMsgCtrl,
                              maxLines: 2,
                              maxLength: 160,
                              decoration: const InputDecoration(
                                labelText: 'Test Mesaj İçeriği',
                                prefixIcon: Icon(Icons.message_outlined),
                                alignLabelWithHint: true,
                              ),
                            ),
                            const SizedBox(height: 8),
                            if (_testResult != null)
                              AnimatedContainer(
                                duration: const Duration(milliseconds: 300),
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: _testSuccess ? Colors.green.shade50 : Colors.red.shade50,
                                  border: Border.all(
                                    color: _testSuccess ? Colors.green.shade300 : Colors.red.shade300,
                                  ),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(
                                      _testSuccess ? Icons.check_circle : Icons.error_outline,
                                      color: _testSuccess ? Colors.green.shade700 : Colors.red.shade700,
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _testResult!,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: _testSuccess ? Colors.green.shade800 : Colors.red.shade800,
                                          height: 1.4,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            FilledButton.tonalIcon(
                              onPressed: _isTesting ? null : _sendTestSms,
                              icon: _isTesting
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : const Icon(Icons.send, size: 18),
                              label: Text(_isTesting ? 'SMS Gönderiliyor...' : 'Test SMS Gönder'),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _sectionHeader(IconData icon, String label, Color color) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}
