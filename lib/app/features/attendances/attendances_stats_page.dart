import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/atoms/app_card.dart';
import 'attendances_providers.dart';

class AttendancesStatsPage extends ConsumerStatefulWidget {
  const AttendancesStatsPage({super.key});

  @override
  ConsumerState<AttendancesStatsPage> createState() =>
      _AttendancesStatsPageState();
}

class _AttendancesStatsPageState extends ConsumerState<AttendancesStatsPage> {
  final _studentIdController = TextEditingController();
  final _teacherIdController = TextEditingController();

  Map<String, dynamic>? _result;
  Object? _error;
  bool _loading = false;

  @override
  void dispose() {
    _studentIdController.dispose();
    _teacherIdController.dispose();
    super.dispose();
  }

  Future<void> _fetchStudent() async {
    final id = int.tryParse(_studentIdController.text.trim()) ?? -1;
    if (id <= 0) return;

    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });

    try {
      final repo = ref.read(attendancesRepositoryProvider);
      final data = await repo.studentStatistics(studentId: id);
      setState(() => _result = data);
    } catch (e) {
      setState(() => _error = e);
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _fetchTeacher() async {
    final id = int.tryParse(_teacherIdController.text.trim()) ?? -1;
    if (id <= 0) return;

    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });

    try {
      final repo = ref.read(attendancesRepositoryProvider);
      final data = await repo.teacherStatistics(teacherId: id);
      setState(() => _result = data);
    } catch (e) {
      setState(() => _error = e);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Yoklama İstatistikleri')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Öğrenci',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _studentIdController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Student ID'),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _fetchStudent,
                      child: const Text('Getir'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Öğretmen',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _teacherIdController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Teacher ID'),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _fetchTeacher,
                      child: const Text('Getir'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            if (_loading) const Center(child: CircularProgressIndicator()),
            if (_error != null) Text('Hata: $_error'),
            if (_result != null) SelectableText(_result.toString()),
          ],
        ),
      ),
    );
  }
}
