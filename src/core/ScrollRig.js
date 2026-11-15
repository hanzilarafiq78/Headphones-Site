import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class ScrollRig {
  constructor() {
    this.initLenis();
  }

  initLenis() {
    this.lenis = new Lenis({
      duration: 1.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Apple-like smooth decel
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.3,
      infinite: false,
    });

    // Synchronize Lenis with GSAP ScrollTrigger
    this.lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }

  bindSectionTimeline(triggerElement, options = {}) {
    return gsap.timeline({
      scrollTrigger: {
        trigger: triggerElement,
        start: options.start || 'top top',
        end: options.end || '+=200%',
        scrub: options.scrub !== undefined ? options.scrub : 1,
        pin: options.pin !== undefined ? options.pin : true,
        anticipatePin: 1,
        onUpdate: options.onUpdate,
      },
    });
  }

  destroy() {
    if (this.lenis) {
      this.lenis.destroy();
    }
    ScrollTrigger.getAll().forEach((t) => t.kill());
  }
}

