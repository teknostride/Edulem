import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client_provider.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/dio_provider.dart';
import '../../core/storage/secure_storage_provider.dart';
import '../../core/utils/role_utils.dart';
import '../../router.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../auth/auth_providers.dart';
import '../dashboard/portal_dashboard_provider.dart';
import '../homework/homework_paging_controller.dart';
import 'models/saved_account.dart';
import 'profile_providers.dart';

const String _kSavedAccountsKey = 'SAVED_PROFILES_LIST';

final savedAccountsProvider =
    StateNotifierProvider<SavedAccountsNotifier, List<SavedAccount>>((ref) {
  return SavedAccountsNotifier(ref);
});

class SavedAccountsNotifier extends StateNotifier<List<SavedAccount>> {
  SavedAccountsNotifier(this._ref) : super([]) {
    loadAccounts();
  }

  final Ref _ref;


  bool _isSameAccount(SavedAccount a, SavedAccount b) {
    if (a.token.isNotEmpty && b.token.isNotEmpty && a.token == b.token) return true;
    if (a.isStudent != b.isStudent) return false;

    final aTc = a.tcNo.trim();
    final bTc = b.tcNo.trim();
    if (aTc.isNotEmpty && bTc.isNotEmpty) {
      return aTc == bTc;
    }

    if (a.id.isNotEmpty && b.id.isNotEmpty && a.id == b.id) return true;

    if (a.isStudent) {
      if (a.studentId != null && b.studentId != null) {
        return a.studentId == b.studentId;
      }
      final aName = a.name.trim().toLowerCase();
      final bName = b.name.trim().toLowerCase();
      return aName.isNotEmpty && aName == bName;
    } else {
      final aName = a.name.trim().toLowerCase();
      final bName = b.name.trim().toLowerCase();
      final aRole = a.role.trim().toLowerCase();
      final bRole = b.role.trim().toLowerCase();
      return aName.isNotEmpty && aName == bName && aRole == bRole;
    }
  }

  List<SavedAccount> _sanitizeAccounts(List<SavedAccount> accounts) {
    return accounts.map((acc) {
      final u = Map<String, dynamic>.from(acc.userData);

      final isStudent = acc.isStudent ||
          acc.roleKey == 'student' ||
          acc.role == 'student' ||
          acc.id.startsWith('student_') ||
          acc.studentId != null ||
          isStudentRole(acc.role) ||
          u['student_name'] != null ||
          u['classroom_name'] != null ||
          u['school_no'] != null ||
          u['is_student'] == true ||
          isStudentRole(u['role']?.toString()) ||
          isStudentRole(u['role_name']?.toString());

      if (isStudent) {
        u['role'] = 'student';
        u['role_name'] = 'student';
        u['is_student'] = true;
      }

      final String resolvedName = isStudent
          ? (u['student_name'] ?? u['name'] ?? acc.name).toString()
          : (u['name'] ?? acc.name).toString();

      final String resolvedRole = isStudent ? 'student' : extractRole(u);
      final String resolvedRoleKey = isStudent ? 'student' : (acc.roleKey == 'default' ? resolvedRole : acc.roleKey);
      final String resolvedTc = (u['tc_no']?.toString() ?? acc.tcNo).trim();

      return acc.copyWith(
        name: resolvedName,
        isStudent: isStudent,
        role: isStudent ? 'student' : (resolvedRole.isNotEmpty && resolvedRole != 'default' ? resolvedRole : acc.role),
        roleKey: resolvedRoleKey,
        tcNo: resolvedTc,
        userData: u,
      );
    }).toList();
  }

  List<SavedAccount> _deduplicateAccounts(List<SavedAccount> accounts) {
    final sanitized = _sanitizeAccounts(accounts);
    final List<SavedAccount> unique = [];
    for (final acc in sanitized) {
      final idx = unique.indexWhere((u) => _isSameAccount(u, acc));
      if (idx >= 0) {
        final existing = unique[idx];
        unique[idx] = existing.copyWith(
          token: acc.token.isNotEmpty ? acc.token : existing.token,
          tcNo: acc.tcNo.isNotEmpty ? acc.tcNo : existing.tcNo,
          studentId: acc.studentId ?? existing.studentId,
          avatar: (acc.avatar != null && acc.avatar!.isNotEmpty) ? acc.avatar : existing.avatar,
          subtitle: (acc.subtitle != null && acc.subtitle!.isNotEmpty && acc.subtitle != acc.role)
              ? acc.subtitle
              : existing.subtitle,
          userData: {...existing.userData, ...acc.userData},
          lastActiveAt: (acc.lastActiveAt.isAfter(existing.lastActiveAt))
              ? acc.lastActiveAt
              : existing.lastActiveAt,
        );
      } else {
        unique.add(acc);
      }
    }
    return unique;
  }

  Future<List<SavedAccount>> _getFreshList() async {
    try {
      final storage = _ref.read(secureStorageProvider);
      final raw = await storage.read(key: _kSavedAccountsKey);
      if (raw != null && raw.trim().isNotEmpty) {
        final List<dynamic> list = jsonDecode(raw) as List<dynamic>;
        final parsed = list
            .whereType<Map>()
            .map((e) => SavedAccount.fromJson(Map<String, dynamic>.from(e)))
            .toList();
        return _deduplicateAccounts(parsed);
      }
    } catch (e) {
      debugPrint('SavedAccountsNotifier._getFreshList error: $e');
    }
    return [];
  }

  Future<void> loadAccounts() async {
    try {
      final accounts = await _getFreshList();
      state = accounts;
      // Eğer deduplication ile fazlalıklar temizlendiyse depolamayı hemen temizle
      final storage = _ref.read(secureStorageProvider);
      final raw = await storage.read(key: _kSavedAccountsKey);
      final cleanRaw = jsonEncode(accounts.map((e) => e.toJson()).toList());
      if (raw != cleanRaw) {
        await storage.write(key: _kSavedAccountsKey, value: cleanRaw);
      }
    } catch (e) {
      debugPrint('SavedAccountsNotifier.loadAccounts error: $e');
    }
  }

  Future<void> _persistAccounts(List<SavedAccount> accounts) async {
    try {
      final clean = _deduplicateAccounts(accounts);
      final storage = _ref.read(secureStorageProvider);
      final raw = jsonEncode(clean.map((e) => e.toJson()).toList());
      await storage.write(key: _kSavedAccountsKey, value: raw);
      state = clean;
    } catch (e) {
      debugPrint('SavedAccountsNotifier._persistAccounts error: $e');
    }
  }

  /// Normal login ekranından giriş yapıldığında profilleri günceller veya ekler
  Future<void> initSingleAccount({
    required String token,
    required Map<String, dynamic> userData,
    required String role,
    String? tcNo,
    bool isStudent = false,
    int? studentId,
  }) async {
    if (token.isEmpty) return;

    final resolvedTc = (tcNo ?? userData['tc_no']?.toString() ?? '').trim();
    final isActuallyStudent = isStudent ||
        isStudentRole(role) ||
        isStudentRole(userData['role']?.toString()) ||
        isStudentRole(userData['role_name']?.toString()) ||
        userData['student_name'] != null ||
        userData['classroom_name'] != null ||
        userData['classroom_id'] != null ||
        userData['school_no'] != null ||
        studentId != null;

    final dynamic sIdVal =
        isActuallyStudent ? (studentId ?? userData['id'] ?? userData['student_id']) : null;
    final int? resolvedStudentId =
        sIdVal != null ? int.tryParse(sIdVal.toString()) : null;

    final id = isActuallyStudent
        ? 'student_${resolvedStudentId ?? resolvedTc}'
        : 'user_${userData['id'] ?? resolvedTc}';

    final name = (userData['student_name'] ?? userData['name'] ?? 'Kullanıcı')
        .toString();

    final roleToSave = isActuallyStudent ? 'student' : role;
    final roleKey = isActuallyStudent ? 'student' : roleToSave;

    if (isActuallyStudent) {
      userData['role'] = 'student';
      userData['role_name'] = 'student';
      userData['is_student'] = true;
      if (userData['student_name'] != null && userData['name'] == null) {
        userData['name'] = userData['student_name'];
      }
    }

    String subtitle = roleToSave;
    if (isActuallyStudent) {
      final classroom = userData['classroom_name'] ??
          (userData['classroom'] is Map ? userData['classroom']['name'] : null);
      if (classroom != null && classroom.toString().isNotEmpty) {
        subtitle = classroom.toString();
      }
    } else if (userData['branch'] != null) {
      subtitle = userData['branch'].toString();
    }

    final avatar = (userData['avatar'] ?? userData['photo_url'] ?? '').toString();

    final account = SavedAccount(
      id: id,
      name: name,
      role: roleToSave,
      roleKey: roleKey,
      token: token,
      tcNo: resolvedTc,
      avatar: avatar.isNotEmpty ? avatar : null,
      subtitle: subtitle,
      userData: userData,
      isStudent: isActuallyStudent,
      studentId: resolvedStudentId,
      activeSeasonId: userData['season_id']?.toString() ??
          userData['active_season_id']?.toString(),
      lastActiveAt: DateTime.now(),
    );

    final currentList = await _getFreshList();
    final existingIndex = currentList.indexWhere((a) => _isSameAccount(a, account));

    if (existingIndex >= 0) {
      final existing = currentList[existingIndex];
      currentList[existingIndex] = account.copyWith(
        tcNo: resolvedTc.isNotEmpty ? resolvedTc : existing.tcNo,
        studentId: studentId ?? existing.studentId,
        avatar: avatar.isNotEmpty ? avatar : existing.avatar,
        lastActiveAt: DateTime.now(),
      );
    } else {
      currentList.insert(0, account);
    }
    await _persistAccounts(currentList);
  }

  /// Mevcut oturumu kayıtlı hesaplar listesinde varsa günceller, yoksa listeye ekler (ASLA silmez)
  Future<void> syncCurrentSession({
    required String token,
    required Map<String, dynamic> userData,
    required String role,
    String? tcNo,
    bool isStudent = false,
    int? studentId,
  }) async {
    if (token.isEmpty) return;

    final resolvedTc = (tcNo ?? userData['tc_no']?.toString() ?? '').trim();
    final isActuallyStudent = isStudent ||
        isStudentRole(role) ||
        isStudentRole(userData['role']?.toString()) ||
        isStudentRole(userData['role_name']?.toString()) ||
        userData['student_name'] != null ||
        userData['classroom_name'] != null ||
        userData['classroom_id'] != null ||
        userData['school_no'] != null ||
        studentId != null;

    final dynamic sIdVal =
        isActuallyStudent ? (studentId ?? userData['id'] ?? userData['student_id']) : null;
    final int? resolvedStudentId =
        sIdVal != null ? int.tryParse(sIdVal.toString()) : null;

    final id = isActuallyStudent
        ? 'student_${resolvedStudentId ?? resolvedTc}'
        : 'user_${userData['id'] ?? resolvedTc}';

    final name = (userData['student_name'] ?? userData['name'] ?? 'Kullanıcı')
        .toString();

    final roleToSave = isActuallyStudent ? 'student' : role;
    final roleKey = isActuallyStudent ? 'student' : roleToSave;

    String subtitle = roleToSave;
    if (isActuallyStudent) {
      final classroom = userData['classroom_name'] ??
          (userData['classroom'] is Map ? userData['classroom']['name'] : null);
      if (classroom != null && classroom.toString().isNotEmpty) {
        subtitle = classroom.toString();
      }
    } else if (userData['branch'] != null) {
      subtitle = userData['branch'].toString();
    }

    final avatar = (userData['avatar'] ?? userData['photo_url'] ?? '').toString();

    final account = SavedAccount(
      id: id,
      name: name,
      role: roleToSave,
      roleKey: roleKey,
      token: token,
      tcNo: resolvedTc,
      avatar: avatar.isNotEmpty ? avatar : null,
      subtitle: subtitle,
      userData: userData,
      isStudent: isActuallyStudent,
      studentId: resolvedStudentId,
      activeSeasonId: userData['season_id']?.toString() ??
          userData['active_season_id']?.toString(),
      lastActiveAt: DateTime.now(),
    );

    final currentList = await _getFreshList();
    final existingIndex = currentList.indexWhere((a) => _isSameAccount(a, account));

    if (existingIndex >= 0) {
      final existing = currentList[existingIndex];
      final tokenChanged = existing.token != token;
      final roleChanged = existing.role != role;
      final nameChanged = existing.name != name;
      final tcChanged = resolvedTc.isNotEmpty && existing.tcNo != resolvedTc;
      final avatarChanged = avatar.isNotEmpty && existing.avatar != avatar;
      final studentIdChanged = studentId != null && existing.studentId != studentId;

      if (!tokenChanged && !roleChanged && !nameChanged && !tcChanged && !avatarChanged && !studentIdChanged) {
        return;
      }

      currentList[existingIndex] = existing.copyWith(
        token: token,
        role: role,
        name: name,
        subtitle: subtitle,
        tcNo: resolvedTc.isNotEmpty ? resolvedTc : existing.tcNo,
        studentId: studentId ?? existing.studentId,
        avatar: avatar.isNotEmpty ? avatar : existing.avatar,
        userData: {...existing.userData, ...userData},
        lastActiveAt: DateTime.now(),
      );
    } else {
      currentList.insert(0, account);
    }
    await _persistAccounts(currentList);
  }

  /// Belirtilen hesaba geçiş yapar
  Future<void> switchToAccount(
    BuildContext? context,
    SavedAccount target,
  ) async {
    final storage = _ref.read(secureStorageProvider);

    final effectiveUserData = Map<String, dynamic>.from(target.userData);
    if (target.isStudent) {
      effectiveUserData['role'] = 'student';
      effectiveUserData['role_name'] = 'student';
      effectiveUserData['is_student'] = true;
      if (effectiveUserData['student_name'] != null && effectiveUserData['name'] == null) {
        effectiveUserData['name'] = effectiveUserData['student_name'];
      }
    }

    // 1. Yeni hesabın bilgilerini aktif session anahtarlarına yaz
    await storage.write(key: 'ACCESS_TOKEN', value: target.token);
    await storage.write(key: 'USER_DATA', value: jsonEncode(effectiveUserData));
    await storage.write(
      key: 'USER_ROLE',
      value: target.isStudent ? 'student' : target.roleKey,
    );
    await storage.write(key: 'SESSION_TC_NO', value: target.tcNo);
    await storage.write(
      key: 'SESSION_IS_STUDENT',
      value: target.isStudent ? '1' : '0',
    );

    final effectiveStudentId = target.studentId ??
        (target.isStudent ? int.tryParse(target.userData['id']?.toString() ?? '') : null);

    if (target.isStudent && effectiveStudentId != null) {
      await storage.write(
        key: 'ACTIVE_STUDENT_ID',
        value: effectiveStudentId.toString(),
      );
    } else {
      await storage.delete(key: 'ACTIVE_STUDENT_ID');
    }

    if (target.activeSeasonId != null && target.activeSeasonId!.isNotEmpty) {
      await storage.write(
        key: 'active_config_season',
        value: target.activeSeasonId!,
      );
    } else {
      await storage.delete(key: 'active_config_season');
    }

    // 2. Hesabın son aktiflik zamanını güncelle
    final currentList = await _getFreshList();
    final idx = currentList.indexWhere((a) => _isSameAccount(a, target));
    if (idx >= 0) {
      currentList[idx] = currentList[idx].copyWith(lastActiveAt: DateTime.now());
      await _persistAccounts(currentList);
    }

    // 3. Cache'leri temizle
    _ref.read(drawerSectionsCacheProvider.notifier).state = [];
    _ref.invalidate(layoutInitProvider);
    _ref.invalidate(portalDashboardProvider);
    _ref.invalidate(homeworkPagingProvider);
    _ref.invalidate(drawerSectionsCacheProvider);
    _ref.invalidate(dioProvider);

    if (target.isStudent && effectiveStudentId != null) {
      _ref.read(selectedPortalStudentIdProvider.notifier).state =
          effectiveStudentId;
    } else {
      _ref.read(selectedPortalStudentIdProvider.notifier).state = null;
    }

    // 4. İlgili dashboard sayfasına hemen yönlendir
    final targetRoute = target.isStudent
        ? '/dashboard/student'
        : dashboardRouteForRole(target.roleKey);

    final navContext = (context != null && context.mounted)
        ? context
        : AppRouter.navigatorKey.currentContext;

    if (navContext != null && navContext.mounted) {
      navContext.go(targetRoute);
    }

    // 5. Yeni oturum ve profil verilerini yenile
    _ref.invalidate(authSessionProvider);
    _ref.invalidate(profileProvider);
  }

  /// Hesabı listeden siler
  Future<void> removeAccount(
    BuildContext context,
    String accountId,
  ) async {
    final currentList = await _getFreshList();
    currentList.removeWhere((a) => a.id == accountId);
    await _persistAccounts(currentList);

    // Eğer silinen hesap şu anki aktif hesapsa, ilk kalan hesaba geç ya da logout yap
    final storage = _ref.read(secureStorageProvider);
    final activeToken = await storage.read(key: 'ACCESS_TOKEN');

    if (currentList.isNotEmpty) {
      final stillActive = currentList.any((a) => a.token == activeToken);
      if (!stillActive && context.mounted) {
        await switchToAccount(context, currentList.first);
      }
    } else {
      // Hiç hesap kalmadı, çıkış yap
      await storage.delete(key: 'ACCESS_TOKEN');
      await storage.delete(key: 'USER_DATA');
      await storage.delete(key: 'USER_ROLE');
      await storage.delete(key: 'ACTIVE_STUDENT_ID');
      _ref.invalidate(authSessionProvider);
      if (context.mounted) {
        context.go('/login');
      }
    }
  }

  /// Şu anki aktif hesabı kayıtlı profillerden tamamen kaldırır
  Future<void> removeActiveAccount() async {
    final storage = _ref.read(secureStorageProvider);
    final activeToken = await storage.read(key: 'ACCESS_TOKEN');
    final activeTc = (await storage.read(key: 'SESSION_TC_NO'))?.trim();
    final activeIsStudent =
        (await storage.read(key: 'SESSION_IS_STUDENT')) == '1';
    final activeStudentIdStr = await storage.read(key: 'ACTIVE_STUDENT_ID');
    final activeStudentId =
        activeStudentIdStr != null ? int.tryParse(activeStudentIdStr) : null;

    final currentList = await _getFreshList();
    currentList.removeWhere((a) {
      if (activeToken != null && activeToken.isNotEmpty && a.token == activeToken) {
        return true;
      }
      if (activeTc != null &&
          activeTc.isNotEmpty &&
          a.tcNo.trim() == activeTc &&
          a.isStudent == activeIsStudent) {
        return true;
      }
      if (activeIsStudent &&
          activeStudentId != null &&
          a.isStudent &&
          a.studentId == activeStudentId) {
        return true;
      }
      return false;
    });

    await _persistAccounts(currentList);
  }

  /// Aktif hesaptan güvenle çıkış yapar.
  /// Eğer başka kayıtlı profil varsa, doğrudan kalan ilk profile geçiş yapar.
  /// Hiç profil kalmadıysa oturumu temizler ve /login sayfasına yönlendirir.
  Future<void> logoutActiveAccount() async {
    try {
      await removeActiveAccount();
    } catch (e) {
      debugPrint('logoutActiveAccount removeActiveAccount error: $e');
    }

    final remaining = await _getFreshList();

    if (remaining.isNotEmpty) {
      // Başka açık/kayıtlı profil var! İlk kalan hesaba otomatik geçiş yap:
      final nextAcc = remaining.first;
      await switchToAccount(null, nextAcc);
    } else {
      // Başka hesap kalmadı! Backend logout ve tam temizlik yap:
      try {
        final authRepo = _ref.read(authRepositoryProvider);
        await authRepo.logout();
      } catch (e) {
        debugPrint('logoutActiveAccount authRepo.logout error: $e');
      }

      try {
        _ref.read(selectedPortalStudentIdProvider.notifier).state = null;
      } catch (_) {}

      try {
        _ref.invalidate(portalDashboardProvider);
      } catch (_) {}

      try {
        _ref.invalidate(homeworkPagingProvider);
      } catch (_) {}

      try {
        _ref.read(drawerSectionsCacheProvider.notifier).state = [];
      } catch (_) {}

      try {
        _ref.invalidate(authSessionProvider);
      } catch (_) {}

      try {
        _ref.invalidate(profileProvider);
      } catch (_) {}

      final navContext = AppRouter.navigatorKey.currentContext;
      if (navContext != null && navContext.mounted) {
        navContext.go('/login');
      }
    }
  }

  /// Tüm hesaplardan çıkış yapar ve tüm oturumları temizler.
  Future<void> logoutAllAccounts() async {
    try {
      await clearAll();
    } catch (e) {
      debugPrint('logoutAllAccounts clearAll error: $e');
    }

    try {
      final authRepo = _ref.read(authRepositoryProvider);
      await authRepo.logout();
    } catch (e) {
      debugPrint('logoutAllAccounts authRepo.logout error: $e');
    }

    try {
      _ref.read(selectedPortalStudentIdProvider.notifier).state = null;
    } catch (_) {}

    try {
      _ref.invalidate(portalDashboardProvider);
    } catch (_) {}

    try {
      _ref.invalidate(homeworkPagingProvider);
    } catch (_) {}

    try {
      _ref.read(drawerSectionsCacheProvider.notifier).state = [];
    } catch (_) {}

    try {
      _ref.invalidate(authSessionProvider);
    } catch (_) {}

    try {
      _ref.invalidate(profileProvider);
    } catch (_) {}

    final navContext = AppRouter.navigatorKey.currentContext;
    if (navContext != null && navContext.mounted) {
      navContext.go('/login');
    }
  }

  /// Tüm kayıtlı hesapları temizler
  Future<void> clearAll() async {
    try {
      final storage = _ref.read(secureStorageProvider);
      await storage.delete(key: _kSavedAccountsKey);
      state = [];
    } catch (e) {
      debugPrint('SavedAccountsNotifier.clearAll error: $e');
    }
  }

  /// Yeni bir profil için TC ve şifre ile giriş yapıp hesabı kaydeder
  Future<SavedAccount> loginAndSaveAccount({
    required String tcNo,
    required String password,
  }) async {
    final api = _ref.read(apiClientProvider);

    dynamic response;
    bool isStudentPortalLogin = false;

    // 1. Ana Giriş (/auth/login) dene
    try {
      response = await api.postRaw(
        '/auth/login',
        data: {
          'tc_no': tcNo.trim(),
          'password': password,
          'device_name': 'EduLem Mobile Multi-Profile',
        },
      );
    } catch (mainError) {
      // 2. /auth/login başarısız ise /portal/student/login dene
      try {
        final studentRes = await api.postRaw(
          '/portal/student/login',
          data: {
            'tc_no': tcNo.trim(),
            'password': password,
            'device_name': 'EduLem Mobile Multi-Profile',
          },
        );
        if (studentRes.statusCode == 200) {
          response = studentRes;
          isStudentPortalLogin = true;
        } else {
          throw ApiException(
            message: 'Giriş başarısız.',
            statusCode: studentRes.statusCode,
            response: studentRes,
          );
        }
      } catch (studentError) {
        if (studentError is ApiException) {
          rethrow;
        }
        throw mainError;
      }
    }

    final data = response?.data;
    if (response?.statusCode != 200 || data == null) {
      throw ApiException(message: 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    }

    final token = (data is Map)
        ? ((data['data'] is Map ? data['data']['token'] : null) ??
            data['token'] ??
            data['access_token'] ??
            (data['data'] is Map ? data['data']['access_token'] : null) ??
            '')
        : '';

    if (token is! String || token.isEmpty) {
      throw ApiException(message: 'Oturum anahtarı alınamadı.');
    }

    Map<String, dynamic>? user;
    bool isStudent = isStudentPortalLogin;

    final rawStudent = (data is Map && data['data'] is Map)
        ? data['data']['student']
        : (data is Map && data['student'] is Map ? data['student'] : null);
    final rawUser = (data is Map && data['data'] is Map)
        ? data['data']['user']
        : (data is Map && data['user'] is Map ? data['user'] : null);

    if (rawStudent is Map && rawStudent.isNotEmpty) {
      user = Map<String, dynamic>.from(rawStudent);
      isStudent = true;
    } else if (rawUser is Map && rawUser.isNotEmpty) {
      user = Map<String, dynamic>.from(rawUser);
      final roleStr = (user['role'] ?? user['role_name'] ?? '').toString();
      isStudent = isStudentRole(roleStr);
    }

    if (user == null) {
      throw ApiException(message: 'Kullanıcı profili alınamadı.');
    }

    // Ek güvenlik: Eğer 'student_name' varsa veya 'classroom' bilgisi varsa kesinlikle öğrencidir
    if (user['student_name'] != null ||
        user['classroom_name'] != null ||
        user['classroom_id'] != null ||
        user['school_no'] != null) {
      isStudent = true;
    }

    final String name =
        (user['student_name'] ?? user['name'] ?? 'Kullanıcı').toString();
    final String roleToSave = isStudent ? 'student' : extractRole(user);
    final String roleKey = isStudent ? 'student' : roleToSave;
    final dynamic sIdVal =
        isStudent ? (user['id'] ?? user['student_id']) : null;
    final int? studentId =
        sIdVal != null ? int.tryParse(sIdVal.toString()) : null;

    if (isStudent) {
      user['role'] = 'student';
      user['role_name'] = 'student';
      user['is_student'] = true;
      if (user['student_name'] != null && user['name'] == null) {
        user['name'] = user['student_name'];
      }
    }

    String subtitle = roleToSave;
    if (isStudent) {
      final classroom = user['classroom_name'] ??
          (user['classroom'] is Map ? user['classroom']['name'] : null);
      if (classroom != null && classroom.toString().isNotEmpty) {
        subtitle = classroom.toString();
      }
    } else if (user['branch'] != null) {
      subtitle = user['branch'].toString();
    }

    final avatar = (user['avatar'] ?? user['photo_url'] ?? '').toString();

    final newAccount = SavedAccount(
      id: isStudent
          ? 'student_${studentId ?? tcNo.trim()}'
          : 'user_${user['id'] ?? tcNo.trim()}',
      name: name,
      role: roleToSave,
      roleKey: roleKey,
      token: token,
      tcNo: tcNo.trim(),
      avatar: avatar.isNotEmpty ? avatar : null,
      subtitle: subtitle,
      userData: user,
      isStudent: isStudent,
      studentId: studentId,
      activeSeasonId: user['season_id']?.toString() ??
          user['active_season_id']?.toString(),
      lastActiveAt: DateTime.now(),
    );

    // Listeye ekle / güncelle
    final currentList = await _getFreshList();
    final existingIndex = currentList.indexWhere((a) => _isSameAccount(a, newAccount));
    if (existingIndex >= 0) {
      final existing = currentList[existingIndex];
      currentList[existingIndex] = newAccount.copyWith(
        tcNo: tcNo.trim().isNotEmpty ? tcNo.trim() : existing.tcNo,
        studentId: studentId ?? existing.studentId,
        avatar: avatar.isNotEmpty ? avatar : existing.avatar,
        lastActiveAt: DateTime.now(),
      );
    } else {
      currentList.insert(0, newAccount);
    }
    await _persistAccounts(currentList);
    return newAccount;
  }

  /// Yeni bir profil için TC ve şifre ile giriş yapıp hesabı ekler ve doğrudan o hesaba geçer
  Future<void> loginAndAddAccount({
    required BuildContext context,
    required String tcNo,
    required String password,
  }) async {
    final newAccount = await loginAndSaveAccount(tcNo: tcNo, password: password);
    if (context.mounted) {
      await switchToAccount(context, newAccount);
    }
  }
}
