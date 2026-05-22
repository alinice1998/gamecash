// lib/screens/settings_screen.dart

import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/glassmorphic_card.dart';

class SettingsScreen extends StatefulWidget {
  final VoidCallback onConfigChanged;

  const SettingsScreen({Key? key, required this.onConfigChanged}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _apiService = ApiService();
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _urlController;
  late TextEditingController _userController;
  late TextEditingController _passController;

  bool _isTesting = false;
  bool _isLoggingIn = false;
  String _statusMessage = '';
  Color _statusColor = Colors.white;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(text: _apiService.baseUrl);
    _userController = TextEditingController(text: _apiService.username);
    _passController = TextEditingController();
  }

  @override
  void dispose() {
    _urlController.dispose();
    _userController.dispose();
    _passController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) {
      _showStatus('يرجى إدخال رابط الخادم أولاً.', Colors.redAccent);
      return;
    }

    setState(() {
      _isTesting = true;
      _statusMessage = 'جاري اختبار الاتصال بالخادم...';
      _statusColor = const Color(0xFF00D2FF);
    });

    bool success = await _apiService.testConnection(url);

    setState(() {
      _isTesting = false;
      if (success) {
        _statusMessage = 'تم الاتصال بالخادم بنجاح! الخادم متاح.';
        _statusColor = const Color(0xFF00FF87);
      } else {
        _statusMessage = 'فشل الاتصال بالخادم. يرجى التحقق من الرابط أو الشبكة.';
        _statusColor = Colors.redAccent;
      }
    });
  }

  Future<void> _saveAndLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final url = _urlController.text.trim();
    final username = _userController.text.trim();
    final password = _passController.text;

    setState(() {
      _isLoggingIn = true;
      _statusMessage = 'جاري حفظ الإعدادات وتسجيل الدخول...';
      _statusColor = const Color(0xFF00D2FF);
    });

    try {
      // 1. Save Base URL first
      await _apiService.setBaseUrl(url);

      // 2. Perform Login Handshake
      bool loggedIn = await _apiService.login(username, password);

      setState(() {
        _isLoggingIn = false;
        if (loggedIn) {
          _statusMessage = 'تم تسجيل الدخول بنجاح وحفظ رمز الولوج!';
          _statusColor = const Color(0xFF00FF87);
          _passController.clear();
          widget.onConfigChanged();
        } else {
          _statusMessage = 'فشل الحصول على رمز التوثيق من الخادم.';
          _statusColor = Colors.redAccent;
        }
      });
    } catch (e) {
      setState(() {
        _isLoggingIn = false;
        _statusMessage = e.toString().replaceAll('Exception: ', '');
        _statusColor = Colors.redAccent;
      });
    }
  }

  Future<void> _logout() async {
    await _apiService.logout();
    setState(() {
      _statusMessage = 'تم تسجيل الخروج بنجاح.';
      _statusColor = Colors.orangeAccent;
      _passController.clear();
    });
    widget.onConfigChanged();
  }

  void _showStatus(String msg, Color color) {
    setState(() {
      _statusMessage = msg;
      _statusColor = color;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D0E15),
      appBar: AppBar(
        title: const Text(
          'إعدادات الاتصال والولوج',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontFamily: 'Cairo',
          ),
        ),
        backgroundColor: const Color(0xFF161824),
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Directionality(
        textDirection: TextDirection.rtl,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 10),
              
              // App Logo / Title
              Center(
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00D2FF).withOpacity(0.1),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0xFF00D2FF),
                          width: 2,
                        ),
                      ),
                      child: const Icon(
                        Icons.settings_suggest_outlined,
                        color: Color(0xFF00D2FF),
                        size: 40,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'إعدادات نظام GameCash',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Cairo',
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'قم بربط التطبيق مع استضافة الخادم والولوج إلى حسابك',
                      style: TextStyle(
                        color: Color(0x80FFFFFF),
                        fontSize: 12,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Status Banner
              if (_statusMessage.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _statusColor, width: 1),
                  ),
                  child: Text(
                    _statusMessage,
                    style: TextStyle(
                      color: _statusColor,
                      fontFamily: 'Cairo',
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Session Info Card (If Authenticated)
              if (_apiService.isAuthenticated) ...[
                GlassmorphicCard(
                  borderColor: const Color(0xFF00FF87).withOpacity(0.3),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.check_circle, color: Color(0xFF00FF87)),
                          const SizedBox(width: 8),
                          const Text(
                            'أنت متصل بالخادم حالياً',
                            style: TextStyle(
                              color: Color(0xFF00FF87),
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ],
                      ),
                      const Divider(color: Color(0x22FFFFFF), height: 20),
                      Text(
                        'المستضيف: ${_apiService.baseUrl}',
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'اسم المستخدم للولوج: ${_apiService.username}',
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _logout,
                        icon: const Icon(Icons.logout),
                        label: const Text(
                          'تسجيل الخروج وقطع الاتصال',
                          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.redAccent.withOpacity(0.2),
                          foregroundColor: Colors.redAccent,
                          side: const BorderSide(color: Colors.redAccent),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Settings Form
              Form(
                key: _formKey,
                child: GlassmorphicCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'بيانات الخادم والحساب',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Cairo',
                        ),
                      ),
                      const Divider(color: Color(0x22FFFFFF), height: 20),

                      // Server Base URL
                      TextFormField(
                        controller: _urlController,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        keyboardType: TextInputType.url,
                        decoration: InputDecoration(
                          labelText: 'رابط استضافة الخادم الـ API *',
                          labelStyle: const TextStyle(color: Color(0x80FFFFFF), fontSize: 13, fontFamily: 'Cairo'),
                          hintText: 'https://yourdomain.com/gamecash-backend',
                          hintStyle: const TextStyle(color: Color(0x33FFFFFF), fontSize: 12),
                          prefixIcon: const Icon(Icons.language, color: Color(0xFF00D2FF)),
                          filled: true,
                          fillColor: const Color(0xFF1E2132),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFF00D2FF), width: 1.2),
                          ),
                          contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'يرجى إدخال رابط الاستضافة.';
                          }
                          if (!value.startsWith('http://') && !value.startsWith('https://')) {
                            return 'يجب أن يبدأ الرابط بـ http:// أو https://';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Username
                      TextFormField(
                        controller: _userController,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'اسم مستخدم الولوج *',
                          labelStyle: const TextStyle(color: Color(0x80FFFFFF), fontSize: 13, fontFamily: 'Cairo'),
                          prefixIcon: const Icon(Icons.person, color: Color(0xFF00D2FF)),
                          filled: true,
                          fillColor: const Color(0xFF1E2132),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFF00D2FF), width: 1.2),
                          ),
                          contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'يرجى إدخال اسم المستخدم.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Password
                      TextFormField(
                        controller: _passController,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        obscureText: true,
                        decoration: InputDecoration(
                          labelText: 'كلمة مرور الحساب *',
                          labelStyle: const TextStyle(color: Color(0x80FFFFFF), fontSize: 13, fontFamily: 'Cairo'),
                          prefixIcon: const Icon(Icons.lock, color: Color(0xFF00D2FF)),
                          filled: true,
                          fillColor: const Color(0xFF1E2132),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFF00D2FF), width: 1.2),
                          ),
                          contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                        ),
                        validator: (value) {
                          if (!_apiService.isAuthenticated && (value == null || value.isEmpty)) {
                            return 'يرجى إدخال كلمة المرور للولوج.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),

                      // Actions Row
                      Row(
                        children: [
                          // Test connection
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _isTesting ? null : _testConnection,
                              icon: _isTesting
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00D2FF)),
                                    )
                                  : const Icon(Icons.network_ping),
                              label: const Text(
                                'اختبار الاتصال',
                                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, fontSize: 12),
                              ),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF00D2FF),
                                side: const BorderSide(color: Color(0xFF00D2FF)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),

                          // Save and log in
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _isLoggingIn ? null : _saveAndLogin,
                              icon: _isLoggingIn
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                                    )
                                  : const Icon(Icons.save),
                              label: const Text(
                                'حفظ وتسجيل دخول',
                                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF00D2FF),
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
