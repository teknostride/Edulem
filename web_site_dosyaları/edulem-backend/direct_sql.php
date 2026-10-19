<?php
// Direct SQL test
$mysqli = new mysqli("localhost", "root", "", "premium_edu");

// Dıkkat: withoutTenantScope() ne göre?
$sql = "SELECT * FROM education_levels ORDER BY sort_order";
$result = $mysqli->query($sql);

echo "Direct SQL Query Result:\n";
if ($result && $result->num_rows > 0) {
    echo "Total rows: " . $result->num_rows . "\n";
    while ($row = $result->fetch_assoc()) {
        echo "- {$row['name']}\n";
    }
} else {
    echo "No rows\n";
}

$mysqli->close();
?>
