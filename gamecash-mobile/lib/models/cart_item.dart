// lib/models/cart_item.dart

enum CartItemType { product, telecom, custom }

class CartItem {
  final CartItemType type;
  
  // Product-specific fields
  final int? productId;
  final String name; // Product name, operator name, or playtime label
  
  // Telecom-specific fields
  final int? telecomCompanyId;
  final String? telecomPhone;
  final double? telecomAmount;
  
  // Common fields
  int quantity;
  double pricePerUnit;
  
  CartItem({
    required this.type,
    this.productId,
    required this.name,
    this.telecomCompanyId,
    this.telecomPhone,
    this.telecomAmount,
    required this.quantity,
    required this.pricePerUnit,
  });
  
  double get totalPrice => pricePerUnit * quantity;
  
  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {
      'type': type.name,
      'quantity': quantity,
      'price_per_unit': pricePerUnit,
    };
    
    if (type == CartItemType.product) {
      data['product_id'] = productId;
    } else if (type == CartItemType.telecom) {
      data['telecom_company_id'] = telecomCompanyId;
      data['telecom_phone'] = telecomPhone;
      data['telecom_amount'] = telecomAmount;
    } else if (type == CartItemType.custom) {
      data['custom_name'] = name;
    }
    
    return data;
  }
}
