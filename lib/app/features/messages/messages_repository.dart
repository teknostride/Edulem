import '../../core/network/api_client.dart';

class MessagesRepository {
  MessagesRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> listConversations({
    required int page,
    required int perPage,
  }) async {
    final data = await _api.getJson(
      '/messages/conversations',
      queryParameters: {
        'page': page.toString(),
        'per_page': perPage.toString(),
      },
    );

    dynamic v;
    if (data['conversations'] is List) {
      v = data['conversations'];
    } else if (data['data'] is Map && (data['data']['conversations'] is List)) {
      v = data['data']['conversations'];
    } else if (data['value'] is List) {
      v = data['value'];
    }

    if (v is! List) {
      return const [];
    }

    final result = v
        .whereType<Map>()
        .map((e) => _normalizeConversation(Map<String, dynamic>.from(e)))
        .toList();

    return result;
  }

  Future<List<Map<String, dynamic>>> listMessages({
    required int conversationId,
    required int page,
    required int perPage,
  }) async {
    final data = await _api.getJson(
      '/messages/messages',
      queryParameters: {
        'conversation_id': conversationId.toString(),
        'page': page.toString(),
        'per_page': perPage.toString(),
      },
    );

    dynamic v;
    if (data['messages'] is List) {
      v = data['messages'];
    } else if (data['data'] is Map && (data['data']['messages'] is List)) {
      v = data['data']['messages'];
    } else if (data['value'] is List) {
      v = data['value'];
    }

    if (v is! List) return const [];

    return v
        .whereType<Map>()
        .map((e) => _normalizeMessage(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<void> sendMessage({
    required int conversationId,
    required String content,
  }) async {
    await _api.postJson(
      '/messages/send',
      data: {'conversation_id': conversationId, 'content': content},
    );
  }

  Future<Map<String, dynamic>> unreadCount() {
    return _api.getJson('/messages/unread-count');
  }

  Future<void> markAsRead(int messageId) async {
    await _api.putJson('/messages/$messageId/read');
  }

  Map<String, dynamic> _normalizeConversation(Map<String, dynamic> c) {
    final normalized = <String, dynamic>{};
    normalized['id'] = c['id'];
    normalized['title'] = c['title'] ?? c['subject'] ?? '';

    // last_message normalization
    final lastMsg = c['last_message'] ?? c['latest_message'] ?? '';
    if (lastMsg is Map) {
      normalized['last_message'] =
          lastMsg['content'] ?? lastMsg['body'] ?? lastMsg['message'] ?? '';
    } else {
      normalized['last_message'] = lastMsg.toString();
    }

    normalized['updated_at'] = c['updated_at'] ?? c['last_message_at'];
    normalized['participants'] = c['participants'] ?? [];

    // other_user normalization
    dynamic other = c['other_user'] ?? c['user'] ?? c['recipient'] ?? c['sender'] ?? c['creator'];
    
    // Eğer doğrudan bir kullanıcı objesi yoksa ama katılımcılar varsa, ben olmayanı bulalım
    if ((other == null || (other is Map && other.isEmpty)) && 
        c['participants'] is List && 
        (c['participants'] as List).isNotEmpty) {
      // Şimdilik ilk katılımcıyı alalım (İleride mevcut kullanıcı ID'sine göre filtreleme yapılabilir)
      other = (c['participants'] as List).first;
    }

    if (other is Map) {
      final firstName = other['first_name']?.toString() ?? '';
      final lastName = other['last_name']?.toString() ?? '';
      final fullName = (firstName.isNotEmpty || lastName.isNotEmpty) 
          ? '$firstName $lastName'.trim() 
          : null;

      normalized['other_user'] = {
        'id': other['id'],
        'name': other['name'] ?? 
                other['display_name'] ?? 
                fullName ?? 
                other['full_name'] ?? 
                other['username'] ??
                'Kullanıcı',
        'avatar': other['avatar'] ?? other['profile_photo_url'],
      };
    } else {
      normalized['other_user'] = {
        'name': c['other_user_name'] ?? c['user_name'] ?? 'Kullanıcı'
      };
    }

    normalized['unread_count'] = c['unread_count'] ?? 0;
    normalized['last_message_is_me'] = c['last_message_is_me'] ?? false;
    return normalized;
  }

  Map<String, dynamic> _normalizeMessage(Map<String, dynamic> m) {
    final normalized = <String, dynamic>{};
    normalized['id'] = m['id'];
    normalized['content'] = m['content'] ?? m['body'] ?? '';
    normalized['sender'] = m['sender'] ?? m['user'] ?? {};
    normalized['created_at'] = m['created_at'] ?? m['sent_at'];
    normalized['is_read'] = m['is_read'] ?? false;
    return normalized;
  }
}
