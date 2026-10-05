<?php
/**
 * STUDENT HUB - CONTACT FORM PROCESSOR (process_contact.php)
 * Validates, sanitizes, and persists contact messages to DATA/contacts.json
 */

require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_response(false, 'Invalid request method. Please submit the form via POST.', [], ['Method Not Allowed'], '../PAGES/CONTACT.HTML');
}

// 1. Sanitize Inputs
$name = sanitize_text($_POST['name'] ?? '');
$email = sanitize_email($_POST['email'] ?? '');
$subject = sanitize_text($_POST['subject'] ?? 'General Inquiry');
$message = sanitize_text($_POST['message'] ?? '', true);

// 2. Validate Inputs
$errors = [];

if (empty($name)) {
    $errors['name'] = 'Full Name is required.';
} elseif (strlen($name) < 2 || strlen($name) > 100) {
    $errors['name'] = 'Full Name must be between 2 and 100 characters.';
} elseif (!preg_match("/^[A-Za-z\s'.-]+$/", $name)) {
    $errors['name'] = 'Full Name can only contain letters, spaces, and hyphens.';
}

if (empty($email)) {
    $errors['email'] = 'Email address is required.';
} elseif (!is_valid_email($email)) {
    $errors['email'] = 'Please provide a valid email address (e.g. user@example.com).';
}

if (empty($message)) {
    $errors['message'] = 'Message content cannot be empty.';
} elseif (strlen($message) < 5) {
    $errors['message'] = 'Message is too short. Please provide at least 5 characters.';
} elseif (strlen($message) > 2000) {
    $errors['message'] = 'Message is too long. Maximum limit is 2000 characters.';
}

if (!empty($errors)) {
    send_response(false, 'Validation failed. Please correct the errors and try again.', [], $errors, '../PAGES/CONTACT.HTML');
}

// 3. Load existing contacts and store new record
$jsonFile = DATA_DIR . DIRECTORY_SEPARATOR . 'contacts.json';
$data = load_json_file($jsonFile, ['dataset' => 'Contact Inquiries']);

$seq = count($data['records']) + 1;
$contactId = sprintf('CNT-%s-%03d', date('Y'), $seq);

$newRecord = [
    'contactId' => $contactId,
    'name' => $name,
    'email' => $email,
    'subject' => $subject,
    'message' => $message,
    'submittedAt' => date('Y-m-d H:i:s'),
    'ipAddress' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
];

// Append to records
$data['records'][] = $newRecord;

if (!save_json_file($jsonFile, $data)) {
    send_response(false, 'System Error: Unable to save contact inquiry to JSON database.', [], ['File write failure'], '../PAGES/CONTACT.HTML');
}

send_response(
    true,
    "Thank you, {$name}! Your message has been received (Ref: {$contactId}). We will contact you at {$email}.",
    $newRecord,
    [],
    '../PAGES/CONTACT.HTML'
);
