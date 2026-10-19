import 'dart:convert';
import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client_provider.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/dio_provider.dart';
import '../../core/storage/secure_storage_provider.dart';
import '../../core/utils/role_utils.dart';
import '../../features/notifications/push/fcm_service.dart';
import '../../features/notifications/push/notification_permission.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import 'auth_providers.dart';
import '../dashboard/portal_dashboard_provider.dart';
import '../homework/homework_paging_controller.dart';
import '../profile/account_manager_service.dart';
import '../profile/profile_providers.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final TextEditingController _tcNoController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _isLoading = false;
  bool _rememberMe = false;
  bool _showForgotInfo = false;
  String? _errorMessage;

  static const _rememberMeKey = 'LOGIN_REMEMBER_ME';
  static const _rememberTcNoKey = 'LOGIN_TC_NO';
  static const _rememberPasswordKey = 'LOGIN_PASSWORD';

  Timer? _rememberDebounce;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_loadRememberedCredentials);

    _tcNoController.addListener(_onCredentialsChanged);
    _passwordController.addListener(_onCredentialsChanged);
  }

  void _onCredentialsChanged() {
    if (_errorMessage != null) {
      setState(() => _errorMessage = null);
    }
    if (!_rememberMe) return;
    _rememberDebounce?.cancel();
    _rememberDebounce = Timer(const Duration(milliseconds: 300), () {
      _persistRememberedCredentials();
    });
  }

  Future<void> _loadRememberedCredentials() async {
    try {
      final storage = ref.read(secureStorageProvider);
      final rememberRaw = await storage.read(key: _rememberMeKey);
      final remember = rememberRaw == '1' || rememberRaw == 'true';
      if (!mounted) return;
      setState(() => _rememberMe = remember);

      if (remember) {
        final tcNo = await storage.read(key: _rememberTcNoKey);
        final password = await storage.read(key: _rememberPasswordKey);
        if (!mounted) return;
        if (tcNo != null && tcNo.trim().isNotEmpty) {
          _tcNoController.text = tcNo.trim();
        }
        if (password != null && password.isNotEmpty) {
          _passwordController.text = password;
        }
      }
    } catch (e) {
      // RememberMe load failed
    }
  }

  Future<void> _persistRememberedCredentials() async {
    final storage = ref.read(secureStorageProvider);

    if (_rememberMe) {
      await storage.write(key: _rememberMeKey, value: '1');
      await storage.write(
        key: _rememberTcNoKey,
        value: _tcNoController.text.trim(),
      );
      await storage.write(
        key: _rememberPasswordKey,
        value: _passwordController.text,
      );
    } else {
      await storage.write(key: _rememberMeKey, value: '0');
      await storage.delete(key: _rememberTcNoKey);
      await storage.delete(key: _rememberPasswordKey);
    }
  }

  bool _isNetworkError(dynamic e) {
    if (e is ApiException) {
      if (e.statusCode == null) return true;
      final msg = e.message.toLowerCase();
      return msg.contains('timeout') ||
          msg.contains('timed out') ||
          msg.contains('socketexception') ||
          msg.contains('connection refused') ||
          msg.contains('connection error') ||
          msg.contains('network is unreachable') ||
          msg.contains('failed host lookup');
    }
    if (e is DioException) {
      return e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError;
    }
    final s = e.toString().toLowerCase();
    return s.contains('socketexception') ||
        s.contains('network is unreachable') ||
        s.contains('connection error');
  }

  String _extractErrorMessage(dynamic e) {
    if (e is ApiException) {
      return e.userFriendlyMessage;
    }
    if (e is DioException) {
      if (e.response != null) {
        final apiEx = ApiException(
          message: e.message ?? 'Request failed',
          statusCode: e.response?.statusCode,
          uri: e.requestOptions.uri,
          response: e.response,
        );
        return apiEx.userFriendlyMessage;
      }
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        return 'Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edin.';
      }
      if (e.type == DioExceptionType.connectionError) {
        return 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.';
      }
    }
    final str = e.toString().toLowerCase();
    if (str.contains('socketexception') ||
        str.contains('network is unreachable') ||
        str.contains('failed host lookup')) {
      return 'Sunucuya erişilemiyor. Lütfen internet bağlantınızı kontrol edin.';
    }
    return 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
  }

  SnackBar _buildErrorSnackBar(String message) {
    return SnackBar(
      behavior: SnackBarBehavior.floating,
      backgroundColor: const Color(0xFFDC2626),
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      margin: const EdgeInsets.all(16),
      content: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: Colors.white,
            size: 22,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
      duration: const Duration(seconds: 4),
    );
  }

  bool _obscurePassword = true;

  Future<void> _login() async {
    final tcNo = _tcNoController.text.trim();
    final password = _passwordController.text;

    if (tcNo.isEmpty) {
      const msg = 'Lütfen TC Kimlik Numaranızı girin.';
      setState(() => _errorMessage = msg);
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(_buildErrorSnackBar(msg));
      }
      return;
    }

    if (password.isEmpty) {
      const msg = 'Lütfen şifrenizi girin.';
      setState(() => _errorMessage = msg);
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(_buildErrorSnackBar(msg));
      }
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    debugPrint('==================== [LOGIN START] ====================');
    debugPrint('TC No: "$tcNo" (length: ${tcNo.length})');
    debugPrint('Password length: ${password.length}');

    try {
      final api = ref.read(apiClientProvider);
      final storage = ref.read(secureStorageProvider);

      // Önceki aktif oturum verilerini temizle
      try {
        await storage.delete(key: 'ACCESS_TOKEN');
        await storage.delete(key: 'USER_DATA');
        await storage.delete(key: 'USER_ROLE');
        await storage.delete(key: 'ACTIVE_STUDENT_ID');
      } catch (storageError) {
        debugPrint('[LOGIN] Storage temizleme uyarısı (önemsiz): $storageError');
      }
      ref.read(selectedPortalStudentIdProvider.notifier).state = null;

      // --- ADIM 1: Ana Giriş (/auth/login) ---
      dynamic response;
      bool isStudentPortalLogin = false;

      debugPrint('[LOGIN] /auth/login isteği gönderiliyor...');
      try {
        response = await api.postRaw(
          '/auth/login',
          data: {
            'tc_no': tcNo,
            'password': password,
            'device_name': 'EduLem Mobile',
          },
        );
        debugPrint('[LOGIN] /auth/login BAŞARILI! Status: ${response.statusCode}');
        debugPrint('[LOGIN] /auth/login Yanıt: ${response.data}');
      } catch (mainLoginError) {
        debugPrint('[LOGIN] /auth/login HATA ALDI: $mainLoginError');
        if (mainLoginError is ApiException) {
          debugPrint('[LOGIN] ApiException status: ${mainLoginError.statusCode}');
          debugPrint('[LOGIN] ApiException response data: ${mainLoginError.response?.data}');
        }

        if (_isNetworkError(mainLoginError)) {
          rethrow;
        }

        // /auth/login başarısız → öğrenci portalını (/portal/student/login) dene
        debugPrint('[LOGIN] /portal/student/login deneniyor...');
        try {
          final studentRes = await api.postRaw(
            '/portal/student/login',
            data: {
              'tc_no': tcNo,
              'password': password,
              'device_name': 'EduLem Mobile',
            },
          );
          if (studentRes.statusCode == 200) {
            response = studentRes;
            isStudentPortalLogin = true;
            debugPrint('[LOGIN] /portal/student/login BAŞARILI!');
          } else {
            throw ApiException(
              message: 'Giriş başarısız.',
              statusCode: studentRes.statusCode,
              response: studentRes,
            );
          }
        } catch (studentError) {
          debugPrint('[LOGIN] /portal/student/login da HATA ALDI: $studentError');
          if (studentError is ApiException) {
            debugPrint('[LOGIN] Student ApiException data: ${studentError.response?.data}');
          }

          if (_isNetworkError(studentError)) {
            rethrow;
          }

          // Eğer ana giriş (/auth/login) bir 401/422 aldıysa, onun gerçek mesajını göster
          // Çünkü personel öğrenci portalında bulunamayabilir
          if (mainLoginError is ApiException && mainLoginError.statusCode != null) {
            rethrow;
          }
          if (studentError is ApiException) {
            rethrow;
          }
          throw mainLoginError;
        }
      }

      final data = response.data;

      if (response.statusCode == 200) {
        final token = (data is Map)
            ? ((data['data'] is Map ? data['data']['token'] : null) ??
                  data['token'] ??
                  data['access_token'] ??
                  (data['data'] is Map ? data['data']['access_token'] : null) ??
                  '')
            : '';

        if (token is! String || token.isEmpty) {
          const msg = 'Oturum anahtarı alınamadı. Lütfen tekrar deneyin.';
          if (mounted) {
            setState(() => _errorMessage = msg);
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
            ScaffoldMessenger.of(context).showSnackBar(_buildErrorSnackBar(msg));
          }
          return;
        }

        // Öğrenci portal girişi: response.data.data.student
        // Personel / Veli / Öğrenci: response.data.data.user
        Map<String, dynamic>? user;
        if (isStudentPortalLogin) {
          final student = (data is Map && data['data'] is Map)
              ? (data['data']['student'] is Map
                    ? Map<String, dynamic>.from(data['data']['student'] as Map)
                    : null)
              : null;
          if (student != null) {
            user = {...student, 'role': 'student'};
          }
        } else {
          // /auth/login başarılı → kullanıcı kesinlikle personel/veli/öğretmendir.
          // Backend bazen data.user yerine data.student döndürebilir (öğrenci kayıtlı personeller için),
          // bu durumda bile 'student' rolü atamak YANLIŞ. Role backend'den gelen gerçek değer olmalı.
          final rawUser = (data is Map && data['data'] is Map)
              ? data['data']['user']
              : null;
          if (rawUser is Map) {
            user = Map<String, dynamic>.from(rawUser);
          } else {
            // data.user yoksa data.student'ı kullan AMA role atama
            final rawStudent = (data is Map && data['data'] is Map)
                ? data['data']['student']
                : null;
            if (rawStudent is Map) {
              user = Map<String, dynamic>.from(rawStudent);
              // ASLA 'student' role atama — /auth/login üzerinden geldi, personeldir
            }
          }
          // role alanı yoksa ve başka alanda role_name varsa onu kullan
          // (student kelimesi içeren rolelar role_utils ile güvenle filtrelenir)
        }

        String roleToSave = '';
        final dynamic role = user?['role'];
        if (role is String) {
          roleToSave = role;
        } else if (role is Map) {
          final name =
              role['name'] ?? role['title'] ?? role['key'] ?? role['slug'];
          if (name != null) roleToSave = name.toString();
        } else if (user?['role_name'] != null) {
          roleToSave = user?['role_name'].toString() ?? '';
        } else if (user?['role_id'] != null) {
          roleToSave = user?['role_id'].toString() ?? '';
        }

        await storage.write(key: 'ACCESS_TOKEN', value: token);
        await storage.write(key: 'SESSION_TC_NO', value: tcNo);
        await storage.write(key: 'SESSION_PASSWORD', value: password);
        await storage.write(
          key: 'SESSION_IS_STUDENT',
          value: isStudentPortalLogin ? '1' : '0',
        );
        dynamic studentIdVal = user?['student_id'];
        if (studentIdVal == null && (isStudentPortalLogin || isStudentRole(roleToSave))) {
          studentIdVal = user?['id'];
        }
        if (studentIdVal != null) {
          await storage.write(key: 'ACTIVE_STUDENT_ID', value: studentIdVal.toString());
        } else {
          await storage.delete(key: 'ACTIVE_STUDENT_ID');
        }
        if (user != null) {
          await storage.write(key: 'USER_DATA', value: jsonEncode(user));
          try {
            await ref.read(savedAccountsProvider.notifier).initSingleAccount(
                  token: token,
                  userData: user,
                  role: roleToSave,
                  tcNo: tcNo,
                  isStudent: isStudentPortalLogin || isStudentRole(roleToSave),
                  studentId: studentIdVal != null
                      ? int.tryParse(studentIdVal.toString())
                      : null,
                );
          } catch (_) {}
        }
        await storage.write(key: 'USER_ROLE', value: roleToSave);

        // X-Season-Id header için aktif sezon bilgisi
        final seasonId =
            user?['active_season_id'] ??
            user?['current_season_id'] ??
            user?['season_id'] ??
            user?['config_season_id'];
        if (seasonId != null) {
          await storage.write(
            key: 'active_config_season',
            value: seasonId.toString(),
          );
        } else {
          await storage.delete(key: 'active_config_season');
        }

        try {
          await _persistRememberedCredentials();
        } catch (e) {
          // RememberMe persist failed
        }

        if (mounted) {
          // Önceki session cache'ini temizle
          ref.invalidate(authSessionProvider);
          ref.invalidate(profileProvider);
          ref.invalidate(portalDashboardProvider);
          ref.invalidate(homeworkPagingProvider);
          ref.invalidate(dioProvider);
          if (studentIdVal != null && int.tryParse(studentIdVal.toString()) != null) {
            ref.read(selectedPortalStudentIdProvider.notifier).state =
                int.parse(studentIdVal.toString());
          } else {
            ref.read(selectedPortalStudentIdProvider.notifier).state = null;
          }
          ref.read(drawerSectionsCacheProvider.notifier).state = [];
          // FCM token kaydı arka planda yap (login'i bloke etme)
          unawaited(_setupPushNotifications());
          // Dashboard'a geç — auth provider orada otomatik fetch edilir
          if (mounted) context.go(dashboardRouteForRole(roleToSave));
        }
      } else {
        final serverMsg =
            (data is Map ? (data['message'] ?? data['error']) : null)?.toString();
        final msg = (serverMsg != null && serverMsg.isNotEmpty)
            ? serverMsg
            : 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';

        debugPrint('[LOGIN] Sunucudan 200 dışı başarı yanıtı döndü: $msg, Data: $data');

        if (mounted) {
          setState(() => _errorMessage = msg);
          ScaffoldMessenger.of(context).hideCurrentSnackBar();
          ScaffoldMessenger.of(context).showSnackBar(_buildErrorSnackBar(msg));
        }
      }
    } catch (e, stack) {
      debugPrint('[LOGIN] GENEL CATCH HATASI: $e');
      debugPrint('[LOGIN] Stack trace: $stack');
      final friendlyMsg = _extractErrorMessage(e);

      if (mounted) {
        setState(() => _errorMessage = friendlyMsg);
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(_buildErrorSnackBar(friendlyMsg));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Push bildirimler için FCM token kaydı ve izin kontrolü
  Future<void> _setupPushNotifications() async {
    try {
      // FCM servisini başlat
      await FcmService().init(ref: ref);

      // Bildirim izni iste
      await NotificationPermission.checkAndRequest();

      // Token kaydet
      await FcmService().registerToken(ref);
    } catch (e) {
      // Token kaydı başarısız olursa sessizce devam et (kritik değil)
    }
  }

  @override
  void dispose() {
    _rememberDebounce?.cancel();
    _tcNoController.removeListener(_onCredentialsChanged);
    _passwordController.removeListener(_onCredentialsChanged);
    _tcNoController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final isWide = width >= 992;

    final borderColor = const Color(0xFF9CA3AF);
    final formRadius = BorderRadius.circular(18);

    InputDecoration deco({
      required String label,
      required IconData icon,
      String? hint,
      Widget? suffixIcon,
    }) {
      return InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon, color: Colors.black45),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: const Color(0xFFF3F4F6),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: borderColor, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: theme.colorScheme.primary, width: 2),
        ),
      );
    }

    Widget logo({double size = 88, double radius = 24}) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Consumer(
          builder: (context, ref, _) {
            final logoInfo = ref.watch(tenantLogoInfoProvider);
            return logoInfo.when(
              data: (info) {
                final url = (info['url'] ?? '').toString();
                final headers = (info['headers'] is Map)
                    ? Map<String, String>.from(info['headers'] as Map)
                    : const <String, String>{};

                Widget fallback() {
                  return ClipOval(
                    child: Image.asset(
                      'assets/images/logo.png',
                      width: size,
                      height: size,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          width: size,
                          height: size,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(radius),
                            border: Border.all(color: borderColor, width: 2),
                          ),
                          child: const Icon(
                            Icons.school,
                            size: 44,
                            color: Colors.black45,
                          ),
                        );
                      },
                    ),
                  );
                }

                if (url.trim().isEmpty) return fallback();

                return Image.network(
                  url,
                  headers: headers,
                  width: size,
                  height: size,
                  fit: BoxFit.cover,
                  errorBuilder: (context, _, _) => fallback(),
                );
              },
              loading: () => ClipOval(
                child: Image.asset(
                  'assets/images/logo.png',
                  width: size,
                  height: size,
                  fit: BoxFit.cover,
                ),
              ),
              error: (_, _) => ClipOval(
                child: Image.asset(
                  'assets/images/logo.png',
                  width: size,
                  height: size,
                  fit: BoxFit.cover,
                ),
              ),
            );
          },
        ),
      );
    }

    Widget heroStats({Color textColor = Colors.white}) {
      Widget stat(String value, String label) {
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: TextStyle(
                color: textColor,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: textColor.withValues(alpha: 0.70),
                fontSize: 12,
              ),
            ),
          ],
        );
      }

      return Center(
        child: stat('%100', 'Kontrol'),
      );
    }

    Widget mobileHero() {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: const Color(0xFF94A3B8).withValues(alpha: 0.16),
          ),
          boxShadow: const [
            BoxShadow(
              blurRadius: 44,
              offset: Offset(0, 18),
              color: Color.fromRGBO(2, 6, 23, 0.45),
            ),
          ],
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0B1220), Color(0xFF0F172A), Color(0xFF0B1220)],
            stops: [0, 0.48, 1],
          ),
        ),
        child: Column(
          children: [
            Container(
              width: 88,
              height: 88,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(
                  colors: [
                    Color.fromRGBO(255, 255, 255, 0.10),
                    Color.fromRGBO(255, 255, 255, 0.06),
                  ],
                ),
              ),
              child: Center(child: logo(size: 64, radius: 16)),
            ),
            const SizedBox(height: 14),
            const Text(
              'EduLem',
              style: TextStyle(
                color: Color.fromRGBO(226, 232, 240, 0.95),
                fontSize: 26,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.0,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Tüm eğitim süreçlerinizi tek noktadan, güvenle yönetin.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color.fromRGBO(226, 232, 240, 0.75),
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 14),
            heroStats(textColor: const Color.fromRGBO(226, 232, 240, 0.95)),
          ],
        ),
      );
    }

    Widget formCard() {
      return Material(
        elevation: 0,
        color: Colors.white,
        borderRadius: formRadius,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: formRadius,
            boxShadow: const [
              BoxShadow(
                blurRadius: 30,
                offset: Offset(0, 14),
                color: Color.fromRGBO(15, 23, 42, 0.14),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 4),
                const Text(
                  'Hoş Geldiniz',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Lütfen hesabınıza giriş yapın.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.black54),
                ),
                const SizedBox(height: 18),
                if (_errorMessage != null) ...[
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: const Color(0xFFFCA5A5),
                        width: 1.2,
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(top: 2),
                          child: Icon(
                            Icons.error_outline_rounded,
                            color: Color(0xFFDC2626),
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(
                              color: Color(0xFF991B1B),
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              height: 1.35,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        GestureDetector(
                          onTap: () => setState(() => _errorMessage = null),
                          behavior: HitTestBehavior.opaque,
                          child: const Padding(
                            padding: EdgeInsets.only(top: 2),
                            child: Icon(
                              Icons.close_rounded,
                              size: 18,
                              color: Color(0xFFDC2626),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                TextField(
                  controller: _tcNoController,
                  keyboardType: TextInputType.number,
                  maxLength: 11,
                  buildCounter: (context, {required currentLength, required isFocused, maxLength}) => null,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(11),
                  ],
                  decoration: deco(
                    label: 'TC Kimlik No',
                    hint: '11 haneli TC Kimlik No',
                    icon: Icons.person_outline,
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Şifre',
                        style: theme.textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () => setState(() => _showForgotInfo = true),
                      child: Text(
                        'Şifremi Unuttum?',
                        style: TextStyle(color: theme.colorScheme.primary),
                      ),
                    ),
                  ],
                ),
                TextField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: deco(
                    label: 'Şifre',
                    hint: '••••••••',
                    icon: Icons.lock_outline,
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off : Icons.visibility,
                        color: Colors.black45,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Checkbox(
                      value: _rememberMe,
                      onChanged: (v) {
                        setState(() => _rememberMe = v ?? false);
                        _persistRememberedCredentials();
                      },
                      side: BorderSide(color: borderColor, width: 2),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const Text(
                      'Beni Hatırla',
                      style: TextStyle(color: Colors.black54),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _login,
                    child: _isLoading
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              ),
                              SizedBox(width: 10),
                              Text('Giriş yapılıyor...'),
                            ],
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.login),
                              SizedBox(width: 10),
                              Text(
                                'Giriş Yap',
                                style: TextStyle(fontWeight: FontWeight.w800),
                              ),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    Future<void> forgotDialog() async {
      if (!_showForgotInfo) return;
      await showDialog<void>(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: const Text('Bilgilendirme'),
            content: const Text(
              'Lütfen İdari Amirinizden / Yöneticinizden Destek Alınız',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Tamam'),
              ),
            ],
          );
        },
      );
      if (mounted) {
        setState(() => _showForgotInfo = false);
      }
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      forgotDialog();
    });

    Widget content() {
      final formArea = ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 450),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!isWide) ...[mobileHero(), const SizedBox(height: 16)],
            formCard(),
            const SizedBox(height: 18),
            const Text(
              '2026 EduLem v1.0',
              style: TextStyle(color: Colors.black45, fontSize: 12),
            ),
          ],
        ),
      );

      if (!isWide) {
        return Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: formArea,
          ),
        );
      }

      final left = Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
          ),
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(48),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: const [
                      BoxShadow(
                        blurRadius: 25,
                        offset: Offset(0, 10),
                        color: Color.fromRGBO(0, 0, 0, 0.25),
                      ),
                    ],
                  ),
                  child: logo(size: 120, radius: 28),
                ),
                const SizedBox(height: 20),
                const Text(
                  'EduLem',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 44,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Tüm eğitim süreçlerinizi tek noktadan, güvenle yönetin.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color.fromRGBO(255, 255, 255, 0.60),
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 40),
                heroStats(textColor: Colors.white),
              ],
            ),
          ),
        ),
      );

      final right = Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: formArea,
        ),
      );

      return Row(
        children: [
          Expanded(child: left),
          Expanded(child: right),
        ],
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(child: content()),
    );
  }
}
