/**
 * ThinkLab Digital Solutions - Interactive Client Suite
 * Handles Form Submissions, Modals, Calendly Fallback, Careers Applications & Toasts
 */

(function () {
  // =============================================================
  // ThinkLab CMS Active Edit Enforcer & React Hydration Shield
  // Guarantees all published text/styles stay persistent across Framer React hydration
  // =============================================================
  function applyActiveCmsEdits() {
    try {
      const rawEdits = window.__THINKLAB_EDITS__;
      if (!rawEdits || typeof rawEdits !== 'object') return;

      const items = Array.isArray(rawEdits) ? rawEdits : Object.entries(rawEdits).map(([key, val]) => {
        let tlId = val.tlId;
        if (!tlId && key.includes('data-tl-id="')) {
          const m = key.match(/data-tl-id="([^"]+)"/);
          if (m) tlId = m[1];
        }
        return Object.assign({ selectorKey: key, tlId: tlId }, val);
      });

      const root = document.getElementById('main') || document.body;
      if (!root) return;

      items.forEach(props => {
        if (!props) return;
        const targetText = props.text;
        const origText = props.originalText;
        const tlId = props.tlId;

        let targets = [];

        // 1. Selector Key / tlId lookup
        if (props.selectorKey) {
          try {
            targets = Array.from(document.querySelectorAll(props.selectorKey));
          } catch(e) {}
        }
        if (targets.length === 0 && tlId) {
          targets = Array.from(document.querySelectorAll(`[data-tl-id="${tlId}"]`));
        }

        // 2. Custom CSS selector / DOM path
        if (targets.length === 0 && props.selector) {
          try {
            targets = Array.from(document.querySelectorAll(props.selector));
          } catch(e) {}
        }

        // 3. Match by originalText if available
        if (targets.length === 0 && origText) {
          const tags = props.tag ? [props.tag] : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'li'];
          const candidates = document.querySelectorAll(tags.join(','));
          for (let cand of candidates) {
            if (cand.textContent.trim() === origText.trim()) {
              targets.push(cand);
              break;
            }
          }
        }

        // 4. TreeWalker Text-Node Shield: Intercepts React Hydration directly on text nodes!
        if (origText && targetText && origText !== targetText) {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
          let node;
          while ((node = walker.nextNode())) {
            if (node.nodeValue && node.nodeValue.includes(origText)) {
              node.nodeValue = node.nodeValue.replace(origText, targetText);
              if (tlId && node.parentElement && !node.parentElement.getAttribute('data-tl-id')) {
                node.parentElement.setAttribute('data-tl-id', tlId);
              }
            }
          }
        }

        // 5. Update text and styles on resolved elements
        targets.forEach(el => {
          if (tlId && !el.getAttribute('data-tl-id')) {
            el.setAttribute('data-tl-id', tlId);
          }
          if (targetText !== undefined && el.textContent !== targetText) {
            el.textContent = targetText;
          }
          if (props.color && el.style.color !== props.color) {
            el.style.color = props.color;
          }
          if (props.fontSize && el.style.fontSize !== props.fontSize) {
            el.style.fontSize = props.fontSize;
          }
          if (props.fontWeight && el.style.fontWeight !== props.fontWeight) {
            el.style.fontWeight = props.fontWeight;
          }
          if (props.href) {
            const link = el.tagName === 'A' ? el : el.closest('a');
            if (link && link.getAttribute('href') !== props.href) {
              link.setAttribute('href', props.href);
            }
          }
          if (props.bg && el.style.background !== props.bg) {
            el.style.background = props.bg;
          }
        });
      });
    } catch (e) {
      console.warn('[CMS] applyActiveCmsEdits note:', e);
    }
  }

  // Apply immediately and on all hydration/load milestones
  applyActiveCmsEdits();
  document.addEventListener('DOMContentLoaded', applyActiveCmsEdits);
  window.addEventListener('load', applyActiveCmsEdits);
  [50, 150, 300, 600, 1200, 2500].forEach(ms => setTimeout(applyActiveCmsEdits, ms));

  // High-performance observer to intercept React Virtual DOM re-renders synchronously
  if (typeof MutationObserver !== 'undefined') {
    let mutDebounce = null;
    const cmsObserver = new MutationObserver(() => {
      if (!mutDebounce) {
        mutDebounce = setTimeout(() => {
          applyActiveCmsEdits();
          mutDebounce = null;
        }, 16);
      }
    });

    const initObs = () => {
      const target = document.getElementById('main') || document.body;
      if (target) {
        cmsObserver.observe(target, { childList: true, subtree: true, characterData: true });
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initObs);
    } else {
      initObs();
    }
  }


  // Ensure hero heading and navbar are revealed immediately on first load
  function revealHeroAndNavbar() {
    try {
      const hero = document.querySelector('[data-framer-name="Hero Heading Content"], .framer-33b0pv');
      if (hero) {
        hero.style.opacity = '1';
        hero.style.visibility = 'visible';
      }
      const nav = document.querySelector('.framer-18h34of-container');
      if (nav) {
        nav.style.opacity = '1';
        nav.style.visibility = 'visible';
      }
    } catch (e) { }
  }
  revealHeroAndNavbar();
  document.addEventListener('DOMContentLoaded', revealHeroAndNavbar);
  window.addEventListener('load', revealHeroAndNavbar);

  // Smooth appearance observer for lazy/appear elements down the page without blocking CSS transforms
  if (typeof IntersectionObserver !== 'undefined') {
    const appearObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.visibility = 'visible';
        }
      });
    }, { rootMargin: '100px 0px', threshold: 0.05 });

    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[data-framer-name="Brands"], [data-framer-name="About"], [data-framer-name="Case Studies"], [data-framer-name="Reviews"], [data-framer-name="FAQ"]').forEach(el => {
        appearObserver.observe(el);
      });
    });
  }

  // =============================================================
  // Lusion-Style 3D Curved Entrance Animation for Services Section
  // =============================================================
  function initLusionServicesCurvedAnimation() {
    const cardSelectors = [
      '.framer-ijy0g9-container', // Digital Marketing
      '.framer-9x6f3l-container', // Workflow/AI Automation
      '.framer-ju06mz-container', // Website Development
      '.framer-1b60apb-container' // Brand Strategy
    ];

    let ticking = false;

    function renderLusionCurve() {
      const windowH = window.innerHeight;
      const isDesktop = window.innerWidth >= 810;

      // Find active service grids (for desktop/tablet/phone variants)
      const serviceGrids = document.querySelectorAll('.framer-1ncqrqd');
      serviceGrids.forEach(grid => {
        if (grid.offsetParent === null) return; // Hidden by media queries

        const cards = grid.querySelectorAll(cardSelectors.join(', '));
        cards.forEach((card, idx) => {
          const rect = card.getBoundingClientRect();

          // Column index: 0 for left column, 1 for right column
          const isRightCol = isDesktop && (idx % 2 === 1);

          // Curve entrance triggers:
          // Start when card top enters from bottom + column stagger
          // Fully settled flat when card reaches upper-mid viewport
          const enterStart = windowH + (isRightCol ? 65 : 0);
          const enterEnd = windowH * 0.42;

          let progress = (enterStart - rect.top) / (enterStart - enterEnd);
          progress = Math.max(0, Math.min(1, progress));

          // Cubic smooth easing for natural deceleration
          const ease = 1 - Math.pow(1 - progress, 3);
          const invEase = 1 - ease;

          if (progress >= 1) {
            // Once fully in the focal zone, settle smoothly without destroying 3D layer context
            card.style.transform = 'translate3d(0px, 0px, 0px)';
            card.style.opacity = '1';
          } else {
            // 3D Parabolic Curve coordinates
            const translateY = 160 * invEase;     // Travel up from below
            const translateZ = -280 * invEase;     // Push forward from background depth
            const rotateX = 24 * invEase;          // Pitch: tilted backward -> unwinds to upright
            const scale = 0.86 + (0.14 * ease);    // Focal rack-focus zoom expansion
            const opacity = 0.12 + (0.88 * ease);  // Smooth fade-in

            // Side-specific arc: Left column sweeps from left, Right column sweeps from right
            const sideFactor = isRightCol ? 1 : -1;
            const translateX = 50 * sideFactor * invEase; // Curve inward toward center
            const rotateY = 10 * sideFactor * invEase;    // Yaw: concave amphitheater angle
            const rotateZ = 2.5 * sideFactor * invEase;   // Dynamic flight banking

            card.style.transform = `perspective(1600px) translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, ${translateZ.toFixed(2)}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) rotateZ(${rotateZ.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
            card.style.opacity = opacity.toFixed(3);
            card.style.willChange = 'transform, opacity';
            card.style.transformStyle = 'preserve-3d';
            card.style.backfaceVisibility = 'hidden';
          }
        });
      });

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(renderLusionCurve);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Initial run
    renderLusionCurve();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLusionServicesCurvedAnimation);
  } else {
    initLusionServicesCurvedAnimation();
  }

  // Inject CSS Styles for interactive widgets and modals
  const styles = document.createElement('style');
  styles.textContent = `
    /* Clean Page Scrolling - No micro-stutter conflicts with Lenis */
    html {
      overflow-x: hidden !important;
      overflow-y: auto !important;
      scroll-behavior: auto !important;
    }

    body {
      overflow-x: hidden !important;
      overflow-y: visible !important;
      position: relative !important;
    }

    #main, .framer-wYZgi, [data-framer-root], .framer-mz11iq, [data-framer-name="Desktop"] {
      overflow: visible !important;
      height: auto !important;
      min-height: 100% !important;
    }

    /* Keep hero headline and navbar visible on initial render */
    .framer-18h34of-container,
    [data-framer-appear-id="18h34of"],
    [data-framer-name="Hero Heading Content"],
    .framer-33b0pv,
    .framer-82uoyz,
    .framer-1sj09g2,
    #hero-heading,
    [id^="hero-heading"] {
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Services section parent stability: prevents 170px jump & initial scroll flicker */
    [data-framer-name="Services"],
    .framer-132yp4z {
      opacity: 1 !important;
      transform: none !important;
      visibility: visible !important;
      will-change: auto !important;
    }

    /* Lusion 3D Curved Service Section Container */
    .framer-1ncqrqd {
      perspective: 1600px !important;
      perspective-origin: 50% 35% !important;
      transform-style: preserve-3d !important;
    }

    .framer-ijy0g9-container,
    .framer-9x6f3l-container,
    .framer-ju06mz-container,
    .framer-1b60apb-container {
      transform-style: preserve-3d !important;
      backface-visibility: hidden !important;
      will-change: transform, opacity !important;
    }

    /* Modal & Dynamic Interactive Suite Styles */
    .tl-modal-backdrop {
      position: fixed !important;
      inset: 0 !important;
      background: rgba(4, 4, 7, 0.85) !important;
      backdrop-filter: blur(12px) !important;
      z-index: 999999 !important;
      display: none !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    .tl-modal-backdrop.active {
      display: flex !important;
      opacity: 1;
    }
    .tl-modal {
      background: #0e0e14 !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      border-radius: 16px !important;
      width: 100% !important;
      max-width: 540px !important;
      max-height: 90vh !important;
      overflow-y: auto !important;
      padding: 30px !important;
      position: relative !important;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(126, 111, 240, 0.25) !important;
      color: #fff !important;
      font-family: 'League Spartan', sans-serif !important;
    }
    .tl-modal-close {
      position: absolute !important;
      top: 18px !important;
      right: 18px !important;
      background: rgba(255, 255, 255, 0.08) !important;
      border: none !important;
      color: #aaa !important;
      width: 32px !important;
      height: 32px !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 16px !important;
      transition: all 0.2s !important;
    }
    .tl-modal-close:hover {
      background: rgba(255, 255, 255, 0.2) !important;
      color: #fff !important;
    }
    .tl-modal-tag {
      display: inline-block !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      color: #a280ff !important;
      font-weight: 700 !important;
      margin-bottom: 6px !important;
    }
    .tl-modal-title {
      font-family: 'Unbounded', sans-serif !important;
      font-size: 20px !important;
      font-weight: 700 !important;
      color: #fff !important;
      letter-spacing: -0.02em !important;
    }
    .tl-form-group {
      margin-top: 16px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
    }
    .tl-form-label {
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #ccc !important;
    }
    .tl-input, .tl-select, .tl-textarea {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      border-radius: 8px !important;
      padding: 10px 14px !important;
      color: #fff !important;
      font-family: inherit !important;
      font-size: 14px !important;
      outline: none !important;
      width: 100% !important;
      box-sizing: border-box !important;
      transition: border-color 0.2s, box-shadow 0.2s !important;
    }
    .tl-input:focus, .tl-select:focus, .tl-textarea:focus {
      border-color: #a280ff !important;
      box-shadow: 0 0 12px rgba(126, 111, 240, 0.3) !important;
    }
    .tl-textarea {
      min-height: 80px !important;
      resize: vertical !important;
    }
    .tl-file-upload {
      border: 2px dashed rgba(162, 128, 255, 0.4) !important;
      background: rgba(162, 128, 255, 0.05) !important;
      border-radius: 10px !important;
      padding: 20px !important;
      text-align: center !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
    }
    .tl-file-upload:hover {
      background: rgba(162, 128, 255, 0.1) !important;
      border-color: #a280ff !important;
    }
    .tl-file-name {
      font-size: 12px !important;
      color: #8c8c9e !important;
      margin-top: 4px !important;
    }
    .tl-submit-btn {
      margin-top: 20px !important;
      width: 100% !important;
      padding: 13px !important;
      border-radius: 9px !important;
      background: linear-gradient(135deg, #7e6ff0, #f58327) !important;
      color: #fff !important;
      font-weight: 700 !important;
      font-size: 14px !important;
      border: none !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
      box-shadow: 0 0 20px rgba(126, 111, 240, 0.35) !important;
    }
    .tl-submit-btn:hover {
      filter: brightness(1.1) !important;
      transform: translateY(-1px) !important;
    }
    .tl-toast {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      background: rgba(14, 14, 20, 0.95) !important;
      border: 1px solid #7e6ff0 !important;
      backdrop-filter: blur(16px) !important;
      color: #fff !important;
      padding: 14px 20px !important;
      border-radius: 10px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(126, 111, 240, 0.3) !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      z-index: 1000000 !important;
      opacity: 0 !important;
      transform: translateY(20px) !important;
      pointer-events: none !important;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }
    .tl-toast.show {
      opacity: 1 !important;
      transform: translateY(0) !important;
      pointer-events: auto !important;
    }
    .tl-toast.error {
      border-color: #ef4444 !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(239, 68, 68, 0.3) !important;
    }
    .tl-contact-wrapper {
      max-width: 680px !important;
      margin: 0 auto !important;
      padding: 24px !important;
      background: rgba(255, 255, 255, 0.03) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 16px !important;
      backdrop-filter: blur(12px) !important;
    }
    .tl-tabs-header {
      display: flex !important;
      gap: 10px !important;
      margin-bottom: 24px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
      padding-bottom: 12px !important;
    }
    .tl-tab-btn {
      padding: 8px 16px !important;
      background: transparent !important;
      border: 1px solid transparent !important;
      color: #8c8c9e !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
    }
    .tl-tab-btn.active, .tl-tab-btn:hover {
      background: rgba(162, 128, 255, 0.15) !important;
      border-color: rgba(162, 128, 255, 0.4) !important;
      color: #fff !important;
    }
    `;
  document.head.appendChild(styles);

  // Global Toast function
  function toast(message, isError = false) {
    let t = document.querySelector('.tl-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'tl-toast';
      document.body.appendChild(t);
    }
    t.className = `tl-toast ${isError ? 'error' : ''}`;
    t.innerHTML = `<span>${isError ? '⚠️' : '✨'}</span> <span>${message}</span>`;
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => t.classList.remove('show'), 4200);
  }

  // 1. Consultation / Quick Contact Modal
  const modalHTML = `
    <div class="tl-modal-backdrop" id="tlConsultationModal">
      <div class="tl-modal">
        <button class="tl-modal-close" onclick="closeConsultModal()">✕</button>
        <div class="tl-modal-header">
          <span class="tl-modal-tag">ThinkLab Digital Solutions</span>
          <h2 class="tl-modal-title">Book Strategy Consultation</h2>
          <p style="color:#aaa; font-size:14px; margin-top:6px;">Discuss your digital growth, SEO, paid ads, or web development goals with our senior strategist.</p>
        </div>

        <form id="tlConsultationForm" onsubmit="handleConsultationSubmit(event)">
          <div class="tl-form-group">
            <label class="tl-form-label">Full Name *</label>
            <input type="text" name="name" class="tl-input" placeholder="e.g. John Doe" required>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="tl-form-group">
              <label class="tl-form-label">Email Address *</label>
              <input type="email" name="email" class="tl-input" placeholder="john@company.com" required>
            </div>
            <div class="tl-form-group">
              <label class="tl-form-label">Phone Number</label>
              <input type="tel" name="phone" class="tl-input" placeholder="+91 9347580911">
            </div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="tl-form-group">
              <label class="tl-form-label">Primary Interest</label>
              <select name="service" class="tl-select">
                <option value="Digital Marketing & SEO">Digital Marketing & SEO</option>
                <option value="Google & Meta Ads">Google & Meta Ads</option>
                <option value="High-Converting Website Design">Website Design</option>
                <option value="CRM & AI Workflow Automation">CRM & AI Automation</option>
                <option value="Brand Strategy & Growth">Brand Strategy</option>
              </select>
            </div>
            <div class="tl-form-group">
              <label class="tl-form-label">Preferred Date *</label>
              <input type="date" name="booking_date" class="tl-input" required>
            </div>
          </div>
          <div class="tl-form-group">
            <label class="tl-form-label">Preferred Time Slot</label>
            <select name="booking_time" class="tl-select">
              <option value="10:00 AM">10:00 AM - 10:30 AM</option>
              <option value="12:00 PM">12:00 PM - 12:30 PM</option>
              <option value="02:30 PM">02:30 PM - 03:00 PM</option>
              <option value="04:30 PM">04:30 PM - 05:00 PM</option>
              <option value="06:00 PM">06:00 PM - 06:30 PM</option>
            </select>
          </div>
          <div class="tl-form-group">
            <label class="tl-form-label">Project Objectives / Notes</label>
            <textarea name="notes" class="tl-textarea" placeholder="Tell us a bit about your current goals and requirements..."></textarea>
          </div>
          <button type="submit" class="tl-submit-btn" id="tlConsultBtn">
            Confirm Consultation Request ➔
          </button>
        </form>
      </div>
    </div>
  `;

  // 2. Careers Application Modal
  const careerModalHTML = `
    <div class="tl-modal-backdrop" id="tlCareerModal">
      <div class="tl-modal">
        <button class="tl-modal-close" onclick="closeCareerModal()">✕</button>
        <div class="tl-modal-header">
          <span class="tl-modal-tag">ThinkLab Careers</span>
          <h2 class="tl-modal-title" id="tlCareerRoleTitle">Apply for Position</h2>
          <p style="color:#aaa; font-size:14px; margin-top:6px;">Join our innovative team in Vijayawada or Sydney. Submit your details below.</p>
        </div>

        <form id="tlCareerForm" onsubmit="handleCareerSubmit(event)">
          <input type="hidden" name="position" id="tlTargetPosition" value="General Application">

          <div class="tl-form-group">
            <label class="tl-form-label">Full Name *</label>
            <input type="text" name="name" class="tl-input" placeholder="e.g. Alex Morgan" required>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="tl-form-group">
              <label class="tl-form-label">Email Address *</label>
              <input type="email" name="email" class="tl-input" placeholder="alex@gmail.com" required>
            </div>
            <div class="tl-form-group">
              <label class="tl-form-label">Phone Number *</label>
              <input type="tel" name="phone" class="tl-input" placeholder="+91 ..." required>
            </div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
            <div class="tl-form-group">
              <label class="tl-form-label">LinkedIn Profile</label>
              <input type="url" name="linkedin" class="tl-input" placeholder="https://linkedin.com/in/...">
            </div>
            <div class="tl-form-group">
              <label class="tl-form-label">Portfolio / GitHub / Work URL</label>
              <input type="url" name="portfolio" class="tl-input" placeholder="https://yourportfolio.com">
            </div>
          </div>

          <div class="tl-form-group">
            <label class="tl-form-label">Resume / CV (PDF, DOCX up to 10MB) *</label>
            <div class="tl-file-upload" onclick="document.getElementById('tlResumeFileInput').click()">
              <input type="file" id="tlResumeFileInput" name="resume" accept=".pdf,.doc,.docx" style="display:none;" onchange="handleFileChange(event)" required>
              <div style="font-size:24px; margin-bottom:4px;">📄</div>
              <div style="font-weight:600; color:#fff;">Click or Drag & Drop Resume File</div>
              <div class="tl-file-name" id="tlResumeFileName">No file selected</div>
            </div>
          </div>

          <div class="tl-form-group">
            <label class="tl-form-label">Cover Letter / Note</label>
            <textarea name="cover_letter" class="tl-textarea" placeholder="Why would you like to join ThinkLab? Tell us about your background..."></textarea>
          </div>

          <button type="submit" class="tl-submit-btn" id="tlCareerBtn">
            Submit Application ➔
          </button>
        </form>
      </div>
    </div>
  `;

  // Attach modals to DOM once loaded without duplication
  function ensureModals() {
    if (!document.getElementById('tlConsultationModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    if (!document.getElementById('tlCareerModal')) {
      document.body.insertAdjacentHTML('beforeend', careerModalHTML);
    }
  }

  function setupFaqAccordions() {
    document.querySelectorAll('[data-framer-name="Collapsed"], [data-framer-name="Expanded"]').forEach(item => {
      if (item.dataset.faqBound) return;
      item.dataset.faqBound = 'true';
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => {
        const isCollapsed = item.getAttribute('data-framer-name') === 'Collapsed';
        item.setAttribute('data-framer-name', isCollapsed ? 'Expanded' : 'Collapsed');
      });
    });
  }

  function initInteractiveSuite() {
    ensureModals();
    bindContactButtons();
    setupFaqAccordions();

    if (window.location.pathname.includes('contact-us')) {
      setupContactUsPage();
    }
    if (window.location.pathname.includes('careers')) {
      setupCareersPage();
    }
    setupNewsletterInputs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInteractiveSuite);
  } else {
    initInteractiveSuite();
  }

  // Modal controls
  window.openConsultModal = function () {
    const m = document.getElementById('tlConsultationModal');
    if (m) m.classList.add('active');
  };
  window.closeConsultModal = function () {
    const m = document.getElementById('tlConsultationModal');
    if (m) m.classList.remove('active');
  };

  window.openCareerModal = function (role = 'General Application') {
    const m = document.getElementById('tlCareerModal');
    const title = document.getElementById('tlCareerRoleTitle');
    const input = document.getElementById('tlTargetPosition');
    if (title) title.textContent = `Apply for: ${role}`;
    if (input) input.value = role;
    if (m) m.classList.add('active');
  };
  window.closeCareerModal = function () {
    const m = document.getElementById('tlCareerModal');
    if (m) m.classList.remove('active');
  };

  window.handleFileChange = function (e) {
    const file = e.target.files[0];
    const nameEl = document.getElementById('tlResumeFileName');
    if (nameEl) {
      nameEl.textContent = file ? `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)` : 'No file selected';
    }
  };

  // Form Handlers
  window.handleConsultationSubmit = async function (e) {
    e.preventDefault();
    const btn = document.getElementById('tlConsultBtn');
    const form = e.target;
    btn.disabled = true;
    btn.textContent = 'Submitting Request...';

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast(data.message);
        form.reset();
        closeConsultModal();
      } else {
        toast(data.error || 'Submission failed', true);
      }
    } catch (err) {
      toast('Network error submitting request. Please try again.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Confirm Consultation Request ➔';
    }
  };

  window.handleCareerSubmit = async function (e) {
    e.preventDefault();
    const btn = document.getElementById('tlCareerBtn');
    const form = e.target;
    btn.disabled = true;
    btn.textContent = 'Uploading Resume & Submitting...';

    const formData = new FormData(form);

    try {
      const res = await fetch('/api/careers', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast(data.message);
        form.reset();
        document.getElementById('tlResumeFileName').textContent = 'No file selected';
        closeCareerModal();
      } else {
        toast(data.error || 'Application failed', true);
      }
    } catch (err) {
      toast('Network error uploading application. Please check file size.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Application ➔';
    }
  };

  // Bind existing contact buttons
  function bindContactButtons() {
    document.querySelectorAll('a, button').forEach(el => {
      const text = el.textContent.trim().toUpperCase();
      if (text === 'CONTACT US' || text.includes('LET\'S TALK') || text.includes('BOOK A CALL')) {
        // If not already linking to contact-us, add consultation modal trigger
        if (!el.getAttribute('href') || el.getAttribute('href') === './' || el.getAttribute('href') === '/') {
          el.addEventListener('click', (ev) => {
            ev.preventDefault();
            openConsultModal();
          });
        }
      }
    });
  }

  // Setup Contact Us Page
  function setupContactUsPage() {
    // Check if an iframe or placeholder exists on /contact-us
    const iframes = document.querySelectorAll('iframe');
    if (iframes.length > 0) {
      const firstIframe = iframes[0];
      const parent = firstIframe.parentElement;

      // Create interactive tabs above/around iframe
      const directFormContainer = document.createElement('div');
      directFormContainer.className = 'tl-contact-wrapper';
      directFormContainer.innerHTML = `
        <div class="tl-tabs-header">
          <button class="tl-tab-btn active" id="tlTabDirect" onclick="switchContactMode('direct')">✉️ Send Message Directly</button>
          <button class="tl-tab-btn" id="tlTabConsult" onclick="switchContactMode('consult')">📅 Schedule 30-Min Call</button>
          <button class="tl-tab-btn" id="tlTabCalendly" onclick="switchContactMode('calendly')">📆 Calendly Widget</button>
        </div>

        <!-- Mode 1: Direct Contact Form -->
        <div id="tlModeDirect">
          <h3 style="font-family:'Unbounded',sans-serif; font-size:18px; margin-bottom:12px;">Get In Touch With Our Team</h3>
          <p style="color:#aaa; font-size:14px; margin-bottom:20px;">Send us a direct message and our strategists in Vijayawada or Sydney will get back to you promptly.</p>
          <form onsubmit="handleDirectContact(event)">
            <div class="tl-form-group">
              <label class="tl-form-label">Your Name *</label>
              <input type="text" name="name" class="tl-input" placeholder="e.g. Rahul Sharma" required>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
              <div class="tl-form-group">
                <label class="tl-form-label">Email Address *</label>
                <input type="email" name="email" class="tl-input" placeholder="rahul@example.com" required>
              </div>
              <div class="tl-form-group">
                <label class="tl-form-label">Phone Number</label>
                <input type="tel" name="phone" class="tl-input" placeholder="+91 9347580911">
              </div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
              <div class="tl-form-group">
                <label class="tl-form-label">Service of Interest</label>
                <select name="service" class="tl-select">
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="SEO & Growth">SEO & Search Visibility</option>
                  <option value="Google & Meta Ads">Google / Meta Performance Ads</option>
                  <option value="Website Design & Development">Website Design & Development</option>
                  <option value="CRM & AI Workflow Automation">CRM & AI Automation</option>
                  <option value="Brand Strategy">Brand Strategy</option>
                </select>
              </div>
              <div class="tl-form-group">
                <label class="tl-form-label">Estimated Budget</label>
                <select name="budget" class="tl-select">
                  <option value="< ₹50,000 / < $1,000">&lt; ₹50,000 / &lt; $1,000</option>
                  <option value="₹50k - ₹1.5L / $1k - $3k">₹50,000 - ₹1,50,000 ($1k - $3k)</option>
                  <option value="₹1.5L - ₹5L / $3k - $8k">₹1,50,000 - ₹5,00,000 ($3k - $8k)</option>
                  <option value="₹5L+ / $8k+">₹5,00,000+ ($8,000+)</option>
                </select>
              </div>
            </div>
            <div class="tl-form-group">
              <label class="tl-form-label">Project Details & Requirements *</label>
              <textarea name="message" class="tl-textarea" placeholder="Tell us about your project, current bottlenecks, and targets..." required></textarea>
            </div>
            <button type="submit" class="tl-submit-btn" id="tlDirectSubmitBtn">
              Send Message ➔
            </button>
          </form>
        </div>

        <!-- Mode 2: Quick Consultation Booking -->
        <div id="tlModeConsult" style="display:none;">
          <h3 style="font-family:'Unbounded',sans-serif; font-size:18px; margin-bottom:12px;">Reserve a Strategy Consultation</h3>
          <p style="color:#aaa; font-size:14px; margin-bottom:20px;">Pick a date and our team will prepare a customized audit for your brand.</p>
          <form onsubmit="handleConsultationSubmit(event)">
            <div class="tl-form-group">
              <label class="tl-form-label">Your Name *</label>
              <input type="text" name="name" class="tl-input" placeholder="e.g. Priya Patel" required>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
              <div class="tl-form-group">
                <label class="tl-form-label">Email Address *</label>
                <input type="email" name="email" class="tl-input" placeholder="priya@domain.com" required>
              </div>
              <div class="tl-form-group">
                <label class="tl-form-label">Phone Number *</label>
                <input type="tel" name="phone" class="tl-input" placeholder="+91 ..." required>
              </div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
              <div class="tl-form-group">
                <label class="tl-form-label">Preferred Date *</label>
                <input type="date" name="booking_date" class="tl-input" required>
              </div>
              <div class="tl-form-group">
                <label class="tl-form-label">Preferred Time Slot</label>
                <select name="booking_time" class="tl-select">
                  <option value="10:00 AM">10:00 AM - 10:30 AM IST</option>
                  <option value="02:00 PM">02:00 PM - 02:30 PM IST</option>
                  <option value="04:30 PM">04:30 PM - 05:00 PM IST</option>
                  <option value="07:00 PM">07:00 PM - 07:30 PM IST</option>
                </select>
              </div>
            </div>
            <div class="tl-form-group">
              <label class="tl-form-label">Topic / Brand URL</label>
              <textarea name="notes" class="tl-textarea" placeholder="Website link and topics you would like to cover..."></textarea>
            </div>
            <button type="submit" class="tl-submit-btn">
              Confirm Strategy Call ➔
            </button>
          </form>
        </div>
      `;

      if (parent) {
        parent.insertBefore(directFormContainer, firstIframe);
        // By default show direct form, hide calendly iframe until chosen
        firstIframe.style.display = 'none';

        window.switchContactMode = function (mode) {
          const tabD = document.getElementById('tlTabDirect');
          const tabC = document.getElementById('tlTabConsult');
          const tabCal = document.getElementById('tlTabCalendly');
          const modeD = document.getElementById('tlModeDirect');
          const modeC = document.getElementById('tlModeConsult');

          tabD.classList.toggle('active', mode === 'direct');
          tabC.classList.toggle('active', mode === 'consult');
          tabCal.classList.toggle('active', mode === 'calendly');

          modeD.style.display = mode === 'direct' ? 'block' : 'none';
          modeC.style.display = mode === 'consult' ? 'block' : 'none';
          firstIframe.style.display = mode === 'calendly' ? 'block' : 'none';
        };
      }
    }
  }

  // Handle direct contact submission
  window.handleDirectContact = async function (e) {
    e.preventDefault();
    const btn = document.getElementById('tlDirectSubmitBtn');
    const form = e.target;
    btn.disabled = true;
    btn.textContent = 'Sending Message...';

    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast(data.message);
        form.reset();
      } else {
        toast(data.error || 'Failed to send message', true);
      }
    } catch (err) {
      toast('Network error sending message. Please try again.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Message ➔';
    }
  };

  // Setup Careers Page Opening Cards
  function setupCareersPage() {
    // Find all job title elements or links on careers page
    const openings = [
      'Social Media Coordinator',
      'Video Editor',
      'Project Consultant',
      'Web Developer Intern',
      'Content Creator',
      'Graphic Designer / Social Media Manager'
    ];

    document.querySelectorAll('*').forEach(el => {
      openings.forEach(role => {
        if (el.textContent && el.textContent.trim() === role && !el.dataset.boundCareer) {
          el.dataset.boundCareer = 'true';
          const card = el.closest('div[class*="framer"]') || el;
          card.style.cursor = 'pointer';
          card.setAttribute('title', `Click to apply for ${role}`);

          // Add a sleek apply button if not already present
          const applyTag = document.createElement('div');
          applyTag.style.cssText = 'margin-top:12px; display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:rgba(126,111,240,0.18); border:1px solid rgba(126,111,240,0.35); border-radius:8px; color:#fff; font-size:13px; font-weight:700;';
          applyTag.innerHTML = `💼 Apply for Role ➔`;
          card.appendChild(applyTag);

          card.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            openCareerModal(role);
          });
        }
      });
    });
  }

  // Intercept newsletter email inputs
  function setupNewsletterInputs() {
    document.querySelectorAll('input[type="email"]').forEach(input => {
      // If it's part of our modal or contact forms, skip
      if (input.closest('#tlConsultationModal') || input.closest('#tlCareerModal') || input.closest('.tl-contact-wrapper')) {
        return;
      }

      // Check if inside a form or container with button
      const parentForm = input.closest('form');
      if (parentForm) {
        parentForm.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const email = input.value.trim();
          if (!email) return;
          try {
            const res = await fetch('/api/newsletter', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, source: window.location.pathname })
            });
            const d = await res.json();
            toast(d.message);
            input.value = '';
          } catch (e) {
            toast('Subscription failed. Please try again.', true);
          }
        });
      }
    });
  }

})();

