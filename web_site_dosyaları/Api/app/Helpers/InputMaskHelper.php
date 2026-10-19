<?php

namespace App\Helpers;

class InputMaskHelper
{
    /**
     * TC Kimlik No mask formatı.
     *
     * @return string
     */
    public static function tcKimlikNo(): string
    {
        return '99999999999';
    }

    /**
     * Telefon numarası mask formatı (05XX XXX XX XX).
     *
     * @return string
     */
    public static function phone(): string
    {
        return '0999 999 99 99';
    }

    /**
     * Telefon numarası mask formatı (alternatif - 05XXXXXXXXX).
     *
     * @return string
     */
    public static function phoneSimple(): string
    {
        return '09999999999';
    }

    /**
     * Tarih mask formatı (DD.MM.YYYY).
     *
     * @return string
     */
    public static function date(): string
    {
        return '99.99.9999';
    }

    /**
     * Saat mask formatı (HH:MM).
     *
     * @return string
     */
    public static function time(): string
    {
        return '99:99';
    }

    /**
     * Okul numarası mask formatı.
     *
     * @return string
     */
    public static function schoolNo(): string
    {
        return '999999';
    }

    /**
     * Format telefon numarası (05XX XXX XX XX).
     *
     * @param  string  $phone
     * @return string
     */
    public static function formatPhone(string $phone): string
    {
        // Sadece rakamları al
        $phone = preg_replace('/\D/', '', $phone);

        // 11 haneli kontrol
        if (strlen($phone) !== 11) {
            return $phone;
        }

        // Format: 05XX XXX XX XX
        return substr($phone, 0, 4) . ' ' . substr($phone, 4, 3) . ' ' . substr($phone, 7, 2) . ' ' . substr($phone, 9, 2);
    }

    /**
     * Format TC Kimlik No (XXX XXX XXX XX).
     *
     * @param  string  $tcNo
     * @return string
     */
    public static function formatTcKimlikNo(string $tcNo): string
    {
        // Sadece rakamları al
        $tcNo = preg_replace('/\D/', '', $tcNo);

        // 11 haneli kontrol
        if (strlen($tcNo) !== 11) {
            return $tcNo;
        }

        // Format: XXX XXX XXX XX
        return substr($tcNo, 0, 3) . ' ' . substr($tcNo, 3, 3) . ' ' . substr($tcNo, 6, 3) . ' ' . substr($tcNo, 9, 2);
    }

    /**
     * Format tarih (DD.MM.YYYY).
     *
     * @param  string  $date
     * @return string
     */
    public static function formatDate(string $date): string
    {
        try {
            $dateObj = \Carbon\Carbon::parse($date);
            return $dateObj->format('d.m.Y');
        } catch (\Exception $e) {
            return $date;
        }
    }
}
