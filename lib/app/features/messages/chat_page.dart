import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/network/api_client_provider.dart';
import '../profile/profile_providers.dart';
import 'conversations_paging_controller.dart';

class ChatPage extends ConsumerStatefulWidget {
  final int userId;
  final Map<String, dynamic>? userData;

  const ChatPage({super.key, required this.userId, this.userData});

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isLoading = true;
  List<dynamic> _messages = [];
  String? _otherUserName;
  String? _otherUserAvatar;
  bool _otherUserOnline = false;
  int? _conversationId; // Sohbet ID'sini sakla
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _otherUserName = widget.userData?['name']?.toString();
    _otherUserAvatar = widget.userData?['avatar']?.toString();
    _loadMessages();

    // Her 5 saniyede bir yeni mesajları kontrol et
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) _loadMessages(silent: true);
    });
  }

  Future<void> _loadMessages({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);

    try {
      final api = ref.read(apiClientProvider);
      // Backend getMessages fonksiyonu ?user_id= query parametre bekliyor
      final response = await api.getJson(
        '/messages/messages',
        queryParameters: {'user_id': widget.userId.toString()},
      );
      // Farklı response formatlarını normalize et
      final Map<String, dynamic> data;
      data =
          response['data'] as Map<String, dynamic>? ??
          response['conversation'] as Map<String, dynamic>? ??
          Map<String, dynamic>.from(response);

      // Conversation ID'sini sakla (silme işlemi için gerekiyor)
      _conversationId = data['id'] as int? ?? data['conversation_id'] as int?;

      // Mesajları farklı key'lerden çek (value, messages, data)
      List<dynamic> messages = [];
      if (response['value'] is List) {
        messages = response['value'] as List<dynamic>;
      } else if (data['value'] is List) {
        messages = data['value'] as List<dynamic>;
      } else if (data['messages'] is List) {
        messages = data['messages'] as List<dynamic>;
      } else if (response['messages'] is List) {
        messages = response['messages'] as List<dynamic>;
      }

      if (mounted) {
        setState(() {
          _messages = messages;
          _otherUserName =
              data['other_user']?['name']?.toString() ?? _otherUserName;
          _otherUserAvatar =
              data['other_user']?['avatar']?.toString() ?? _otherUserAvatar;
          _otherUserOnline = data['other_user']?['is_online'] == true;
          _isLoading = false;
        });
        if (messages.isNotEmpty) {
          _scrollToBottom();
        }
      }
    } catch (e) {
      if (mounted && !silent) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      Future.delayed(const Duration(milliseconds: 100), () {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    final currentUserId = ref.read(profileProvider).valueOrNull?['id'];

    // Optimistik ekleme
    setState(() {
      _messages.add({
        'id': DateTime.now().millisecondsSinceEpoch,
        'content': text,
        'sender_id': currentUserId,
        'created_at': DateTime.now().toIso8601String(),
        'is_me': true,
        'is_read': false,
      });
    });
    _messageController.clear();
    _scrollToBottom();

    try {
      final api = ref.read(apiClientProvider);
      await api.postJson(
        '/messages/send',
        data: {'receiver_id': widget.userId, 'content': text},
      );
      ref.invalidate(conversationsPagingProvider);
    } catch (e) {
      // Hata durumunda kullanıcıya bildir
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Mesaj gönderilemedi: $e')));
      }
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Row(
          children: [
            CircleAvatar(
              radius: 20,
              backgroundImage: _otherUserAvatar != null
                  ? NetworkImage(_otherUserAvatar!)
                  : null,
              child: _otherUserAvatar == null
                  ? Text(_otherUserName?.substring(0, 1).toUpperCase() ?? '?')
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _otherUserName ?? 'Yükleniyor...',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    _otherUserOnline ? 'Çevrimiçi' : 'Çevrimdışı',
                    style: TextStyle(
                      fontSize: 12,
                      color: _otherUserOnline ? Colors.green : Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () {
              // Sohbet seçenekleri menüsü
              showModalBottomSheet(
                context: context,
                builder: (context) => _buildOptionsMenu(),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Mesajlar listesi
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.chat_bubble_outline,
                          size: 64,
                          color: Colors.grey.shade400,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Henüz mesaj yok',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'İlk mesajı siz gönderin',
                          style: TextStyle(
                            color: Colors.grey.shade500,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: () => _loadMessages(),
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        return _buildMessageBubble(_messages[index]);
                      },
                    ),
                  ),
          ),

          // Mesaj yazma alanı
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              border: Border(top: BorderSide(color: Colors.grey.shade300)),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        hintText: 'Mesaj yaz...',
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      maxLines: null,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: Theme.of(context).primaryColor,
                    child: IconButton(
                      icon: const Icon(
                        Icons.send,
                        color: Colors.white,
                        size: 20,
                      ),
                      onPressed: _sendMessage,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(dynamic message) {
    final isMe =
        message['is_me'] == true ||
        message['sender_id'] == ref.read(profileProvider).valueOrNull?['id'];
    final content = message['content']?.toString() ?? '';
    final createdAt = message['created_at']?.toString() ?? '';

    // Tarih formatı
    String timeText = '';
    if (createdAt.isNotEmpty) {
      try {
        final dt = DateTime.parse(createdAt);
        timeText =
            '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      } catch (_) {}
    }

    final messageId = message['id'] as int?;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: InkWell(
        onLongPress: messageId != null && isMe
            ? () => _showMessageOptions(messageId, content)
            : null,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16),
          topRight: const Radius.circular(16),
          bottomLeft: Radius.circular(isMe ? 16 : 4),
          bottomRight: Radius.circular(isMe ? 4 : 16),
        ),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: isMe ? Theme.of(context).primaryColor : Colors.grey.shade200,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(isMe ? 16 : 4),
              bottomRight: Radius.circular(isMe ? 4 : 16),
            ),
          ),
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.75,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                content,
                style: TextStyle(
                  color: isMe ? Colors.white : Colors.black87,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    timeText,
                    style: TextStyle(
                      color: isMe ? Colors.white70 : Colors.grey.shade600,
                      fontSize: 11,
                    ),
                  ),
                  if (isMe) ...[
                    const SizedBox(width: 4),
                    Icon(
                      message['is_read'] == true ? Icons.done_all : Icons.done,
                      size: 14,
                      color: message['is_read'] == true
                          ? Colors.white70
                          : Colors.white54,
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOptionsMenu() {
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.delete_outline, color: Colors.red),
            title: const Text(
              'Sohbeti Sil',
              style: TextStyle(color: Colors.red),
            ),
            onTap: () {
              context.pop();
              _deleteConversation();
            },
          ),
          ListTile(
            leading: const Icon(Icons.block),
            title: const Text('Engelle'),
            onTap: () {
              context.pop();
            },
          ),
        ],
      ),
    );
  }

  Future<void> _deleteConversation() async {
    // Sohbet silme onayı
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sohbeti Sil'),
        content: const Text('Bu sohbeti silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => context.pop(false),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => context.pop(true),
            child: const Text('Sil', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final api = ref.read(apiClientProvider);
        final conversationId = _conversationId ?? widget.userId;
        await api.deleteJson('/messages/conversations/$conversationId');
        ref.invalidate(conversationsPagingProvider);
        if (mounted) context.pop();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Sohbet silinemedi: $e')));
        }
      }
    }
  }

  // Tek mesaj için seçenekler menüsü
  void _showMessageOptions(int messageId, String content) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Colors.red),
              title: const Text(
                'Mesajı Sil',
                style: TextStyle(color: Colors.red),
              ),
              onTap: () {
                context.pop();
                _deleteMessage(messageId);
              },
            ),
            ListTile(
              leading: const Icon(Icons.copy),
              title: const Text('Kopyala'),
              onTap: () {
                context.pop();
                // Clipboard'a kopyala
              },
            ),
          ],
        ),
      ),
    );
  }

  // Tek mesaj silme
  Future<void> _deleteMessage(int messageId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Mesajı Sil'),
        content: const Text('Bu mesajı silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => context.pop(false),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => context.pop(true),
            child: const Text('Sil', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final api = ref.read(apiClientProvider);
        await api.deleteJson('/messages/$messageId');
        // Mesaj listesini yenile
        await _loadMessages(silent: true);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Mesaj silinemedi: $e')));
        }
      }
    }
  }
}
