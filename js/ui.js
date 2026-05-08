/* js/ui.js — Gestion de l'interface utilisateur */

'use strict';

class UI {
  constructor(game) {
    this.game = game; // référence directe — pas de lookup window.game
    this.screens = {
      menu: document.getElementById('main-menu'),
      modes: document.getElementById('mode-select'),
      scores: document.getElementById('scores-screen'),
      skins: document.getElementById('skins-screen'),
      game: document.getElementById('game-screen'),
      pause: document.getElementById('pause-screen'),
      gameover: document.getElementById('gameover-screen')
    };
    this._bindMenus();
    this._bindSkins();
    this._bindModeSelect();
  }

  showScreen(name) {
    Object.values(this.screens).forEach(s => {
      if (s) s.classList.remove('active');
    });
    if (this.screens[name]) this.screens[name].classList.add('active');
  }

  showOverlay(name) {
    if (this.screens[name]) this.screens[name].classList.add('active');
  }

  hideOverlay(name) {
    if (this.screens[name]) this.screens[name].classList.remove('active');
  }

  updateScore(score, best) {
    const sd = document.getElementById('score-display');
    const bd = document.getElementById('best-display');
    if (sd) { sd.textContent = score.toLocaleString(); sd.classList.add('score-bump'); setTimeout(()=>sd.classList.remove('score-bump'),300); }
    if (bd) bd.textContent = best.toLocaleString();
  }

  updateLevel(level) {
    const el = document.getElementById('level-display');
    if (el) { el.textContent = level; el.classList.add('bump'); setTimeout(()=>el.classList.remove('bump'),500); }
  }

  updateLines(lines) {
    const el = document.getElementById('lines-display');
    if (el) el.textContent = lines;
  }

  updateTimer(seconds) {
    const el = document.getElementById('timer-display');
    if (!el) return;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    el.textContent = `${min}:${sec.toString().padStart(2,'0')}`;
  }

  updateSprintTarget(remaining) {
    const el = document.getElementById('sprint-display');
    if (el) el.textContent = remaining;
  }

  updateStats({ tetris, tspin, combo, time }) {
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set('stat-tetris', tetris);
    set('stat-tspin', tspin);
    set('stat-combo', combo);
    set('stat-time', time);
  }

  showCombo(text) {
    const el = document.getElementById('combo-display');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._comboTimeout);
    this._comboTimeout = setTimeout(() => el.classList.remove('show'), 1200);
  }

  showBonus(text) {
    const el = document.getElementById('bonus-display');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._bonusTimeout);
    this._bonusTimeout = setTimeout(() => el.classList.remove('show'), 1000);
  }

  showLevelUp(level) {
    const el = document.getElementById('levelup-notif');
    if (!el) return;
    el.textContent = `LEVEL ${level}!`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1500);
  }

  shakeBoard() {
    const frame = document.querySelector('.board-frame');
    if (!frame) return;
    frame.classList.add('shake');
    setTimeout(() => frame.classList.remove('shake'), 250);
  }

  hardShakeBoard() {
    const frame = document.querySelector('.board-frame');
    if (!frame) return;
    frame.classList.add('hard-shake');
    setTimeout(() => frame.classList.remove('hard-shake'), 150);
  }

  showGameOver(stats, isNewBest) {
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set('go-score', stats.score.toLocaleString());
    set('go-level', stats.level);
    set('go-lines', stats.lines);
    set('go-tetris', stats.tetris);
    set('go-tspin', stats.tspin);
    set('go-time', stats.time);
    const nbEl = document.getElementById('new-highscore');
    if (nbEl) nbEl.style.display = isNewBest ? 'block' : 'none';
    this.showOverlay('gameover');
  }

  showTimerBox(visible) {
    const el = document.getElementById('timer-box');
    if (el) el.style.display = visible ? 'block' : 'none';
  }

  showSprintBox(visible) {
    const el = document.getElementById('sprint-box');
    if (el) el.style.display = visible ? 'block' : 'none';
  }

  showAchievement(text) {
    const el = document.getElementById('achievement-notif');
    if (!el) return;
    el.textContent = `🏆 ${text}`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  _bindMenus() {
    const btn = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    // Menu principal
    btn('btn-start',          () => this.game.startGame('classic'));
    btn('btn-modes',          () => this.showScreen('modes'));
    btn('btn-scores',         () => { this._renderScores(); this.showScreen('scores'); });
    btn('btn-skins',          () => this.showScreen('skins'));
    btn('btn-mode-back',      () => this.showScreen('menu'));
    btn('btn-scores-back',    () => this.showScreen('menu'));
    btn('btn-skins-back',     () => this.showScreen('menu'));

    // Contrôles en jeu
    btn('btn-pause',          () => this.game.togglePause());
    btn('btn-restart',        () => this.game.restart());
    btn('btn-menu',           () => this.game.goToMenu());

    // Écran pause
    btn('btn-resume',         () => this.game.resume());
    btn('btn-pause-restart',  () => this.game.restart());
    btn('btn-pause-menu',     () => this.game.goToMenu());

    // Game over
    btn('btn-play-again',     () => this.game.restart());
    btn('btn-go-menu',        () => this.game.goToMenu());

    // Son / Musique
    btn('btn-sound', () => {
      const on = this.game.audio.toggleSound();
      const el = document.getElementById('btn-sound');
      if (el) el.textContent = on ? '🔊 SON' : '🔇 SON';
    });
    btn('btn-music', () => {
      const on = this.game.audio.toggleMusic();
      const el = document.getElementById('btn-music');
      if (el) el.textContent = on ? '🎵 MUSIQUE' : '🎵 OFF';
    });
  }

  _bindModeSelect() {
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        this.game.startGame(card.dataset.mode);
      });
    });
  }

  _bindSkins() {
    document.querySelectorAll('.skin-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.skin-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const skin = card.dataset.skin;
        document.body.className = document.body.className.replace(/skin-\w+/g, '');
        if (skin !== 'retro') document.body.classList.add(`skin-${skin}`);
        localStorage.setItem('tetris_skin', skin);
      });
    });
    // Restaurer skin sauvegardé
    const saved = localStorage.getItem('tetris_skin');
    if (saved && saved !== 'retro') {
      document.body.classList.add(`skin-${saved}`);
      document.querySelectorAll('.skin-card').forEach(c => {
        c.classList.toggle('active', c.dataset.skin === saved);
      });
    }
  }

  _renderScores() {
    const container = document.getElementById('scores-list');
    if (!container) return;
    const scores = Scoring.getLeaderboard();
    if (scores.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:2rem;font-size:0.8rem">Aucun score enregistré</div>';
      return;
    }
    container.innerHTML = scores.slice(0, 10).map((s, i) => `
      <div class="score-entry">
        <span class="score-rank">#${i + 1}</span>
        <span class="score-mode">${s.mode.toUpperCase()}</span>
        <span>${s.lines}L LV${s.level}</span>
        <span class="score-val">${s.score.toLocaleString()}</span>
        <span style="color:rgba(255,255,255,0.3);font-size:0.6rem">${s.date}</span>
      </div>
    `).join('');
  }
}
