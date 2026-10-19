<?php
/**
 * Installation Check
 * 
 * This file checks if the system is already installed.
 * If installed, redirects to home page.
 * If not installed, redirects to installation page.
 */

// Check if system is already installed
$installedFile = __DIR__ . '/../storage/.installed';

if (file_exists($installedFile)) {
    // System is installed, redirect to home
    header('Location: /');
    exit;
}

// System is not installed, redirect to installation page
header('Location: /install');
exit;
