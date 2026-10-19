import 'package:go_router/go_router.dart';


class AppNavigationHistory {
  AppNavigationHistory._();
  static final AppNavigationHistory instance = AppNavigationHistory._();

  final List<String> _history = [];
  bool _isNavigatingBack = false;
  String? _lastDashboardRoute;

  List<String> get history => List.unmodifiable(_history);

  bool isDashboardRoute(String location) {
    final clean = location.split('?').first.trim();
    return clean == '/dashboard' ||
        clean.startsWith('/dashboard/') ||
        clean == '/';
  }

  bool isAuthRoute(String location) {
    final clean = location.split('?').first.trim();
    return clean == '/login' || clean == '/' || clean.startsWith('/auth');
  }

  void setLastDashboard(String route) {
    if (isDashboardRoute(route)) {
      _lastDashboardRoute = route;
    }
  }

  String getFallbackDashboard() {
    return _lastDashboardRoute ?? '/dashboard';
  }

  void recordLocation(String location) {
    if (_isNavigatingBack) return;

    final clean = location.trim();
    if (clean.isEmpty) return;

    // Login veya splash rotasında geçmişi temizle
    if (clean == '/login') {
      _history.clear();
      return;
    }
    if (clean == '/') {
      return;
    }

    if (isDashboardRoute(clean)) {
      _lastDashboardRoute = clean;
    }

    // Aynı rotanın ardışık tekrarını ekleme
    if (_history.isNotEmpty && _history.last == clean) {
      return;
    }

    // Eğer anasayfaya dönüldüyse, geçmişi anasayfadan başlatacak şekilde düzenle
    if (isDashboardRoute(clean)) {
      _history.clear();
      _history.add(clean);
      return;
    }

    _history.add(clean);
  }

  Future<bool> handleBack(GoRouter router) async {
    // 1. Önce açık dialog, bottom sheet, drawer veya modal route varsa pop et
    final navigator = router.routerDelegate.navigatorKey.currentState;
    if (navigator != null && navigator.canPop()) {
      navigator.pop();
      return true;
    }

    // 2. GoRouter'ın kendi navigator'ı canPop diyorsa pop et
    if (router.canPop()) {
      router.pop();
      return true;
    }

    // Mevcut konumu al
    final currentLoc = router.routerDelegate.currentConfiguration.uri.toString().trim();

    // 3. Zaten ana sayfada mıyız?
    if (isDashboardRoute(currentLoc)) {
      // Ana sayfadayken geri tuşuna basıldığında uygulamadan çıkma, ana sayfada kal
      return true;
    }

    // 4. Login sayfasındaysak sistemin normal çıkışına izin ver
    if (currentLoc == '/login') {
      return false;
    }

    // 5. Geçmişte önceki sayfa var mı? (Web sitesindeki geri mantığı)
    if (_history.length > 1) {
      // Mevcut sayfayı çıkar
      _history.removeLast();
      final targetRoute = _history.last;

      _isNavigatingBack = true;
      try {
        router.go(targetRoute);
      } finally {
        _isNavigatingBack = false;
      }
      return true;
    }

    // 6. Geçmiş bittiyse veya tek eleman kaldıysa ana sayfaya dön
    final dashboard = getFallbackDashboard();
    _history.clear();
    _history.add(dashboard);

    _isNavigatingBack = true;
    try {
      router.go(dashboard);
    } finally {
      _isNavigatingBack = false;
    }
    return true;
  }
}


