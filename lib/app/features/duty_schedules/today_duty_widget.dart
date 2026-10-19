import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client_provider.dart';
import '../profile/profile_providers.dart';
import 'duty_schedule_page.dart';

class TodayDutyWidget extends ConsumerStatefulWidget {
  const TodayDutyWidget({super.key});

  @override
  ConsumerState<TodayDutyWidget> createState() => _TodayDutyWidgetState();
}

class _TodayDutyWidgetState extends ConsumerState<TodayDutyWidget> {
  DutySchedule? _todayDuty;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _fetchTodayDuty();
  }

  Future<void> _fetchTodayDuty() async {
    try {
      final profile = ref.read(profileProvider).valueOrNull;
      final userId = profile?['id'];
      if (userId == null) return;

      final api = ref.read(apiClientProvider);
      final todayWeekday = DateTime.now().weekday;

      final res = await api.getJson(
        '/duty-schedules',
        queryParameters: {
          'user_id': userId.toString(),
          'day_of_week': todayWeekday.toString(),
          'is_active': '1',
        },
      );

      List<dynamic> items = [];
      if (res['data'] is Map && (res['data'] as Map)['items'] is List) {
        items = (res['data'] as Map)['items'] as List;
      } else if (res['items'] is List) {
        items = res['items'] as List;
      } else if (res['data'] is List) {
        items = res['data'] as List;
      }

      final schedules = items
          .whereType<Map>()
          .map((m) => DutySchedule.fromJson(Map<String, dynamic>.from(m)))
          .where((s) => s.isActive && s.dayOfWeek == todayWeekday)
          .toList();

      if (mounted) {
        setState(() {
          _todayDuty = schedules.isNotEmpty ? schedules.first : null;
          _loaded = true;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loaded = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded || _todayDuty == null) {
      return const SizedBox.shrink();
    }

    final duty = _todayDuty!;
    final location = (duty.location ?? '').trim();
    final startTime = duty.startTime.length >= 5 ? duty.startTime.substring(0, 5) : duty.startTime;
    final endTime = duty.endTime.length >= 5 ? duty.endTime.substring(0, 5) : duty.endTime;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.push('/duty-schedules'),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFFF59E0B).withValues(alpha: 0.15),
                  const Color(0xFFD97706).withValues(alpha: 0.08),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.3),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.security_rounded,
                    color: Colors.white,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Bugün Nöbetiniz Var',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF92400E),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF59E0B),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Nöbetçi',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 12,
                        runSpacing: 4,
                        children: [
                          if (location.isNotEmpty)
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.location_on_rounded,
                                  size: 15,
                                  color: Color(0xFFB45309),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  location,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF78350F),
                                  ),
                                ),
                              ],
                            ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.access_time_rounded,
                                size: 15,
                                color: Color(0xFFB45309),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '$startTime - $endTime',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF78350F),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 16,
                  color: Color(0xFFB45309),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
