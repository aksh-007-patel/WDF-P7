<?php
/**
 * STUDENT HUB - REGISTRATION FORM PROCESSOR (process_register.php)
 * Validates, sanitizes, and persists registration & student data to JSON
 */

require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_response(false, 'Invalid request method. Please submit the form via POST.', [], ['Method Not Allowed'], '../PAGES/REGISTER.HTML');
}

// 1. Sanitize Inputs
$name = sanitize_text($_POST['name'] ?? '');
$email = sanitize_email($_POST['email'] ?? '');
$mobile = sanitize_text($_POST['mobile'] ?? '');
$password = (string)($_POST['password'] ?? '');
$confirmPassword = (string)($_POST['confirmPassword'] ?? '');
$course = sanitize_text($_POST['course'] ?? '');
$year = sanitize_text($_POST['year'] ?? '');
$gender = sanitize_text($_POST['gender'] ?? '');
$terms = isset($_POST['terms']) && ($_POST['terms'] === 'on' || $_POST['terms'] === '1' || $_POST['terms'] === true);

// 2. Validate Inputs
$errors = [];

// Name: min 2 words, letters only
if (empty($name)) {
    $errors['name'] = 'Full Name is required.';
} elseif (strlen($name) < 2 || strlen($name) > 50) {
    $errors['name'] = 'Name must be between 2 and 50 characters.';
} elseif (!preg_match("/^[A-Za-z][A-Za-z\s'.-]{1,49}$/", $name)) {
    $errors['name'] = 'Name can only contain letters, spaces, and punctuation (.-).';
}

// Email
if (empty($email)) {
    $errors['email'] = 'Email address is required.';
} elseif (!is_valid_email($email)) {
    $errors['email'] = 'Enter a valid email address (e.g., student@charusat.edu.in).';
}

// Mobile (10-digit Indian starting 6-9)
if (empty($mobile)) {
    $errors['mobile'] = 'Mobile number is required.';
} elseif (!is_valid_phone($mobile)) {
    $errors['mobile'] = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
}

// Password validation
if (empty($password)) {
    $errors['password'] = 'Password is required.';
} elseif (strlen($password) < 8 || strlen($password) > 30) {
    $errors['password'] = 'Password must be between 8 and 30 characters.';
} elseif (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_#\-+.^=])/', $password)) {
    $errors['password'] = 'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.';
}

// Confirm Password
if (empty($confirmPassword)) {
    $errors['confirmPassword'] = 'Please confirm your password.';
} elseif ($password !== $confirmPassword) {
    $errors['confirmPassword'] = 'Passwords do not match.';
}

// Course validation
$allowedCourses = ['BCA', 'BBA', 'BTech', 'MCA', 'Computer Engineering', 'Information Technology', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering'];
if (empty($course)) {
    $errors['course'] = 'Please select a course.';
} elseif (!in_array($course, $allowedCourses, true)) {
    $errors['course'] = 'Invalid course selection.';
}

// Year validation
$allowedYears = ['1', '2', '3', '4'];
if (empty($year)) {
    $errors['year'] = 'Please select your academic year.';
} elseif (!in_array($year, $allowedYears, true)) {
    $errors['year'] = 'Invalid academic year.';
}

// Gender validation
$allowedGenders = ['Male', 'Female', 'Other'];
if (empty($gender)) {
    $errors['gender'] = 'Please select your gender.';
} elseif (!in_array($gender, $allowedGenders, true)) {
    $errors['gender'] = 'Invalid gender value.';
}

// Terms validation
if (!$terms) {
    $errors['terms'] = 'You must accept the terms and conditions to proceed.';
}

if (!empty($errors)) {
    send_response(false, 'Validation failed. Please review the errors below.', [], $errors, '../PAGES/REGISTER.HTML');
}

// 3. Load registrations and check duplicates
$regFile = DATA_DIR . DIRECTORY_SEPARATOR . 'registrations.json';
$regData = load_json_file($regFile, ['dataset' => 'Student Registrations']);

foreach ($regData['records'] as $existing) {
    if (strcasecmp($existing['email'] ?? '', $email) === 0) {
        $errors['email'] = 'A student account with this email address already exists.';
        send_response(false, 'Email already registered.', [], $errors, '../PAGES/REGISTER.HTML');
    }
}

// 4. Generate Student & Registration Identifiers
$regSeq = count($regData['records']) + 1;
$regId = sprintf('REG-%s-%03d', date('Y'), $regSeq);

// Map course to Student ID prefix
$prefixMap = [
    'BCA' => '26BCA',
    'BBA' => '26BBA',
    'BTech' => '26DCE',
    'MCA' => '26MCA',
    'Computer Engineering' => '26DCE',
    'Information Technology' => '26DIT',
    'Mechanical Engineering' => '26DME',
    'Electrical Engineering' => '26DEE',
    'Civil Engineering' => '26DCL'
];
$codePrefix = $prefixMap[$course] ?? '26STU';
$studentId = sprintf('%s%03d', $codePrefix, $regSeq + 100);

// Hash password for secure storage
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$regRecord = [
    'registrationId' => $regId,
    'studentId' => $studentId,
    'name' => $name,
    'email' => $email,
    'mobile' => $mobile,
    'course' => $course,
    'year' => $year,
    'gender' => $gender,
    'passwordHash' => $passwordHash,
    'registeredAt' => date('Y-m-d H:i:s'),
    'ipAddress' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
];

$regData['records'][] = $regRecord;
save_json_file($regFile, $regData);

// 5. Also insert into students.json dataset
$stuFile = DATA_DIR . DIRECTORY_SEPARATOR . 'students.json';
$stuData = load_json_file($stuFile, ['dataset' => 'Student Profiles']);

$courseToMajor = [
    'BCA' => 'Computer Applications',
    'BBA' => 'Business Administration',
    'BTech' => 'Computer Engineering',
    'MCA' => 'Computer Applications',
    'Computer Engineering' => 'Computer Engineering',
    'Information Technology' => 'Information Technology',
    'Mechanical Engineering' => 'Mechanical Engineering',
    'Electrical Engineering' => 'Electrical Engineering',
    'Civil Engineering' => 'Civil Engineering'
];
$major = $courseToMajor[$course] ?? $course;
$gradYear = (int)date('Y') + (5 - (int)$year);

$newStudentRecord = [
    'studentId' => $studentId,
    'fullName' => $name,
    'major' => $major,
    'graduationYear' => $gradYear,
    'gpa' => 8.50,
    'extracurricularActivities' => ['Newly Registered Member', 'Student Hub Portal'],
    'contact' => [
        'email' => $email,
        'phone' => $mobile,
        'address' => 'CHARUSAT Campus, Changa, Gujarat'
    ]
];

$stuData['records'][] = $newStudentRecord;
save_json_file($stuFile, $stuData);

// Send response (do not expose password hash in output preview)
$safeOutput = $regRecord;
unset($safeOutput['passwordHash']);
$safeOutput['assignedStudentId'] = $studentId;

send_response(
    true,
    "Registration Successful! Welcome to Student Hub, {$name}. Your generated Student ID is {$studentId}.",
    $safeOutput,
    [],
    '../PAGES/DASHBOARD.HTML'
);
