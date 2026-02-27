const audioContext = () => new (window.AudioContext || (window as any).webkitAudioContext)();

const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) => {
  try {
    const ctx = audioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio is not available
  }
};

export const playSuccessSound = () => {
  try {
    const ctx = audioContext();
    const now = ctx.currentTime;

    // Two-note ascending chime
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.15, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  } catch {
    // Silently fail
  }
};

export const playErrorSound = () => {
  playTone(200, 0.3, 'square', 0.1);
};

export const playInfoSound = () => {
  playTone(440, 0.15, 'sine', 0.1);
};
