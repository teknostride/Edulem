<?php

echo "Testing HTTP Request...\n";

// Test with file_get_contents
$url = "http://127.0.0.1:8000/api/v1/auth/login";
$data = json_encode(['email' => 'test@test.com', 'password' => 'password']);

$options = [
    'http' => [
        'header'  => "Content-Type: application/json\r\n",
        'method'  => 'POST',
        'content' => $data,
    ],
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);

if ($result === false) {
    echo "HTTP Request failed\n";
} else {
    echo "Response: " . $result . "\n";
}

?>
