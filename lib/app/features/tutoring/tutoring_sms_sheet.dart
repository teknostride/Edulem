import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'tutoring_providers.dart';

class TutoringSmsSheet extends ConsumerStatefulWidget {
  const TutoringSmsSheet({
    super.key,
    required this.session,
    this.initialStudents,
  });

  final Map<String, dynamic> session;
  final List<Map<String, dynamic>>? initialStudents;

  static Future<void> show(
    BuildContext context, {
    required Map<String, dynamic> session,
    List<Map<String, dynamic>>? initialStudents,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => TutoringSmsSheet(
        session: session,
        initialStudents: initialStudents,
      ),
    );
  }

  @override
  ConsumerState<TutoringSmsSheet> createState() => _TutoringSmsSheetState();
}

class _TutoringSmsSheetState extends ConsumerState<TutoringSmsSheet> {
  final _messageController = TextEditingController();
  String _targetAudience = 'guardians';
  final Set<int> _selectedStudentIds = {};
  bool _sending = false;
  List<Map<String, dynamic>> _students = [];

  final List<Map<String, String>> _audienceOptions = const [
    {'id': 'guardians', 'label': 'Veliler'},
    {'id': 'mother', 'label': 'Anneler'},
    {'id': 'father', 'label': 'Babalar'},
    {'id': 'student', 'label': 'Öğrenciler'},
    {'id': 'all', 'label': 'Tümü'},
  ];

  @override
  void initState() {
    super.initState();
    _initStudents();
  }

  void _initStudents() {
    if (widget.initialStudents != null && widget.initialStudents!.isNotEmpty) {
      _students = List<Map<String, dynamic>>.from(widget.initialStudents!);
    } else if (widget.session['students'] is List) {
      _students = (widget.session['students'] as List)
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }

    for (final s in _students) {
      final id = int.tryParse(s['id']?.toString() ?? '');
      if (id != null) {
        _selectedStudentIds.add(id);
      }
    }

    final title = widget.session['title']?.toString() ?? 'Etüt';
    _messageController.text =
        'Sayın velimiz, öğrencimizin $title etüt dersi ile ilgili bilgilendirmedir.';
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  void _applyTemplate(String text) {
    setState(() {
      _messageController.text = text;
    });
  }

  int _calculateSmsCount(int charCount) {
    if (charCount == 0) return 0;
    if (charCount <= 160) return 1;
    return (charCount / 153).ceil();
  }

  Future<void> _handleSend() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lütfen bir SMS mesajı girin.')),
      );
      return;
    }

    if (_selectedStudentIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lütfen en az bir öğrenci seçin.')),
      );
      return;
    }

    setState(() => _sending = true);

    try {
      final repo = ref.read(tutoringRepositoryProvider);
      final title = widget.session['title']?.toString() ?? 'Etüt';
      await repo.sendSms(
        title: '$title - Etüt Bilgilendirmesi',
        message: message,
        studentIds: _selectedStudentIds.toList(),
        targetAudience: _targetAudience,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.green,
            content: Text(
              '${_selectedStudentIds.length} öğrenci için SMS başarıyla kuyruğa alındı.',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.red,
            content: Text('SMS gönderilemedi: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.session['title']?.toString() ?? 'Etüt';
    final lesson = widget.session['lesson'] is Map
        ? widget.session['lesson']['name']?.toString()
        : null;
    final date = widget.session['date']?.toString() ?? '';
    final charCount = _messageController.text.length;
    final smsCount = _calculateSmsCount(charCount);

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.sms_outlined, color: Colors.blue.shade700),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'SMS Gönder',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '$title${lesson != null ? " • $lesson" : ""}',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Body
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // Hedef Kitle
                const Text(
                  'Hedef Kitle',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _audienceOptions.map((opt) {
                    final isSelected = _targetAudience == opt['id'];
                    return ChoiceChip(
                      label: Text(opt['label']!),
                      selected: isSelected,
                      selectedColor: Colors.blue.shade600,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : Colors.black87,
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 13,
                      ),
                      onSelected: (val) {
                        if (val) {
                          setState(() => _targetAudience = opt['id']!);
                        }
                      },
                    );
                  }).toList(),
                ),

                const SizedBox(height: 20),

                // Hazır Şablonlar
                const Text(
                  'Hızlı Şablonlar',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      ActionChip(
                        avatar: const Icon(Icons.info_outline, size: 16),
                        label: const Text('Etüt Bilgisi'),
                        onPressed: () {
                          _applyTemplate(
                            'Sayın velimiz, öğrencimizin $title etüt dersi $date tarihinde gerçekleştirilecektir.',
                          );
                        },
                      ),
                      const SizedBox(width: 8),
                      ActionChip(
                        avatar: const Icon(Icons.check_circle_outline,
                            size: 16, color: Colors.green),
                        label: const Text('Katılım Sağladı'),
                        onPressed: () {
                          _applyTemplate(
                            'Sayın velimiz, öğrencimiz $title dersi etüt çalışmasına katılım sağlamıştır.',
                          );
                        },
                      ),
                      const SizedBox(width: 8),
                      ActionChip(
                        avatar: const Icon(Icons.cancel_outlined,
                            size: 16, color: Colors.red),
                        label: const Text('Katılmadı'),
                        onPressed: () {
                          _applyTemplate(
                            'Sayın velimiz, öğrencimiz bugünkü $title etüt çalışmasına katılmamıştır.',
                          );
                        },
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Mesaj Alanı
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'SMS Mesajı',
                      style: TextStyle(
                          fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '$charCount kr. ($smsCount SMS)',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.blue.shade700,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _messageController,
                  maxLines: 4,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Gönderilecek mesajı buraya yazın...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),

                const SizedBox(height: 20),

                // Öğrenci Seçimi
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Alıcı Öğrenciler (${_selectedStudentIds.length}/${_students.length})',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          if (_selectedStudentIds.length == _students.length) {
                            _selectedStudentIds.clear();
                          } else {
                            _selectedStudentIds.clear();
                            for (final s in _students) {
                              final id =
                                  int.tryParse(s['id']?.toString() ?? '');
                              if (id != null) _selectedStudentIds.add(id);
                            }
                          }
                        });
                      },
                      child: Text(
                        _selectedStudentIds.length == _students.length
                            ? 'Seçimi Kaldır'
                            : 'Tümünü Seç',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),

                if (_students.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    alignment: Alignment.center,
                    child: Text(
                      'Bu etüte kayıtlı öğrenci bulunmuyor.',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  )
                else
                  ..._students.map((student) {
                    final id =
                        int.tryParse(student['id']?.toString() ?? '') ?? 0;
                    final name = student['name']?.toString() ??
                        '${student['first_name'] ?? ''} ${student['last_name'] ?? ''}'
                            .trim();
                    final no = student['student_number']?.toString() ??
                        student['school_no']?.toString() ??
                        '';
                    final isChecked = _selectedStudentIds.contains(id);

                    return CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      value: isChecked,
                      onChanged: (val) {
                        setState(() {
                          if (val == true) {
                            _selectedStudentIds.add(id);
                          } else {
                            _selectedStudentIds.remove(id);
                          }
                        });
                      },
                      title: Text(
                        name.isEmpty ? 'Öğrenci #$id' : name,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      subtitle: no.isNotEmpty
                          ? Text('No: $no', style: const TextStyle(fontSize: 12))
                          : null,
                      controlAffinity: ListTileControlAffinity.leading,
                    );
                  }),
              ],
            ),
          ),

          // Footer
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _sending ? null : _handleSend,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: _sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send),
                  label: Text(
                    _sending
                        ? 'Gönderiliyor...'
                        : '${_selectedStudentIds.length} Kişiye SMS Gönder',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
