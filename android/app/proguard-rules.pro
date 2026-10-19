# Flutter'ın kendi çekirdek sınıflarını koru
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.embedding.** { *; }
-keep class io.flutter.plugins.** { *; }

# Kendi paket yapını ve MainActivity sınıfını tamamen koru
-keep class com.teknostride.edulem.** { *; }

# AndroidX ve Activity başlatan sistem sınıflarını koru
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.ContentProvider
-keep public class * extends android.content.BroadcastReceiver

# Play Core ve eksik sınıf uyarılarını R8 için yoksay (Eksik sınıf kaynaklı derleme hatalarını önler)
-dontwarn com.google.android.play.core.**
-dontwarn io.flutter.embedding.**

# Firebase ve GMS sınıflarının silinmesini engelle (Beyaz ekran / release crash çözümü)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Tüm Flutter eklentilerini (plugins) koru
-keep class * implements io.flutter.plugin.common.PluginRegistry$PluginRegistrantCallback { *; }
-keep class * implements io.flutter.plugin.common.PluginRegistry$Registrar { *; }

# Flutter Secure Storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }
-dontwarn com.it_nomads.fluttersecurestorage.**

# Flutter Local Notifications
-keep class com.dexterous.flutterlocalnotifications.** { *; }
-dontwarn com.dexterous.flutterlocalnotifications.**

# Community Plus Plugins (Package Info, App Badge Plus)
-keep class dev.fluttercommunity.plus.** { *; }
-dontwarn dev.fluttercommunity.plus.**

