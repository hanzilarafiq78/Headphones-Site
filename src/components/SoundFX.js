// Web Audio API Procedural Synthesizer for High-End Haptic Sounds
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.enabled = true;
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
      this.enabled = true;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled && !this.ctx) {
      this.init();
    }
    return this.enabled;
  }

  playHover() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playClick() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  }

  // Crisp, mechanical 0.2ms optical microswitch click
  playSwitchClick(pitch = 1.0) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1420 * pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320 * pitch, this.ctx.currentTime + 0.025);

      clickGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.028);

      osc.connect(clickGain);
      clickGain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.028);
    } catch (e) {}
  }
}

export const sound = new SoundFX();

