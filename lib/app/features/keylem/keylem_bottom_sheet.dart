import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'keylem_totp_service.dart';

/// KeyLem Akıllı Tahta Şifre Oluşturucu Alt Sayfası (Bottom Sheet)
Future<void> showKeylemBottomSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => const KeylemBottomSheet(),
  );
}

class KeylemBottomSheet extends StatefulWidget {
  const KeylemBottomSheet({super.key});

  @override
  State<KeylemBottomSheet> createState() => _KeylemBottomSheetState();
}

class _KeylemBottomSheetState extends State<KeylemBottomSheet> with SingleTickerProviderStateMixin {
  String _currentKey = '------';
  int _secondsRemaining = 30;
  bool _isLoading = true;
  bool _isOnline = false;
  Timer? _countdownTimer;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
      lowerBound: 0.96,
      upperBound: 1.0,
    )..value = 1.0;

    _loadKey();
    _startTicker();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _startTicker() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() {
        if (_secondsRemaining > 1) {
          _secondsRemaining--;
        } else {
          // Süre doldu, yeni anahtarı al
          _loadKey(showAnimation: true);
        }
      });
    });
  }

  Future<void> _loadKey({bool showAnimation = false}) async {
    final result = await KeylemTotpService.fetchServerOrLocalKey();
    if (!mounted) return;

    setState(() {
      _currentKey = result.key;
      _secondsRemaining = result.secondsRemaining > 0 ? result.secondsRemaining : 30;
      _isOnline = result.isOnline;
      _isLoading = false;
    });

    if (showAnimation) {
      _pulseController.forward(from: 0.95);
    }
  }

  void _copyToClipboard() {
    if (_currentKey.isEmpty || _currentKey == '------') return;
    Clipboard.setData(ClipboardData(text: _currentKey));
    HapticFeedback.lightImpact();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text('$_currentKey panoya kopyalandı'),
          ],
        ),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        backgroundColor: const Color(0xFF4F46E5),
      ),
    );
  }

  Color _getTimerColor() {
    if (_secondsRemaining > 10) return const Color(0xFF10B981); // Yeşil
    if (_secondsRemaining > 5) return const Color(0xFFF59E0B); // Turuncu
    return const Color(0xFFEF4444); // Kırmızı
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E1E2E) : Colors.white;
    final formattedKey = _currentKey.length == 6
        ? '${_currentKey.substring(0, 3)}  ${_currentKey.substring(3, 6)}'
        : _currentKey;

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 28,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Tutamaç Çubuğu
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.35),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Başlık Satırı
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.tv_rounded,
                  color: Color(0xFF6366F1),
                  size: 26,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'KeyLem Akıllı Tahta',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.3,
                      ),
                    ),
                    Text(
                      'Dinamik Giriş Anahtarı',
                      style: TextStyle(
                        fontSize: 13,
                        color: theme.textTheme.bodyMedium?.color?.withValues(alpha: 0.65),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close_rounded),
                color: Colors.grey,
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Şifre Gösterim Alanı (Geniş Kart)
          ScaleTransition(
            scale: _pulseController,
            child: InkWell(
              onTap: _copyToClipboard,
              borderRadius: BorderRadius.circular(18),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xFF4F46E5),
                      Color(0xFF7C3AED),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4F46E5).withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Text(
                      'GÜNCEL TAHTA ŞİFRESİ',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.5,
                        color: Colors.white.withValues(alpha: 0.75),
                      ),
                    ),
                    const SizedBox(height: 10),
                    _isLoading
                        ? const SizedBox(
                            height: 48,
                            child: Center(
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 3,
                              ),
                            ),
                          )
                        : FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              formattedKey,
                              style: const TextStyle(
                                fontSize: 44,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 8,
                                color: Colors.white,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.copy_rounded, size: 13, color: Colors.white),
                          const SizedBox(width: 5),
                          Text(
                            'Kopyalamak için dokunun',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: Colors.white.withValues(alpha: 0.9),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(height: 22),

          // Dairesel Geri Sayım Sayacı ve Durum
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Sol: Geri Sayım Halkası
              Row(
                children: [
                  SizedBox(
                    width: 44,
                    height: 44,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        CircularProgressIndicator(
                          value: _secondsRemaining / 30.0,
                          strokeWidth: 4,
                          backgroundColor: Colors.grey.withValues(alpha: 0.2),
                          valueColor: AlwaysStoppedAnimation<Color>(_getTimerColor()),
                        ),
                        Center(
                          child: Text(
                            '$_secondsRemaining',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: _getTimerColor(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$_secondsRemaining saniye kaldı',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        _isOnline ? 'Bulut Senkron' : 'Yerel TOTP Motoru',
                        style: TextStyle(
                          fontSize: 11,
                          color: _isOnline ? const Color(0xFF10B981) : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              // Sağ: Yenile Butonu
              OutlinedButton.icon(
                onPressed: () {
                  HapticFeedback.selectionClick();
                  _loadKey(showAnimation: true);
                },
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('Yenile'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),

          // Açıklama / Rehber Kutucuğu
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withValues(alpha: 0.05) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.grey.withValues(alpha: 0.15),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.info_outline_rounded,
                  size: 18,
                  color: Color(0xFF6366F1),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Akıllı tahtanın kilit ekranına bu 6 haneli kodu girerek tahtayı anında açabilirsiniz. Güvenlik için kod her 30 saniyede bir otomatik yenilenir.',
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.4,
                      color: theme.textTheme.bodyMedium?.color?.withValues(alpha: 0.75),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
