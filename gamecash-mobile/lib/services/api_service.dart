// lib/services/api_service.dart

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';
import '../models/customer.dart';
import '../models/telecom_company.dart';
import '../models/cart_item.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String _baseUrl = '';
  String _token = '';
  String _username = '';

  String get baseUrl => _baseUrl;
  String get token => _token;
  String get username => _username;
  bool get isAuthenticated => _token.isNotEmpty;

  // Initialize service and load saved settings
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString('api_base_url') ?? '';
    _token = prefs.getString('auth_token') ?? '';
    _username = prefs.getString('auth_username') ?? '';
  }

  // Save base URL setting
  Future<void> setBaseUrl(String url) async {
    // Standardize URL to not have a trailing slash
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    _baseUrl = url;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_base_url', url);
  }

  // Clear session (Logout)
  Future<void> logout() async {
    _token = '';
    _username = '';
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('auth_username');
  }

  // Standard API headers
  Map<String, String> _getHeaders() {
    final Map<String, String> headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token.isNotEmpty) {
      headers['X-Auth-Token'] = _token;
    }
    return headers;
  }

  // Handle Response structure
  dynamic _processResponse(http.Response response) {
    if (response.statusCode == 401) {
      logout();
      throw Exception('رمز الولوج منتهي الصلاحية أو غير صالح، يرجى إعادة تسجيل الدخول.');
    }

    try {
      final body = json.decode(utf8.decode(response.bodyBytes));
      if (body['status'] == 'success') {
        return body['data'];
      } else {
        throw Exception(body['message'] ?? 'حدث خطأ غير معروف في خادم الويب.');
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('فشل قراءة استجابة الخادم: ${response.statusCode}');
    }
  }

  // Test server connectivity
  Future<bool> testConnection(String url) async {
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    try {
      // Send a dummy request to index.php or static checking point
      final response = await http.get(
        Uri.parse('$url/index.php'),
      ).timeout(const Duration(seconds: 5));
      
      // If we get any response, the server exists!
      return response.statusCode < 500;
    } catch (_) {
      return false;
    }
  }

  // Login handshake
  Future<bool> login(String username, String password) async {
    if (_baseUrl.isEmpty) {
      throw Exception('يرجى تحديد رابط الخادم أولاً في الإعدادات.');
    }

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/index.php?route=auth/login'),
        headers: _getHeaders(),
        body: json.encode({
          'username': username,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = _processResponse(response);
      
      if (data != null && data['token'] != null) {
        _token = data['token'].toString();
        _username = username;
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', _token);
        await prefs.setString('auth_username', _username);
        return true;
      }
      return false;
    } catch (e) {
      throw Exception('فشل تسجيل الدخول: ${e.toString().replaceAll('Exception: ', '')}');
    }
  }

  // Fetch Products catalog
  Future<List<Product>> getProducts() async {
    if (_baseUrl.isEmpty) throw Exception('رابط الخادم غير مهيأ.');
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/index.php?route=products'),
        headers: _getHeaders(),
      ).timeout(const Duration(seconds: 10));

      final data = _processResponse(response) as List;
      return data.map((json) => Product.fromJson(json)).toList();
    } catch (e) {
      throw Exception('فشل جلب المأكولات: ${e.toString().replaceAll('Exception: ', '')}');
    }
  }

  // Fetch Customers list
  Future<List<Customer>> getCustomers() async {
    if (_baseUrl.isEmpty) throw Exception('رابط الخادم غير مهيأ.');
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/index.php?route=customers'),
        headers: _getHeaders(),
      ).timeout(const Duration(seconds: 10));

      final data = _processResponse(response) as List;
      return data.map((json) => Customer.fromJson(json)).toList();
    } catch (e) {
      throw Exception('فشل جلب العملاء: ${e.toString().replaceAll('Exception: ', '')}');
    }
  }

  // Add new Customer inline
  Future<Customer> createCustomer(String name, String? phone) async {
    if (_baseUrl.isEmpty) throw Exception('رابط الخادم غير مهيأ.');
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/index.php?route=customers'),
        headers: _getHeaders(),
        body: json.encode({
          'name': name,
          'phone': phone,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = _processResponse(response);
      return Customer.fromJson(data);
    } catch (e) {
      throw Exception('فشل إضافة العميل: ${e.toString().replaceAll('Exception: ', '')}');
    }
  }

  // Fetch Telecom Companies list
  Future<List<TelecomCompany>> getTelecomCompanies() async {
    if (_baseUrl.isEmpty) throw Exception('رابط الخادم غير مهيأ.');
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/index.php?route=telecom'),
        headers: _getHeaders(),
      ).timeout(const Duration(seconds: 10));

      final data = _processResponse(response) as List;
      return data.map((json) => TelecomCompany.fromJson(json)).toList();
    } catch (e) {
      throw Exception('فشل جلب شركات الاتصال: ${e.toString().replaceAll('Exception: ', '')}');
    }
  }

  // Submit Sale (Unified Cart Checkout)
  Future<Map<String, dynamic>> submitSale({
    int? customerId,
    required double paidAmount,
    required double debtAmount,
    String? notes,
    required List<CartItem> items,
  }) async {
    if (_baseUrl.isEmpty) throw Exception('رابط الخادم غير مهيأ.');
    if (items.isEmpty) throw Exception('سلة البيع فارغة.');
    
    try {
      final body = {
        'customer_id': customerId,
        'paid_amount': paidAmount,
        'debt_amount': debtAmount,
        'notes': notes ?? 'تم البيع عبر تطبيق الجوال',
        'items': items.map((i) => i.toJson()).toList(),
      };

      final response = await http.post(
        Uri.parse('$_baseUrl/index.php?route=sales'),
        headers: _getHeaders(),
        body: json.encode(body),
      ).timeout(const Duration(seconds: 15));

      final data = _processResponse(response);
      return Map<String, dynamic>.from(data);
    } catch (e) {
      throw Exception(e.toString().replaceAll('Exception: ', ''));
    }
  }
}
