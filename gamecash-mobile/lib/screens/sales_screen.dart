// lib/screens/sales_screen.dart

import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/product.dart';
import '../models/customer.dart';
import '../models/telecom_company.dart';
import '../models/cart_item.dart';
import '../widgets/glassmorphic_card.dart';
import '../widgets/stepper_widget.dart';
import '../helpers/number_helper.dart';
import 'settings_screen.dart';

class SalesScreen extends StatefulWidget {
  const SalesScreen({Key? key}) : super(key: key);

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  final _apiService = ApiService();

  // Loaded Catalog Data
  List<Product> _products = [];
  List<Customer> _customers = [];
  List<TelecomCompany> _telecomCompanies = [];
  bool _isLoadingData = false;
  String _loadError = '';

  // Local UI State for Sale
  bool _enableTelecom = false;
  TelecomCompany? _selectedTelecomCompany;
  final _telecomPhoneController = TextEditingController();
  final _telecomAmountController = TextEditingController();
  double _telecomPrice = 0.0;

  bool _enablePlaystation = false;
  final _playstationLabelController = TextEditingController(text: 'لعب بلايستيشن');
  double _playstationPrice = 0.0;

  // Selected Snacks inside Cart
  final Map<int, int> _selectedSnackQuantities = {}; // product_id -> qty

  // Split Billing details
  double _paidCash = 0.0;
  bool _isPaidCashManuallyEdited = false;
  Customer? _selectedCustomer;
  final _notesController = TextEditingController();

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _notesController.text = 'تم تسجيل البيع عبر تطبيق الموبايل';
    _initializeAndLoad();
  }

  @override
  void dispose() {
    _telecomPhoneController.dispose();
    _telecomAmountController.dispose();
    _playstationLabelController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _initializeAndLoad() async {
    await _apiService.init();
    if (_apiService.isAuthenticated) {
      _loadData();
    } else {
      setState(() {
        _products = [];
        _customers = [];
        _telecomCompanies = [];
      });
    }
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoadingData = true;
      _loadError = '';
    });

    try {
      final products = await _apiService.getProducts();
      final customers = await _apiService.getCustomers();
      final telecom = await _apiService.getTelecomCompanies();

      setState(() {
        _products = products;
        _customers = customers;
        _telecomCompanies = telecom;
        _isLoadingData = false;
        
        // Select first telecom company as default if available
        if (_telecomCompanies.isNotEmpty && _selectedTelecomCompany == null) {
          _selectedTelecomCompany = _telecomCompanies.first;
        }
      });
    } catch (e) {
      setState(() {
        _isLoadingData = false;
        _loadError = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  // Get list of active items to represent the cart
  List<CartItem> _getCartItems() {
    final List<CartItem> items = [];

    // 1. Add Checked Snacks
    _selectedSnackQuantities.forEach((prodId, qty) {
      if (qty > 0) {
        final product = _products.firstWhere((p) => p.id == prodId);
        items.add(CartItem(
          type: CartItemType.product,
          productId: product.id,
          name: product.name,
          quantity: qty,
          pricePerUnit: product.sellingPrice,
        ));
      }
    });

    // 2. Add Telecom if enabled
    if (_enableTelecom && _selectedTelecomCompany != null) {
      items.add(CartItem(
        type: CartItemType.telecom,
        telecomCompanyId: _selectedTelecomCompany!.id,
        name: 'شحن رصيد - ${_selectedTelecomCompany!.name}',
        telecomPhone: NumberHelper.normalizeDigits(_telecomPhoneController.text.trim()),
        telecomAmount: NumberHelper.tryParseDouble(_telecomAmountController.text) ?? 0.0,
        quantity: 1,
        pricePerUnit: _telecomPrice,
      ));
    }

    // 3. Add Playstation if enabled
    if (_enablePlaystation) {
      items.add(CartItem(
        type: CartItemType.custom,
        name: _playstationLabelController.text.trim().isNotEmpty 
            ? _playstationLabelController.text.trim() 
            : 'لعب بلايستيشن',
        quantity: 1,
        pricePerUnit: _playstationPrice,
      ));
    }

    return items;
  }

  // Calculate grand total price
  double _calculateGrandTotal() {
    double total = 0.0;
    for (var item in _getCartItems()) {
      total += item.totalPrice;
    }
    return total;
  }

  // Get dynamic calculated debt amount
  double _calculateDebtAmount(double grandTotal) {
    if (!_isPaidCashManuallyEdited) {
      return 0.0; // By default cash pays all, debt is 0
    }
    double debt = grandTotal - _paidCash;
    return debt < 0 ? 0.0 : debt;
  }

  // Open snacks catalog dialog
  void _openSnacksCatalogSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF161824),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: _SnacksCatalogSheet(
            products: _products,
            initialQuantities: _selectedSnackQuantities,
            onSave: (quantities) {
              setState(() {
                _selectedSnackQuantities.clear();
                _selectedSnackQuantities.addAll(quantities);
                
                // Recalculate cash if not manually typed
                if (!_isPaidCashManuallyEdited) {
                  _paidCash = _calculateGrandTotal();
                }
              });
            },
          ),
        );
      },
    );
  }

  // Quick Inline Customer Dialog
  void _openAddNewCustomerDialog() {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isSavingCust = false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return Directionality(
              textDirection: TextDirection.rtl,
              child: AlertDialog(
                backgroundColor: const Color(0xFF161824),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(15),
                  side: const BorderSide(color: Color(0x33FFFFFF)),
                ),
                title: const Text(
                  'إضافة عميل جديد لقائمة الديون',
                  style: TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 16, fontWeight: FontWeight.bold),
                ),
                content: Form(
                  key: formKey,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextFormField(
                          controller: nameController,
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          decoration: InputDecoration(
                            labelText: 'اسم العميل الكامل *',
                            labelStyle: const TextStyle(color: Colors.white54, fontSize: 12, fontFamily: 'Cairo'),
                            filled: true,
                            fillColor: const Color(0xFF1E2132),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'يرجى إدخال اسم العميل.';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: phoneController,
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          keyboardType: TextInputType.phone,
                          decoration: InputDecoration(
                            labelText: 'رقم الهاتف (اختياري)',
                            labelStyle: const TextStyle(color: Colors.white54, fontSize: 12, fontFamily: 'Cairo'),
                            filled: true,
                            fillColor: const Color(0xFF1E2132),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('إلغاء', style: TextStyle(color: Colors.white60, fontFamily: 'Cairo')),
                  ),
                  ElevatedButton(
                    onPressed: isSavingCust
                        ? null
                        : () async {
                            if (!formKey.currentState!.validate()) return;
                            setDialogState(() => isSavingCust = true);

                            try {
                              final newCust = await _apiService.createCustomer(
                                nameController.text.trim(),
                                phoneController.text.trim().isNotEmpty ? NumberHelper.normalizeDigits(phoneController.text.trim()) : null,
                              );

                              // Success
                              await _loadData(); // Re-fetch all customers
                              
                              setState(() {
                                // Match newly loaded customer by ID and select them
                                _selectedCustomer = _customers.firstWhere(
                                  (c) => c.id == newCust.id,
                                  orElse: () => newCust,
                                );
                              });

                              if (mounted) Navigator.of(context).pop();
                              
                              ScaffoldMessenger.of(this.context).showSnackBar(
                                const SnackBar(
                                  content: Text('تم إضافة العميل بنجاح واختياره.', style: TextStyle(fontFamily: 'Cairo')),
                                  backgroundColor: Color(0xFF00FF87),
                                ),
                              );
                            } catch (e) {
                              setDialogState(() => isSavingCust = false);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(e.toString().replaceAll('Exception: ', ''), style: const TextStyle(fontFamily: 'Cairo')),
                                  backgroundColor: Colors.redAccent,
                                ),
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00D2FF)),
                    child: isSavingCust
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                        : const Text('حفظ واختيار', style: TextStyle(color: Colors.black, fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // Submit complete checkout
  Future<void> _submitCheckout() async {
    final cartItems = _getCartItems();
    if (cartItems.isEmpty) {
      _showAlertDialog('السلة فارغة!', 'يرجى إضافة مأكولات، أو رصيد، أو جلسة لعب لإتمام البيع.', Colors.orangeAccent);
      return;
    }

    final grandTotal = _calculateGrandTotal();
    final debt = _calculateDebtAmount(grandTotal);
    final paid = grandTotal - debt;

    if (debt > 0 && _selectedCustomer == null) {
      _showAlertDialog('مطلوب اختيار العميل!', 'لقد قمت بتسجيل متبقي كدين. يجب اختيار عميل من القائمة أو إضافة عميل جديد لتسجيل الدين باسمه.', Colors.redAccent);
      return;
    }

    // Additional validations for telecom
    if (_enableTelecom) {
      if (_telecomPhoneController.text.trim().isEmpty) {
        _showAlertDialog('بيانات تحويل ناقصة!', 'يرجى كتابة رقم الهاتف لتحويل الرصيد.', Colors.orangeAccent);
        return;
      }
      final parsedAmount = NumberHelper.tryParseDouble(_telecomAmountController.text);
      if (parsedAmount == null || parsedAmount <= 0) {
        _showAlertDialog('بيانات تحويل ناقصة!', 'يرجى كتابة مبلغ الرصيد المراد تحويله بشكل صحيح.', Colors.orangeAccent);
        return;
      }
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final res = await _apiService.submitSale(
        customerId: debt > 0 ? _selectedCustomer?.id : null,
        paidAmount: paid,
        debtAmount: debt,
        notes: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
        items: cartItems,
      );

      // Success!
      _showSuccessDialog(
        total: grandTotal,
        paid: paid,
        debt: debt,
        customerName: debt > 0 ? _selectedCustomer?.name : null,
      );

      // Clear State
      setState(() {
        _selectedSnackQuantities.clear();
        _enableTelecom = false;
        _telecomPhoneController.clear();
        _telecomAmountController.clear();
        _telecomPrice = 0.0;

        _enablePlaystation = false;
        _playstationPrice = 0.0;

        _isPaidCashManuallyEdited = false;
        _paidCash = 0.0;
        _selectedCustomer = null;
      });

      // Re-load inventory stocks and customer debts in background
      _loadData();
    } catch (e) {
      _showAlertDialog('فشل تسجيل البيع', e.toString().replaceAll('Exception: ', ''), Colors.redAccent);
    } finally {
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  void _showAlertDialog(String title, String desc, Color color) {
    showDialog(
      context: context,
      builder: (context) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            backgroundColor: const Color(0xFF161824),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15), side: BorderSide(color: color.withOpacity(0.5))),
            title: Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: color),
                const SizedBox(width: 8),
                Text(title, style: TextStyle(color: color, fontFamily: 'Cairo', fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            content: Text(desc, style: const TextStyle(color: Colors.white70, fontFamily: 'Cairo', fontSize: 13)),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('فهمت', style: TextStyle(color: Colors.white, fontFamily: 'Cairo')),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showSuccessDialog({
    required double total,
    required double paid,
    required double debt,
    String? customerName,
  }) {
    showDialog(
      context: context,
      builder: (context) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            backgroundColor: const Color(0xFF161824),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15), side: const BorderSide(color: Color(0xFF00FF87), width: 1.5)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00FF87).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle_outline, color: Color(0xFF00FF87), size: 48),
                ),
                const SizedBox(height: 16),
                const Text(
                  'تم تسجيل عملية البيع بنجاح!',
                  style: TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Divider(color: Color(0x22FFFFFF)),
                const SizedBox(height: 6),
                _buildReceiptRow('إجمالي الفاتورة:', '${total.toStringAsFixed(0)} ل.س'),
                _buildReceiptRow('المسدد كاش:', '${paid.toStringAsFixed(0)} ل.س', valueColor: const Color(0xFF00FF87)),
                if (debt > 0) ...[
                  _buildReceiptRow('المتبقي كدين:', '${debt.toStringAsFixed(0)} ل.س', valueColor: Colors.redAccent),
                  _buildReceiptRow('مسجل للزبون:', customerName ?? '', valueColor: const Color(0xFF00D2FF)),
                ],
              ],
            ),
            actions: [
              Center(
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00FF87),
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 10),
                  ),
                  child: const Text('ممتاز', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildReceiptRow(String label, String value, {Color valueColor = Colors.white}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white54, fontSize: 13, fontFamily: 'Cairo')),
          Text(value, style: TextStyle(color: valueColor, fontSize: 14, fontWeight: FontWeight.bold, fontFamily: 'Cairo')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final grandTotal = _calculateGrandTotal();
    final debt = _calculateDebtAmount(grandTotal);
    final finalPaid = grandTotal - debt;
    
    // Automatically match paidCash display if not manually edited
    final paidCashDisplay = _isPaidCashManuallyEdited ? _paidCash : grandTotal;

    return Scaffold(
      backgroundColor: const Color(0xFF0D0E15),
      appBar: AppBar(
        title: const Text(
          'شاشة البيع الموحدة',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontFamily: 'Cairo',
            color: Colors.white,
          ),
        ),
        backgroundColor: const Color(0xFF161824),
        elevation: 0,
        centerTitle: true,
        actions: [
          // Refresh Button
          if (_apiService.isAuthenticated)
            IconButton(
              icon: _isLoadingData 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.refresh, color: Colors.white),
              onPressed: _isLoadingData ? null : _loadData,
            ),
          // Settings Drawer Launcher
          IconButton(
            icon: const Icon(Icons.settings, color: Color(0xFF00D2FF)),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => SettingsScreen(
                    onConfigChanged: () {
                      _initializeAndLoad();
                    },
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: Directionality(
        textDirection: TextDirection.rtl,
        child: !_apiService.isAuthenticated
            ? _buildNotConnectedWidget()
            : _isLoadingData && _products.isEmpty
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF00D2FF)))
                : _loadError.isNotEmpty
                    ? _buildErrorWidget()
                    : _buildMainCheckoutBody(grandTotal, paidCashDisplay, debt, finalPaid),
      ),
    );
  }

  Widget _buildNotConnectedWidget() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: GlassmorphicCard(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, color: Colors.orangeAccent, size: 56),
              const SizedBox(height: 16),
              const Text(
                'التطبيق غير متصل بخادم الويب',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
              ),
              const SizedBox(height: 10),
              const Text(
                'يرجى الانتقال لشاشة الإعدادات وتهيئة رابط استضافة خادم الـ API مع تسجيل الدخول بحساب الإدارة لبدء تفعيل شاشة البيع.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white60, fontSize: 13, fontFamily: 'Cairo', height: 1.5),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => SettingsScreen(
                        onConfigChanged: () {
                          _initializeAndLoad();
                        },
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.settings),
                label: const Text('التوجه للإعدادات الآن', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00D2FF),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: GlassmorphicCard(
          borderColor: Colors.redAccent.withOpacity(0.3),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.redAccent, size: 56),
              const SizedBox(height: 16),
              const Text(
                'فشل تحميل البيانات من السيرفر',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
              ),
              const SizedBox(height: 10),
              Text(
                _loadError,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white60, fontSize: 13, fontFamily: 'Cairo', height: 1.5),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loadData,
                icon: const Icon(Icons.refresh),
                label: const Text('إعادة المحاولة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00D2FF),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMainCheckoutBody(double grandTotal, double paidCashDisplay, double debt, double finalPaid) {
    final activeItems = _getCartItems();
    final selectedSnackCount = _selectedSnackQuantities.values.where((q) => q > 0).fold<int>(0, (sum, val) => sum + val);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Unified Selection Header
          const Text(
            'تعبئة عناصر الفاتورة',
            style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
          ),
          const SizedBox(height: 10),

          // 2. Select Products Integrated Container
          GlassmorphicCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // SNACKS BUTTON
                ElevatedButton.icon(
                  onPressed: _openSnacksCatalogSheet,
                  icon: const Icon(Icons.fastfood, color: Colors.black),
                  label: Text(
                    selectedSnackCount > 0 
                        ? 'تعديل المأكولات والمشروبات ($selectedSnackCount قطع)'
                        : 'إضافة مأكولات ومشروبات من الكتالوج',
                    style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: selectedSnackCount > 0 
                        ? const Color(0xFF00FF87) 
                        : const Color(0xFF00D2FF),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 16),
                const Divider(color: Color(0x1BFFFFFF), height: 1),
                const SizedBox(height: 16),

                // TELECOM TRANSFER SECTION
                Row(
                  children: [
                    Checkbox(
                      value: _enableTelecom,
                      onChanged: (val) {
                        setState(() {
                          _enableTelecom = val ?? false;
                          if (!_isPaidCashManuallyEdited) _paidCash = _calculateGrandTotal();
                        });
                      },
                      activeColor: const Color(0xFF00D2FF),
                      checkColor: Colors.black,
                    ),
                    const Text(
                      'تحويل رصيد اتصال شركات',
                      style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                    ),
                  ],
                ),
                if (_enableTelecom) ...[
                  Padding(
                    padding: const EdgeInsets.only(right: 12, left: 12, bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Company Selector Dropdown
                        const Text(
                          'شركة الاتصالات:',
                          style: TextStyle(color: Colors.white54, fontSize: 12, fontFamily: 'Cairo'),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E2132),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<TelecomCompany>(
                              value: _selectedTelecomCompany,
                              dropdownColor: const Color(0xFF161824),
                              style: const TextStyle(color: Colors.white, fontSize: 14, fontFamily: 'Cairo'),
                              onChanged: (comp) {
                                setState(() {
                                  _selectedTelecomCompany = comp;
                                });
                              },
                              items: _telecomCompanies.map((tc) {
                                return DropdownMenuItem(
                                  value: tc,
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 12,
                                        height: 12,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: Color(int.tryParse(tc.logoColor.replaceFirst('#', '0xFF')) ?? 0xFFCCCCCC),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(tc.name),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Row of Inputs
                        Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: TextField(
                                controller: _telecomPhoneController,
                                keyboardType: TextInputType.phone,
                                style: const TextStyle(color: Colors.white, fontSize: 14),
                                decoration: InputDecoration(
                                  labelText: 'رقم الهاتف المرد شحنه *',
                                  labelStyle: const TextStyle(color: Colors.white54, fontSize: 11, fontFamily: 'Cairo'),
                                  filled: true,
                                  fillColor: const Color(0xFF1E2132),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              flex: 2,
                              child: TextField(
                                controller: _telecomAmountController,
                                keyboardType: TextInputType.number,
                                style: const TextStyle(color: Colors.white, fontSize: 14),
                                decoration: InputDecoration(
                                  labelText: 'الرصيد المحول *',
                                  labelStyle: const TextStyle(color: Colors.white54, fontSize: 11, fontFamily: 'Cairo'),
                                  filled: true,
                                  fillColor: const Color(0xFF1E2132),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // Selling Price Stepper
                        StepperWidget(
                          value: _telecomPrice,
                          label: 'سعر البيع المقبوض من العميل:',
                          onChanged: (val) {
                            setState(() {
                              _telecomPrice = val;
                              if (!_isPaidCashManuallyEdited) _paidCash = _calculateGrandTotal();
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                const Divider(color: Color(0x1BFFFFFF), height: 1),
                const SizedBox(height: 16),

                // PLAYSTATION SERVICE SECTION
                Row(
                  children: [
                    Checkbox(
                      value: _enablePlaystation,
                      onChanged: (val) {
                        setState(() {
                          _enablePlaystation = val ?? false;
                          if (!_isPaidCashManuallyEdited) _paidCash = _calculateGrandTotal();
                        });
                      },
                      activeColor: const Color(0xFF00D2FF),
                      checkColor: Colors.black,
                    ),
                    const Text(
                      'لعب بلايستيشن (PlayStation)',
                      style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                    ),
                  ],
                ),
                if (_enablePlaystation) ...[
                  Padding(
                    padding: const EdgeInsets.only(right: 12, left: 12, bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          controller: _playstationLabelController,
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          decoration: InputDecoration(
                            labelText: 'مسمى الجلسة/الجهاز (اختياري)',
                            labelStyle: const TextStyle(color: Colors.white54, fontSize: 11, fontFamily: 'Cairo'),
                            filled: true,
                            fillColor: const Color(0xFF1E2132),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                        const SizedBox(height: 12),
                        StepperWidget(
                          value: _playstationPrice,
                          label: 'سعر اللعب الإجمالي:',
                          onChanged: (val) {
                            setState(() {
                              _playstationPrice = val;
                              if (!_isPaidCashManuallyEdited) _paidCash = _calculateGrandTotal();
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 3. Cart Summary Box (Only if has items)
          if (activeItems.isNotEmpty) ...[
            const Text(
              'ملخص سلة الشراء الموحدة',
              style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
            ),
            const SizedBox(height: 10),
            GlassmorphicCard(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              borderColor: const Color(0xFF00D2FF).withOpacity(0.15),
              child: Column(
                children: [
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: activeItems.length,
                    separatorBuilder: (context, idx) => const Divider(color: Color(0x12FFFFFF)),
                    itemBuilder: (context, idx) {
                      final item = activeItems[idx];
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            Icon(
                              item.type == CartItemType.product
                                  ? Icons.fastfood_outlined
                                  : item.type == CartItemType.telecom
                                      ? Icons.phone_android_outlined
                                      : Icons.sports_esports_outlined,
                              color: const Color(0xFF00D2FF),
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.name,
                                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                                  ),
                                  if (item.type == CartItemType.telecom)
                                    Text(
                                      'رقم: ${item.telecomPhone} | شحن: ${item.telecomAmount?.toStringAsFixed(0)}',
                                      style: const TextStyle(color: Colors.white54, fontSize: 11),
                                    ),
                                ],
                              ),
                            ),
                            Text(
                              '${item.quantity} × ${item.pricePerUnit.toStringAsFixed(0)} ل.س',
                              style: const TextStyle(color: Colors.white70, fontSize: 12, fontFamily: 'Cairo'),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              '${item.totalPrice.toStringAsFixed(0)} ل.س',
                              style: const TextStyle(color: Color(0xFF00D2FF), fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const Divider(color: Color(0x33FFFFFF), thickness: 1, height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'إجمالي قيمة الفاتورة:',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14, fontFamily: 'Cairo'),
                      ),
                      Text(
                        '${grandTotal.toStringAsFixed(0)} ل.س',
                        style: const TextStyle(color: Color(0xFF00D2FF), fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'Cairo'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // 4. Payment Splitting Section
          const Text(
            'طريقة الدفع والحساب',
            style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
          ),
          const SizedBox(height: 10),
          GlassmorphicCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Paid Cash Box
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'المدفوع كاش (نقداً):',
                            style: TextStyle(color: Colors.white54, fontSize: 12, fontFamily: 'Cairo'),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            height: 48,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(color: const Color(0xFF1E2132), borderRadius: BorderRadius.circular(10)),
                            child: Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    keyboardType: TextInputType.number,
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                                    decoration: const InputDecoration(border: InputBorder.none, hintText: '0'),
                                    controller: TextEditingController(
                                      text: paidCashDisplay.toStringAsFixed(0),
                                    )..selection = TextSelection.fromPosition(
                                        TextPosition(offset: paidCashDisplay.toStringAsFixed(0).length),
                                      ),
                                    onChanged: (val) {
                                      setState(() {
                                        _isPaidCashManuallyEdited = true;
                                        _paidCash = NumberHelper.tryParseDouble(val) ?? 0.0;
                                      });
                                    },
                                  ),
                                ),
                                const Text('ل.س', style: TextStyle(color: Colors.white30, fontSize: 12)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Remaining Debt box (Readonly)
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'المتبقي كدين:',
                            style: TextStyle(color: Colors.white54, fontSize: 12, fontFamily: 'Cairo'),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            height: 48,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: debt > 0 ? Colors.redAccent.withOpacity(0.15) : const Color(0xFF1E2132),
                              borderRadius: BorderRadius.circular(10),
                              border: debt > 0 ? Border.all(color: Colors.redAccent.withOpacity(0.5)) : null,
                            ),
                            alignment: Alignment.centerLeft,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  debt.toStringAsFixed(0),
                                  style: TextStyle(
                                    color: debt > 0 ? Colors.redAccent : Colors.white70,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                                Text(
                                  'ل.س',
                                  style: TextStyle(color: debt > 0 ? Colors.redAccent.withOpacity(0.6) : Colors.white30, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                // If Debt exists, show Customer Dropdown Selector
                if (debt > 0) ...[
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'اختر العميل لتسجيل الدين عليه: *',
                        style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                      ),
                      // Alert label
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: Colors.redAccent.withOpacity(0.15), borderRadius: BorderRadius.circular(4)),
                        child: const Text('مطلوب', style: TextStyle(color: Colors.redAccent, fontSize: 10, fontFamily: 'Cairo')),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E2132),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<Customer>(
                              value: _selectedCustomer,
                              isExpanded: true,
                              hint: const Text('ابحث أو اختر عميل الديون...', style: TextStyle(color: Colors.white30, fontSize: 13, fontFamily: 'Cairo')),
                              dropdownColor: const Color(0xFF161824),
                              style: const TextStyle(color: Colors.white, fontSize: 14, fontFamily: 'Cairo'),
                              onChanged: (cust) {
                                setState(() {
                                  _selectedCustomer = cust;
                                });
                              },
                              items: _customers.map((c) {
                                return DropdownMenuItem(
                                  value: c,
                                  child: Text('${c.name} (دين حالي: ${c.totalDebt.toStringAsFixed(0)} ل.س)'),
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Add new customer button
                      InkWell(
                        onTap: _openAddNewCustomerDialog,
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: const Color(0xFF00D2FF).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFF00D2FF), width: 1),
                          ),
                          child: const Icon(Icons.person_add, color: Color(0xFF00D2FF), size: 20),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 16),

                // Sale Notes
                TextField(
                  controller: _notesController,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    labelText: 'ملاحظات الفاتورة',
                    labelStyle: const TextStyle(color: Colors.white54, fontSize: 11, fontFamily: 'Cairo'),
                    filled: true,
                    fillColor: const Color(0xFF1E2132),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 5. Huge Submit Checkout Button
          ElevatedButton.icon(
            onPressed: _isSubmitting ? null : _submitCheckout,
            icon: _isSubmitting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                : const Icon(Icons.rocket_launch, color: Colors.black),
            label: Text(
              _isSubmitting ? 'جاري تسجيل العملية...' : 'تسجيل عملية البيع (${grandTotal.toStringAsFixed(0)} ل.س)',
              style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 15),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00FF87),
              foregroundColor: Colors.black,
              shadowColor: const Color(0xFF00FF87).withOpacity(0.4),
              elevation: 8,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 50),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------
// PRIVATE WIDGET: SNACKS CATALOG SHEET
// ---------------------------------------------------------
class _SnacksCatalogSheet extends StatefulWidget {
  final List<Product> products;
  final Map<int, int> initialQuantities;
  final ValueChanged<Map<int, int>> onSave;

  const _SnacksCatalogSheet({
    Key? key,
    required this.products,
    required this.initialQuantities,
    required this.onSave,
  }) : super(key: key);

  @override
  State<_SnacksCatalogSheet> createState() => _SnacksCatalogSheetState();
}

class _SnacksCatalogSheetState extends State<_SnacksCatalogSheet> {
  final Map<int, int> _quantities = {};
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _quantities.addAll(widget.initialQuantities);
  }

  @override
  Widget build(BuildContext context) {
    // Filter snacks based on search
    final filtered = widget.products.where((p) {
      if (p.category != 'snack' && p.category != 'drink') return false; // Must be snacks/drinks
      if (_searchQuery.trim().isEmpty) return true;
      return p.name.toLowerCase().contains(_searchQuery.trim().toLowerCase());
    }).toList();

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'كتالوج المأكولات والمشروبات',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white54),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Search Field
          TextField(
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'ابحث عن مشروب أو وجبة...',
              hintStyle: const TextStyle(color: Colors.white30, fontSize: 12, fontFamily: 'Cairo'),
              prefixIcon: const Icon(Icons.search, color: Color(0xFF00D2FF), size: 18),
              filled: true,
              fillColor: const Color(0xFF1E2132),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(vertical: 8),
            ),
            onChanged: (val) {
              setState(() {
                _searchQuery = val;
              });
            },
          ),
          const SizedBox(height: 16),

          // Product Checklist Catalog
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.45,
            ),
            child: filtered.isEmpty
                ? const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: Text(
                        'لا يوجد نتائج للبحث.',
                        style: TextStyle(color: Colors.white30, fontSize: 13, fontFamily: 'Cairo'),
                      ),
                    ),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    itemCount: filtered.length,
                    separatorBuilder: (context, idx) => const Divider(color: Color(0x12FFFFFF)),
                    itemBuilder: (context, idx) {
                      final product = filtered[idx];
                      final currentQty = _quantities[product.id] ?? 0;
                      final isSelected = currentQty > 0;

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            // Selection Checkbox
                            Checkbox(
                              value: isSelected,
                              onChanged: (checked) {
                                setState(() {
                                  if (checked == true) {
                                    _quantities[product.id] = 1;
                                  } else {
                                    _quantities[product.id] = 0;
                                  }
                                });
                              },
                              activeColor: const Color(0xFF00FF87),
                              checkColor: Colors.black,
                            ),
                            const SizedBox(width: 4),

                            // Product details
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    product.name,
                                    style: TextStyle(
                                      color: isSelected ? Colors.white : Colors.white70,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                      fontSize: 13,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                  Text(
                                    'السعر: ${product.sellingPrice.toStringAsFixed(0)} ل.س | المتوفر: ${product.stock} قطع',
                                    style: TextStyle(
                                      color: product.stock <= 2 ? Colors.orangeAccent : Colors.white30,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Quantity Picker (If checked)
                            if (isSelected)
                              Container(
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1E2132),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    // Decrement
                                    IconButton(
                                      icon: const Icon(Icons.remove, size: 16, color: Colors.redAccent),
                                      onPressed: () {
                                        setState(() {
                                          if (currentQty > 1) {
                                            _quantities[product.id] = currentQty - 1;
                                          } else {
                                            _quantities[product.id] = 0;
                                          }
                                        });
                                      },
                                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                      padding: EdgeInsets.zero,
                                    ),
                                    Text(
                                      currentQty.toString(),
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    // Increment
                                    IconButton(
                                      icon: const Icon(Icons.add, size: 16, color: Color(0xFF00FF87)),
                                      onPressed: () {
                                        if (currentQty >= product.stock) {
                                          // Enforce stock bounds
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: Text('الكمية المطلوبة تتجاوز المتاح في المخزن (${product.stock} قطعة)', style: const TextStyle(fontFamily: 'Cairo')),
                                              backgroundColor: Colors.orangeAccent,
                                              duration: const Duration(seconds: 1),
                                            ),
                                          );
                                          return;
                                        }
                                        setState(() {
                                          _quantities[product.id] = currentQty + 1;
                                        });
                                      },
                                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                      padding: EdgeInsets.zero,
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          const SizedBox(height: 20),

          // Action Save Button
          ElevatedButton(
            onPressed: () {
              widget.onSave(_quantities);
              Navigator.of(context).pop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00FF87),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text(
              'حفظ وإضافة للسلة',
              style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 14),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
