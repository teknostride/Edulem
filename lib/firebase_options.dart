import 'package:firebase_core/firebase_core.dart';
import 'dart:io' show Platform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (Platform.isIOS) {
      return ios;
    } else if (Platform.isAndroid) {
      return android;
    }
    throw UnsupportedError(
      'Desteklenmeyen platform: ${Platform.operatingSystem}',
    );
  }

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCgsoGZwApJ58r59jBqYBprhLhYwmgd0IY',
    appId: '1:980767048954:ios:8b374abe7b7637b18f7543',
    messagingSenderId: '980767048954',
    projectId: 'edulem-50022',
    storageBucket: 'edulem-50022.firebasestorage.app',
    iosBundleId: 'com.teknostride.edulem',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBAk1YzmLIXeOgQZ_ue3FuWQtLkrsuN4S0',
    appId: '1:980767048954:android:439698e3b1ff23e68f7543',
    messagingSenderId: '980767048954',
    projectId: 'edulem-50022',
    storageBucket: 'edulem-50022.firebasestorage.app',
  );
}
