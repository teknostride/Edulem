import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:speech_to_text/speech_recognition_error.dart';

/// Web frontend'deki "Sesle Yazdır" butonunun Flutter karşılığı.
/// - Canlı (stream) olarak tanınan kelimeleri metin kutusuna yazar.
/// - Butona tekrar basarak veya konuşmayı bitirince durur.
/// - AVFAudio EXC_BAD_ACCESS çökmelerini önlemek için güvenli oturum yönetimi içerir.
class VoiceInputButton extends StatefulWidget {
  final TextEditingController controller;
  final String? label;

  const VoiceInputButton({
    super.key,
    required this.controller,
    this.label,
  });

  @override
  State<VoiceInputButton> createState() => _VoiceInputButtonState();
}

class _VoiceInputButtonState extends State<VoiceInputButton>
    with SingleTickerProviderStateMixin {
  final stt.SpeechToText _speech = stt.SpeechToText();

  bool _isInitialized = false;
  bool _isListening = false;
  bool _isProcessing = false;
  String? _selectedLocaleId;
  String _initialText = '';

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  Future<bool> _ensureInitialized() async {
    if (_isInitialized) return true;

    try {
      final available = await _speech.initialize(
        onError: _onError,
        onStatus: _onStatus,
        debugLogging: true,
      );

      if (!available) {
        _isInitialized = false;
        return false;
      }

      _isInitialized = true;

      // Cihazdaki Türkçe locale'i tespit et
      try {
        final locales = await _speech.locales();
        for (final loc in locales) {
          if (loc.localeId.toLowerCase().startsWith('tr')) {
            _selectedLocaleId = loc.localeId;
            break;
          }
        }
        if (_selectedLocaleId == null) {
          final sys = await _speech.systemLocale();
          if (sys != null && sys.localeId.toLowerCase().startsWith('tr')) {
            _selectedLocaleId = sys.localeId;
          }
        }
      } catch (e) {
        debugPrint('VoiceInput locales lookup error: $e');
      }

      _selectedLocaleId ??= 'tr_TR';
      debugPrint('VoiceInput initialized. Selected locale: $_selectedLocaleId');
      return true;
    } catch (e) {
      debugPrint('VoiceInput initialize exception: $e');
      _isInitialized = false;
      return false;
    }
  }

  void _onStatus(String status) {
    debugPrint('VoiceInput status: $status');
    if (status == 'done' || status == 'notListening' || status == 'doneNoResult') {
      if (mounted && _isListening) {
        setState(() => _isListening = false);
      }
      try {
        _speech.stop();
      } catch (_) {}
    }
  }

  void _onError(SpeechRecognitionError error) {
    debugPrint('VoiceInput error: ${error.errorMsg} (permanent: ${error.permanent})');
    if (mounted) {
      setState(() => _isListening = false);
    }
    // Mikrofon oturumunu anında serbest bırak (iOS turuncu noktanın kapanması için)
    try {
      _speech.stop();
    } catch (_) {}

    if (mounted) {
      if (error.errorMsg.contains('error_permission')) {
        _showSnack(
          'Mikrofon veya ses tanıma izni verilmedi.\n'
          'Ayarlar uygulamasından EduLem için Mikrofon iznini açın.',
        );
      } else if (error.errorMsg.contains('error_speech_recognizer_disabled') ||
          error.errorMsg.contains('error_speech_recognizer_connection_interrupted') ||
          error.errorMsg.contains('error_speech_recognizer_connection_invalidated')) {
        _showSnack(
          'Apple ses servisi bağlantısı kesildi (LTE/Ağ hatası).\n'
          'Mikrofon serbest bırakıldı. Metin kutusuna dokunup klavye mikrofonuyla (🎙️) konuşabilirsiniz.',
        );
      }
    }
  }

  void _handleResult(dynamic result) {
    final words = result.recognizedWords.toString().trim();
    debugPrint('VoiceInput words: "$words" final: ${result.finalResult}');

    if (words.isNotEmpty && mounted) {
      final sep = _initialText.isNotEmpty &&
              !_initialText.endsWith(' ') &&
              !_initialText.endsWith('\n')
          ? ' '
          : '';

      widget.controller.text = '$_initialText$sep$words';
      widget.controller.selection = TextSelection.fromPosition(
        TextPosition(offset: widget.controller.text.length),
      );

      if (result.finalResult == true) {
        _initialText = widget.controller.text;
      }
    }
  }

  Future<void> _startListening() async {
    if (_isProcessing || _isListening) return;
    _isProcessing = true;

    try {
      final initialized = await _ensureInitialized();
      if (!initialized) {
        _showSnack(
          'Ses tanıma başlatılamadı.\n'
          '• Ayarlar → Genel → Klavye → Dikteyi Etkinleştir açık olmalı\n'
          '• İnternet bağlantınızı kontrol edin',
        );
        return;
      }

      _initialText = widget.controller.text;

      // Türkçe locale'i öncelikle cihazın desteklenen dillerinden al
      String targetLocale = _selectedLocaleId ?? 'tr_TR';
      try {
        final locales = await _speech.locales();
        final trLocale = locales.firstWhere(
          (loc) => loc.localeId.toLowerCase().replaceAll('_', '-').startsWith('tr'),
          orElse: () => stt.LocaleName('tr_TR', 'Turkish'),
        );
        targetLocale = trLocale.localeId;
        _selectedLocaleId = targetLocale;
      } catch (e) {
        debugPrint('VoiceInput locales lookup error: $e');
      }

      debugPrint('VoiceInput starting listen with locale: $targetLocale');

      if (mounted) {
        setState(() => _isListening = true);
      }

      await _speech.listen(
        onResult: _handleResult,
        listenOptions: stt.SpeechListenOptions(
          localeId: targetLocale, // iOS ve Android için kesinlikle Türkçe
          listenFor: const Duration(seconds: 60),
          pauseFor: null,
          partialResults: true,
          cancelOnError: false,
          listenMode: stt.ListenMode.dictation,
          autoPunctuation: true,
          onDevice: false, // Apple'ın yerel + ağ hibrit motorunu kullan
        ),
      );
    } catch (e) {
      debugPrint('VoiceInput listen exception: $e');
      if (mounted) {
        setState(() => _isListening = false);
      }
    } finally {
      _isProcessing = false;
    }
  }

  Future<void> _stopListening() async {
    if (!_isListening) return;
    setState(() => _isListening = false);

    try {
      await _speech.stop();
    } catch (e) {
      debugPrint('VoiceInput stop error: $e');
    }
  }

  void _toggleListening() {
    if (_isListening) {
      _stopListening();
    } else {
      _startListening();
    }
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 5),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    if (_speech.isListening) {
      _speech.stop();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        final scale = _isListening ? _pulseAnimation.value : 1.0;
        return Transform.scale(scale: scale, child: child);
      },
      child: FilledButton.icon(
        onPressed: _isProcessing ? null : _toggleListening,
        style: FilledButton.styleFrom(
          backgroundColor:
              _isListening ? colorScheme.error : colorScheme.primaryContainer,
          foregroundColor:
              _isListening ? colorScheme.onError : colorScheme.onPrimaryContainer,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        icon: Icon(
          _isListening ? Icons.stop_rounded : Icons.mic_none_outlined,
          size: 20,
        ),
        label: Text(
          _isListening ? 'Dinleniyor...' : (widget.label ?? 'Sesle Yazdır'),
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
