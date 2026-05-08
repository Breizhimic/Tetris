/* js/game.js — Logique principale du jeu */

'use strict';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.holdCanvas = document.getElementById('hold-canvas');
    this.nextCanvas = document.getElementById('next-canvas');

    this.grid = new Grid();
    this.physics = new Physics(this.grid);
    this.scoring = new Scoring();
    this.holdQueue = new HoldQueue();
    this.nextQueue = new NextQueue();
    this.particles = new ParticleSystem(this.canvas);
    this.audio = new AudioEngine();
    this.ui = new UI(this);
    this.controls = new Controls(this);

    this.bag = new PieceBag();
    this.currentPiece = null;
    this.ghostPiece = null;

    this.running = false;
    this.paused = false;
    this.gameOver = false;

    this.mode = 'classic';
    this.fallTimer = 0;
    this.lastTime = 0;
    this.animFrameId = null;
    this.timeAttackTimer = 180; // 3 minutes
    this.sprintTarget = 40;
    this.lastLevel = 1;
    this.tSpinPending = false;
    this.lineClearAnim = []; // { row, timer }
    this.lineClearDuration = 300; // ms

    // Achievements tracking
    this.achievements = new Set(JSON.parse(localStorage.getItem('tetris_achievements') || '[]'));

    this.ui.showScreen('menu');
  }

  // ── START / RESTART ──
  startGame(mode = 'classic') {
    this.mode = mode;
    this.grid.reset();
    this.physics.reset();
    this.scoring.reset();
    this.holdQueue.reset();
    this.particles.clear();
    this.bag = new PieceBag();
    this.lineClearAnim = [];
    this.tSpinPending = false;
    this.survivalTimer = 0;
    this.survivalInterval = 20000; // add a garbage row every 20s
    this.timeAttackTimer = 180;
    this.sprintTarget = 40;
    this.lastLevel = 1;
    this.gameOver = false;
    this.paused = false;

    // Mode-specific setup
    if (mode === 'hardcore') {
      this.scoring.level = 15;
    }
    if (mode === 'zen') {
      this.scoring.level = 1;
    }

    // UI mode-specific
    this.ui.showTimerBox(mode === 'timeattack' || mode === 'survival');
    this.ui.showSprintBox(mode === 'sprint');

    this.currentPiece = this.bag.next();
    this.currentPiece.x = 3; this.currentPiece.y = 0;
    this.holdQueue.refresh();
    this.nextQueue.update(this.bag);

    this.running = true;
    this.ui.showScreen('game');
    this.ui.hideOverlay('pause');
    this.ui.hideOverlay('gameover');

    this.lastTime = performance.now();
    this.audio.startMusic(this.scoring.level);

    this._loop(this.lastTime);
  }

  restart() {
    this.ui.hideOverlay('pause');
    this.ui.hideOverlay('gameover');
    this.startGame(this.mode);
  }

  confirmRestart() { this.restart(); }

  goToMenu() {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
    this.audio.stopMusic();
    this.ui.hideOverlay('pause');
    this.ui.hideOverlay('gameover');
    this.ui.showScreen('menu');
  }

  // ── GAME LOOP ──
  _loop(timestamp) {
    if (!this.running) return;

    const dt = Math.min(timestamp - this.lastTime, 100); // cap dt
    this.lastTime = timestamp;

    if (!this.paused) {
      this._update(dt);
    }
    this._render();

    this.animFrameId = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    this.controls.update(dt);

    // Mode timers
    if (this.mode === 'timeattack') {
      this.timeAttackTimer -= dt / 1000;
      this.ui.updateTimer(Math.max(0, Math.ceil(this.timeAttackTimer)));
      if (this.timeAttackTimer <= 0) { this._triggerGameOver(); return; }
    }

    // Survival mode: push a garbage row from below every N seconds
    if (this.mode === 'survival') {
      this.survivalTimer += dt;
      const nextIn = Math.max(5000, this.survivalInterval - (this.scoring.level - 1) * 1000);
      this.ui.updateTimer(Math.ceil((nextIn - (this.survivalTimer % nextIn)) / 1000));
      if (this.survivalTimer >= nextIn) {
        this.survivalTimer = 0;
        this._pushGarbageRow();
      }
    }

    // Update line clear animation
    this.lineClearAnim = this.lineClearAnim.filter(a => {
      a.timer += dt;
      return a.timer < this.lineClearDuration;
    });

    if (!this.currentPiece) return;

    // Gravity (skip in zen mode)
    if (this.mode !== 'zen') {
      this.fallTimer += dt;
      const speed = this.scoring.fallSpeed;
      if (this.fallTimer >= speed) {
        this.fallTimer = 0;
        if (!this.physics.softDrop(this.currentPiece)) {
          // Piece is resting — lock delay handles it
        }
      }
    }

    // Lock delay
    const shouldLock = this.physics.updateLock(this.currentPiece, dt);
    if (shouldLock) {
      this._lockPiece();
    }

    // Update ghost
    this.ghostPiece = this.physics.getGhostPosition(this.currentPiece);

    // Update particles
    this.particles.update(dt);

    // Update HUD
    this.ui.updateScore(this.scoring.score, this.scoring.bestScore);
    this.ui.updateLines(this.scoring.lines);
    this.ui.updateStats({
      tetris: this.scoring.tetrisCount,
      tspin: this.scoring.tSpinCount,
      combo: this.scoring.comboMax,
      time: this.scoring.elapsedFormatted
    });
  }

  _lockPiece() {
    this.grid.lockPiece(this.currentPiece);
    this.audio.playLock();

    const wasAbove = this.currentPiece.y <= 1;

    // Detect complete rows
    const completeRows = this.grid.findCompleteRows();

    if (completeRows.length > 0) {
      // Animate then clear
      completeRows.forEach(r => this.lineClearAnim.push({ row: r, timer: 0 }));

      // Spawn particles
      completeRows.forEach(r => {
        this.particles.spawnLineClear(
          r * BLOCK,
          completeRows.length === 4 ? '#ffffff' : this.currentPiece.color,
          completeRows.length === 4 ? 30 : 15
        );
      });

      // Wait for animation then clear
      setTimeout(() => {
        this.grid.clearRows(completeRows);

        const tSpin = this.tSpinPending;
        const result = this.scoring.addLineClear(completeRows.length, tSpin);
        this.tSpinPending = false;

        this.audio.playLineClear(completeRows.length);
        this.ui.shakeBoard();

        if (result.label) this.ui.showCombo(result.label);
        if (result.points > 0) this.ui.showBonus(`+${result.points}`);

        if (result.levelUp) {
          this.ui.updateLevel(this.scoring.level);
          this.ui.showLevelUp(this.scoring.level);
          this.audio.playLevelUp();
          this.audio.updateMusicTempo(this.scoring.level);
        }

        // Sprint mode check
        if (this.mode === 'sprint') {
          this.sprintTarget = Math.max(0, 40 - this.scoring.lines);
          this.ui.updateSprintTarget(this.sprintTarget);
          if (this.sprintTarget <= 0) this._triggerGameOver();
        }

        // Confetti on high score
        if (this.scoring.isNewBest && !this._highscoreShown) {
          this._highscoreShown = true;
          this.particles.spawnHighScore();
        }

        this._checkAchievements();
      }, this.lineClearDuration);
    } else {
      this.tSpinPending = false;
      this.scoring.addLineClear(0); // reset combo
    }

    // Check game over (classic / hardcore modes only)
    if ((this.mode === 'classic' || this.mode === 'hardcore' || this.mode === 'sprint') && wasAbove) {
      if (this.grid.isGameOver()) {
        this._triggerGameOver();
        return;
      }
    }

    // Spawn next piece
    this._spawnNext();
  }

  _spawnNext() {
    this.currentPiece = this.bag.next();
    this.currentPiece.x = 3; this.currentPiece.y = 0;
    this.holdQueue.refresh();
    this.physics.reset();
    this.nextQueue.update(this.bag);
    this.fallTimer = 0;

    // Check spawn collision (game over in applicable modes)
    if (this.mode !== 'zen') {
      if (!this.physics.canPlace(this.currentPiece)) {
        this._triggerGameOver();
      }
    }
  }

  _pushGarbageRow() {
    // Shift all rows up by one
    this.grid.cells.shift();
    // Generate a garbage row: one random gap
    const gap = Math.floor(Math.random() * COLS);
    const row = Array.from({ length: COLS }, (_, i) => i === gap ? null : {
      color: '#555577', glowColor: 'rgba(100,100,150,0.4)', type: 'G'
    });
    this.grid.cells.push(row);
    // If current piece overlaps, push it up
    if (this.currentPiece && !this.physics.canPlace(this.currentPiece)) {
      this.currentPiece.y -= 1;
      if (!this.physics.canPlace(this.currentPiece)) {
        this._triggerGameOver();
      }
    }
  }

  _triggerGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.running = false;
    this.audio.stopMusic();
    this.audio.playGameOver();
    this.scoring.saveToLeaderboard(this.mode);
    this.ui.showGameOver({
      score: this.scoring.score,
      level: this.scoring.level,
      lines: this.scoring.lines,
      tetris: this.scoring.tetrisCount,
      tspin: this.scoring.tSpinCount,
      time: this.scoring.elapsedFormatted
    }, this.scoring.isNewBest);
  }

  // ── RENDER ──
  _render() {
    const ctx = this.ctx;
    const W = COLS * BLOCK;
    const H = ROWS * BLOCK;

    ctx.clearRect(0, 0, W, H);

    // Draw grid (background + locked blocks)
    this.grid.draw(ctx);

    // Draw line clear flash overlay
    for (const anim of this.lineClearAnim) {
      const t = anim.timer / this.lineClearDuration;
      const intensity = Math.sin(t * Math.PI);
      ctx.save();
      ctx.globalAlpha = intensity * 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.fillRect(0, anim.row * BLOCK, W, BLOCK);
      ctx.restore();
    }

    // Draw ghost piece
    if (this.ghostPiece && this.currentPiece) {
      const ghostBlocks = this.ghostPiece.getBlocks();
      for (const b of ghostBlocks) {
        if (b.y >= 0) {
          drawBlock(ctx, b.x * BLOCK, b.y * BLOCK, BLOCK, this.currentPiece.color, this.currentPiece.glowColor, 1, true);
        }
      }
    }

    // Draw current piece
    if (this.currentPiece) {
      const blocks = this.currentPiece.getBlocks();
      for (const b of blocks) {
        if (b.y >= 0) {
          drawBlock(ctx, b.x * BLOCK, b.y * BLOCK, BLOCK, this.currentPiece.color, this.currentPiece.glowColor);
        }
      }

      // Lock delay indicator: red tint on bottom of piece
      if (this.physics.lockProgress > 0) {
        ctx.save();
        ctx.globalAlpha = this.physics.lockProgress * 0.4;
        ctx.fillStyle = '#ff4444';
        for (const b of blocks) {
          if (b.y >= 0) {
            ctx.fillRect(b.x * BLOCK + 1, b.y * BLOCK + BLOCK - 4, BLOCK - 2, 3);
          }
        }
        ctx.restore();
      }
    }

    // Draw particles on top
    this.particles.draw();

    // Draw hold and next canvases
    const holdCtx = this.holdCanvas.getContext('2d');
    this.holdQueue.draw(holdCtx, this.holdCanvas.width, this.holdCanvas.height);

    const nextCtx = this.nextCanvas.getContext('2d');
    this.nextQueue.draw(nextCtx, this.nextCanvas.width, this.nextCanvas.height);
  }

  // ── PLAYER ACTIONS ──
  moveLeft() {
    if (!this.running || this.paused || !this.currentPiece) return;
    if (this.physics.moveHorizontal(this.currentPiece, -1)) {
      this.audio.playMove();
    }
  }

  moveRight() {
    if (!this.running || this.paused || !this.currentPiece) return;
    if (this.physics.moveHorizontal(this.currentPiece, 1)) {
      this.audio.playMove();
    }
  }

  rotate(dir = 1) {
    if (!this.running || this.paused || !this.currentPiece) return;
    const { success, tSpin } = this.physics.rotate(this.currentPiece, dir);
    if (success) {
      this.audio.playRotate();
      if (tSpin) {
        this.tSpinPending = true;
        this.audio.playTSpin();
        this.ui.showBonus('T-SPIN READY!');
      }
    }
  }

  softDrop() {
    if (!this.running || this.paused || !this.currentPiece) return;
    if (this.physics.softDrop(this.currentPiece)) {
      this.scoring.addSoftDrop(1);
      this.audio.playSoftDrop();
    }
  }

  hardDrop() {
    if (!this.running || this.paused || !this.currentPiece) return;
    const dropped = this.physics.hardDrop(this.currentPiece);
    this.scoring.addHardDrop(dropped);
    this.audio.playHardDrop();
    this.ui.hardShakeBoard();
    this.particles.spawnHardDropTrail(this.currentPiece);
    this._lockPiece();
  }

  hold() {
    if (!this.running || this.paused || !this.currentPiece) return;
    const { swapped, newPiece } = this.holdQueue.swap(this.currentPiece, this.bag);
    if (swapped && newPiece) {
      this.currentPiece = newPiece;
      this.currentPiece.x = 3; this.currentPiece.y = 0;
      this.physics.reset();
      this.fallTimer = 0;
      this.nextQueue.update(this.bag);
      this.audio.playRotate();
    }
  }

  togglePause() {
    if (!this.running) return;
    if (this.gameOver) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.audio.stopMusic();
      this.ui.showOverlay('pause');
    } else {
      this.audio.startMusic(this.scoring.level);
      this.ui.hideOverlay('pause');
      this.lastTime = performance.now();
    }
  }

  resume() {
    if (this.paused) this.togglePause();
  }

  // ── ACHIEVEMENTS ──
  _checkAchievements() {
    const check = (id, condition, text) => {
      if (condition && !this.achievements.has(id)) {
        this.achievements.add(id);
        localStorage.setItem('tetris_achievements', JSON.stringify([...this.achievements]));
        this.ui.showAchievement(text);
      }
    };

    check('first_tetris', this.scoring.tetrisCount >= 1, 'Premier Tetris !');
    check('tetris_10', this.scoring.tetrisCount >= 10, '10 Tetris en une partie !');
    check('score_100k', this.scoring.score >= 100000, '100 000 points !');
    check('tspin_master', this.scoring.tSpinCount >= 5, 'T-Spin Master !');
    check('level_20', this.scoring.level >= 20, 'Speed Demon - Niveau 20 !');
    check('score_500k', this.scoring.score >= 500000, '500 000 points !');
  }
}

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();

  // Prevent scroll on arrow keys
  window.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
      e.preventDefault();
    }
  }, { passive: false });

  // Resize canvas to fit screen nicely
  function resizeGame() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const maxH = window.innerHeight * 0.85;
    const maxW = window.innerWidth;
    const idealH = ROWS * BLOCK;
    const idealW = COLS * BLOCK;
    const scale = Math.min(maxH / idealH, (maxW * 0.5) / idealW, 1.2);
    canvas.style.width = `${idealW * scale}px`;
    canvas.style.height = `${idealH * scale}px`;
  }
  resizeGame();
  window.addEventListener('resize', resizeGame);
});
