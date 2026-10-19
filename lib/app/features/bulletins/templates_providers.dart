import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/dio_provider.dart';

final templatesListProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final dio = ref.read(dioProvider);
  try {
    final response = await dio.get('/bulletin-templates');
    final data = response.data;
    if (data['data'] is List) {
      return List<Map<String, dynamic>>.from(data['data']);
    }
    return [];
  } catch (e) {
    return [];
  }
});
