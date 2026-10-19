import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/role_utils.dart';
import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import '../auth/auth_providers.dart';
import 'search_providers.dart';

class GlobalSearchPage extends ConsumerStatefulWidget {
  const GlobalSearchPage({super.key});

  @override
  ConsumerState<GlobalSearchPage> createState() => _GlobalSearchPageState();
}

class _GlobalSearchPageState extends ConsumerState<GlobalSearchPage> {
  final TextEditingController _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    setState(() {
      _query = value.trim();
    });
  }

  void _clearSearch() {
    _searchController.clear();
    setState(() {
      _query = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final searchResults = _query.length >= 2
        ? ref.watch(globalSearchProvider(_query))
        : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Global Arama')),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Ara (en az 2 karakter)...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        onPressed: _clearSearch,
                        icon: const Icon(Icons.clear),
                      )
                    : null,
                border: const OutlineInputBorder(),
              ),
              onChanged: _onSearchChanged,
            ),
            const SizedBox(height: 16),
            Expanded(child: _buildResults(searchResults)),
          ],
        ),
      ),
    );
  }

  Widget _buildResults(AsyncValue<Map<String, dynamic>>? results) {
    if (_query.isEmpty) {
      return const Center(child: Text('Aramak için en az 2 karakter yazın'));
    }

    if (_query.length < 2) {
      return const Center(child: Text('Arama en az 2 karakter olmalıdır'));
    }

    if (results == null) {
      return const SizedBox.shrink();
    }

    final authSession = ref.watch(authSessionProvider);
    final role = authSession.valueOrNull?.role ?? '';
    final isStudent = isStudentRole(role);

    return results.when(
      data: (data) {
        final rawStudents = data['students'] as List? ?? [];
        final students = isStudent ? const [] : rawStudents;
        final lessons = data['lessons'] as List? ?? [];
        final rawUsers = data['users'] as List? ?? [];
        final users = isStudent ? const [] : rawUsers;

        final hasResults =
            students.isNotEmpty || lessons.isNotEmpty || users.isNotEmpty;

        if (!hasResults) {
          return const Center(child: Text('Sonuç bulunamadı'));
        }

        return ListView(
          children: [
            if (students.isNotEmpty) ...[
              _buildSectionTitle('Öğrenciler (${students.length})'),
              ...students.map((s) => _buildStudentItem(s)),
              const SizedBox(height: 16),
            ],
            if (lessons.isNotEmpty) ...[
              _buildSectionTitle('Dersler (${lessons.length})'),
              ...lessons.map((l) => _buildLessonItem(l)),
              const SizedBox(height: 16),
            ],
            if (users.isNotEmpty) ...[
              _buildSectionTitle('Kullanıcılar (${users.length})'),
              ...users.map((u) => _buildUserItem(u)),
            ],
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Hata: $e')),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: Colors.grey,
        ),
      ),
    );
  }

  Widget _buildStudentItem(Map<String, dynamic> student) {
    final name = student['name']?.toString() ?? 'İsimsiz';
    final schoolNo = student['school_no']?.toString();
    final tcNo = student['tc_no']?.toString();
    final id = student['id'];

    return AppCard(
      child: ListTile(
        leading: const CircleAvatar(child: Icon(Icons.person)),
        title: Text(name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (schoolNo != null && schoolNo.isNotEmpty)
              Text('Okul No: $schoolNo'),
            if (tcNo != null && tcNo.isNotEmpty) Text('TC: $tcNo'),
          ],
        ),
        onTap: () {
          if (id != null) {
            context.push('/students/$id');
          }
        },
      ),
    );
  }

  Widget _buildLessonItem(Map<String, dynamic> lesson) {
    final name = lesson['name']?.toString() ?? 'İsimsiz';
    final code = lesson['code']?.toString();

    return AppCard(
      child: ListTile(
        leading: const CircleAvatar(child: Icon(Icons.book)),
        title: Text(name),
        subtitle: code != null && code.isNotEmpty ? Text('Kod: $code') : null,
      ),
    );
  }

  Widget _buildUserItem(Map<String, dynamic> user) {
    final name = user['name']?.toString() ?? 'İsimsiz';
    final email = user['email']?.toString();
    final id = user['id'];

    return AppCard(
      child: ListTile(
        leading: const CircleAvatar(child: Icon(Icons.account_circle)),
        title: Text(name),
        subtitle: email != null && email.isNotEmpty ? Text(email) : null,
        onTap: () {
          if (id != null) {
            context.push('/users/$id');
          }
        },
      ),
    );
  }
}
