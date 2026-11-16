import gsap from 'gsap';

export class AetherLoader {
  constructor() {
    this.container = null;
    this.isRevealed = false;
    this.currentProgress = 0;
    this.targetProgress = 15;
    this.isCompleting = false;
    this.createDOM();
    this.startProgress();

    // Safety watchdog: ensure loader never remains stuck on screen
    this.safetyTimeout = setTimeout(() => {
      if (!this.isRevealed) {
        console.warn('Loader safety watchdog triggered');
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
        const simulated = Math.min(88, Math.floor(18 + 70 * (1 - Math.exp(-elapsed / 1200))));
        this.targetProgress = Math.max(this.targetProgress, simulated);
      }

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
          setTimeout(resolve, 140);
        } else {
          this.setUIProgress(this.currentProgress + (100 - this.currentProgress) * 0.32);
          requestAnimationFrame(checkDone);
        }
      };
      requestAnimationFrame(checkDone);
    });
  }

  revealHero(elements = {}) {
    if (this.isRevealed) return;
    this.isRevealed = true;

    if (this.safetyTimeout) {
      clearTimeout(this.safetyTimeout);
      this.safetyTimeout = null;
    }

    if (this.container) {
      this.container.style.pointerEvents = 'none';
    }

    const targets = {
      nav: elements.nav || '#main-nav',
      heroElements: elements.headline
        ? [elements.headline, elements.body, elements.btn, elements.badge].filter(Boolean)
        : '#chapter-hero h1, #chapter-hero p, #chapter-hero .btn-hero-explore, #chapter-hero .font-mono',
      timeline: elements.timeline || '#top-timeline-track',
      sceneManager: elements.sceneManager || window.__sceneManager,
    };

    const tl = gsap.timeline({
      onComplete: () => {
        if (this.container && this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
      },
    });

    // 1. Center brand title & meter dissolve cleanly and quickly
    if (this.center) {
      tl.to(
        this.center,
        {
          opacity: 0,
          y: -8,
          duration: 0.45,
          ease: 'power2.out',
        },
        0
      );
    }

    // 2. Dual Horizontal Shutter Reveal: velvety, seamless cinematic parting
    const curtainDuration = 1.35;
    const curtainStart = 0.15;

    if (this.curtainTop) {
      tl.to(
        this.curtainTop,
        {
          yPercent: -100,
          duration: curtainDuration,
          ease: 'power3.inOut',
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
          ease: 'power3.inOut',
        },
        curtainStart
      );
    }

    // Soft dissolve of entire loader veil towards the end so zero edges are ever visible
    if (this.container) {
      tl.to(
        this.container,
        {
          opacity: 0,
          duration: 0.5,
          ease: 'power1.out',
        },
        curtainStart + curtainDuration - 0.45
      );
    }

    // 3. 3D Model subtle depth settling: camera smoothly glides into hero focal stance
    const sm = targets.sceneManager;
    if (sm) {
      const targetZ = sm.cameraPos.z;
      const startZ = targetZ + 0.16;
      sm.cameraPos.z = startZ;

      tl.to(
        sm.cameraPos,
        {
          z: targetZ,
          duration: 1.8,
          ease: 'power2.out',
        },
        curtainStart + 0.1
      );

      const targetRotY = sm.modelRot.y;
      const startRotY = targetRotY - 0.04;
      sm.modelRot.y = startRotY;

      tl.to(
        sm.modelRot,
        {
          y: targetRotY,
          duration: 2.0,
          ease: 'power2.out',
        },
        curtainStart + 0.1
      );
    }

    // 4. Hero content enters as ONE single, unified, harmonious fade
    // Starts gracefully while the curtains are parting, so it emerges organically from the opening
    const heroEnterStart = curtainStart + 0.35;

    // The hero text elements fade up together (subtly staggered, single unified pass)
    tl.fromTo(
      targets.heroElements,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        stagger: 0.08,
        ease: 'power2.out',
      },
      heroEnterStart
    );

    // Top Navigation & Timeline rail glide in cleanly from top
    if (targets.nav) {
      tl.fromTo(
        targets.nav,
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' },
        heroEnterStart
      );
    }

    if (targets.timeline) {
      tl.fromTo(
        targets.timeline,
        { opacity: 0 },
        { opacity: 1, duration: 1.0, ease: 'power2.out' },
        heroEnterStart + 0.1
      );
    }

    return tl;
  }
}
