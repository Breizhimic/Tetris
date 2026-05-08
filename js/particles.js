/* js/particles.js — Particle System */

'use strict';

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
  }

  // Spawn particles for a cleared row
  spawnLineClear(rowY, color, count = 20) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * COLS * BLOCK,
        y: rowY + BLOCK / 2,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 5 - 1,
        size: Math.random() * 5 + 2,
        color,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.03,
        type: 'line'
      });
    }
  }

  // Spawn flash particles for Tetris (4 lines)
  spawnTetrisBlast(colors) {
    for (let i = 0; i < 60; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: Math.random() * COLS * BLOCK,
        y: Math.random() * ROWS * BLOCK,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        size: Math.random() * 6 + 2,
        color,
        alpha: 1,
        decay: 0.015 + Math.random() * 0.025,
        type: 'tetris'
      });
    }
  }

  // Spawn trail particles on hard drop landing
  spawnHardDropTrail(piece) {
    const blocks = piece.getBlocks();
    for (const b of blocks) {
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: b.x * BLOCK + BLOCK / 2 + (Math.random() - 0.5) * BLOCK,
          y: b.y * BLOCK + BLOCK,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 3 + 1,
          size: Math.random() * 3 + 1,
          color: piece.color,
          alpha: 0.8,
          decay: 0.05 + Math.random() * 0.05,
          type: 'trail'
        });
      }
    }
  }

  // Spawn confetti for high score
  spawnHighScore() {
    const colors = ['#00ffff','#ffff00','#ff006e','#00ff88','#ff6b35','#4361ee'];
    for (let i = 0; i < 80; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: Math.random() * COLS * BLOCK,
        y: Math.random() * ROWS * BLOCK * 0.3,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 1,
        size: Math.random() * 6 + 3,
        color,
        alpha: 1,
        decay: 0.008,
        type: 'confetti',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  update(dt) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.vx *= 0.98;
      p.alpha -= p.decay;
      if (p.rotation !== undefined) p.rotation += p.rotSpeed;
      return p.alpha > 0;
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;

      if (p.type === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}
