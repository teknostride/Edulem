import 'package:flutter/material.dart';

import '../../core/utils/role_utils.dart';
import 'app_drawer.dart';

// Web menu hiyerarşisi ileride /layout/init içinden okunacak.
// Şimdilik parity için aynı başlıkları Flutter Drawer'a taşıyoruz.
List<AppDrawerSection> defaultDrawerSectionsForRole(String role) {
  if (isStudentRole(role)) {
    return studentPortalDrawerSections(role);
  }

  if (isTeacherRole(role)) {
    return teacherDrawerSections(role);
  }

  return managementDrawerSections(role);
}

List<AppDrawerSection> studentPortalDrawerSections(String role) {
  return [
    AppDrawerSection(
      title: 'Öğrenci Menüsü',
      items: [
        const AppDrawerItem(
          title: 'Ders Programım',
          icon: Icons.calendar_month,
          route: '/schedule',
        ),
        AppDrawerItem(
          title: 'Ölçme Değerlendirme',
          icon: Icons.bar_chart,
          children: [
            const AppDrawerItem(title: 'Sınavlarım', route: '/assessment'),
            const AppDrawerItem(title: 'Notlarım', route: '/grades'),
          ],
        ),
        const AppDrawerItem(
          title: 'Ödevlerim',
          icon: Icons.book,
          route: '/homework',
        ),
        const AppDrawerItem(
          title: 'Yemek Menüsü',
          icon: Icons.restaurant_menu,
          route: '/meal-menus',
        ),
        const AppDrawerItem(
          title: 'Duyurular',
          icon: Icons.campaign,
          route: '/announcements',
        ),
        const AppDrawerItem(
          title: 'Anketler',
          icon: Icons.quiz,
          route: '/surveys',
        ),
      ],
    ),
  ];
}

List<AppDrawerSection> guardianPortalDrawerSections(String role) {
  return [
    AppDrawerSection(
      title: 'Veli Menüsü',
      items: [
        const AppDrawerItem(
          title: 'Ders Programı',
          icon: Icons.calendar_month,
          route: '/schedule',
        ),
        const AppDrawerItem(
          title: 'Devamsızlık',
          icon: Icons.how_to_reg,
          route: '/attendances',
        ),
        AppDrawerItem(
          title: 'Akademik Durum',
          icon: Icons.bar_chart,
          children: [
            const AppDrawerItem(title: 'Sınav Sonuçları', route: '/assessment'),
            const AppDrawerItem(title: 'Ders Notları', route: '/grades'),
            const AppDrawerItem(title: 'Ödev Takibi', route: '/homework'),
          ],
        ),
        AppDrawerItem(
          title: 'Rehberlik & Etüt',
          icon: Icons.psychology,
          children: [
            const AppDrawerItem(
              title: 'Rehberlik Notları',
              route: '/conversations',
            ),
            const AppDrawerItem(title: 'Etüt Programı', route: '/tutoring'),
          ],
        ),
        const AppDrawerItem(
          title: 'Bültenler',
          icon: Icons.article,
          route: '/bulletins',
        ),
        const AppDrawerItem(
          title: 'Etkinlikler',
          icon: Icons.event,
          route: '/activities',
        ),
        const AppDrawerItem(
          title: 'Yemek Menüsü',
          icon: Icons.restaurant_menu,
          route: '/meal-menus',
        ),
        const AppDrawerItem(
          title: 'Duyurular',
          icon: Icons.campaign,
          route: '/announcements',
        ),
        const AppDrawerItem(
          title: 'Mesajlar',
          icon: Icons.mail,
          route: '/messages',
        ),
      ],
    ),
  ];
}

List<AppDrawerSection> teacherDrawerSections(String role) {
  return [
    const AppDrawerSection(
      title: 'AKADEMIK',
      items: [
        AppDrawerItem(
          title: 'Öğrenciler',
          icon: Icons.people,
          route: '/students',
        ),
        AppDrawerItem(
          title: 'Ders Programım',
          icon: Icons.calendar_month,
          route: '/schedule',
        ),
        AppDrawerItem(
          title: 'Ölçme Değerlendirme',
          icon: Icons.bar_chart,
          children: [AppDrawerItem(title: 'Sınavlar', route: '/exams')],
        ),
        AppDrawerItem(
          title: 'Yoklama Al',
          icon: Icons.how_to_reg,
          route: '/attendances',
        ),
        AppDrawerItem(
          title: 'Ödev Yönetimi',
          icon: Icons.assignment,
          route: '/homework',
        ),
        AppDrawerItem(
          title: 'Etüt ve Özel Ders',
          icon: Icons.menu_book,
          route: '/tutoring',
        ),
        AppDrawerItem(
          title: 'Görüşmelerim',
          icon: Icons.record_voice_over,
          route: '/my-conversations',
        ),
        AppDrawerItem(
          title: 'Rehberlik Servisi',
          icon: Icons.psychology,
          route: '/conversations',
        ),
        AppDrawerItem(
          title: 'Yemek Menüsü',
          icon: Icons.restaurant_menu,
          route: '/meal-menus',
        ),
        AppDrawerItem(
          title: 'Nöbet Çizelgesi',
          icon: Icons.schedule,
          route: '/duty-schedules',
        ),
      ],
    ),
    const AppDrawerSection(
      title: 'ILETISIM',
      items: [
        AppDrawerItem(
          title: 'Duyurular',
          icon: Icons.campaign,
          route: '/announcements',
        ),
        AppDrawerItem(title: 'Mesajlar', icon: Icons.mail, route: '/messages'),
        AppDrawerItem(title: 'Anketler', icon: Icons.quiz, route: '/surveys'),
      ],
    ),
  ];
}

List<AppDrawerSection> managementDrawerSections(String role) {
  return const [
    AppDrawerSection(
      title: 'Yönetim',
      items: [
        AppDrawerItem(
          title: 'Öğrenci Yönetimi',
          icon: Icons.people,
          children: [
            AppDrawerItem(title: 'Öğrenci Listesi', route: '/students'),
          ],
        ),
        AppDrawerItem(
          title: 'Kullanıcı Yönetimi',
          icon: Icons.admin_panel_settings,
          children: [
            AppDrawerItem(title: 'Kullanıcı Listesi', route: '/users'),
          ],
        ),
      ],
    ),
    AppDrawerSection(
      title: 'Akademik',
      items: [
        AppDrawerItem(
          title: 'Dersler',
          icon: Icons.book,
          children: [
            AppDrawerItem(title: 'Ders Listesi', route: '/lessons'),
            AppDrawerItem(title: 'Ders Programı', route: '/schedule'),
          ],
        ),
        AppDrawerItem(
          title: 'Yoklama Takibi',
          icon: Icons.how_to_reg,
          children: [
            AppDrawerItem(title: 'Yoklama Takibi', route: '/attendances'),
          ],
        ),
        AppDrawerItem(
          title: 'Ödev Yönetimi',
          icon: Icons.assignment,
          route: '/homework',
        ),
        AppDrawerItem(
          title: 'Etüt ve Özel Ders',
          icon: Icons.menu_book,
          route: '/tutoring',
        ),
        AppDrawerItem(
          title: 'Görüşmeler',
          icon: Icons.record_voice_over,
          route: '/meetings',
        ),
        AppDrawerItem(
          title: 'Rehberlik Servisi',
          icon: Icons.psychology,
          route: '/conversations',
        ),
        AppDrawerItem(
          title: 'Yemek Menüsü',
          icon: Icons.restaurant_menu,
          route: '/meal-menus',
        ),
        AppDrawerItem(
          title: 'Nöbet Çizelgesi',
          icon: Icons.schedule,
          route: '/duty-schedules',
        ),
        AppDrawerItem(
          title: 'Bursluluk Sınavları',
          icon: Icons.workspace_premium,
          route: '/scholarship/exams',
        ),
        AppDrawerItem(
          title: 'Ölçme Değerlendirme',
          icon: Icons.bar_chart,
          children: [AppDrawerItem(title: 'Sınavlar', route: '/exams')],
        ),
      ],
    ),
    AppDrawerSection(
      title: 'İletişim',
      items: [
        AppDrawerItem(
          title: 'Duyurular',
          subtitle: 'Bildirim merkezi',
          icon: Icons.notifications,
          route: '/announcements',
        ),
        AppDrawerItem(
          title: 'Mesajlar',
          subtitle: 'Mesajlaşma',
          icon: Icons.mail,
          route: '/messages',
        ),
        AppDrawerItem(title: 'Anketler', icon: Icons.quiz, route: '/surveys'),
      ],
    ),
    AppDrawerSection(
      title: 'Kurumsal',
      items: [
        AppDrawerItem(
          title: 'Kurum Yapısı',
          icon: Icons.apartment,
          children: [
            AppDrawerItem(title: 'Kurum Bilgileri', route: '/tenant/info'),
            AppDrawerItem(title: 'Kampüsler', route: '/campuses'),
            AppDrawerItem(
              title: 'Eğitim Kademeleri',
              route: '/education-levels',
            ),
            AppDrawerItem(title: 'Sınıflar', route: '/classrooms'),
          ],
        ),
        AppDrawerItem(title: 'Kurum Saatleri', icon: Icons.schedule),
        AppDrawerItem(
          title: 'SMS Merkezi',
          icon: Icons.sms,
          route: '/sms/history',
          children: [
            AppDrawerItem(title: 'SMS Geçmişi', route: '/sms/history'),
            AppDrawerItem(title: 'Toplu SMS Gönder', route: '/sms/bulk-send'),
            AppDrawerItem(title: 'SMS Şablonları', route: '/sms/templates'),
            AppDrawerItem(title: 'API Ayarları', route: '/sms/api-settings'),
          ],
        ),
      ],
    ),
    AppDrawerSection(
      title: 'Yetkilendirme',
      items: [
        AppDrawerItem(title: 'Roller', icon: Icons.shield, route: '/roles'),
      ],
    ),
  ];
}

List<AppDrawerSection> defaultDrawerSections() {
  return const [
    AppDrawerSection(
      title: 'Yönetim',
      items: [
        AppDrawerItem(
          title: 'Global Arama',
          subtitle: 'Hızlı arama',
          icon: Icons.search,
          route: '/search',
        ),
        AppDrawerItem(
          title: 'Rol Yönetimi',
          subtitle: 'Rol işlemleri',
          icon: Icons.manage_accounts,
          route: '/roles',
        ),
        AppDrawerItem(
          title: 'Yetki Yönetimi',
          subtitle: 'Yetki işlemleri',
          icon: Icons.key,
          route: '/permissions',
        ),
        AppDrawerItem(
          title: 'Sınıf Yönetimi',
          subtitle: 'Sınıf işlemleri',
          icon: Icons.meeting_room,
          route: '/classrooms',
        ),
        AppDrawerItem(
          title: 'Öğrenci Yönetimi',
          subtitle: 'Öğrenci işlemleri',
          icon: Icons.people,
          route: '/students',
        ),
        AppDrawerItem(
          title: 'Kullanıcı Yönetimi',
          subtitle: 'Kullanıcı işlemleri',
          icon: Icons.admin_panel_settings,
          route: '/users',
        ),
      ],
    ),
    AppDrawerSection(
      title: 'Akademik',
      items: [
        AppDrawerItem(
          title: 'Dersler',
          subtitle: 'Ders işlemleri',
          icon: Icons.book,
          route: '/lessons',
        ),
        AppDrawerItem(
          title: 'Yoklama Takibi',
          subtitle: 'Yoklama işlemleri',
          icon: Icons.how_to_reg,
          route: '/attendances',
        ),
        AppDrawerItem(
          title: 'Ödev Yönetimi',
          subtitle: 'Ödev işlemleri',
          icon: Icons.assignment,
          route: '/homework',
        ),
        AppDrawerItem(
          title: 'Ölçme Değerlendirme',
          subtitle: 'Sınav analizleri',
          icon: Icons.bar_chart,
          children: [AppDrawerItem(title: 'Sınavlar', route: '/exams')],
        ),
        AppDrawerItem(
          title: 'Görüşmelerim',
          subtitle: 'Bireysel görüşmeler',
          icon: Icons.record_voice_over,
          route: '/my-conversations',
        ),
        AppDrawerItem(
          title: 'Rehberlik Servisi',
          subtitle: 'PDR işlemleri',
          icon: Icons.psychology,
          route: '/conversations',
        ),
        AppDrawerItem(
          title: 'Nöbet Çizelgesi',
          subtitle: 'Nöbet işlemleri',
          icon: Icons.schedule,
          route: '/duty-schedules',
        ),
      ],
    ),
    AppDrawerSection(
      title: 'İçerik',
      items: [
        AppDrawerItem(
          title: 'Duyurular',
          subtitle: 'Yeni duyurular',
          icon: Icons.campaign,
          route: '/announcements',
        ),
        AppDrawerItem(
          title: 'Etkinlikler',
          subtitle: 'Etkinlik takvimi',
          icon: Icons.event,
          route: '/activities',
        ),
        AppDrawerItem(
          title: 'Bültenler',
          subtitle: 'Bülten yönetimi',
          icon: Icons.article,
          route: '/bulletins',
        ),
        AppDrawerItem(
          title: 'Takvim',
          subtitle: 'Etkinlik takvimi',
          icon: Icons.calendar_month,
          route: '/calendar-events',
        ),
        AppDrawerItem(
          title: 'Dahili Mesajlar',
          subtitle: 'Kurum içi mesajlaşma',
          icon: Icons.mail,
          route: '/internal-messages',
        ),
      ],
    ),
    AppDrawerSection(
      title: 'İletişim',
      items: [
        AppDrawerItem(
          title: 'Sohbet',
          subtitle: 'Mesajlaşma',
          icon: Icons.chat,
          route: '/messages',
        ),
        AppDrawerItem(
          title: 'Bildirimler',
          subtitle: 'Bildirim merkezi',
          icon: Icons.notifications,
          route: '/announcements',
        ),
      ],
    ),
    AppDrawerSection(
      title: 'Kurumsal',
      items: [
        AppDrawerItem(
          title: 'Kampüsler',
          subtitle: 'Kampüs yönetimi',
          icon: Icons.location_on,
          route: '/campuses',
        ),
        AppDrawerItem(
          title: 'Eğitim Yılları',
          subtitle: 'Akademik yıl yönetimi',
          icon: Icons.calendar_today,
          route: '/academic-years',
        ),
        AppDrawerItem(
          title: 'Eğitim Seviyeleri',
          subtitle: 'Eğitim kademeleri',
          icon: Icons.school,
          route: '/education-levels',
        ),
        AppDrawerItem(
          title: 'SMS Merkezi',
          subtitle: 'SMS işlemleri',
          icon: Icons.sms,
          route: '/sms/history',
          children: [
            AppDrawerItem(title: 'SMS Geçmişi', route: '/sms/history'),
            AppDrawerItem(title: 'Toplu SMS Gönder', route: '/sms/bulk-send'),
            AppDrawerItem(title: 'SMS Şablonları', route: '/sms/templates'),
            AppDrawerItem(title: 'API Ayarları', route: '/sms/api-settings'),
          ],
        ),
        AppDrawerItem(
          title: 'Anket ve Formlar',
          subtitle: 'Anket işlemleri',
          icon: Icons.quiz,
        ),
      ],
    ),
  ];
}
