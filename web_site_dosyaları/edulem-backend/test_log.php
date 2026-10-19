<?php
$log = file_get_contents('c:/xampp/htdocs/edulem-backend/storage/logs/laravel.log');
$parts = explode('[202', $log);
$last = '[202' . array_pop($parts);
echo $last;
