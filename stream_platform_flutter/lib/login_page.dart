import 'package:flutter/material.dart';

class LoginPage extends StatelessWidget {
  final VoidCallback onLogin;

  LoginPage({required this.onLogin});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Login'),
      ),
      body: Center(
        child: ElevatedButton(
          onPressed: onLogin,
          child: Text('Login'),
        ),
      ),
    );
  }
}
