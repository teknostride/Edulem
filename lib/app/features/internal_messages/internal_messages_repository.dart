import '../../core/network/api_client.dart';

class InternalMessagesRepository {
  InternalMessagesRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> list() async {
    try {
      final data = await _api.getJson('/internal-messages');
      final List<dynamic> items = data['data'] ?? data['messages'] ?? [];
      return items
          .map((e) => _normalizeInternalMessage(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      // Mock data for testing when API is not available
      return [
        {
          'id': 1,
          'subject': 'Ödev Teslim Tarihi Hk.',
          'content':
              'Deðerli öðrencilerimiz, bu hafta verilen matematik ödevlerinin teslim tarihi Cuma günü sona erecektir.',
          'sender': {'id': 1, 'name': 'Ahmet Yýlmaz', 'role': 'Öðretmen'},
          'is_read': false,
          'priority': 2,
          'sent_at': DateTime.now()
              .subtract(const Duration(hours: 2))
              .toIso8601String(),
          'recipient': {'id': 101, 'name': 'Mehmet Öz', 'role': 'Öðrenci'},
          'attachments': [],
          'reply_count': 0,
          'is_important': true,
        },
        {
          'id': 2,
          'subject': 'Toplantý Davetiyesi',
          'content':
              'Yarýn saat 14:00\'da rehberlik ofisinde toplantý yapýlacaktýr. Katýlýmýnýz beklenmektedir.',
          'sender': {'id': 2, 'name': 'Ayþe Demir', 'role': 'Rehberlik'},
          'is_read': true,
          'priority': 1,
          'sent_at': DateTime.now()
              .subtract(const Duration(days: 1))
              .toIso8601String(),
          'recipient': {'id': 102, 'name': 'Zeynep Kaya', 'role': 'Öðrenci'},
          'attachments': [
            {'id': 1, 'name': 'toplanti_gundemi.pdf', 'size': '245KB'},
          ],
          'reply_count': 1,
          'is_important': false,
        },
        {
          'id': 3,
          'subject': 'Etkinlik Bilgilendirme',
          'content':
              'Bu hafta sonu okul bahçesinde spor etkinliði düzenlenecektir. Katýlmak isteyenler formu doldursun.',
          'sender': {'id': 3, 'name': 'Mustafa Çelik', 'role': 'Öðretmen'},
          'is_read': false,
          'priority': 0,
          'sent_at': DateTime.now()
              .subtract(const Duration(hours: 6))
              .toIso8601String(),
          'recipient': {'id': 103, 'name': 'Elif Avcý', 'role': 'Öðrenci'},
          'attachments': [
            {'id': 2, 'name': 'etkinlik_formu.pdf', 'size': '125KB'},
            {'id': 3, 'name': 'etkinlik_programi.docx', 'size': '89KB'},
          ],
          'reply_count': 0,
          'is_important': false,
        },
        {
          'id': 4,
          'subject': 'Acil: Öðrenci Bilgisi Güncellemesi',
          'content':
              'Veli bilgilerinizdeki telefon numarasýnýn güncellenmesi gerekmektedir. Lütfen en kýsa sürede iletiþime geçin.',
          'sender': {'id': 4, 'name': 'Fatma Öztürk', 'role': 'Öðrenci Ýþleri'},
          'is_read': false,
          'priority': 3,
          'sent_at': DateTime.now()
              .subtract(const Duration(minutes: 30))
              .toIso8601String(),
          'recipient': {'id': 104, 'name': 'Ali Veli', 'role': 'Veli'},
          'attachments': [],
          'reply_count': 0,
          'is_important': true,
        },
        {
          'id': 5,
          'subject': 'Baþarý Tebriði',
          'content':
              'Fen bilimleri yarýþmasýnda aldýðýnýz baþarýdan dolayý tebrik ederiz. Ödül töreni Pazartesi günü yapýlacaktýr.',
          'sender': {'id': 5, 'name': 'Dr. Kemal Yýldýz', 'role': 'Müdür'},
          'is_read': true,
          'priority': 2,
          'sent_at': DateTime.now()
              .subtract(const Duration(days: 2))
              .toIso8601String(),
          'recipient': {'id': 105, 'name': 'Can Polat', 'role': 'Öðrenci'},
          'attachments': [
            {'id': 4, 'name': 'odul_belgesi.pdf', 'size': '156KB'},
          ],
          'reply_count': 2,
          'is_important': true,
        },
      ];
    }
  }

  Future<Map<String, dynamic>> getById(int id) async {
    final data = await _api.getJson('/internal-messages/$id');
    return _normalizeInternalMessage(data['data'] ?? data);
  }

  Future<Map<String, dynamic>> create({
    required String subject,
    required String content,
    required List<int> recipientIds,
    int? priority,
    List<int>? attachmentIds,
  }) async {
    final data = await _api.postJson(
      '/internal-messages',
      data: {
        'subject': subject,
        'content': content,
        'recipient_ids': recipientIds,
        'priority': priority,
        'attachment_ids': attachmentIds,
      },
    );
    return _normalizeInternalMessage(data['data'] ?? data);
  }

  Future<void> markAsRead(int id) async {
    await _api.putJson('/internal-messages/$id/read', data: {});
  }

  Future<void> deleteById(int id) async {
    await _api.deleteJson('/internal-messages/$id');
  }

  Map<String, dynamic> _normalizeInternalMessage(Map<String, dynamic> m) {
    return {
      'id': m['id'],
      'subject': m['subject'] ?? '',
      'content': m['content'] ?? '',
      'sender': m['sender'],
      'recipients': m['recipients'] ?? [],
      'is_read': m['is_read'] ?? m['isRead'] ?? false,
      'priority': m['priority'] ?? 0,
      'sent_at': m['sent_at'] ?? m['sentAt'],
      'attachments': m['attachments'] ?? [],
    };
  }
}
