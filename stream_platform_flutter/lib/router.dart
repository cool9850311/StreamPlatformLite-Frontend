import 'package:flutter/material.dart';
import 'home_page.dart'; 
import 'login_page.dart'; 
import 'live_stream_page.dart'; 

// 路由路径类
class AppRoutePath {
  final String? location;
  final bool isLoggedIn;

  AppRoutePath.home() : location = '/', isLoggedIn = false;
  AppRoutePath.liveStream() : location = '/live', isLoggedIn = true;
  AppRoutePath.login() : location = '/login', isLoggedIn = false;

  bool get isHomePage => location == '/';
  bool get isLiveStreamPage => location == '/live';
  bool get isLoginPage => location == '/login';
}

// 路由代理
class AppRouterDelegate extends RouterDelegate<AppRoutePath>
    with ChangeNotifier, PopNavigatorRouterDelegateMixin<AppRoutePath> {
  final GlobalKey<NavigatorState> navigatorKey;

  AppRouterDelegate({required this.navigatorKey}) : super();

  AppRoutePath _currentPath = AppRoutePath.home();
  bool _isLoggedIn = false;

  AppRoutePath get currentConfiguration => _currentPath;

  void _handleLogin() {
    _isLoggedIn = true;
    _updatePath(AppRoutePath.liveStream());
  }

  void _updatePath(AppRoutePath path) {
    if (path.isLoggedIn != _isLoggedIn) {
      // Redirect to login page if needed
      _isLoggedIn = false;
      _currentPath = AppRoutePath.login();
    } else {
      _currentPath = path;
    }
    notifyListeners();
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Page>[];

    if (_currentPath.isLoginPage) {
      pages.add(MaterialPage(child: LoginPage(onLogin: _handleLogin)));
    } else if (_currentPath.isLiveStreamPage) {
      pages.add(MaterialPage(child: LiveStreamPage()));
    } else {
      pages.add(MaterialPage(child: HomePage(onLogin: _handleLogin)));
    }

    return Navigator(
      key: navigatorKey,
      pages: pages,
      onPopPage: (route, result) {
        if (!route.didPop(result)) {
          return false;
        }
        _updatePath(AppRoutePath.home());
        return true;
      },
    );
  }

  @override
  Future<void> setNewRoutePath(AppRoutePath path) async {
    _updatePath(path);
  }
}

// 路由解析器
class AppRouteInformationParser extends RouteInformationParser<AppRoutePath> {
  @override
  Future<AppRoutePath> parseRouteInformation(RouteInformation routeInformation) async {
    final uri = Uri.parse(routeInformation.location ?? '/');
    if (uri.pathSegments.isEmpty) {
      return AppRoutePath.home();
    }

    final path = uri.pathSegments.first;
    if (path == 'live') {
      return AppRoutePath.liveStream();
    }
    return AppRoutePath.login();
  }

  @override
  RouteInformation? restoreRouteInformation(AppRoutePath path) {
    if (path.isHomePage) {
      return RouteInformation(location: '/');
    } else if (path.isLiveStreamPage) {
      return RouteInformation(location: '/live');
    }
    return RouteInformation(location: '/login');
  }
}
