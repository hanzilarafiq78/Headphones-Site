import gsap from 'gsap';

export class AetherLoader {
  constructor() {
    this.container = null;
    this.isModelLoaded = false;
    this.isRevealed = false;
    this.currentProgress = 0;
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
                   style="background: linear-gradient(90deg, rgba(142, 147, 158, 0.4) 0%, #ECEBE8 100%); box-shadow: 0 0 10px rgba(236, 235, 232, 0.6); will-change: width; transition: width 0.05s linear;">
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

  startProgress() {
    // 1.35 seconds of uninterrupted, continuous monotonic progression from 0 to 100
    const duration = 1350;
    const startTime = performance.now();

    this.progressPromise = new Promise((resolve) => {
      const step = (now) => {
        const elapsed = now - startTime;
        const rawT = Math.min(1, Math.max(0, elapsed / duration));

        // Smooth deceleration curve: continuous, zero stutter, zero stoppage
        const eased = 1 - Math.pow(1 - rawT, 2.2);
        const val = Math.min(100, Math.floor(eased * 100));

        this.currentProgress = val;
        if (this.meterBar) {
          this.meterBar.style.width = `${eased * 100}%`;
        }
        if (this.percentEl) {
          this.percentEl.textContent = `${val}%`;
        }
        if (this.statusEl) {
          if (val >= 85) {
            this.statusEl.textContent = 'STAGING';
          } else if (val >= 45) {
            this.statusEl.textContent = 'INITIALIZING';
          } else {
            this.statusEl.textContent = 'CALIBRATING';
          }
        }

        if (rawT < 1) {
          requestAnimationFrame(step);
        } else {
          if (this.statusEl) this.statusEl.textContent = 'READY';
          if (this.percentEl) this.percentEl.textContent = '100%';
          if (this.meterBar) this.meterBar.style.width = '100%';
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  }

  async complete() {
    this.isModelLoaded = true;
    // Await the continuous 0% -> 100% progress sequence with a 2.5s maximum timeout
    await Promise.race([
      this.progressPromise,
      new Promise((r) => setTimeout(r, 2500)),
    ]);
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

    const tl = gsap.timeline({
      onComplete: () => {
        if (this.container && this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
      },
    });

    // 1. Center brand logo gently fades
    if (this.center) {
      tl.to(
        this.center,
        {
          opacity: 0,
          scale: 0.98,
          duration: 0.45,
          ease: 'power2.in',
        },
        0
      );
    }

    // 2. Dual Horizontal Shutter Reveal (Top curtain slides UP, Bottom curtain slides DOWN)
    if (this.curtainTop) {
      tl.to(
        this.curtainTop,
        {
          yPercent: -100,
          duration: 1.15,
          ease: 'power3.inOut',
        },
        0.25
      );
    }

    if (this.curtainBottom) {
      tl.to(
        this.curtainBottom,
        {
          yPercent: 100,
          duration: 1.15,
          ease: 'power3.inOut',
        },
        0.25
      );
    }

    // 3. 3D Model subtle depth settling: camera smoothly eases into hero stance
    if (elements.sceneManager && elements.sceneManager.camera) {
      const targetZ = elements.sceneManager.cameraPos.z;
      elements.sceneManager.camera.position.z = targetZ + 0.35;
      tl.to(
        elements.sceneManager.camera.position,
        {
          z: targetZ,
          duration: 1.8,
          ease: 'power3.out',
        },
        0.35
      );
    }

    // 4. Hero typography and navigation emerge smoothly through the opening gate
    if (elements.nav) {
      tl.fromTo(
        elements.nav,
        { y: -15, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.0, ease: 'sine.out' },
        0.5
      );
    }

    if (elements.headline) {
      tl.fromTo(
        elements.headline,
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: 'sine.out' },
        0.6
      );
    }

    if (elements.body) {
      tl.fromTo(
        elements.body,
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, ease: 'sine.out' },
        0.75
      );
    }

    if (elements.btn) {
      tl.fromTo(
        elements.btn,
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.0, ease: 'sine.out' },
        0.85
      );
    }

    if (elements.badge) {
      tl.fromTo(
        elements.badge,
        { opacity: 0 },
        { opacity: 1, duration: 1.0, ease: 'sine.out' },
        0.9
      );
    }

    return tl;
  }
}
