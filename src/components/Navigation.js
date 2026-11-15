import { sound } from './SoundFX.js';

let activeChapterId = 'arrival';

export function setupNavigation(scrollRig) {
  const navContainer = document.getElementById('main-nav');
  if (!navContainer) return;

  const chapters = [
    { name: 'ARRIVAL', id: 'arrival', progress: 0.0 },
    { name: 'RESONANCE', id: 'resonance', progress: 0.20 },
    { name: 'IMMERSION', id: 'immersion', progress: 0.40 },
    { name: 'CRAFT', id: 'craft', progress: 0.58 },
    { name: 'ARTIFACT', id: 'artifact', progress: 0.82 },
  ];

  navContainer.className = 'fixed top-0 left-0 w-full z-50 pointer-events-auto bg-transparent border-none transition-all duration-500 ease-out';

  navContainer.innerHTML = `
    <nav class="w-full px-5 sm:px-14 lg:px-20 py-3.5 sm:py-5 flex items-center justify-between bg-transparent border-none">
      <!-- Brand Logo (Left) -->
      <a href="#chapter-hero" class="nav-logo flex flex-col group cursor-pointer">
        <span class="font-serif tracking-[0.2em] sm:tracking-[0.28em] text-[17px] sm:text-[20px] font-light text-[#FAF7F2] group-hover:text-white transition-colors duration-500 ease-out leading-none">AETHER</span>
        <span class="tracking-[0.18em] sm:tracking-[0.24em] text-[7.5px] sm:text-[8.5px] font-sans font-medium uppercase text-[#8C8780] group-hover:text-[#ABA7A0] transition-colors duration-500 ease-out mt-1 sm:mt-1.5">ACOUSTIC INSTRUMENT</span>
      </a>

      <!-- Center Storyline Chapter Navigation -->
      <div class="hidden md:flex items-center gap-7 lg:gap-11">
        ${chapters
          .map(
            (ch) => `
          <button 
            type="button"
            data-chapter="${ch.id}" 
            data-progress="${ch.progress}"
            class="nav-story-link group relative py-1 text-[11px] font-mono uppercase tracking-[0.24em] transition-all duration-500 ease-out cursor-pointer ${
              activeChapterId === ch.id
                ? 'text-[#FAF7F2] font-medium'
                : 'text-[#8C8780] hover:text-[#FAF7F2]'
            }">
            <span>${ch.name}</span>
            <span class="nav-indicator absolute -bottom-1 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FAF7F2] to-transparent transition-opacity duration-500 ease-out ${
              activeChapterId === ch.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
            }"></span>
          </button>
        `
          )
          .join('')}
      </div>

      <!-- Right Action Button (Reserve Batch 01 Allocation) -->
      <div class="flex items-center gap-2 sm:gap-4">
        <button id="nav-reserve-btn" type="button" class="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-1.5 sm:py-2 rounded-full border border-white/20 bg-white/[0.04] text-[9px] sm:text-[10.5px] font-mono font-medium tracking-[0.2em] sm:tracking-[0.22em] text-[#FAF7F2] hover:border-white/40 hover:bg-white/[0.10] hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-500 ease-out cursor-pointer">
          <span>RESERVE</span>
          <span class="text-xs text-[#FAF7F2] transition-transform duration-500 ease-out group-hover:translate-x-0.5">→</span>
        </button>
      </div>
    </nav>
  `;

  // Handle smooth scroll to chapters
  const scrollToChapter = (progress) => {
    const track = document.getElementById('story-track');
    const maxScroll = track ? track.scrollHeight - window.innerHeight : 0;
    const targetY = maxScroll * progress;
    if (scrollRig && scrollRig.lenis) {
      scrollRig.lenis.scrollTo(targetY, { duration: 2.0 });
    } else {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  const navLinks = navContainer.querySelectorAll('.nav-story-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      try { sound.playClick(); } catch {}
      const prog = parseFloat(link.dataset.progress || '0');
      scrollToChapter(prog);
    });
  });

  const logo = navContainer.querySelector('.nav-logo');
  if (logo) {
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      try { sound.playClick(); } catch {}
      scrollToChapter(0);
    });
  }
}

export function setActiveNavChapter(chapterId) {
  if (activeChapterId === chapterId) return;
  activeChapterId = chapterId;

  const links = document.querySelectorAll('.nav-story-link');
  links.forEach((link) => {
    const isCurrent = link.dataset.chapter === chapterId;
    const indicator = link.querySelector('.nav-indicator');
    if (isCurrent) {
      link.classList.remove('text-[#8C8780]');
      link.classList.add('text-[#FAF7F2]', 'font-medium');
      if (indicator) {
        indicator.classList.remove('opacity-0');
        indicator.classList.add('opacity-100');
      }
    } else {
      link.classList.remove('text-[#FAF7F2]', 'font-medium');
      link.classList.add('text-[#8C8780]');
      if (indicator) {
        indicator.classList.remove('opacity-100');
        indicator.classList.add('opacity-0');
      }
    }
  });
}
