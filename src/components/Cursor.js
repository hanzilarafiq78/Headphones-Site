export function setupCursor() {
  // Enforce hiding default Windows cursor on desktop
  const checkDesktop = () => {
    if (window.innerWidth >= 768) {
      document.documentElement.classList.add('hide-default-cursor');
    } else {
      document.documentElement.classList.remove('hide-default-cursor');
    }
  };
  checkDesktop();
  window.addEventListener('resize', checkDesktop);

  // AETHER Precision Mechanical Rotary Dial Cursor
  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor hidden md:block';

  cursor.innerHTML = `
    <div class="dial-container">
      <div class="dial-bezel">
        <span class="bezel-notch n"></span>
        <span class="bezel-notch e"></span>
        <span class="bezel-notch s"></span>
        <span class="bezel-notch w"></span>
        <div class="bezel-ring"></div>
      </div>
      <div class="dial-iris"></div>
    </div>
  `;

  cursor.style.top = '0px';
  cursor.style.left = '0px';
  cursor.style.willChange = 'transform';

  // Center Precision Core Crosshair
  const dot = document.createElement('div');
  dot.className = 'custom-cursor-dot hidden md:block';
  dot.style.top = '0px';
  dot.style.left = '0px';
  dot.style.willChange = 'transform';
  dot.innerHTML = `
    <div class="core-crosshair">
      <span class="axis-h"></span>
      <span class="axis-v"></span>
      <span class="core-dot"></span>
    </div>
  `;

  document.body.appendChild(cursor);
  document.body.appendChild(dot);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;
  let prevX = mouseX;
  let prevY = mouseY;
  let rotationAngle = 0;
  let targetAngle = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;

    cursor.classList.remove('hidden-cursor');
    dot.classList.remove('hidden-cursor');
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    cursor.classList.add('hidden-cursor');
    dot.classList.add('hidden-cursor');
  });

  document.addEventListener('mouseenter', () => {
    cursor.classList.remove('hidden-cursor');
    dot.classList.remove('hidden-cursor');
  });

  window.addEventListener('mousedown', () => {
    cursor.classList.add('dragging');
  });

  window.addEventListener('mouseup', () => {
    cursor.classList.remove('dragging');
  });

  function update() {
    const dx = mouseX - prevX;
    const dy = mouseY - prevY;
    prevX = mouseX;
    prevY = mouseY;

    const speed = Math.sqrt(dx * dx + dy * dy);

    // Smooth position lerp (fluid luxury inertia)
    cursorX += (mouseX - cursorX) * 0.16;
    cursorY += (mouseY - cursorY) * 0.16;

    cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;

    // Dynamic mechanical rotation based on movement trajectory (subtle & damped)
    if (speed > 1.0) {
      targetAngle += (dx + dy) * 0.14;
    }
    rotationAngle += (targetAngle - rotationAngle) * 0.08;

    const bezel = cursor.querySelector('.dial-bezel');
    if (bezel) {
      bezel.style.transform = `rotate(${rotationAngle}deg)`;
    }

    requestAnimationFrame(update);
  }
  update();

  // Attach hover listeners with event delegation
  const interactiveSelector =
    'a, button, input, [role="button"], .color-btn, .interactive-hover, #explode-slider, #top-timeline-track, .ch-details, .nav-story-link, .nav-chapter-link, .nav-logo, #back-to-top';

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest(interactiveSelector);
    if (target) {
      cursor.classList.add('active');
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest(interactiveSelector);
    if (target) {
      cursor.classList.remove('active');
    }
  });
}
