import { SceneManager } from '../core/SceneManager.js';
import { ScrollRig } from '../core/ScrollRig.js';
import { setupNavigation, setActiveNavChapter } from '../components/Navigation.js';
import { setupCursor } from '../components/Cursor.js';
import { AetherLoader } from '../components/Loader.js';
import { sound } from '../components/SoundFX.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Ensure page always starts at top (progress 0) on load or refresh
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

async function initHeadphones() {
  window.scrollTo(0, 0);
  const loader = new AetherLoader();
  const scrollRig = new ScrollRig();
  if (scrollRig && scrollRig.lenis) {
    scrollRig.lenis.scrollTo(0, { immediate: true });
  }

  setupNavigation(scrollRig);
  setupCursor();
  const canvas = document.getElementById('webgl-canvas');
  const sceneManager = new SceneManager(canvas);
  window.__sceneManager = sceneManager;

  // Initial Hero Staging - Far Right Side Staging Matching Reference
  sceneManager.modelPos = { x: 2.05, y: -0.23, z: 0 };
  sceneManager.modelRot = { x: 0.20, y: 0.55, z: 0.08 };
  sceneManager.cameraPos = { x: 0, y: 0, z: 4.6 };
  sceneManager.cameraLookAt = { x: 0, y: 0, z: 0 };
  sceneManager.setAcousticRings(0, 0, 0);

  // Initial Overlay Setup using GSAP autoAlpha & gentle y offset for smooth entrance
  gsap.set(['#chapter-resonance', '#chapter-immersion', '#chapter-craft', '#chapter-finale'], {
    y: 36,
    scale: 1,
    autoAlpha: 0,
    pointerEvents: 'none',
  });
  // Set individual typography elements in place for pure fade-in reveals on scroll
  gsap.set('.ch-eyebrow, .ch-headline, .ch-details, .ch-subhead, .ch-swatches, .ch-actions', {
    y: 0,
    scale: 1,
    autoAlpha: 0,
  });

  gsap.set('#main-footer', {
    yPercent: 100,
    pointerEvents: 'none',
  });
  gsap.set('#chapter-hero', {
    y: 0,
    scale: 1,
    autoAlpha: 1,
    pointerEvents: 'auto',
  });
  // Prime hero elements for the choreographed reveal
  gsap.set(['#chapter-hero h1', '#chapter-hero p', '#chapter-hero .btn-hero-explore', '#chapter-hero .font-mono', '#main-nav', '#top-timeline-track'], {
    opacity: 0,
  });

  try {
    // Load 3D model in parallel with the smooth progress meter
    const modelPromise = sceneManager
      .loadModel('headphones', '/models/headphones.glb', 0.894, 0)
      .then((model) => {
        sceneManager.displayModel('headphones');
        return model;
      })
      .catch((err) => {
        console.warn('3D Model deferred or error:', err);
        return null;
      });

    // Wait for smooth progress animation and model loading with a 6.0s safety ceiling
    await Promise.race([
      Promise.all([loader.complete(), modelPromise]),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);

    // Ensure model is displayed in the scene
    sceneManager.displayModel('headphones');

    // Luxury Entrance Reveal Sequence
    loader.revealHero({
      nav: '#main-nav',
      headline: '#chapter-hero h1',
      body: '#chapter-hero p',
      btn: '#chapter-hero .btn-hero-explore',
      badge: '#chapter-hero .font-mono',
      timeline: '#top-timeline-track',
      sceneManager,
    });

    // Force ScrollTrigger calibration once scene and DOM are settled
    ScrollTrigger.refresh();
    window.addEventListener('resize', () => ScrollTrigger.refresh());

    // Cache Telemetry DOM Elements & Top Scrollbar Rail
    const decouplingReadout = document.getElementById('decoupling-readout');
    const decouplingBar = document.getElementById('decoupling-bar');
    const decouplingNode = document.getElementById('decoupling-node');
    const resonanceGaugeFill = document.getElementById('resonance-gauge-fill');
    const resonanceGaugeNode = document.getElementById('resonance-gauge-node');
    const metrologyTitle = document.getElementById('metrology-target-title');
    const metrologyMat = document.getElementById('metrology-mat-val');
    const metrologySurf = document.getElementById('metrology-surf-val');
    const chapterLabel = document.getElementById('pinned-chapter-label');
    const topTimelineTrack = document.getElementById('top-timeline-track');
    const topTimelineLine = document.getElementById('top-timeline-line');

    // High-Performance GPU Hardware-Accelerated Top Timeline Controller (Zero Reflow, Zero Stutter)
    const updateTopTimeline = (p) => {
      if (topTimelineLine) {
        const clamped = Math.min(1, Math.max(0, p));
        topTimelineLine.style.transform = `scaleX(${clamped})`;
      }
    };

    // Initialize timeline fulfillment at 0%
    updateTopTimeline(0);

    // Drive Top Timeline directly from Lenis 60/120fps RAF scroll loop (Eliminates GSAP scrub lag & stutter)
    if (scrollRig && scrollRig.lenis) {
      scrollRig.lenis.on('scroll', (e) => {
        const p = typeof e.progress === 'number' ? e.progress : (e.scroll / Math.max(1, e.limit));
        updateTopTimeline(p);
      });
    }

    // Passive fallback for native scroll
    window.addEventListener('scroll', () => {
      if (!scrollRig || !scrollRig.lenis) {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const p = maxScroll > 0 ? window.scrollY / maxScroll : 0;
        updateTopTimeline(p);
      }
    }, { passive: true });

    // Interactive Click-to-Seek on Top Storyline Timeline
    if (topTimelineTrack) {
      topTimelineTrack.addEventListener('click', (e) => {
        const rect = topTimelineTrack.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const track = document.getElementById('story-track');
        const maxScroll = track ? track.scrollHeight - window.innerHeight : 0;
        const targetY = maxScroll * ratio;
        if (scrollRig && scrollRig.lenis) {
          scrollRig.lenis.scrollTo(targetY, { duration: 2.6 });
        } else {
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      });
    }

    // Explore Buttons (Hero & Nav) Smooth Scroll to Chapter 02
    const handleExplore = (e) => {
      e.preventDefault();
      const track = document.getElementById('story-track');
      const maxScroll = track ? track.scrollHeight - window.innerHeight : 0;
      const targetY = maxScroll * 0.21;
      if (scrollRig && scrollRig.lenis) {
        scrollRig.lenis.scrollTo(targetY, { duration: 2.6 });
      } else {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    };

    const heroExploreBtn = document.querySelector('.btn-hero-explore');
    const navExploreBtn = document.querySelector('.btn-nav-explore');
    if (heroExploreBtn) heroExploreBtn.addEventListener('click', handleExplore);
    if (navExploreBtn) navExploreBtn.addEventListener('click', handleExplore);

    // =========================================================================
    // MASTER PINNED TIMELINE: SCREEN STAYS PINNED TO VIEWPORT ACROSS ALL CHAPTERS
    // =========================================================================
    const masterTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: '#story-track',
        pin: '#story-pinned',
        pinSpacing: false,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 2.0,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress;

          let nextChapterName = 'ARRIVAL';
          let nextChapterId = 'arrival';
          if (p < 0.12) {
            nextChapterName = 'ARRIVAL';
            nextChapterId = 'arrival';
          } else if (p < 0.30) {
            nextChapterName = 'RESONANCE';
            nextChapterId = 'resonance';
          } else if (p < 0.48) {
            nextChapterName = 'IMMERSION';
            nextChapterId = 'immersion';
          } else if (p < 0.76) {
            nextChapterName = 'CRAFT';
            nextChapterId = 'craft';
          } else {
            nextChapterName = 'THE ARTIFACT';
            nextChapterId = 'artifact';
          }

          if (chapterLabel && chapterLabel.textContent !== nextChapterName) {
            gsap.killTweensOf(chapterLabel);
            gsap.to(chapterLabel, {
              opacity: 0,
              y: -4,
              duration: 0.35,
              ease: 'power2.in',
              onComplete: () => {
                chapterLabel.textContent = nextChapterName;
                gsap.to(chapterLabel, {
                  opacity: 1,
                  y: 0,
                  duration: 0.55,
                  ease: 'power2.out',
                });
              },
            });
          }
          setActiveNavChapter(nextChapterId);
        },
      },
    });
    window.__masterTimeline = masterTimeline;

    // -------------------------------------------------------------------------
    // SEGMENT 01: HERO / ARRIVAL (0 - 90)
    // -------------------------------------------------------------------------
    masterTimeline
      // Chapter 01 gently drifts upward and dissolves smoothly
      .to('#chapter-hero', {
        y: -30,
        autoAlpha: 0,
        ease: 'sine.inOut',
        duration: 45,
      }, 45)
      .set('#chapter-hero', { pointerEvents: 'none' }, 90);

    // -------------------------------------------------------------------------
    // SEGMENT 02: SCULPTURAL RESONANCE (75 - 225)
    // -------------------------------------------------------------------------
    masterTimeline
      // Model & Camera glide unhurriedly into resonance portrait (45 to 125, duration: 80)
      .to(sceneManager.modelPos, {
        x: 1.38,
        y: -0.08,
        z: 0.0,
        ease: 'sine.inOut',
        duration: 80,
      }, 45)
      .to(sceneManager.modelRot, {
        x: 0.15,
        y: 0.27,
        z: 0.0,
        ease: 'sine.inOut',
        duration: 80,
      }, 45)
      .to(sceneManager.cameraPos, {
        z: 4.95,
        ease: 'sine.inOut',
        duration: 80,
      }, 45)
      // Chapter 02 ascends gracefully from below as Hero clears
      .set('#chapter-resonance', { pointerEvents: 'auto' }, 80)
      .to('#chapter-resonance', {
        y: 0,
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 48,
      }, 80)
      .to('#chapter-resonance .ch-eyebrow', {
        autoAlpha: 1,
        letterSpacing: '0.28em',
        ease: 'sine.out',
        duration: 40,
      }, 80)
      .to('#chapter-resonance .ch-headline', {
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 44,
      }, 84)
      .to('#chapter-resonance .ch-details', {
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 44,
      }, 90)
      // Expand concentric acoustic rings gracefully
      .to({ ringP: 0, ringA: 0 }, {
        ringP: 1.0,
        ringA: 0.95,
        duration: 55,
        ease: 'sine.inOut',
        onUpdate: function () {
          const vals = this.targets()[0];
          sceneManager.setAcousticRings(vals.ringP, 0, vals.ringA);
          const gaugePct = 20 + vals.ringP * 38;
          if (resonanceGaugeFill) resonanceGaugeFill.style.width = `${gaugePct}%`;
          if (resonanceGaugeNode) resonanceGaugeNode.style.left = `${gaugePct}%`;
        },
      }, 90)
      // Chapter 02 exits gracefully with upward drift
      .to('#chapter-resonance', {
        y: -30,
        autoAlpha: 0,
        ease: 'sine.inOut',
        duration: 45,
      }, 175)
      .set('#chapter-resonance', { pointerEvents: 'none' }, 220);

    // -------------------------------------------------------------------------
    // SEGMENT 03: THE SENSORY VOID / IMMERSION (205 - 355)
    // -------------------------------------------------------------------------
    masterTimeline
      // Model & Camera glide smoothly from right to left across the screen (165 to 245, duration: 80)
      .to(sceneManager.modelPos, {
        x: -0.92,
        y: -0.06,
        z: 0.05,
        ease: 'sine.inOut',
        duration: 80,
      }, 165)
      .to(sceneManager.modelRot, {
        x: 0.08,
        y: 0.22,
        z: 0.04,
        ease: 'sine.inOut',
        duration: 80,
      }, 165)
      .to(sceneManager.cameraPos, {
        z: 4.35,
        ease: 'sine.inOut',
        duration: 80,
      }, 165)
      // Chapter 03 enters smoothly from below on the right side
      .set('#chapter-immersion', { pointerEvents: 'auto' }, 205)
      .to('#chapter-immersion', {
        y: 0,
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 48,
      }, 205)
      .to('#chapter-immersion .ch-eyebrow', {
        autoAlpha: 1,
        letterSpacing: '0.28em',
        ease: 'sine.out',
        duration: 40,
      }, 205)
      .to('#chapter-immersion .ch-headline', {
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 44,
      }, 209)
      .to('#chapter-immersion .ch-details', {
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 44,
      }, 215)
      // Align portal rings & update decibel readout smoothly
      .to({ portal: 0 }, {
        portal: 1.0,
        duration: 55,
        ease: 'sine.inOut',
        onUpdate: function () {
          const vals = this.targets()[0];
          sceneManager.setAcousticRings(1.0, vals.portal, 0.95);
          const currentDb = Math.round(+65 - vals.portal * (65 + 42));
          const pct = Math.min(100, vals.portal * 100);
          if (decouplingReadout) decouplingReadout.textContent = `${currentDb} dBA`;
          if (decouplingBar) decouplingBar.style.width = `${pct}%`;
          if (decouplingNode) decouplingNode.style.left = `${pct}%`;
        },
      }, 215)
      // Chapter 03 exits gracefully with upward drift
      .to('#chapter-immersion', {
        y: -30,
        autoAlpha: 0,
        ease: 'sine.inOut',
        duration: 45,
      }, 305)
      .set('#chapter-immersion', { pointerEvents: 'none' }, 350);

    // Track shared explode state object for bidirectional scrub precision
    const explodeState = { value: 0 };

    // -------------------------------------------------------------------------
    // SEGMENT 04: ANATOMICAL DECONSTRUCTION / CRAFT (335 - 560)
    // -------------------------------------------------------------------------
    masterTimeline
      // Model & Camera transition smoothly from left to right side (295 to 365, duration: 70)
      .to(sceneManager.modelPos, {
        x: 0.98,
        y: -0.06,
        z: 0.0,
        ease: 'sine.inOut',
        duration: 70,
      }, 295)
      .to(sceneManager.modelRot, {
        x: 0.05,
        y: Math.PI * 0.5 - 0.16,
        z: 0.0,
        ease: 'sine.inOut',
        duration: 70,
      }, 295)
      .to(sceneManager.cameraPos, {
        z: 4.65,
        ease: 'sine.inOut',
        duration: 70,
      }, 295)
      // Dissolve acoustic rings smoothly
      .to({ ringDissolve: 1 }, {
        ringDissolve: 0,
        duration: 55,
        ease: 'sine.out',
        onUpdate: function () {
          const r = this.targets()[0].ringDissolve;
          sceneManager.setAcousticRings(1.0, 1.0, r * 0.95);
        },
      }, 295)
      // Ensure model starts assembled
      .call(() => {
        explodeState.value = 0;
        sceneManager.setExplode(0);
      }, null, 300)
      // Chapter 04 enters smoothly from below
      .set('#chapter-craft', { pointerEvents: 'auto' }, 335)
      .to('#chapter-craft', {
        y: 0,
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 48,
      }, 335)
      .to('#chapter-craft .ch-eyebrow', {
        autoAlpha: 1,
        letterSpacing: '0.28em',
        ease: 'sine.out',
        duration: 40,
      }, 335)
      .to('#chapter-craft .ch-headline', {
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 44,
      }, 339)
      .to('#chapter-craft .ch-details', {
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 44,
      }, 345)
      // EXPANSIVE ANATOMICAL BREAKDOWN WITH 360 ROTATION (380 to 445, duration: 65)
      .to(explodeState, {
        value: 1.0,
        ease: 'sine.inOut',
        duration: 65,
        onUpdate: () => {
          sceneManager.setExplode(explodeState.value);
        },
      }, 380)
      .to(sceneManager.modelRot, {
        x: 0.06,
        y: (Math.PI * 0.5 - 0.16) + Math.PI * 2.0,
        z: 0.0,
        ease: 'sine.inOut',
        duration: 65,
      }, 380)
      .to(sceneManager.modelPos, {
        x: 0.98,
        y: -0.05,
        z: 0.02,
        ease: 'sine.inOut',
        duration: 65,
      }, 380)
      // UNHURRIED PRECISION REASSEMBLY (465 to 525, duration: 60 - fully matching explosion pacing)
      .to(explodeState, {
        value: 0.0,
        ease: 'sine.inOut',
        duration: 60,
        onUpdate: () => {
          sceneManager.setExplode(explodeState.value);
        },
      }, 465)
      // Chapter 04 exits smoothly with upward drift
      .to('#chapter-craft', {
        y: -30,
        autoAlpha: 0,
        ease: 'sine.inOut',
        duration: 45,
      }, 515)
      .set('#chapter-craft', { pointerEvents: 'none' }, 560);

    // -------------------------------------------------------------------------
    // SEGMENT 05: THE ARTIFACT & FINALE (545 - 655)
    // -------------------------------------------------------------------------
    masterTimeline
      // Smoothly reposition model and camera into iconic 3/4 hero portrait (515 to 585, duration: 70)
      .to(sceneManager.modelPos, {
        x: 1.95,
        y: -0.16,
        z: 0,
        ease: 'sine.inOut',
        duration: 70,
      }, 515)
      .to(sceneManager.modelRot, {
        x: 0.16,
        y: Math.PI * 4.0 + 0.42,
        z: 0.04,
        ease: 'sine.inOut',
        duration: 70,
      }, 515)
      .to(sceneManager.cameraPos, {
        z: 4.8,
        ease: 'sine.inOut',
        duration: 70,
      }, 515)
      .to(sceneManager.cameraLookAt, {
        x: 0,
        y: -0.05,
        z: 0,
        ease: 'sine.inOut',
        duration: 70,
      }, 515)
      // Chapter 05 enters smoothly from below
      .set('#chapter-finale', { pointerEvents: 'auto' }, 545)
      .to('#chapter-finale', {
        y: 0,
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 48,
      }, 545)
      .to('#chapter-finale .ch-eyebrow', {
        autoAlpha: 1,
        letterSpacing: '0.28em',
        ease: 'sine.out',
        duration: 40,
      }, 545)
      .to('#chapter-finale .ch-headline', {
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 44,
      }, 549)
      .to('#chapter-finale .ch-subhead', {
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 42,
      }, 555)
      .to('#chapter-finale .ch-swatches', {
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 42,
      }, 561)
      .to('#chapter-finale .ch-actions', {
        autoAlpha: 1,
        ease: 'sine.out',
        duration: 42,
      }, 567);

    // -------------------------------------------------------------------------
    // SEGMENT 06: THE BLANKET FOOTER OVERLAY (645 - 725)
    // -------------------------------------------------------------------------
    masterTimeline
      // Chapter 05 text dissolves and drifts upward as the blanket rises
      .to('#chapter-finale', {
        y: -30,
        autoAlpha: 0,
        ease: 'sine.inOut',
        duration: 45,
      }, 645)
      .set('#chapter-finale', { pointerEvents: 'none' }, 690)
      // Bottom-right pinned HUD label fades out smoothly
      .to('#pinned-chapter-label', {
        autoAlpha: 0,
        ease: 'sine.inOut',
        duration: 32,
      }, 645)
      // 3D model gently recedes into shadow as the blanket covers it
      .to(sceneManager.modelPos, {
        y: -0.28,
        z: -0.35,
        ease: 'sine.inOut',
        duration: 50,
      }, 645)
      // The footer rises smoothly and slowly over Chapter 05 like a luxurious blanket
      .to('#main-footer', {
        yPercent: 0,
        pointerEvents: 'auto',
        ease: 'power2.out',
        duration: 75,
      }, 645);

    // =========================================================================
    // MICRO-INTERACTIONS ENGINE
    // =========================================================================

    // --- Ensure audio context resumes on first user interaction ---
    const enableAudio = () => {
      try { sound.init(); } catch { }
      window.removeEventListener('pointerdown', enableAudio);
    };
    window.addEventListener('pointerdown', enableAudio, { once: true });

    // --- Click Ripple on any interactive button/link ---
    document.addEventListener('click', (e) => {
      const clickTarget = e.target.closest('button, a, .color-btn, #top-timeline-track');
      if (!clickTarget) return;

      const ripple = document.createElement('span');
      ripple.className = 'click-ripple';
      const rect = clickTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.35;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      const prevPos = window.getComputedStyle(clickTarget).position;
      if (prevPos === 'static') clickTarget.style.position = 'relative';
      clickTarget.appendChild(ripple);

      setTimeout(() => ripple.remove(), 950);
    });

    // --- Magnetic hover effect for buttons (high-performance quickTo, zero GC allocations) ---
    const magneticButtons = document.querySelectorAll(
      '#nav-reserve-btn, .btn-hero-explore, #reserve-btn, .btn-footer-explore, #confirm-reserve, .color-btn, #back-to-top, #modal-close'
    );

    magneticButtons.forEach((btn) => {
      const strength = btn.classList.contains('color-btn') ? 0.10 : 0.08;
      const setX = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'power3.out' });
      const setY = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'power3.out' });

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * strength;
        const y = (e.clientY - rect.top - rect.height / 2) * strength;
        setX(x);
        setY(y);
      });

      btn.addEventListener('mouseleave', () => {
        setX(0);
        setY(0);
      });
    });

    // --- Interactive Gauges Micro-Interaction (Chapters 02 & 03) ---
    const resonanceGauge = document.querySelector('#chapter-resonance .ch-details');
    if (resonanceGauge && resonanceGaugeNode) {
      resonanceGauge.addEventListener('mouseenter', () => {
        try { sound.playHover(); } catch { }
        gsap.to(resonanceGaugeNode, { scale: 1.22, boxShadow: '0 0 14px rgba(255,255,255,0.9)', duration: 0.6, ease: 'power2.out' });
      });
      resonanceGauge.addEventListener('mouseleave', () => {
        gsap.to(resonanceGaugeNode, { scale: 1.0, boxShadow: '0 0 8px rgba(255,255,255,0.85)', duration: 0.7, ease: 'power2.out' });
      });
    }

    const decouplingGauge = document.querySelector('#chapter-immersion .ch-details');
    if (decouplingGauge && decouplingNode) {
      decouplingGauge.addEventListener('mouseenter', () => {
        try { sound.playHover(); } catch { }
        gsap.to(decouplingNode, { scale: 1.22, boxShadow: '0 0 14px rgba(255,255,255,0.9)', duration: 0.6, ease: 'power2.out' });
        if (decouplingReadout) gsap.to(decouplingReadout, { color: '#FFFFFF', textShadow: '0 0 12px rgba(255,255,255,0.6)', duration: 0.5, ease: 'power2.out' });
      });
      decouplingGauge.addEventListener('mouseleave', () => {
        gsap.to(decouplingNode, { scale: 1.0, boxShadow: '0 0 8px rgba(255,255,255,0.85)', duration: 0.7, ease: 'power2.out' });
        if (decouplingReadout) gsap.to(decouplingReadout, { color: '#C8C5C0', textShadow: 'none', duration: 0.6, ease: 'power2.out' });
      });
    }

    // --- Staggered entrance for footer columns on visibility ---
    const footerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const columns = entry.target.querySelectorAll('.lg\\:col-span-6, .lg\\:col-span-3');
            gsap.fromTo(
              columns,
              { y: 25, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.9,
                stagger: 0.15,
                ease: 'sine.out',
              }
            );

            // Animate footer divider line
            const divider = entry.target.querySelector('.bg-white\\/10');
            if (divider) {
              gsap.fromTo(divider,
                { scaleX: 0, transformOrigin: 'left center' },
                { scaleX: 1, duration: 1.0, ease: 'power2.out', delay: 0.4 }
              );
            }

            // Animate sub-footer
            const subFooter = entry.target.querySelector('.flex.flex-col.sm\\:flex-row');
            if (subFooter) {
              gsap.fromTo(subFooter,
                { y: 12, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, ease: 'sine.out', delay: 0.6 }
              );
            }

            footerObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    const footerContent = document.querySelector('#main-footer .max-w-\\[1600px\\]');
    if (footerContent) footerObserver.observe(footerContent);

    // --- Hover sound feedback on nav links ---
    const hoverSoundTargets = document.querySelectorAll(
      '.nav-story-link, .nav-chapter-link, #nav-reserve-btn, #back-to-top, footer a[target="_blank"]'
    );
    hoverSoundTargets.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        try { sound.playHover(); } catch { }
      });
    });

    // --- Parallax tilt on modal panel (subtle, dampened) ---
    const modalPanel = document.querySelector('#reservation-modal .glass-panel');
    if (modalPanel) {
      modalPanel.addEventListener('mousemove', (e) => {
        const rect = modalPanel.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(modalPanel, {
          rotateY: x * 1.5,
          rotateX: -y * 1.5,
          duration: 0.8,
          ease: 'power2.out',
          transformPerspective: 900,
        });
      });

      modalPanel.addEventListener('mouseleave', () => {
        gsap.to(modalPanel, {
          rotateY: 0,
          rotateX: 0,
          duration: 1.0,
          ease: 'power3.out',
        });
      });
    }

    // =========================================================================
    // RESERVATION MODAL INTERACTION
    // =========================================================================
    const modal = document.getElementById('reservation-modal');
    const reserveBtn = document.getElementById('reserve-btn');
    const modalClose = document.getElementById('modal-close');
    const confirmReserve = document.getElementById('confirm-reserve');

    const openModal = () => {
      if (!modal) return;
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modal.classList.add('opacity-100', 'pointer-events-auto');
    };

    const closeModal = () => {
      if (!modal) return;
      modal.classList.remove('opacity-100', 'pointer-events-auto');
      modal.classList.add('opacity-0', 'pointer-events-none');
    };

    const navReserveBtn = document.getElementById('nav-reserve-btn');
    if (reserveBtn) reserveBtn.addEventListener('click', openModal);
    if (navReserveBtn) navReserveBtn.addEventListener('click', openModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Storyline navigation links (in footer and elsewhere)
    const footerStoryLinks = document.querySelectorAll('.nav-chapter-link');
    const CHAPTER_PROGRESS = {
      arrival: 0.0,
      resonance: 0.21,
      immersion: 0.39,
      craft: 0.59,
      artifact: 0.85,
      specs: 1.0,
    };
    footerStoryLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const ch = link.dataset.chapter;
        const prog = CHAPTER_PROGRESS[ch] ?? 0;
        const track = document.getElementById('story-track');
        const maxScroll = track ? track.scrollHeight - window.innerHeight : 0;
        const targetY = maxScroll * prog;
        if (scrollRig && scrollRig.lenis) {
          scrollRig.lenis.scrollTo(targetY, { duration: 2.6 });
        } else {
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      });
    });

    if (confirmReserve) {
      confirmReserve.addEventListener('click', () => {
        confirmReserve.textContent = 'ALLOCATION CONFIRMED ✓';
        confirmReserve.classList.add('bg-emerald-600', 'text-white');
        setTimeout(() => {
          closeModal();
          confirmReserve.textContent = 'CONFIRM ALLOCATION REQUEST';
          confirmReserve.classList.remove('bg-emerald-600', 'text-white');
        }, 1800);
      });
    }

    // =========================================================================
    // 360° DRAG INSPECTION & COLORWAY PREVIEW
    // =========================================================================
    const colorBtns = document.querySelectorAll('.color-btn');
    const colorLabel = document.getElementById('active-colorway-label');

    colorBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        try { sound.playSwitchClick(); } catch { }
        const color = btn.dataset.color;
        const name = btn.dataset.name || color.toUpperCase();

        colorBtns.forEach((b) => {
          b.classList.remove('border-white');
          b.classList.add('border-transparent');
        });
        btn.classList.remove('border-transparent');
        btn.classList.add('border-white');

        if (colorLabel) colorLabel.textContent = name;
        sceneManager.setColorway(color);
      });
    });

    // 360 Turntable Demo Spin button
    const dragPill = document.getElementById('drag-inspect-pill');
    if (dragPill) {
      dragPill.addEventListener('click', (e) => {
        e.stopPropagation();
        gsap.to(sceneManager.dragRotation, {
          y: sceneManager.dragRotation.y + Math.PI * 2,
          duration: 2.4,
          ease: 'power2.inOut',
        });
      });
    }

    // =========================================================================
    // FOOTER INTERACTIVE HANDLERS (BACK TO TOP & EXPLORE)
    // =========================================================================
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (scrollRig && scrollRig.lenis) {
          scrollRig.lenis.scrollTo(0, { duration: 2.6 });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    const footerExploreBtns = document.querySelectorAll('.btn-footer-explore');
    footerExploreBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const track = document.getElementById('story-track');
        const maxScroll = track ? track.scrollHeight - window.innerHeight : 0;
        if (scrollRig && scrollRig.lenis) {
          scrollRig.lenis.scrollTo(maxScroll, { duration: 2.6 });
        } else {
          window.scrollTo({ top: maxScroll, behavior: 'smooth' });
        }
      });
    });

  } catch (err) {
    console.error('Error initializing headphones page:', err);
    try {
      loader.revealHero();
    } catch (e) {
      document.getElementById('aether-loader')?.remove();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeadphones);
} else {
  initHeadphones();
}
