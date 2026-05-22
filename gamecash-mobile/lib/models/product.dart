// lib/models/product.dart

class Product {
  final int id;
  final String name;
  final String category;
  final double purchasePrice;
  final double sellingPrice;
  final int stock;

  Product({
    required this.id,
    required this.name,
    required this.category,
    required this.purchasePrice,
    required this.sellingPrice,
    required this.stock,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: int.tryParse(json['id'].toString()) ?? 0,
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? 'snack',
      purchasePrice: double.tryParse(json['purchase_price'].toString()) ?? 0.0,
      sellingPrice: double.tryParse(json['selling_price'].toString()) ?? 0.0,
      stock: int.tryParse(json['stock'].toString()) ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'purchase_price': purchasePrice,
      'selling_price': sellingPrice,
      'stock': stock,
    };
  }
}
