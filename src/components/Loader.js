import gsap from 'gsap';

export class AetherLoader {
  constructor() {
    this.container = null;
    this.isRevealed = false;
    this.currentProgress = 0;
    this.targetProgress = 12;
    this.isCompleting = false;
    this.createDOM();
    this.startProgress();

    // Safety watchdog: ensure loader is never stuck on screen under any circumstance
    this.safetyTimeout = setTimeout(() => {
      if (!this.isRevealed) {
        console.warn('Loader safety watchdog triggered - auto revealing hero');
        this.revealHero();
      }
    }, 4500);
  }

  createDOM() {
    let existing = document.getElementById('aether-loader');
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = 'aether-loader';
      this.container.className =
        'fixed inset-0 z-[99999] select-none pointer-events-auto overflow-hidden';

      this.container.innerHTML = `
        <!-- Dual Precision Shutter Curtains (Seamless, no border seams) -->
        <div class="curtain-top absolute top-0 left-0 w-full h-[51%] bg-[#12151B] z-10"></div>
        <div class="curtain-bottom absolute bottom-0 left-0 w-full h-[51%] bg-[#12151B] z-10"></div>

        <!-- Center Brand & Smooth Loading Meter -->
        <div class="loader-center absolute inset-0 z-20 flex flex-col items-center justify-center text-center pointer-events-none">
          <!-- Ambient subtle studio halo -->
          <div class="loader-halo absolute w-[380px] h-[380px] rounded-full pointer-events-none -z-10" style="background: radial-gradient(circle, rgba(255, 255, 255, 0.035) 0%, rgba(18, 21, 27, 0) 70%);"></div>

          <!-- Minimalist Brand Logo -->
          <div class="loader-brand-title font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-[0.38em] text-[#ECEBE8] leading-none ml-4">
            AETHER
          </div>
          <div class="loader-brand-sub tracking-[0.32em] text-[9px] sm:text-[10px] font-sans font-medium uppercase text-[#5B6068] mt-3.5 ml-2">
            PRECISION HARDWARE
          </div>

          <!-- Smooth Luxury Loading Meter -->
          <div class="loader-meter-container mt-8 flex flex-col items-center gap-2.5">
            <div class="flex items-center gap-2.5 text-[9.5px] font-mono tracking-[0.26em] text-[#8E939E]">
              <span class="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse"></span>
              <span class="loader-status uppercase">CALIBRATING</span>
              <span class="loader-percent text-[#ECEBE8] font-medium ml-1">0%</span>
            </div>

            <!-- Refined Hairline Gauge -->
            <div class="w-44 sm:w-56 h-[2px] bg-white/[0.08] relative rounded-full overflow-hidden">
              <div class="loader-meter-bar absolute top-0 left-0 h-full w-0 rounded-full"
                   style="background: linear-gradient(90deg, rgba(142, 147, 158, 0.4) 0%, #ECEBE8 100%); box-shadow: 0 0 10px rgba(236, 235, 232, 0.6); will-change: width;">
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.prepend(this.container);
    }

    this.center = this.container.querySelector('.loader-center');
    this.curtainTop = this.container.querySelector('.curtain-top');
    this.curtainBottom = this.container.querySelector('.curtain-bottom');
    this.meterBar = this.container.querySelector('.loader-meter-bar');
    this.percentEl = this.container.querySelector('.loader-percent');
    this.statusEl = this.container.querySelector('.loader-status');
  }

  setUIProgress(val) {
    const clamped = Math.min(100, Math.max(0, Math.floor(val)));
    this.currentProgress = clamped;
    if (this.meterBar) this.meterBar.style.width = `${clamped}%`;
    if (this.percentEl) this.percentEl.textContent = `${clamped}%`;
    if (this.statusEl) {
      if (clamped >= 100) {
        this.statusEl.textContent = 'READY';
      } else if (clamped >= 80) {
        this.statusEl.textContent = 'STAGING';
      } else if (clamped >= 40) {
        this.statusEl.textContent = 'INITIALIZING';
      } else {
        this.statusEl.textContent = 'CALIBRATING';
      }
    }
  }

  startProgress() {
    this.targetProgress = 25;
    const startTime = performance.now();

    const updateLoop = (now) => {
      if (this.isRevealed) return;

      const elapsed = now - startTime;
      if (!this.isCompleting) {
        // Natural progression asymptotic toward 88% while assets load
        const simulated = Math.min(88, Math.floor(18 + 70 * (1 - Math.exp(-elapsed / 1200))));
        this.targetProgress = Math.max(this.targetProgress, simulated);
      }

      // Smooth interpolation toward targetProgress
      const diff = this.targetProgress - this.currentProgress;
      if (Math.abs(diff) > 0.4) {
        this.setUIProgress(this.currentProgress + diff * 0.22);
      } else if (this.isCompleting && this.targetProgress >= 100) {
        this.setUIProgress(100);
        return;
      }

      requestAnimationFrame(updateLoop);
    };

    requestAnimationFrame(updateLoop);
  }

  updateDownloadProgress(ratio) {
    if (this.isCompleting) return;
    const modelPercent = Math.min(92, Math.floor(ratio * 92));
    this.targetProgress = Math.max(this.targetProgress, modelPercent);
  }

  async complete() {
    this.isCompleting = true;
    this.targetProgress = 100;

    return new Promise((resolve) => {
      const checkDone = () => {
        if (this.currentProgress >= 99 || this.isRevealed) {
          this.setUIProgress(100);
          // Very brief pause (160ms) so user registers "READY 100%" before the shutter reveal
          setTimeout(resolve, 160);
        } else {
          this.setUIProgress(this.currentProgress + (100 - this.currentProgress) * 0.32);
          requestAnimationFrame(checkDone);
        }
      };
      requestAnimationFrame(checkDone);
    });
  }

  revealHero(elements = {}) {
    if (this.safetyTimeout) {
      clearTimeout(this.safetyTimeout);
      this.safetyTimeout = null;
    }

    // Default target selectors to guarantee the hero section is NEVER invisible
    const targets = {
      nav: elements.nav || '#main-nav',
      headline: elements.headline || '#chapter-hero h1',
      body: elements.body || '#chapter-hero p',
      btn: elements.btn || '#chapter-hero .btn-hero-explore',
      badge: elements.badge || '#chapter-hero .font-mono',
      timeline: elements.timeline || '#top-timeline-track',
      sceneManager: elements.sceneManager || window.__sceneManager,
    };

    if (this.isRevealed) {
      // Curtains already parted - ensure any target elements are visible immediately
      [targets.nav, targets.headline, targets.body, targets.btn, targets.badge, targets.timeline].forEach((sel) => {
        if (sel) {
          gsap.to(sel, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
        }
      });
      return;
    }
    this.isRevealed = true;

    if (this.container) {
      this.container.style.pointerEvents = 'none';
    }

    const tl = gsap.timeline({
      onComplete: () => {
        if (this.container && this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
      },
    });

    // 1. Center brand logo and loading gauge dissolve with atmospheric subtlety
    if (this.center) {
      const meter = this.container.querySelector('.loader-meter-container');
      const title = this.container.querySelector('.loader-brand-title');
      const sub = this.container.querySelector('.loader-brand-sub');
      const halo = this.container.querySelector('.loader-halo');

      // The meter gently fades first with subtle downward drift
      if (meter) {
        tl.to(
          meter,
          {
            opacity: 0,
            y: 6,
            duration: 0.45,
            ease: 'power2.out',
          },
          0
        );
      }

      // Brand logo dissolves with an ethereal, soft upward drift and delicate fade
      if (title || sub) {
        tl.to(
          [title, sub].filter(Boolean),
          {
            opacity: 0,
            y: -6,
            duration: 0.60,
            ease: 'power2.out',
          },
          0.04
        );
      }

      // Ambient studio halo disperses quietly
      if (halo) {
        tl.to(
          halo,
          {
            opacity: 0,
            scale: 1.15,
            duration: 0.8,
            ease: 'sine.out',
          },
          0
        );
      }
    }

    // 2. Dual Horizontal Shutter Reveal: unhurried, silky cinematic parting
    const curtainDuration = 1.6;
    const curtainStart = 0.25;

    if (this.curtainTop) {
      tl.to(
        this.curtainTop,
        {
          yPercent: -100,
          duration: curtainDuration,
          ease: 'power2.inOut',
        },
        curtainStart
      );
    }

    if (this.curtainBottom) {
      tl.to(
        this.curtainBottom,
        {
          yPercent: 100,
          duration: curtainDuration,
          ease: 'power2.inOut',
        },
        curtainStart
      );
    }

    // Soft curtain horizon dissipation as they reach viewport boundaries
    if (this.curtainTop || this.curtainBottom) {
      tl.to(
        [this.curtainTop, this.curtainBottom].filter(Boolean),
        {
          opacity: 0,
          duration: 0.55,
          ease: 'power1.out',
        },
        curtainStart + curtainDuration - 0.55
      );
    }

    // 3. 3D Model subtle depth settling: camera smoothly glides into hero focal stance
    const sm = targets.sceneManager;
    if (sm) {
      const targetZ = sm.cameraPos.z;
      const startZ = targetZ + 0.28;

      sm.cameraPos.z = startZ;
      if (sm.camera) {
        sm.camera.position.z = startZ;
      }

      tl.to(
        sm.cameraPos,
        {
          z: targetZ,
          duration: 2.2,
          ease: 'power2.out',
        },
        curtainStart
      );

      const targetRotY = sm.modelRot.y;
      const startRotY = targetRotY - 0.05;
      sm.modelRot.y = startRotY;
      if (sm.modelContainer) {
        sm.modelContainer.rotation.y = startRotY;
      }

      tl.to(
        sm.modelRot,
        {
          y: targetRotY,
          duration: 2.4,
          ease: 'power2.out',
        },
        curtainStart
      );
    }

    // 4. Hero typography, navigation and top timeline emerge smoothly
    const textStart = 0.70;

    if (targets.nav) {
      tl.fromTo(
        targets.nav,
        { y: -10, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: 'power2.out' },
        textStart
      );
    }

    if (targets.headline) {
      tl.fromTo(
        targets.headline,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.3, ease: 'power2.out' },
        textStart + 0.10
      );
    }

    if (targets.body) {
      tl.fromTo(
        targets.body,
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: 'power2.out' },
        textStart + 0.22
      );
    }

    if (targets.btn) {
      tl.fromTo(
        targets.btn,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: 'power2.out' },
        textStart + 0.34
      );
    }

    if (targets.badge) {
      tl.fromTo(
        targets.badge,
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: 'power2.out' },
        textStart + 0.42
      );
    }

    if (targets.timeline) {
      tl.fromTo(
        targets.timeline,
        { opacity: 0 },
        { opacity: 1, duration: 1.2, ease: 'power2.out' },
        textStart + 0.28
      );
    }

    return tl;
  }
}
