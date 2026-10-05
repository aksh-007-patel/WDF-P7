/**
 * STUDENT HUB — DYNAMIC UI COMPONENTS  (dynamic-ui.js)
 * Practical 4 / 5 / 6  ·  JavaScript Dynamic UI Assignment
 *
 * Components implemented:
 *  1. Collapsible FAQ Accordion
 *  2. Modal Popup
 *  3. Image / Content Slider (Carousel)
 *  4. Notification Banner (auto-dismiss + manual close)
 *  5. Hamburger Menu (mobile nav toggle)
 *  6. Light / Dark Theme Switcher  (persisted via localStorage)
 *
 * All components are self-contained IIFE modules that guard against
 * missing DOM elements, so this file is safe to include on every page.
 */

/* ============================================================
   1.  COLLAPSIBLE FAQ ACCORDION
   ============================================================ */
(function () {
  "use strict";

  /**
   * Initialises every .faq-item on the page.
   * Clicking the .faq-question toggles the matching .faq-answer.
   * Only one item is open at a time (accordion behaviour).
   */
  function initFAQ() {
    const items = document.querySelectorAll(".faq-item");
    if (!items.length) return;

    items.forEach(function (item) {
      const question = item.querySelector(".faq-question");
      const answer   = item.querySelector(".faq-answer");
      if (!question || !answer) return;

      // Start collapsed
      answer.style.maxHeight   = "0";
      answer.style.overflow    = "hidden";
      answer.style.transition  = "max-height 0.35s ease, padding 0.25s ease";
      answer.style.paddingTop  = "0";
      answer.style.paddingBottom = "0";

      question.setAttribute("aria-expanded", "false");
      question.setAttribute("role", "button");
      question.setAttribute("tabindex", "0");

      function toggle() {
        const isOpen = item.classList.contains("faq-open");

        // Collapse all
        items.forEach(function (i) {
          i.classList.remove("faq-open");
          const a = i.querySelector(".faq-answer");
          const q = i.querySelector(".faq-question");
          if (a) {
            a.style.maxHeight    = "0";
            a.style.paddingTop   = "0";
            a.style.paddingBottom = "0";
          }
          if (q) q.setAttribute("aria-expanded", "false");
        });

        // If it was closed, open it
        if (!isOpen) {
          item.classList.add("faq-open");
          // Use scrollHeight for natural height
          answer.style.maxHeight    = answer.scrollHeight + 40 + "px";
          answer.style.paddingTop   = "14px";
          answer.style.paddingBottom = "14px";
          question.setAttribute("aria-expanded", "true");
        }
      }

      question.addEventListener("click", toggle);
      question.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFAQ);
  } else {
    initFAQ();
  }
})();


/* ============================================================
   2.  MODAL POPUP
   ============================================================ */
(function () {
  "use strict";

  /**
   * Generic modal system.
   *
   * HTML pattern:
   *   <button data-modal-open="myModal">Open</button>
   *   <div id="myModal" class="sh-modal" role="dialog" aria-modal="true" aria-labelledby="myModalTitle">
   *     <div class="sh-modal-content">
   *       <button class="sh-modal-close" aria-label="Close">&times;</button>
   *       <h3 id="myModalTitle">Title</h3>
   *       <p>Body…</p>
   *     </div>
   *   </div>
   */
  function initModals() {
    // Open triggers
    document.querySelectorAll("[data-modal-open]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        const id    = trigger.getAttribute("data-modal-open");
        const modal = document.getElementById(id);
        if (modal) openModal(modal);
      });
    });

    // Close buttons inside modals
    document.querySelectorAll(".sh-modal-close").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeModal(btn.closest(".sh-modal"));
      });
    });

    // Click on backdrop closes modal
    document.querySelectorAll(".sh-modal").forEach(function (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal(modal);
      });
    });

    // Escape key closes active modal
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const open = document.querySelector(".sh-modal.sh-modal-visible");
        if (open) closeModal(open);
      }
    });
  }

  function openModal(modal) {
    modal.classList.add("sh-modal-visible");
    document.body.classList.add("sh-modal-open");
    // Focus first focusable element for accessibility
    const focusable = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) setTimeout(function () { focusable.focus(); }, 50);
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("sh-modal-visible");
    document.body.classList.remove("sh-modal-open");
  }

  // Expose globally so FAQ "Read more" buttons can call it
  window.SHModal = { open: openModal, close: closeModal };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initModals);
  } else {
    initModals();
  }
})();


/* ============================================================
   3.  IMAGE / CONTENT SLIDER (CAROUSEL)
   ============================================================ */
(function () {
  "use strict";

  /**
   * Initialises every .sh-slider on the page.
   *
   * HTML pattern:
   *   <div class="sh-slider" data-autoplay="4000">
   *     <div class="sh-slider-track">
   *       <div class="sh-slide">…</div>
   *       <div class="sh-slide">…</div>
   *     </div>
   *     <button class="sh-slider-prev" aria-label="Previous">&#8249;</button>
   *     <button class="sh-slider-next" aria-label="Next">&#8250;</button>
   *     <div class="sh-slider-dots"></div>
   *   </div>
   */
  function initSliders() {
    document.querySelectorAll(".sh-slider").forEach(function (slider) {
      const track     = slider.querySelector(".sh-slider-track");
      const slides    = slider.querySelectorAll(".sh-slide");
      const prevBtn   = slider.querySelector(".sh-slider-prev");
      const nextBtn   = slider.querySelector(".sh-slider-next");
      const dotsWrap  = slider.querySelector(".sh-slider-dots");
      const delay     = parseInt(slider.getAttribute("data-autoplay") || "0", 10);

      if (!track || slides.length < 2) return;

      let current  = 0;
      let autoplay = null;

      // Build dots
      if (dotsWrap) {
        slides.forEach(function (_, i) {
          const dot = document.createElement("button");
          dot.className   = "sh-slider-dot";
          dot.setAttribute("aria-label", "Go to slide " + (i + 1));
          dot.addEventListener("click", function () { goTo(i); });
          dotsWrap.appendChild(dot);
        });
      }

      function goTo(index) {
        slides[current].classList.remove("sh-slide-active");
        updateDot(current, false);
        current = (index + slides.length) % slides.length;
        slides[current].classList.add("sh-slide-active");
        updateDot(current, true);
        track.style.transform = "translateX(-" + current * 100 + "%)";
      }

      function updateDot(index, active) {
        if (!dotsWrap) return;
        const dots = dotsWrap.querySelectorAll(".sh-slider-dot");
        if (dots[index]) dots[index].classList.toggle("sh-dot-active", active);
      }

      if (prevBtn) prevBtn.addEventListener("click", function () { goTo(current - 1); resetAutoplay(); });
      if (nextBtn) nextBtn.addEventListener("click", function () { goTo(current + 1); resetAutoplay(); });

      // Touch / swipe support
      let touchStartX = 0;
      slider.addEventListener("touchstart", function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
      slider.addEventListener("touchend", function (e) {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) { diff > 0 ? goTo(current + 1) : goTo(current - 1); resetAutoplay(); }
      });

      function startAutoplay() {
        if (delay > 0) autoplay = setInterval(function () { goTo(current + 1); }, delay);
      }
      function resetAutoplay() {
        clearInterval(autoplay);
        startAutoplay();
      }

      // Init first slide
      goTo(0);
      startAutoplay();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSliders);
  } else {
    initSliders();
  }
})();


/* ============================================================
   4.  NOTIFICATION BANNER
   ============================================================ */
(function () {
  "use strict";

  /**
   * Shows a dismissible notification banner at the top of the page.
   * Banners with a data-banner-key are only shown once per browser session.
   *
   * HTML pattern (optional — can also be injected via JS):
   *   <div class="sh-banner sh-banner-info" data-banner-key="welcome2026">
   *     <span class="sh-banner-msg">📢 Welcome to the new Student Hub 2026!</span>
   *     <button class="sh-banner-close" aria-label="Dismiss">×</button>
   *   </div>
   */
  function initBanners() {
    document.querySelectorAll(".sh-banner").forEach(function (banner) {
      const key = banner.getAttribute("data-banner-key");

      // Skip if dismissed this session
      if (key && sessionStorage.getItem("sh-banner-" + key) === "dismissed") {
        banner.style.display = "none";
        return;
      }

      // Show
      banner.classList.add("sh-banner-visible");

      // Auto-dismiss after 8 s if data-auto-dismiss is set
      const autoDismiss = parseInt(banner.getAttribute("data-auto-dismiss") || "0", 10);
      let timer = null;
      if (autoDismiss > 0) {
        timer = setTimeout(function () { dismiss(banner, key); }, autoDismiss);
      }

      // Close button
      const closeBtn = banner.querySelector(".sh-banner-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          clearTimeout(timer);
          dismiss(banner, key);
        });
      }
    });
  }

  function dismiss(banner, key) {
    banner.classList.add("sh-banner-hiding");
    setTimeout(function () {
      banner.style.display = "none";
      banner.classList.remove("sh-banner-visible", "sh-banner-hiding");
    }, 350);
    if (key) sessionStorage.setItem("sh-banner-" + key, "dismissed");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBanners);
  } else {
    initBanners();
  }
})();


/* ============================================================
   5.  HAMBURGER MENU (mobile nav toggle)
   ============================================================ */
(function () {
  "use strict";

  /**
   * Converts the site's main <nav> into a collapsible mobile menu when
   * the viewport is ≤768 px.  Works with any page that uses
   *   <button class="hamburger-btn" aria-label="Open menu">
   * placed before or inside the <nav>.
   *
   * The hamburger is hidden on desktop via CSS media query.
   */
  function initHamburger() {
    document.querySelectorAll(".hamburger-btn").forEach(function (btn) {
      const targetId = btn.getAttribute("data-nav-target") || "mainNav";
      const nav      = document.getElementById(targetId) ||
                       btn.closest("header")?.querySelector("nav") ||
                       document.querySelector("nav");
      if (!nav) return;

      nav.classList.add("hamburger-nav");

      btn.setAttribute("aria-controls", nav.id || "mainNav");
      btn.setAttribute("aria-expanded", "false");

      btn.addEventListener("click", function () {
        const isOpen = nav.classList.toggle("nav-open");
        btn.classList.toggle("is-active", isOpen);
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      // Close when a nav link is clicked
      nav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          nav.classList.remove("nav-open");
          btn.classList.remove("is-active");
          btn.setAttribute("aria-expanded", "false");
        });
      });

      // Close on outside click
      document.addEventListener("click", function (e) {
        if (!nav.contains(e.target) && !btn.contains(e.target)) {
          nav.classList.remove("nav-open");
          btn.classList.remove("is-active");
          btn.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHamburger);
  } else {
    initHamburger();
  }
})();


/* ============================================================
   6.  LIGHT / DARK THEME SWITCHER
   (Primary logic lives in SCRIPT.JS – this module adds the
   smooth CSS transition class & re-syncs any late-rendered buttons)
   ============================================================ */
(function () {
  "use strict";

  const THEME_KEY = "registrationTheme";

  function applyTheme(isDark) {
    document.body.classList.toggle("dark-theme", isDark);
    document.querySelectorAll(".theme-toggle-btn").forEach(function (btn) {
      const icon = btn.querySelector(".theme-icon");
      const text = btn.querySelector(".theme-text");
      if (icon) icon.textContent = isDark ? "☀️" : "🌙";
      if (text) text.textContent = isDark ? "Light mode" : "Dark mode";
      btn.setAttribute("aria-pressed", isDark ? "true" : "false");
    });
  }

  function initThemeSwitcher() {
    const saved      = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia &&
                        window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && prefersDark);
    applyTheme(isDark);

    document.querySelectorAll(".theme-toggle-btn").forEach(function (btn) {
      // Remove old listeners by cloning (safe because SCRIPT.JS may also bind)
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener("click", function () {
        const nowDark = !document.body.classList.contains("dark-theme");
        applyTheme(nowDark);
        localStorage.setItem(THEME_KEY, nowDark ? "dark" : "light");
      });
    });
  }

  // Cross-tab sync
  window.addEventListener("storage", function (e) {
    if (e.key === THEME_KEY) applyTheme(e.newValue === "dark");
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThemeSwitcher);
  } else {
    initThemeSwitcher();
  }
})();
