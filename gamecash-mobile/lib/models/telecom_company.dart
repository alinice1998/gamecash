// lib/models/telecom_company.dart

class TelecomCompany {
  final int id;
  final String name;
  final String logoColor;

  TelecomCompany({
    required this.id,
    required this.name,
    required this.logoColor,
  });

  factory TelecomCompany.fromJson(Map<String, dynamic> json) {
    return TelecomCompany(
      id: int.tryParse(json['id'].toString()) ?? 0,
      name: json['name']?.toString() ?? '',
      logoColor: json['logo_color']?.toString() ?? '#cccccc',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'logo_color': logoColor,
    };
  }
}
