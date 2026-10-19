import 'package:flutter/material.dart';

class AppShadows {
  // matrix: 0 2px 5px rgba(57, 62, 80, 0.1)
  static const BoxShadow soft = BoxShadow(
    color: Color.fromRGBO(57, 62, 80, 0.10),
    blurRadius: 5,
    spreadRadius: 0,
    offset: Offset(0, 2),
  );

  static const List<BoxShadow> card = [soft];
}
