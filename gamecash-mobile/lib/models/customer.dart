// lib/models/customer.dart

class Customer {
  final int id;
  final String name;
  final String? phone;
  final double totalDebt;

  Customer({
    required this.id,
    required this.name,
    this.phone,
    required this.totalDebt,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: int.tryParse(json['id'].toString()) ?? 0,
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString(),
      totalDebt: double.tryParse(json['total_debt'].toString()) ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'total_debt': totalDebt,
    };
  }
}
