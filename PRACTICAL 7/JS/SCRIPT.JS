/**
 * STUDENT HUB - THEME CONTROLLER + FORM VALIDATION (SCRIPT.JS)
 * Practical 3 UI Interactivity & Practical 4 Registration Validation
 * Synchronized with localStorage key "registrationTheme"
 */

(function () {
  const THEME_STORAGE_KEY = "registrationTheme";

  function applyTheme(isDark) {
    if (isDark) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }

    document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
      const icon = btn.querySelector(".theme-icon");
      const text = btn.querySelector(".theme-text");
      if (icon) icon.textContent = isDark ? "☀️" : "🌙";
      if (text) text.textContent = isDark ? "Light mode" : "Dark mode";
    });
  }

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isInitiallyDark = savedTheme === "dark" || (!savedTheme && prefersDark);

  function initTheme() {
    applyTheme(isInitiallyDark);

    document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const isDark = !document.body.classList.contains("dark-theme");
        applyTheme(isDark);
        localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme);
  } else {
    initTheme();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY) {
      applyTheme(event.newValue === "dark");
    }
  });
})();

(function () {
  "use strict";

  const VALIDATION_PATTERNS = {
    name: /^[A-Za-z][A-Za-z\s'.-]{1,49}$/,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    mobile: /^[6-9]\d{9}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_#\-+.^=])[A-Za-z\d@$!%*?&_#\-+.^=]{8,20}$/,
    course: /^(BCA|BBA|BTech|MCA)$/,
    year: /^(1|2|3|4)$/,
    gender: /^(Male|Female|Other)$/
  };

  const ERROR_MESSAGES = {
    name: {
      empty: "Please enter your full name.",
      invalid: "Name must be 2-50 letters, spaces, (' . -) only. Start with a letter."
    },
    email: {
      empty: "Please enter your email address.",
      invalid: "Enter a valid email (e.g., name@example.com)."
    },
    mobile: {
      empty: "Please enter your mobile number.",
      invalid: "Enter a valid 10-digit Indian mobile number starting with 6-9."
    },
    password: {
      empty: "Please enter a password.",
      invalid: "Password: 8-20 chars, 1 uppercase, 1 lowercase, 1 number, 1 special (@$!%*?&_#-+.^=)."
    },
    confirmPassword: {
      empty: "Please confirm your password.",
      mismatch: "Passwords do not match. Please re-enter."
    },
    course: {
      empty: "Please select a course from the dropdown."
    },
    year: {
      empty: "Please select your academic year."
    },
    gender: {
      empty: "Please select your gender."
    },
    terms: {
      empty: "You must accept the terms and conditions to proceed."
    }
  };

  const form = document.getElementById("registrationForm");
  if (!form) return;

  const fields = {
    name: document.getElementById("name"),
    email: document.getElementById("email"),
    mobile: document.getElementById("mobile"),
    password: document.getElementById("password"),
    confirmPassword: document.getElementById("confirmPassword"),
    course: document.getElementById("course"),
    year: document.getElementById("year"),
    terms: document.getElementById("terms")
  };

  const errors = {
    name: document.getElementById("nameError"),
    email: document.getElementById("emailError"),
    mobile: document.getElementById("mobileError"),
    password: document.getElementById("passwordError"),
    confirmPassword: document.getElementById("confirmPasswordError"),
    course: document.getElementById("courseError"),
    year: document.getElementById("yearError"),
    gender: document.getElementById("genderError"),
    terms: document.getElementById("termsError")
  };

  function showError(fieldKey, errorKey, targetInput) {
    const errEl = errors[fieldKey];
    if (!errEl) return;
    errEl.textContent = ERROR_MESSAGES[fieldKey][errorKey] || errorKey;
    errEl.classList.add("visible");

    if (targetInput) {
      targetInput.classList.remove("input-valid");
      targetInput.classList.add("input-invalid");
    }

    if (fieldKey === "terms") {
      const termsWrap = fields.terms.closest(".terms");
      if (termsWrap) {
        termsWrap.classList.remove("terms-valid");
        termsWrap.classList.add("terms-invalid");
      }
    }

    if (fieldKey === "gender") {
      const radioGroup = document.querySelector(".radio-group");
      if (radioGroup) {
        radioGroup.classList.remove("radio-valid");
        radioGroup.classList.add("radio-invalid");
      }
    }
  }

  function clearError(fieldKey, targetInput) {
    const errEl = errors[fieldKey];
    if (!errEl) return;
    errEl.textContent = "";
    errEl.classList.remove("visible");

    if (targetInput) {
      targetInput.classList.remove("input-invalid");
      targetInput.classList.add("input-valid");
    }

    if (fieldKey === "terms") {
      const termsWrap = fields.terms.closest(".terms");
      if (termsWrap) {
        termsWrap.classList.remove("terms-invalid");
        termsWrap.classList.add("terms-valid");
      }
    }

    if (fieldKey === "gender") {
      const radioGroup = document.querySelector(".radio-group");
      if (radioGroup) {
        radioGroup.classList.remove("radio-invalid");
        radioGroup.classList.add("radio-valid");
      }
    }
  }

  function resetFieldState(fieldKey, targetInput) {
    const errEl = errors[fieldKey];
    if (!errEl) return;
    errEl.textContent = "";
    errEl.classList.remove("visible");

    if (targetInput) {
      targetInput.classList.remove("input-invalid", "input-valid");
    }

    if (fieldKey === "terms") {
      const termsWrap = fields.terms.closest(".terms");
      if (termsWrap) {
        termsWrap.classList.remove("terms-invalid", "terms-valid");
      }
    }

    if (fieldKey === "gender") {
      const radioGroup = document.querySelector(".radio-group");
      if (radioGroup) {
        radioGroup.classList.remove("radio-invalid", "radio-valid");
      }
    }
  }

  function validateName() {
    const value = fields.name.value.trim();
    if (!value) {
      showError("name", "empty", fields.name);
      return false;
    }
    const words = value.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 2 || !VALIDATION_PATTERNS.name.test(value)) {
      showError("name", "invalid", fields.name);
      return false;
    }
    clearError("name", fields.name);
    return true;
  }

  function validateEmail() {
    const value = fields.email.value.trim();
    if (!value) {
      showError("email", "empty", fields.email);
      return false;
    }
    if (!VALIDATION_PATTERNS.email.test(value)) {
      showError("email", "invalid", fields.email);
      return false;
    }
    clearError("email", fields.email);
    return true;
  }

  function validateMobile() {
    const value = fields.mobile.value.trim();
    if (!value) {
      showError("mobile", "empty", fields.mobile);
      return false;
    }
    if (!VALIDATION_PATTERNS.mobile.test(value)) {
      showError("mobile", "invalid", fields.mobile);
      return false;
    }
    clearError("mobile", fields.mobile);
    return true;
  }

  function validatePassword() {
    const value = fields.password.value;
    if (!value) {
      showError("password", "empty", fields.password);
      return false;
    }
    if (!VALIDATION_PATTERNS.password.test(value)) {
      showError("password", "invalid", fields.password);
      return false;
    }
    clearError("password", fields.password);
    if (fields.confirmPassword.value) {
      validateConfirmPassword();
    }
    return true;
  }

  function validateConfirmPassword() {
    const value = fields.confirmPassword.value;
    const passwordVal = fields.password.value;
    if (!value) {
      showError("confirmPassword", "empty", fields.confirmPassword);
      return false;
    }
    if (value !== passwordVal) {
      showError("confirmPassword", "mismatch", fields.confirmPassword);
      return false;
    }
    clearError("confirmPassword", fields.confirmPassword);
    return true;
  }

  function validateCourse() {
    const value = fields.course.value;
    if (!value) {
      showError("course", "empty", fields.course);
      return false;
    }
    if (!VALIDATION_PATTERNS.course.test(value)) {
      showError("course", "empty", fields.course);
      return false;
    }
    clearError("course", fields.course);
    return true;
  }

  function validateYear() {
    const value = fields.year.value;
    if (!value) {
      showError("year", "empty", fields.year);
      return false;
    }
    if (!VALIDATION_PATTERNS.year.test(value)) {
      showError("year", "empty", fields.year);
      return false;
    }
    clearError("year", fields.year);
    return true;
  }

  function validateGender() {
    const selected = document.querySelector('input[name="gender"]:checked');
    if (!selected) {
      showError("gender", "empty", null);
      return false;
    }
    if (!VALIDATION_PATTERNS.gender.test(selected.value)) {
      showError("gender", "empty", null);
      return false;
    }
    clearError("gender", null);
    return true;
  }

  function validateTerms() {
    if (!fields.terms.checked) {
      showError("terms", "empty", null);
      return false;
    }
    clearError("terms", null);
    return true;
  }

  function validateAll() {
    let isValid = true;
    if (!validateName()) isValid = false;
    if (!validateEmail()) isValid = false;
    if (!validateMobile()) isValid = false;
    if (!validatePassword()) isValid = false;
    if (!validateConfirmPassword()) isValid = false;
    if (!validateCourse()) isValid = false;
    if (!validateYear()) isValid = false;
    if (!validateGender()) isValid = false;
    if (!validateTerms()) isValid = false;
    return isValid;
  }

  function focusFirstInvalid() {
    const fieldOrder = [
      { key: "name", el: fields.name, fn: validateName },
      { key: "email", el: fields.email, fn: validateEmail },
      { key: "mobile", el: fields.mobile, fn: validateMobile },
      { key: "password", el: fields.password, fn: validatePassword },
      { key: "confirmPassword", el: fields.confirmPassword, fn: validateConfirmPassword },
      { key: "course", el: fields.course, fn: validateCourse },
      { key: "year", el: fields.year, fn: validateYear },
      { key: "gender", el: document.getElementById("male"), fn: validateGender },
      { key: "terms", el: fields.terms, fn: validateTerms }
    ];
    for (const item of fieldOrder) {
      if (!item.fn() && item.el) {
        item.el.focus();
        item.el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
  }

  function addPasswordStrengthIndicator() {
    const passGroup = fields.password.closest(".form-group");
    if (!passGroup || passGroup.querySelector(".password-strength")) return;

    const strengthHtml = `
      <div class="password-strength">
        <div class="strength-bar">
          <div class="strength-bar-fill"></div>
        </div>
        <span class="strength-text">Strength</span>
      </div>`;
    passGroup.insertAdjacentHTML("beforeend", strengthHtml);
  }

  function updatePasswordStrength() {
    const value = fields.password.value;
    const fill = document.querySelector(".strength-bar-fill");
    const text = document.querySelector(".strength-text");
    if (!fill || !text) return;

    let score = 0;
    if (value.length >= 8) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[@$!%*?&_#\-+.^=]/.test(value)) score++;

    let width = "0%";
    let color = "#cbd5e1";
    let label = "Strength";
    let textColor = "";

    if (value.length === 0) {
      width = "0%";
      color = "#cbd5e1";
      label = "Strength";
    } else if (score <= 2) {
      width = "33%";
      color = "#dc2626";
      label = "Weak";
      textColor = "#dc2626";
    } else if (score <= 3) {
      width = "66%";
      color = "#f59e0b";
      label = "Fair";
      textColor = "#f59e0b";
    } else if (score === 4) {
      width = "85%";
      color = "#16a34a";
      label = "Good";
      textColor = "#16a34a";
    } else {
      width = "100%";
      color = "#059669";
      label = "Strong";
      textColor = "#059669";
    }

    fill.style.width = width;
    fill.style.backgroundColor = color;
    text.textContent = label;
    if (textColor) {
      text.style.color = textColor;
    } else {
      text.style.color = "";
    }
  }

  function attachValidationListeners() {
    fields.name.addEventListener("blur", validateName);
    fields.name.addEventListener("input", () => {
      if (fields.name.classList.contains("input-invalid")) validateName();
    });

    fields.email.addEventListener("blur", validateEmail);
    fields.email.addEventListener("input", () => {
      if (fields.email.classList.contains("input-invalid")) validateEmail();
    });

    fields.mobile.addEventListener("blur", validateMobile);
    fields.mobile.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
      if (fields.mobile.classList.contains("input-invalid")) validateMobile();
    });

    addPasswordStrengthIndicator();
    fields.password.addEventListener("blur", validatePassword);
    fields.password.addEventListener("input", () => {
      updatePasswordStrength();
      if (fields.password.classList.contains("input-invalid")) validatePassword();
    });

    fields.confirmPassword.addEventListener("blur", validateConfirmPassword);
    fields.confirmPassword.addEventListener("input", () => {
      if (fields.confirmPassword.classList.contains("input-invalid")) validateConfirmPassword();
    });

    fields.course.addEventListener("blur", validateCourse);
    fields.course.addEventListener("change", validateCourse);

    fields.year.addEventListener("blur", validateYear);
    fields.year.addEventListener("change", validateYear);

    document.querySelectorAll('input[name="gender"]').forEach((radio) => {
      radio.addEventListener("change", validateGender);
      radio.addEventListener("blur", validateGender);
    });

    fields.terms.addEventListener("change", validateTerms);
    fields.terms.addEventListener("blur", validateTerms);

    form.addEventListener("reset", () => {
      setTimeout(() => {
        Object.keys(fields).forEach((key) => {
          resetFieldState(key, fields[key]);
        });
        resetFieldState("gender", null);
        updatePasswordStrength();
      }, 0);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (validateAll()) {
        const feedbackEl = document.getElementById("registrationFeedback");
        if (window.location.protocol.startsWith("http")) {
          // Running on web server (XAMPP / PHP server)
          const formData = new FormData(form);
          const submitBtn = form.querySelector('input[type="submit"]');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.value = "Registering...";
          }

          fetch(form.action, {
            method: "POST",
            body: formData,
            headers: { "Accept": "application/json" }
          })
          .then(async res => {
            const data = await res.json();
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.value = "Register Now";
            }
            if (data.success) {
              if (feedbackEl) {
                feedbackEl.style.display = "block";
                feedbackEl.innerHTML = `
                  <div class="sh-banner sh-banner-success" style="padding:15px; border-radius:8px; margin-bottom:15px;">
                    <strong>✅ ${data.message}</strong>
                    <div style="font-size:0.9rem; margin-top:8px;">
                      Student ID: <strong>${data.data?.studentId || data.data?.assignedStudentId || "Generated"}</strong> |
                      Saved to <code>DATA/registrations.json</code> &amp; <code>DATA/students.json</code>.
                    </div>
                  </div>
                `;
              }
              form.reset();
              setTimeout(() => {
                window.location.href = "DASHBOARD.HTML";
              }, 2500);
            } else {
              if (feedbackEl) {
                feedbackEl.style.display = "block";
                const errList = Object.values(data.errors || {}).map(e => `<li>${e}</li>`).join("");
                feedbackEl.innerHTML = `
                  <div class="sh-banner sh-banner-danger" style="padding:15px; border-radius:8px; margin-bottom:15px; background:#fee2e2; color:#b91c1c; border-left:4px solid #dc2626;">
                    <strong>⚠️ ${data.message}</strong>
                    <ul style="margin-top:6px; padding-left:20px;">${errList}</ul>
                  </div>
                `;
              }
            }
          })
          .catch(err => {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.value = "Register Now";
            }
            form.submit();
          });
        } else {
          // Direct file execution - submit standard POST
          form.submit();
        }
      } else {
        focusFirstInvalid();
      }
    });

    updatePasswordStrength();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachValidationListeners);
  } else {
    attachValidationListeners();
  }
})();

/**
 * GENERIC PHP AJAX FORM HANDLER (Contact, Events, Students)
 */
(function () {
  "use strict";

  function setupFormHandler(formId, feedbackId, modalId, datasetKey) {
    const form = document.getElementById(formId);
    if (!form) return;

    const feedback = document.getElementById(feedbackId);

    form.addEventListener("submit", function (e) {
      if (!window.location.protocol.startsWith("http")) {
        // Normal form submission when not on http server
        return;
      }

      e.preventDefault();
      const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
      const originalText = submitBtn ? submitBtn.value : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.value = "Saving...";
      }

      const formData = new FormData(form);

      fetch(form.action, {
        method: "POST",
        body: formData,
        headers: { "Accept": "application/json" }
      })
      .then(async (res) => {
        const json = await res.json();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.value = originalText;
        }

        if (json.success) {
          if (feedback) {
            feedback.style.display = "block";
            feedback.innerHTML = `
              <div style="background:#ecfdf5; border-left:4px solid #16a34a; padding:12px 16px; border-radius:6px; color:#15803d; margin-bottom:12px;">
                <strong>✅ Success:</strong> ${json.message}
              </div>
            `;
          }
          form.reset();

          // If inside a modal, close after brief display and refresh dataset
          if (modalId) {
            setTimeout(() => {
              const modal = document.getElementById(modalId);
              if (modal && typeof SHModal !== "undefined" && SHModal.close) {
                SHModal.close(modal);
              } else if (modal) {
                modal.classList.remove("sh-modal-visible");
                document.body.classList.remove("sh-modal-active");
              }
              if (feedback) feedback.style.display = "none";
            }, 1800);
          }

          // Clear cache & refresh dynamic table if available
          if (typeof SHDataManager !== "undefined" && SHDataManager.clearCache && datasetKey) {
            SHDataManager.clearCache(datasetKey);
            if (typeof SHDynTable !== "undefined" && SHDynTable.init) {
              window.location.reload();
            }
          }
        } else {
          if (feedback) {
            feedback.style.display = "block";
            const errItems = Object.values(json.errors || {}).map(err => `<li>${err}</li>`).join("");
            feedback.innerHTML = `
              <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:12px 16px; border-radius:6px; color:#b91c1c; margin-bottom:12px;">
                <strong>⚠️ Error:</strong> ${json.message}
                ${errItems ? `<ul style="margin:6px 0 0 18px;">${errItems}</ul>` : ""}
              </div>
            `;
          }
        }
      })
      .catch((err) => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.value = originalText;
        }
        form.submit();
      });
    });
  }

  function initForms() {
    setupFormHandler("contactForm", "contactFeedback", null, null);
    setupFormHandler("addEventForm", "eventModalFeedback", "modal-add-event", "events");
    setupFormHandler("addStudentForm", "studentModalFeedback", "modal-add-student", "students");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initForms);
  } else {
    initForms();
  }
})();

