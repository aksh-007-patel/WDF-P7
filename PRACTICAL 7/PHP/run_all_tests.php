<?php
/**
 * Run comprehensive tests for all 4 PHP processors and check JSON files
 */

function execute_test($name, $file, $post) {
    echo "\n------------------------------------------------------------\n";
    echo "TEST: $name ($file)\n";
    echo "------------------------------------------------------------\n";

    $descriptor = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w']
    ];

    $cmd = 'php -d display_errors=1';
    // Use xampp php if available
    if (file_exists('C:\\xampp\\php\\php.exe')) {
        $cmd = '"C:\\xampp\\php\\php.exe" -d display_errors=1';
    }

    $env = array_merge($_ENV, [
        'REQUEST_METHOD' => 'POST',
        'HTTP_ACCEPT' => 'application/json',
        'CONTENT_TYPE' => 'application/x-www-form-urlencoded'
    ]);

    // Build wrapper script to run in separate process
    $wrapperCode = '<?php
$_SERVER["REQUEST_METHOD"] = "POST";
$_SERVER["HTTP_ACCEPT"] = "application/json";
$_SERVER["REMOTE_ADDR"] = "127.0.0.1";
$_POST = ' . var_export($post, true) . ';
require ' . var_export(__DIR__ . '/' . $file, true) . ';
';

    $proc = proc_open($cmd, $descriptor, $pipes, __DIR__, $env);
    if (is_resource($proc)) {
        fwrite($pipes[0], $wrapperCode);
        fclose($pipes[0]);

        $stdout = stream_get_contents($pipes[1]);
        fclose($pipes[1]);

        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        $status = proc_close($proc);

        echo "Output:\n" . trim($stdout) . "\n";
        if (!empty($stderr)) {
            echo "STDERR:\n" . trim($stderr) . "\n";
        }
    }
}

// 1. Valid Contact
execute_test("1. Contact Submission", "process_contact.php", [
    'name' => 'Dr. Ritesh Patel',
    'email' => 'ritesh.patel@charusat.ac.in',
    'subject' => 'Guest Lecture on Cloud Computing',
    'message' => 'I would like to schedule a 2-hour guest lecture session on AWS & Microservices for final year students.'
]);

// 2. Invalid Contact (Validation Error Check)
execute_test("2. Contact Submission - Invalid Email Check", "process_contact.php", [
    'name' => 'A',
    'email' => 'invalid-email-format',
    'subject' => '',
    'message' => 'Hi'
]);

// 3. Valid Registration
execute_test("3. Student Registration", "process_register.php", [
    'name' => 'Aksh Virja',
    'email' => 'aksh.virja2026@charusat.edu.in',
    'mobile' => '9274338033',
    'password' => 'Charusat@2026',
    'confirmPassword' => 'Charusat@2026',
    'course' => 'Computer Engineering',
    'year' => '2',
    'gender' => 'Male',
    'terms' => 'on'
]);

// 4. Invalid Registration (Password mismatch & missing terms)
execute_test("4. Student Registration - Validation Error Check", "process_register.php", [
    'name' => 'Test User',
    'email' => 'test@charusat.edu.in',
    'mobile' => '12345',
    'password' => 'Weak1',
    'confirmPassword' => 'Mismatch2',
    'course' => 'BCA',
    'year' => '1'
]);

// 5. Valid Event
execute_test("5. Add Campus Event", "process_event.php", [
    'title' => 'National AI & Robotics Symposium 2026',
    'description' => 'Two-day national symposium showcasing autonomous robotics, drones, and computer vision projects.',
    'date' => '2026-11-20',
    'time' => '10:00',
    'location' => 'University Auditorium, CHARUSAT Changa',
    'category' => 'Seminar',
    'organizer' => 'IEEE Student Branch & CSPIT',
    'attendanceCapacity' => '400',
    'registeredCount' => '120'
]);

// 6. Valid Student Profile
execute_test("6. Add Student Profile", "process_student.php", [
    'fullName' => 'Ananya Joshi',
    'major' => 'Information Technology',
    'graduationYear' => '2028',
    'gpa' => '9.65',
    'extracurricularActivities' => 'President of Web Development Club, Hackathon Winner 2025, IEEE Volunteer',
    'email' => 'ananya.joshi@charusat.edu.in',
    'phone' => '9123456789',
    'address' => 'Surat, Gujarat'
]);

// 7. API Statistics
execute_test("7. Unified API Get Stats", "api.php", [
    'action' => 'get_stats'
]);
