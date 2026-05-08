/* js/scoring.js — Système de points, combos, niveaux */

'use strict';

const SCORE_TABLE = {
  1: 100,
  2: 300,
  3: 500,
  4: 800
};
const TSPIN_BONUS = 400;
const SOFT_DROP_BONUS = 1;
const HARD_DROP_BONUS = 2;

class Scoring {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = 0;
    this.comboMax = 0;
    this.tetrisCount = 0;
    this.tSpinCount = 0;
    this.startTime = Date.now();
    this.bestScore = parseInt(localStorage.getItem('tetris_best') || '0');
    this.isNewBest = false;
  }

  // Returns { points, label, isNewBest }
  addLineClear(count, tSpin = false) {
    let pts = 0;
    let label = '';

    if (count > 0) {
      this.combo++;
      if (this.combo > this.comboMax) this.comboMax = this.combo;

      const base = (SCORE_TABLE[count] || 0) * this.level;
      const comboBonus = Math.floor(base * (this.combo - 1) * 0.1);
      pts += base + comboBonus;

      if (tSpin) {
        pts += TSPIN_BONUS * this.level;
        this.tSpinCount++;
      }

      this.lines += count;
      this.score += pts;

      // Labels
      if (count === 4) {
        label = 'TETRIS!';
        this.tetrisCount++;
      } else if (tSpin) {
        label = 'T-SPIN!';
      } else if (count === 3) {
        label = 'TRIPLE!';
      } else if (count === 2) {
        label = 'DOUBLE!';
      } else {
        label = 'SINGLE';
      }

      if (this.combo > 1) {
        label += ` COMBO ×${this.combo}`;
      }
    } else {
      this.combo = 0;
    }

    // Level progression: every 10 lines
    const newLevel = Math.floor(this.lines / 10) + 1;
    const levelUp = newLevel > this.level;
    this.level = newLevel;

    // Check best
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.isNewBest = true;
      localStorage.setItem('tetris_best', this.bestScore);
    }

    return { points: pts, label, levelUp, combo: this.combo };
  }

  addSoftDrop(cells) {
    this.score += SOFT_DROP_BONUS * cells;
  }

  addHardDrop(cells) {
    this.score += HARD_DROP_BONUS * cells;
  }

  // Fall speed in ms per row (decreases with level)
  get fallSpeed() {
    return Math.max(100, 800 - (this.level - 1) * 50);
  }

  get elapsed() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  get elapsedFormatted() {
    const s = this.elapsed;
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2,'0')}`;
  }

  // Save score to leaderboard
  saveToLeaderboard(mode) {
    const key = 'tetris_scores';
    const scores = JSON.parse(localStorage.getItem(key) || '[]');
    scores.push({
      score: this.score,
      level: this.level,
      lines: this.lines,
      tetris: this.tetrisCount,
      tSpin: this.tSpinCount,
      time: this.elapsedFormatted,
      mode: mode,
      date: new Date().toLocaleDateString()
    });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem(key, JSON.stringify(scores.slice(0, 20)));
  }

  static getLeaderboard() {
    return JSON.parse(localStorage.getItem('tetris_scores') || '[]');
  }

  static getBestScore() {
    return parseInt(localStorage.getItem('tetris_best') || '0');
  }
}
