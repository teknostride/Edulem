<?php
// QuizLem - Alt Klasör Karşılama Yönlendiricisi
// Eğer kullanıcı edulem.com/quizlem/ adresine girerse otomatik olarak public/index.html açılır.
if (file_exists(__DIR__ . '/public/index.html')) {
    include __DIR__ . '/public/index.html';
    exit;
} else {
    header('Location: public/');
    exit;
}
