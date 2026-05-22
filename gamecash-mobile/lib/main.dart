// lib/main.dart

import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'screens/sales_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize API service and load cached server IP & token
  final apiService = ApiService();
  await apiService.init();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GameCash Mobile',
      debugShowCheckedModeBanner: false,
      
      // Force Arabic RTL layout natively
      locale: const Locale('ar', 'AE'),
      supportedLocales: const [
        Locale('ar', 'AE'),
      ],
      
      // Premium Dark Glassmorphic Theme
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0D0E15),
        primaryColor: const Color(0xFF00D2FF), // Neon cyan
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00D2FF),
          secondary: Color(0xFF00FF87), // Neon green
          surface: Color(0xFF161824),
          background: const Color(0xFF0D0E15),
          error: Colors.redAccent,
        ),
        
        // Custom Cairo-inspired Arabic typography styling
        fontFamily: 'Cairo',
        textTheme: const TextTheme(
          displayLarge: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
          titleLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
          bodyLarge: TextStyle(fontSize: 14, color: Colors.white70),
          bodyMedium: TextStyle(fontSize: 13, color: Colors.white54),
        ),
        
        // Custom Glassmorphic-friendly Inputs
        inputDecorationTheme: InputDecorationTheme(
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
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Colors.redAccent, width: 1.2),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        
        // Custom Neon Checkbox & Dialog Themes
        checkboxTheme: CheckboxThemeData(
          fillColor: MaterialStateProperty.resolveWith<Color>((states) {
            if (states.contains(MaterialState.selected)) {
              return const Color(0xFF00D2FF);
            }
            return Colors.transparent;
          }),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        
        dialogTheme: DialogThemeData(
          backgroundColor: const Color(0xFF161824),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0x33FFFFFF), width: 1),
          ),
        ),
      ),
      
      // The default screen is direct checkout!
      home: const SalesScreen(),
    );
  }
}
