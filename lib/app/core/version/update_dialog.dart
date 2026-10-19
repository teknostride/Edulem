import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../router.dart';
import 'app_version_service.dart';

class UpdateDialog extends StatelessWidget {
  final AppVersionCheckResult versionInfo;

  const UpdateDialog({
    super.key,
    required this.versionInfo,
  });

  static Future<void> show(
    BuildContext context,
    AppVersionCheckResult versionInfo,
  ) async {
    final ctx = AppRouter.navigatorKey.currentContext ?? context;
    if (!ctx.mounted) return;
    await showDialog<void>(
      context: ctx,
      barrierDismissible: !versionInfo.isForceUpdate,
      barrierColor: Colors.black54,
      builder: (dialogCtx) => UpdateDialog(versionInfo: versionInfo),
    );
  }

  Future<void> _openStore(BuildContext context) async {
    if (!kIsWeb && Platform.isAndroid) {
      final marketUri = Uri.parse(AppVersionService.playStoreMarketUri);
      try {
        if (await canLaunchUrl(marketUri)) {
          await launchUrl(marketUri, mode: LaunchMode.externalApplication);
          return;
        }
      } catch (_) {}
    }

    final webUri = Uri.parse(versionInfo.storeUrl);
    try {
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Mağaza açılamadı: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isForce = versionInfo.isForceUpdate;
    final primaryColor = Theme.of(context).primaryColor;

    return PopScope(
      canPop: !isForce,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        elevation: 16,
        backgroundColor: Colors.white,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Icon Header
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: isForce
                      ? const Color(0xFFEFF6FF)
                      : const Color(0xFFF0FDF4),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isForce
                        ? const Color(0xFF3B82F6).withValues(alpha: 0.2)
                        : const Color(0xFF22C55E).withValues(alpha: 0.2),
                    width: 2,
                  ),
                ),
                child: Icon(
                  isForce
                      ? Icons.system_update_rounded
                      : Icons.new_releases_outlined,
                  size: 38,
                  color: isForce
                      ? const Color(0xFF2563EB)
                      : const Color(0xFF16A34A),
                ),
              ),
              const SizedBox(height: 20),

              // Title
              Text(
                isForce
                    ? 'Uygulama Güncellemesi Gerekli'
                    : 'Yeni Güncelleme Mevcut',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 10),

              // Description
              Text(
                isForce
                    ? 'EduLem uygulamasını kesintisiz ve güvenli şekilde kullanmaya devam edebilmek için lütfen en son sürüme güncelleyin.'
                    : 'EduLem uygulamasının yeni özellikleri ve performans iyileştirmelerinden yararlanmak için hemen güncelleyebilirsiniz.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 18),

              // Version Badges
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Mevcut: v${versionInfo.currentVersion}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade700,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8),
                      child: Icon(Icons.arrow_forward_rounded,
                          size: 14, color: Colors.grey),
                    ),
                    Text(
                      'Yeni: v${isForce ? versionInfo.minRequiredVersion : versionInfo.latestVersion}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF2563EB),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Action Buttons
              if (isForce) ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () => _openStore(context),
                    icon: const Icon(Icons.download_rounded, size: 20),
                    label: const Text(
                      'Hemen Güncelle',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
              ] else ...[
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 46,
                        child: OutlinedButton(
                          onPressed: () => Navigator.of(context).pop(),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: Colors.grey.shade300),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            'Daha Sonra',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade700,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: SizedBox(
                        height: 46,
                        child: ElevatedButton(
                          onPressed: () => _openStore(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryColor,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'Güncelle',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
