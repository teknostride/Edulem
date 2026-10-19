import 'package:dio/dio.dart';

import 'api_exception.dart';

class ApiClient {
  ApiClient(this._dio);

  final Dio _dio;

  String _normalizePath(String path) {
    if (path.isEmpty) return path;
    return path.startsWith('/') ? path.substring(1) : path;
  }

  Future<Response<dynamic>> getRaw(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.get<dynamic>(
        _normalizePath(path),
        queryParameters: queryParameters,
      );
    } on DioException catch (e) {
      throw ApiException(
        message: e.message ?? 'Request failed',
        statusCode: e.response?.statusCode,
        uri: e.requestOptions.uri,
        response: e.response,
      );
    }
  }

  Future<Map<String, dynamic>> putJson(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    final res = await putRaw(
      path,
      data: data,
      queryParameters: queryParameters,
    );
    return _normalizeEnvelope(res);
  }

  Future<Map<String, dynamic>> deleteJson(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    final res = await deleteRaw(
      path,
      data: data,
      queryParameters: queryParameters,
    );
    return _normalizeEnvelope(res);
  }

  Future<Response<dynamic>> putRaw(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.put<dynamic>(
        _normalizePath(path),
        data: data,
        queryParameters: queryParameters,
      );
    } on DioException catch (e) {
      throw ApiException(
        message: e.message ?? 'Request failed',
        statusCode: e.response?.statusCode,
        uri: e.requestOptions.uri,
        response: e.response,
      );
    }
  }

  Future<Response<dynamic>> deleteRaw(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.delete<dynamic>(
        _normalizePath(path),
        data: data,
        queryParameters: queryParameters,
      );
    } on DioException catch (e) {
      throw ApiException(
        message: e.message ?? 'Request failed',
        statusCode: e.response?.statusCode,
        uri: e.requestOptions.uri,
        response: e.response,
      );
    }
  }

  Future<Response<dynamic>> postRaw(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.post<dynamic>(
        _normalizePath(path),
        data: data,
        queryParameters: queryParameters,
      );
    } on DioException catch (e) {
      throw ApiException(
        message: e.message ?? 'Request failed',
        statusCode: e.response?.statusCode,
        uri: e.requestOptions.uri,
        response: e.response,
      );
    }
  }

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final res = await _dio.get<dynamic>(
        _normalizePath(path),
        queryParameters: queryParameters,
      );
      return _normalizeEnvelope(res);
    } on DioException catch (e) {
      throw ApiException(
        message: e.message ?? 'Request failed',
        statusCode: e.response?.statusCode,
        uri: e.requestOptions.uri,
        response: e.response,
      );
    }
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final res = await _dio.post<dynamic>(
        _normalizePath(path),
        data: data,
        queryParameters: queryParameters,
      );
      return _normalizeEnvelope(res);
    } on DioException catch (e) {
      throw ApiException(
        message: e.message ?? 'Request failed',
        statusCode: e.response?.statusCode,
        uri: e.requestOptions.uri,
        response: e.response,
      );
    }
  }

  Future<Map<String, dynamic>> postMultipartJson(
    String path, {
    Map<String, dynamic> fields = const {},
    Map<String, String> files = const {},
  }) async {
    try {
      final formData = FormData();

      for (final entry in fields.entries) {
        formData.fields.add(MapEntry(entry.key, entry.value.toString()));
      }

      for (final entry in files.entries) {
        formData.files.add(
          MapEntry(entry.key, await MultipartFile.fromFile(entry.value)),
        );
      }

      final res = await _dio.post<dynamic>(
        _normalizePath(path),
        data: formData,
      );
      return _normalizeEnvelope(res);
    } on DioException catch (e) {
      throw ApiException(
        message: e.message ?? 'Request failed',
        statusCode: e.response?.statusCode,
        uri: e.requestOptions.uri,
        response: e.response,
      );
    }
  }

  Future<Map<String, dynamic>> putMultipartJson(
    String path, {
    Map<String, dynamic> fields = const {},
    Map<String, String> files = const {},
  }) async {
    try {
      final formData = FormData();

      for (final entry in fields.entries) {
        formData.fields.add(MapEntry(entry.key, entry.value.toString()));
      }

      for (final entry in files.entries) {
        formData.files.add(
          MapEntry(entry.key, await MultipartFile.fromFile(entry.value)),
        );
      }

      final res = await _dio.put<dynamic>(_normalizePath(path), data: formData);
      return _normalizeEnvelope(res);
    } on DioException catch (e) {
      throw ApiException(
        message: e.message ?? 'Request failed',
        statusCode: e.response?.statusCode,
        uri: e.requestOptions.uri,
        response: e.response,
      );
    }
  }

  Map<String, dynamic> _normalizeEnvelope(Response<dynamic> response) {
    final body = response.data;

    if (body is Map) {
      // Backend çoğunlukla {status: true, data: {...}} dönüyor.
      // Burada envelope'u koruyup normalize ediyoruz.
      if (body.containsKey('data')) {
        final data = body['data'];
        if (data is Map) {
          return Map<String, dynamic>.from(data);
        }
        return <String, dynamic>{'value': data};
      }
      return Map<String, dynamic>.from(body);
    }

    return <String, dynamic>{'value': body};
  }
}
