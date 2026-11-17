// Juice: particles (sparks, smoke, blood puffs, muzzle flashes, pickup sparkles),
// skid marks left by hard turns, and the screen shake that sells a crash or a
// gunshot. Data only — the renderer draws what is here, and step() ages it.

const MAX_PARTICLES = 240;
const MAX_SKIDS = 160;

export function createEffects() {
  const particles = [];
  const skids = [];
  let shake = 0;

  return {
    particles,
    skids,
    /** How hard the camera is shaking right now (0 when calm). */
    shakeAmount() {
      return shake;
    },
    burst(x, y, color, count, speed, life, size) {
      for (let i = 0; i < count; i += 1) {
        if (particles.length >= MAX_PARTICLES) return;
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.4 + Math.random() * 0.6);
        particles.push({
          x, y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: life * (0.6 + Math.random() * 0.4),
          maxLife: life,
          color,
          size: size * (0.7 + Math.random() * 0.6),
        });
      }
    },
    sparks(x, y) {
      this.burst(x, y, '#ffd23f', 10, 260, 0.45, 3);
      this.burst(x, y, '#ff8a3d', 6, 180, 0.35, 2);
    },
    smoke(x, y) {
      this.burst(x, y, '#8b93a3', 5, 40, 0.9, 6);
    },
    muzzle(x, y, angle) {
      this.burst(x + Math.cos(angle) * 22, y + Math.sin(angle) * 22, '#ffe9a8', 5, 200, 0.12, 3);
    },
    sparkle(x, y, color) {
      this.burst(x, y, color, 12, 120, 0.7, 3);
    },
    addSkid(x, y, angle) {
      skids.push({ x, y, angle, life: 2.4 });
      if (skids.length > MAX_SKIDS) skids.shift();
    },
    addShake(amount) {
      shake = Math.min(18, shake + amount);
    },
    step(dt) {
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
      for (let i = skids.length - 1; i >= 0; i -= 1) {
        skids[i].life -= dt;
        if (skids[i].life <= 0) skids.splice(i, 1);
      }
      shake = Math.max(0, shake - dt * 26);
    },
  };
}
