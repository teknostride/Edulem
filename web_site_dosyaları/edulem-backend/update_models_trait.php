<?php
$models = [
    'Attendance',
    'CounselingSession',
    'CounselingStudent',
    'DutySchedule',
    'Exam',
    'FormSurvey',
    'Grade',
    'Lesson',
    'MealMenu',
    'MeasurementTrial',
    'Message',
    'OnlineSurvey',
    'Schedule',
];

$basePath = 'c:/xampp/htdocs/edulem-backend/app/Models/';

foreach ($models as $modelName) {
    $filePath = $basePath . $modelName . '.php';
    if (!file_exists($filePath)) {
        echo "File $filePath not found.\n";
        continue;
    }
    
    $content = file_get_contents($filePath);
    
    // Check if already has trade
    if (strpos($content, 'BelongsToSeason') !== false) {
        echo "Model $modelName already has BelongsToSeason trait.\n";
        continue;
    }
    
    // Add use statement and trait
    $content = str_replace(
        "namespace App\Models;",
        "namespace App\Models;\n\nuse App\Traits\BelongsToSeason;",
        $content
    );
    
    // Find the class definition and add the trait after 'use' keyword
    // Pattern to find `use ...;` and inject BelongsToSeason
    if (preg_match('/use\s+([^;]+);/i', $content, $matches, PREG_OFFSET_CAPTURE)) {
        $lastUsePos = strrpos($content, 'use ');
        $endOfLastUse = strpos($content, ';', $lastUsePos);
        
        // Actually it's easier to find the `use trait1, trait2;` inside the class
        if (preg_match('/{\s+use\s+([^;]+);/i', $content, $matches)) {
            $existingTraits = $matches[1];
            $content = str_replace("use $existingTraits;", "use $existingTraits, BelongsToSeason;", $content);
        } else {
            // No traits used? find the class start
            $content = preg_replace('/(class\s+\w+[^{]*{)/i', "$1\n    use BelongsToSeason;\n", $content);
        }
    }
    
    // Also add to fillable if not there
    if (strpos($content, "'season_id'") === false) {
        $content = preg_replace("/('academic_year_id',?)/i", "$1\n        'season_id',", $content);
    }
    
    file_put_contents($filePath, $content);
    echo "Updated $modelName.\n";
}
echo "Done.\n";
