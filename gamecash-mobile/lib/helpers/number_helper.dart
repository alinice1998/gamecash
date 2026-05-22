// lib/helpers/number_helper.dart

class NumberHelper {
  static String normalizeDigits(String input) {
    const english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    String result = input;
    for (int i = 0; i < 10; i++) {
      result = result.replaceAll(arabic[i], english[i]);
      result = result.replaceAll(persian[i], english[i]);
    }

    // Remove any commas or spaces that could interfere with parsing
    result = result.replaceAll(RegExp(r'\s+'), '').replaceAll(',', '');

    return result;
  }

  static double? tryParseDouble(String? input) {
    if (input == null) return null;
    final normalized = normalizeDigits(input);
    return double.tryParse(normalized);
  }

  static int? tryParseInt(String? input) {
    if (input == null) return null;
    final normalized = normalizeDigits(input);
    return int.tryParse(normalized);
  }
}
