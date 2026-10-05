# Student Hub — Practical 6: PHP Server-Side Validation, Sanitization & JSON Storage

## 📌 Overview
This module implements complete server-side processing in **PHP** for all forms across the Student Hub platform (**Contact**, **Registration**, **Campus Events**, and **Student Directory**). It validates, sanitizes, and persists all submitted form records into structured **JSON** files with full error handling and visual success/error notifications.

---

## 🗂️ File & Directory Structure

```text
PRACTICAL 6 - Copy/
├── CSS/
│   └── STYLE.CSS              # Responsive styles & theme definitions
├── DATA/
│   ├── contacts.json          # Stored contact inquiries & feedback
│   ├── registrations.json     # Stored student registrations (with hashed credentials)
│   ├── events.json            # Campus events & schedule dataset
│   ├── students.json          # Student directory & profile records
│   └── faqs.json              # Knowledge base FAQs
├── JS/
│   ├── SCRIPT.JS              # Client validation & AJAX form handlers
│   ├── data-manager.js        # JSON dataset loader, cache, search & sort
│   ├── data-table.js          # Dynamic card/table rendering engine
│   └── dynamic-ui.js          # Modal, banners, and theme controllers
├── PAGES/
│   ├── CONTACT.HTML           # Contact form (submits to PHP/process_contact.php)
│   ├── REGISTER.HTML          # Student registration (submits to PHP/process_register.php)
│   ├── EVENTS.HTML            # Campus schedule + "+ Add Event" modal
│   ├── PROFILE.HTML           # Student directory + "+ Add Student" modal
│   ├── ADMIN.HTML             # Admin dashboard with live stats & shortcuts
│   ├── DASHBOARD.HTML         # Student portal dashboard
│   ├── FAQ.HTML               # Knowledge base & help center
│   ├── LOGIN.HTML             # Portal login
│   └── ABOUT.HTML             # About CHARUSAT & Student Hub
├── PHP/
│   ├── helpers.php            # Sanitization, validation, JSON I/O & response functions
│   ├── process_contact.php    # Handles contact form submissions
│   ├── process_register.php   # Handles student registrations
│   ├── process_event.php      # Handles campus event creation
│   ├── process_student.php    # Handles student profile creation
│   ├── api.php                # Unified REST API router
│   └── run_all_tests.php      # Automated PHP test suite
└── home.html                  # Main Student Hub homepage
```

---

## 🛡️ Server-Side Validation & Sanitization Details

| Form | Fields | Sanitization & Validation Rules | Target JSON File |
| :--- | :--- | :--- | :--- |
| **Contact** | `name`, `email`, `subject`, `message` | • `strip_tags()` & `htmlspecialchars()`<br>• `filter_var(..., FILTER_VALIDATE_EMAIL)`<br>• Message length between 5 and 2000 chars | `DATA/contacts.json` |
| **Registration** | `name`, `email`, `mobile`, `password`, `confirmPassword`, `course`, `year`, `gender`, `terms` | • Full name regex `^[A-Za-z][A-Za-z\s'.-]{1,49}$`<br>• Mobile regex `^[6-9]\d{9}$`<br>• Password complexity check (8+ chars, upper, lower, number, symbol)<br>• Secure `password_hash()`<br>• Unique email validation<br>• Auto-generates official Student ID (e.g. `26DCE102`) | `DATA/registrations.json`<br>&amp; `DATA/students.json` |
| **Campus Event** | `title`, `description`, `date`, `time`, `location`, `category`, `organizer`, `attendanceCapacity` | • Date format `YYYY-MM-DD`<br>• Time format `HH:MM`<br>• Category whitelist validation<br>• Integer capacity check (5–10,000)<br>• Auto-generates Event ID (e.g. `EVT-2026-026`) | `DATA/events.json` |
| **Student Profile** | `studentId`, `fullName`, `major`, `graduationYear`, `gpa`, `email`, `phone`, `address`, `extracurricularActivities` | • GPA range check (0.00 to 10.00)<br>• Grad Year range check (2020–2035)<br>• Email & phone verification<br>• Duplicate student ID verification | `DATA/students.json` |

---

## 💾 JSON Data Handling & Concurrency
- **File Locking**: All write operations utilize `file_put_contents($file, $json, LOCK_EX)` to prevent race conditions during simultaneous form submissions.
- **Structured Metadata**: Each JSON document contains automatic metadata tracking `totalRecords`, `lastUpdated` timestamp, and schema versioning.
- **Formatting**: Outputs clean human-readable JSON using `JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE`.

---

## 🚀 How to Run & Test

### Option 1: Using XAMPP
1. Move or link the project folder into `C:\xampp\htdocs\StudentHub`.
2. Start **Apache** from XAMPP Control Panel.
3. Open your browser and navigate to:
   ```text
   http://localhost/StudentHub/home.html
   ```

### Option 2: Using PHP Built-in Server
Run the following command in terminal:
```bash
php -S localhost:8000
```
Open `http://localhost:8000/home.html` in your browser.

### Option 3: Run Automated Test Suite
To verify all validation rules, sanitization, and JSON file updates via PHP CLI:
```bash
php PHP/run_all_tests.php
```
