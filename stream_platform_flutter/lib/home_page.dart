import 'package:flutter/material.dart';

class HomePage extends StatelessWidget {
  final VoidCallback onLogin;

  HomePage({required this.onLogin});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Home'),
      ),
      body: Center(
        child: ElevatedButton(
          onPressed: onLogin,
          child: Text('Go to Live Stream'),
        ),
      ),
    );
  }
}
