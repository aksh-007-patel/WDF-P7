<?php
/**
 * STUDENT HUB - CAMPUS EVENT PROCESSOR (process_event.php)
 * Validates, sanitizes, and stores campus event records in DATA/events.json
 */

require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_response(false, 'Invalid request method. Please submit the form via POST.', [], ['Method Not Allowed'], '../PAGES/EVENTS.HTML');
}

// 1. Sanitize Inputs
$title = sanitize_text($_POST['title'] ?? '');
$description = sanitize_text($_POST['description'] ?? '', true);
$date = sanitize_text($_POST['date'] ?? '');
$time = sanitize_text($_POST['time'] ?? '');
$location = sanitize_text($_POST['location'] ?? '');
$category = sanitize_text($_POST['category'] ?? '');
$organizer = sanitize_text($_POST['organizer'] ?? '');
$capacity = sanitize_int($_POST['attendanceCapacity'] ?? $_POST['capacity'] ?? 100, 100);
$registeredCount = sanitize_int($_POST['registeredCount'] ?? 0, 0);

// 2. Validate Inputs
$errors = [];

if (empty($title)) {
    $errors['title'] = 'Event title is required.';
} elseif (strlen($title) < 3 || strlen($title) > 120) {
    $errors['title'] = 'Event title must be between 3 and 120 characters.';
}

if (empty($description)) {
    $errors['description'] = 'Event description is required.';
} elseif (strlen($description) < 10 || strlen($description) > 1000) {
    $errors['description'] = 'Description must be between 10 and 1000 characters.';
}

if (empty($date)) {
    $errors['date'] = 'Event date is required.';
} elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    $errors['date'] = 'Invalid date format. Use YYYY-MM-DD.';
}

if (empty($time)) {
    $errors['time'] = 'Event time is required.';
} elseif (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $time)) {
    $errors['time'] = 'Invalid time format. Use HH:MM.';
}

if (empty($location)) {
    $errors['location'] = 'Event venue/location is required.';
} elseif (strlen($location) < 3 || strlen($location) > 120) {
    $errors['location'] = 'Location must be between 3 and 120 characters.';
}

$allowedCategories = ['Seminar', 'Hackathon', 'Competition', 'Festival', 'Workshop', 'Career', 'Networking', 'Health', 'Sports', 'Cultural', 'Academic'];
if (empty($category)) {
    $errors['category'] = 'Please select a category.';
} elseif (!in_array($category, $allowedCategories, true)) {
    $errors['category'] = 'Invalid event category selected.';
}

if (empty($organizer)) {
    $errors['organizer'] = 'Organizer department / club is required.';
} elseif (strlen($organizer) < 2 || strlen($organizer) > 100) {
    $errors['organizer'] = 'Organizer must be between 2 and 100 characters.';
}

if ($capacity < 5 || $capacity > 10000) {
    $errors['attendanceCapacity'] = 'Attendance capacity must be between 5 and 10,000.';
}

if ($registeredCount < 0) {
    $errors['registeredCount'] = 'Registered count cannot be negative.';
}

if (!empty($errors)) {
    send_response(false, 'Validation failed. Please correct event details and re-submit.', [], $errors, '../PAGES/EVENTS.HTML');
}

// 3. Load events.json and save record
$eventsFile = DATA_DIR . DIRECTORY_SEPARATOR . 'events.json';
$data = load_json_file($eventsFile, ['dataset' => 'Campus Events']);

$seq = count($data['records']) + 1;
$eventId = sprintf('EVT-%s-%03d', date('Y'), $seq);

$newEvent = [
    'eventId' => $eventId,
    'title' => $title,
    'description' => $description,
    'date' => $date,
    'time' => $time,
    'location' => $location,
    'category' => $category,
    'organizer' => $organizer,
    'attendanceCapacity' => $capacity,
    'registeredCount' => $registeredCount
];

// Prepend or append to records list
array_unshift($data['records'], $newEvent);

if (!save_json_file($eventsFile, $data)) {
    send_response(false, 'System Error: Unable to save event to events.json.', [], ['File write failure'], '../PAGES/EVENTS.HTML');
}

send_response(
    true,
    "Event '{$title}' has been successfully scheduled and added to Campus Schedule (Event ID: {$eventId}).",
    $newEvent,
    [],
    '../PAGES/EVENTS.HTML'
);
