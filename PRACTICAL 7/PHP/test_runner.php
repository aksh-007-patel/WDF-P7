<?php
/**
 * Test runner script to simulate POST submissions to all handlers
 */

function run_post_test($script, $postData) {
    echo "\n=== Testing $script ===\n";
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SERVER['HTTP_ACCEPT'] = 'application/json';
    $_POST = $postData;

    ob_start();
    include __DIR__ . '/' . $script;
    $output = ob_get_clean();
    echo "Response:\n" . $output . "\n";
}

// 1. Test Contact
run_post_test('process_contact.php', [
    'name' => 'Aksh Patel',
    'email' => 'aksh.patel@charusat.edu.in',
    'subject' => 'Lab Access Inquiry',
    'message' => 'Can students get weekend access to the AI / Robotics laboratory?'
]);

// 2. Test Registration
run_post_test('process_register.php', [
    'name' => 'Karan Dave',
    'email' => 'karan.dave@charusat.edu.in',
    'mobile' => '9825123456',
    'password' => 'Pass@1234',
    'confirmPassword' => 'Pass@1234',
    'course' => 'BTech',
    'year' => '2',
    'gender' => 'Male',
    'terms' => 'on'
]);

// 3. Test Event
run_post_test('process_event.php', [
    'title' => 'CHARUSAT AI Hackathon 2026',
    'description' => 'A premier 36-hour hackathon to build generative AI tools for social impact.',
    'date' => '2026-11-15',
    'time' => '09:00',
    'location' => 'DEPSTAR Seminar Complex',
    'category' => 'Hackathon',
    'organizer' => 'Department of Computer Science & Engineering',
    'attendanceCapacity' => '250',
    'registeredCount' => '45'
]);

// 4. Test Student
run_post_test('process_student.php', [
    'fullName' => 'Rohan Mehta',
    'major' => 'Computer Engineering',
    'graduationYear' => '2028',
    'gpa' => '9.15',
    'extracurricularActivities' => 'ACM President, Hackathon Finalist, Open Source Contributor',
    'email' => 'rohan.mehta@charusat.edu.in',
    'phone' => '9898012345',
    'address' => 'Vadodara, Gujarat'
]);
