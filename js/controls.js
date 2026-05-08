/* js/controls.js — Contrôles clavier & tactile */

'use strict';

class Controls {
  constructor(game) {
    this.game = game;
    this.keys = {};
    this.dasDelay = 170;
    this.dasInterval = 50;
    this.dasKey = null;
    this.dasActive = false;
    this.lastDasTime = 0;

    this._bindKeyboard();
    this._bindMobile();
  }

  _bindKeyboard() {
    document.addEventListener('keydown', e => {
      const id = this._id(e);
      if (this.keys[id]) return;
      this.keys[id] = true;
      this._handleKey(id, e);
    });
    document.addEventListener('keyup', e => {
      const id = this._id(e);
      this.keys[id] = false;
      if (this.dasKey === id) {
        this.dasKey = null;
        this.dasActive = false;
      }
    });
  }

  // Identifiant de touche : e.key en minuscule pour les lettres,
  // e.code pour les touches spéciales (flèches, espace, shift…)
  _id(e) {
    if (e.key && e.key.length === 1 && e.key !== ' ') return e.key.toLowerCase();
    return e.code;
  }

  _handleKey(id, e) {
    const g = this.game;
    if (!g.running) return;

    switch (id) {
      // ── Déplacement gauche : ← ou Q
      case 'ArrowLeft':
      case 'q':
        e.preventDefault();
        g.moveLeft();
        this.dasKey = id; this.lastDasTime = Date.now();
        break;

      // ── Déplacement droit : → ou D
      case 'ArrowRight':
      case 'd':
        e.preventDefault();
        g.moveRight();
        this.dasKey = id; this.lastDasTime = Date.now();
        break;

      // ── Rotation : ↑ ou Z
      case 'ArrowUp':
      case 'z':
        e.preventDefault();
        g.rotate(1);
        break;

      // ── Soft drop : ↓ ou S
      case 'ArrowDown':
      case 's':
        e.preventDefault();
        g.softDrop();
        this.dasKey = id; this.lastDasTime = Date.now();
        break;

      // ── Hard drop : Espace
      case 'Space':
        e.preventDefault();
        g.hardDrop();
        break;

      // ── Hold : E ou Shift
      case 'e':
      case 'ShiftLeft':
      case 'ShiftRight':
        e.preventDefault();
        g.hold();
        break;

      // ── Pause : Échap ou P
      case 'Escape':
      case 'p':
        e.preventDefault();
        g.togglePause();
        break;
    }
  }

  // DAS (Delayed Auto Shift) — appelé depuis la boucle de jeu
  update(dt) {
    if (!this.dasKey) return;

    const now = Date.now();
    if (!this.dasActive) {
      if (now - this.lastDasTime >= this.dasDelay) {
        this.dasActive = true;
        this.lastDasTime = now;
      }
    } else {
      if (now - this.lastDasTime >= this.dasInterval) {
        this.lastDasTime = now;
        switch (this.dasKey) {
          case 'ArrowLeft':
          case 'q':  this.game.moveLeft();  break;
          case 'ArrowRight':
          case 'd':  this.game.moveRight(); break;
          case 'ArrowDown':
          case 's':  this.game.softDrop();  break;
        }
      }
    }
  }

  _bindMobile() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      let interval = null;
      const start = (e) => {
        e.preventDefault();
        fn();
        if (['m-left','m-right','m-soft'].includes(id)) {
          interval = setTimeout(() => { interval = setInterval(fn, 80); }, 200);
        }
      };
      const stop = () => { clearTimeout(interval); clearInterval(interval); interval = null; };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', stop, { passive: false });
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', stop);
    };

    bind('m-left',   () => this.game.moveLeft());
    bind('m-right',  () => this.game.moveRight());
    bind('m-rotate', () => this.game.rotate(1));
    bind('m-soft',   () => this.game.softDrop());
    bind('m-hard',   () => this.game.hardDrop());
    bind('m-hold',   () => this.game.hold());
  }

  destroy() {}
}
