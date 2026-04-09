import confetti from "canvas-confetti";

const BRAND_COLORS = ["#a78bfa", "#ec4899", "#06b6d4", "#c4b5fd", "#f472b6"];

/** Small burst — action completed, check-in saved */
export function confettiBurst() {
  void confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.7 },
    colors: BRAND_COLORS,
    disableForReducedMotion: true,
  });
}

/** Full celebration — milestone, goal completed, signup */
export function confettiCelebration() {
  const end = Date.now() + 1500;

  function frame() {
    void confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: BRAND_COLORS,
      disableForReducedMotion: true,
    });
    void confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: BRAND_COLORS,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }

  frame();
}

/** Heartbeat-themed: two quick bursts like a heartbeat */
export function confettiHeartbeat() {
  void confetti({
    particleCount: 25,
    spread: 40,
    origin: { y: 0.6 },
    colors: ["#ec4899", "#f472b6", "#f9a8d4"],
    scalar: 0.8,
    disableForReducedMotion: true,
  });
  setTimeout(() => {
    void confetti({
      particleCount: 35,
      spread: 50,
      origin: { y: 0.6 },
      colors: ["#a78bfa", "#c4b5fd", "#06b6d4"],
      scalar: 1,
      disableForReducedMotion: true,
    });
  }, 180);
}
