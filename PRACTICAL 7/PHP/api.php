<?php
/**
 * STUDENT HUB - UNIFIED DATA & FORM API (api.php)
 * Handles AJAX requests for storing and retrieving Contact, Registration, Event, and Student data
 */

require_once __DIR__ . '/helpers.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'contact':
        require __DIR__ . '/process_contact.php';
        break;

    case 'register':
        require __DIR__ . '/process_register.php';
        break;

    case 'event':
        require __DIR__ . '/process_event.php';
        break;

    case 'student':
        require __DIR__ . '/process_student.php';
        break;

    case 'get_stats':
        $contacts = load_json_file(DATA_DIR . '/contacts.json');
        $registrations = load_json_file(DATA_DIR . '/registrations.json');
        $events = load_json_file(DATA_DIR . '/events.json');
        $students = load_json_file(DATA_DIR . '/students.json');

        echo json_encode([
            'success' => true,
            'stats' => [
                'totalStudents' => count($students['records'] ?? []),
                'totalEvents' => count($events['records'] ?? []),
                'totalRegistrations' => count($registrations['records'] ?? []),
                'totalContacts' => count($contacts['records'] ?? [])
            ]
        ]);
        exit;

    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid action parameter. Valid actions: contact, register, event, student, get_stats'
        ]);
        exit;
}
