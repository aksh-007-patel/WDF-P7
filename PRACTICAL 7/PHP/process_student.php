<?php
/**
 * STUDENT HUB - STUDENT PROFILE PROCESSOR (process_student.php)
 * Validates, sanitizes, and stores student profile data in DATA/students.json
 */

require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_response(false, 'Invalid request method. Please submit the form via POST.', [], ['Method Not Allowed'], '../PAGES/PROFILE.HTML');
}

// 1. Sanitize Inputs
$studentId = strtoupper(sanitize_text($_POST['studentId'] ?? ''));
$fullName = sanitize_text($_POST['fullName'] ?? $_POST['name'] ?? '');
$major = sanitize_text($_POST['major'] ?? '');
$gradYear = sanitize_int($_POST['graduationYear'] ?? date('Y') + 2, date('Y') + 2);
$gpa = sanitize_float($_POST['gpa'] ?? 8.0, 8.0);
$activitiesRaw = sanitize_text($_POST['extracurricularActivities'] ?? $_POST['activities'] ?? '');
$email = sanitize_email($_POST['email'] ?? '');
$phone = sanitize_text($_POST['phone'] ?? $_POST['mobile'] ?? '');
$address = sanitize_text($_POST['address'] ?? '');

// 2. Validate Inputs
$errors = [];

if (empty($fullName)) {
    $errors['fullName'] = 'Student full name is required.';
} elseif (strlen($fullName) < 2 || strlen($fullName) > 100) {
    $errors['fullName'] = 'Full name must be between 2 and 100 characters.';
} elseif (!preg_match("/^[A-Za-z\s'.-]+$/", $fullName)) {
    $errors['fullName'] = 'Full name can only contain letters, spaces, and hyphens.';
}

$allowedMajors = [
    'Computer Engineering',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Electronics & Communication',
    'Biomedical Engineering',
    'Information Technology',
    'Chemical Engineering',
    'Civil Engineering',
    'Computer Applications'
];
if (empty($major)) {
    $errors['major'] = 'Please select a major department.';
} elseif (!in_array($major, $allowedMajors, true)) {
    $errors['major'] = 'Invalid engineering/academic major selected.';
}

if ($gradYear < 2020 || $gradYear > 2035) {
    $errors['graduationYear'] = 'Graduation year must be between 2020 and 2035.';
}

if ($gpa < 0.0 || $gpa > 10.0) {
    $errors['gpa'] = 'GPA must be on a 10.0 scale (0.00 to 10.00).';
}

if (empty($email)) {
    $errors['email'] = 'Student email address is required.';
} elseif (!is_valid_email($email)) {
    $errors['email'] = 'Invalid email address.';
}

if (empty($phone)) {
    $errors['phone'] = 'Mobile contact number is required.';
} elseif (!is_valid_phone($phone)) {
    $errors['phone'] = 'Provide a valid 10-digit mobile number starting with 6-9.';
}

if (empty($address)) {
    $errors['address'] = 'City/Address is required.';
} elseif (strlen($address) < 2 || strlen($address) > 150) {
    $errors['address'] = 'Address must be between 2 and 150 characters.';
}

if (!empty($errors)) {
    send_response(false, 'Validation failed for student profile.', [], $errors, '../PAGES/PROFILE.HTML');
}

// 3. Load students.json
$stuFile = DATA_DIR . DIRECTORY_SEPARATOR . 'students.json';
$data = load_json_file($stuFile, ['dataset' => 'Student Profiles']);

// Generate or validate student ID
if (empty($studentId)) {
    $deptCodeMap = [
        'Computer Engineering' => 'DCE',
        'Mechanical Engineering' => 'DME',
        'Electrical Engineering' => 'DEE',
        'Electronics & Communication' => 'DEC',
        'Biomedical Engineering' => 'DBE',
        'Information Technology' => 'DIT',
        'Chemical Engineering' => 'DCH',
        'Civil Engineering' => 'DCL',
        'Computer Applications' => 'BCA'
    ];
    $code = $deptCodeMap[$major] ?? 'STU';
    $studentId = sprintf('26%s%03d', $code, count($data['records']) + 101);
} else {
    // Check duplicate studentId
    foreach ($data['records'] as $stu) {
        if (strcasecmp($stu['studentId'] ?? '', $studentId) === 0) {
            $errors['studentId'] = "A student with ID '{$studentId}' already exists.";
            send_response(false, 'Duplicate Student ID.', [], $errors, '../PAGES/PROFILE.HTML');
        }
    }
}

// Parse activities list
$activities = [];
if (!empty($activitiesRaw)) {
    $items = explode(',', $activitiesRaw);
    foreach ($items as $item) {
        $t = trim($item);
        if (!empty($t)) {
            $activities[] = $t;
        }
    }
}
if (empty($activities)) {
    $activities = ['Academic Club Member'];
}

$newStudent = [
    'studentId' => $studentId,
    'fullName' => $fullName,
    'major' => $major,
    'graduationYear' => $gradYear,
    'gpa' => round($gpa, 2),
    'extracurricularActivities' => $activities,
    'contact' => [
        'email' => $email,
        'phone' => $phone,
        'address' => $address
    ]
];

// Prepend to student records list
array_unshift($data['records'], $newStudent);

if (!save_json_file($stuFile, $data)) {
    send_response(false, 'System Error: Unable to save student profile to students.json.', [], ['File write failure'], '../PAGES/PROFILE.HTML');
}

send_response(
    true,
    "Student Profile for '{$fullName}' (ID: {$studentId}) created and saved to Student Directory.",
    $newStudent,
    [],
    '../PAGES/PROFILE.HTML'
);
