<?php
/**
 * STUDENT HUB - PHP HELPERS & DATA ACCESS LAYER
 * Practical 6: Server-side validation, sanitization, and JSON persistence
 */

// Define directory constants
define('BASE_DIR', dirname(__DIR__));
define('DATA_DIR', BASE_DIR . DIRECTORY_SEPARATOR . 'DATA');

// Ensure DATA directory exists and is writable
if (!is_dir(DATA_DIR)) {
    @mkdir(DATA_DIR, 0777, true);
}

/**
 * Sanitize plain text input
 *
 * @param string $data
 * @param bool $allowNewlines
 * @return string
 */
function sanitize_text($data, $allowNewlines = false) {
    if ($data === null) return '';
    $data = trim((string)$data);
    // Strip malicious tags
    $data = strip_tags($data);
    if (!$allowNewlines) {
        $data = preg_replace('/[\r\n]+/', ' ', $data);
    }
    return htmlspecialchars($data, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/**
 * Sanitize and validate email
 *
 * @param string $email
 * @return string
 */
function sanitize_email($email) {
    $email = trim((string)$email);
    return filter_var($email, FILTER_SANITIZE_EMAIL);
}

/**
 * Validate email format
 *
 * @param string $email
 * @return bool
 */
function is_valid_email($email) {
    return (bool)filter_var($email, FILTER_VALIDATE_EMAIL);
}

/**
 * Validate Indian 10-digit mobile number
 *
 * @param string $phone
 * @return bool
 */
function is_valid_phone($phone) {
    $phone = trim((string)$phone);
    return (bool)preg_match('/^[6-9]\d{9}$/', $phone);
}

/**
 * Sanitize integer
 *
 * @param mixed $val
 * @param int $default
 * @return int
 */
function sanitize_int($val, $default = 0) {
    if (!isset($val) || $val === '') return $default;
    return intval(filter_var($val, FILTER_SANITIZE_NUMBER_INT));
}

/**
 * Sanitize float
 *
 * @param mixed $val
 * @param float $default
 * @return float
 */
function sanitize_float($val, $default = 0.0) {
    if (!isset($val) || $val === '') return $default;
    return floatval(filter_var($val, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION));
}

/**
 * Read JSON file safely with metadata structure
 *
 * @param string $filePath Full path to JSON file
 * @param array $defaultMetadata Metadata if creating file
 * @return array
 */
function load_json_file($filePath, $defaultMetadata = []) {
    if (!file_exists($filePath)) {
        return [
            'metadata' => array_merge([
                'dataset' => 'Student Hub Dataset',
                'version' => '1.0.0',
                'lastUpdated' => date('Y-m-d H:i:s'),
                'totalRecords' => 0
            ], $defaultMetadata),
            'records' => []
        ];
    }

    $raw = @file_get_contents($filePath);
    if ($raw === false || empty(trim($raw))) {
        return [
            'metadata' => array_merge([
                'dataset' => 'Student Hub Dataset',
                'version' => '1.0.0',
                'lastUpdated' => date('Y-m-d H:i:s'),
                'totalRecords' => 0
            ], $defaultMetadata),
            'records' => []
        ];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [
            'metadata' => [
                'dataset' => 'Student Hub Dataset',
                'version' => '1.0.0',
                'lastUpdated' => date('Y-m-d H:i:s'),
                'totalRecords' => 0
            ],
            'records' => []
        ];
    }

    if (!isset($decoded['records']) || !is_array($decoded['records'])) {
        $decoded['records'] = [];
    }
    if (!isset($decoded['metadata']) || !is_array($decoded['metadata'])) {
        $decoded['metadata'] = [
            'dataset' => 'Student Hub Dataset',
            'version' => '1.0.0',
            'lastUpdated' => date('Y-m-d H:i:s'),
            'totalRecords' => count($decoded['records'])
        ];
    }

    return $decoded;
}

/**
 * Save array to JSON file with lock and formatting
 *
 * @param string $filePath
 * @param array $data
 * @return bool
 */
function save_json_file($filePath, array $data) {
    // Update metadata
    if (!isset($data['metadata'])) {
        $data['metadata'] = [];
    }
    $data['metadata']['lastUpdated'] = date('Y-m-d H:i:s');
    $data['metadata']['totalRecords'] = count($data['records'] ?? []);

    $jsonStr = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($jsonStr === false) {
        return false;
    }

    $result = @file_put_contents($filePath, $jsonStr, LOCK_EX);
    return $result !== false;
}

/**
 * Check if the current request expects a JSON response
 *
 * @return bool
 */
function is_json_request() {
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    return (
        stripos($accept, 'application/json') !== false ||
        strtolower($requestedWith) === 'xmlhttprequest' ||
        stripos($contentType, 'application/json') !== false ||
        isset($_GET['ajax']) ||
        isset($_POST['ajax'])
    );
}

/**
 * Send JSON or HTML response based on client
 *
 * @param bool $success
 * @param string $message
 * @param array $data
 * @param array $errors
 * @param string|null $backUrl
 */
function send_response($success, $message, $data = [], $errors = [], $backUrl = null) {
    if (is_json_request()) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=UTF-8');
            http_response_code($success ? 200 : 422);
        }
        echo json_encode([
            'success' => $success,
            'message' => $message,
            'data' => $data,
            'errors' => $errors,
            'timestamp' => date('c')
        ]);
        exit;
    }

    // Render HTML response page with Student Hub design
    render_html_response_page($success, $message, $data, $errors, $backUrl);
    exit;
}

/**
 * Render a styled HTML feedback page matching the Student Hub UI
 */
function render_html_response_page($success, $message, $data, $errors, $backUrl) {
    $title = $success ? "Submission Successful - Student Hub" : "Validation Error - Student Hub";
    $statusColor = $success ? "#16a34a" : "#dc2626";
    $icon = $success ? "✅" : "⚠️";
    $backLink = $backUrl ?: "../home.html";
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title><?php echo htmlspecialchars($title); ?></title>
      <link rel="stylesheet" href="../CSS/style.css">
      <style>
        .result-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 30px;
          margin: 30px auto;
          max-width: 650px;
          box-shadow: var(--shadow-md);
        }
        .result-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1.5px solid var(--border);
        }
        .result-icon {
          font-size: 2.4rem;
        }
        .result-title {
          font-size: 1.4rem;
          color: <?php echo $statusColor; ?>;
          margin: 0;
        }
        .result-msg {
          font-size: 1.05rem;
          margin-bottom: 20px;
          color: var(--text-main);
          line-height: 1.6;
        }
        .error-list {
          background: rgba(220, 38, 38, 0.08);
          border-left: 4px solid #dc2626;
          border-radius: var(--radius-sm);
          padding: 15px 20px;
          margin-bottom: 20px;
          list-style: disc inside;
          color: #dc2626;
          font-weight: 500;
        }
        .data-preview {
          background: var(--surface-alt);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 15px;
          margin-bottom: 20px;
          font-family: monospace;
          font-size: 0.9rem;
          overflow-x: auto;
          white-space: pre-wrap;
          color: var(--text-main);
        }
        .btn-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header-top-row">
          <span class="badge"><?php echo $success ? "Success" : "Error Notification"; ?></span>
          <button type="button" class="theme-toggle-btn" aria-label="Toggle dark/light theme">
            <span class="theme-icon">🌙</span>
            <span class="theme-text">Dark mode</span>
          </button>
        </div>

        <div class="result-card">
          <div class="result-header">
            <span class="result-icon"><?php echo $icon; ?></span>
            <div>
              <h2 class="result-title"><?php echo $success ? "Success!" : "Submission Failed"; ?></h2>
              <span style="font-size:0.85rem; color: var(--text-muted);"><?php echo date('F j, Y, g:i a'); ?></span>
            </div>
          </div>

          <p class="result-msg"><?php echo htmlspecialchars($message); ?></p>

          <?php if (!empty($errors)): ?>
            <ul class="error-list">
              <?php foreach ($errors as $err): ?>
                <li><?php echo htmlspecialchars($err); ?></li>
              <?php endforeach; ?>
            </ul>
          <?php endif; ?>

          <?php if (!empty($data)): ?>
            <h4 style="margin-bottom:8px; color:var(--text-main);">Submitted &amp; Stored Record Details:</h4>
            <div class="data-preview"><?php echo htmlspecialchars(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)); ?></div>
          <?php endif; ?>

          <div class="btn-group">
            <a href="<?php echo htmlspecialchars($backLink); ?>" class="home-btn">← Go Back / Continue</a>
            <a href="../home.html" class="home-btn">🏠 Home Portal</a>
            <a href="DASHBOARD.HTML" class="home-btn">📊 Dashboard</a>
          </div>
        </div>

        <footer>
          <p>&copy; 2026 Student Hub. Charotar University of Science and Technology.</p>
        </footer>
      </div>
      <script src="../JS/SCRIPT.JS"></script>
    </body>
    </html>
    <?php
}
