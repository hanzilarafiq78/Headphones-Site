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
    }, 6000);
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
    // 1.55 seconds of continuous, monotonic precision calibration progression from 0 to 100
    const duration = 1550;
    const startTime = performance.now();

    this.progressPromise = new Promise((resolve) => {
      const step = (now) => {
        const elapsed = now - startTime;
        const rawT = Math.min(1, Math.max(0, elapsed / duration));

        // Smooth deceleration curve: continuous, zero stutter, zero stoppage
        const eased = 1 - Math.pow(1 - rawT, 2.4);
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

          // Subtle breathing pause (340ms) allowing the user to perceive completion
          // before the opening sequence gracefully unfolds
          setTimeout(() => {
            resolve();
          }, 340);
        }
      };

      requestAnimationFrame(step);
    });
  }

  async complete() {
    this.isModelLoaded = true;
    // Await the continuous 0% -> 100% progress sequence with a 3.5s maximum timeout
    await Promise.race([
      this.progressPromise,
      new Promise((r) => setTimeout(r, 3500)),
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
            duration: 0.65,
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
            duration: 0.85,
            ease: 'power2.out',
          },
          0.06
        );
      }

      // Ambient studio halo disperses quietly
      if (halo) {
        tl.to(
          halo,
          {
            opacity: 0,
            scale: 1.15,
            duration: 1.0,
            ease: 'sine.out',
          },
          0
        );
      }
    }

    // 2. Dual Horizontal Shutter Reveal: unhurried, silky cinematic parting
    // Using power2.inOut for gradual acceleration and decelerated settle (eliminates abrupt snapping)
    const curtainDuration = 1.85;
    const curtainStart = 0.35;

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
          duration: 0.65,
          ease: 'power1.out',
        },
        curtainStart + curtainDuration - 0.65
      );
    }

    // 3. 3D Model subtle depth settling: camera smoothly glides into hero focal stance
    if (elements.sceneManager) {
      const sm = elements.sceneManager;
      const targetZ = sm.cameraPos.z;
      const startZ = targetZ + 0.28;

      // Start slightly backed out in depth
      sm.cameraPos.z = startZ;
      if (sm.camera) {
        sm.camera.position.z = startZ;
      }

      // Smooth camera position glide into hero focal plane
      tl.to(
        sm.cameraPos,
        {
          z: targetZ,
          duration: 2.6,
          ease: 'power2.out',
        },
        curtainStart
      );

      // Microscopic rotational settle: model eases smoothly to its resting hero angle
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
          duration: 2.8,
          ease: 'power2.out',
        },
        curtainStart
      );
    }

    // 4. Hero typography, navigation and top timeline emerge smoothly with restrained displacement
    // Text elements begin gracefully appearing once the shutter opening is well underway
    const textStart = 0.88;

    if (elements.nav) {
      tl.fromTo(
        elements.nav,
        { y: -10, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.4, ease: 'power2.out' },
        textStart
      );
    }

    if (elements.headline) {
      tl.fromTo(
        elements.headline,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.5, ease: 'power2.out' },
        textStart + 0.12
      );
    }

    if (elements.body) {
      tl.fromTo(
        elements.body,
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.4, ease: 'power2.out' },
        textStart + 0.28
      );
    }

    if (elements.btn) {
      tl.fromTo(
        elements.btn,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.3, ease: 'power2.out' },
        textStart + 0.42
      );
    }

    if (elements.badge) {
      tl.fromTo(
        elements.badge,
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.3, ease: 'power2.out' },
        textStart + 0.52
      );
    }

    if (elements.timeline) {
      tl.fromTo(
        elements.timeline,
        { opacity: 0 },
        { opacity: 1, duration: 1.3, ease: 'power2.out' },
        textStart + 0.35
      );
    }

    return tl;
  }
}
