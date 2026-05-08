/* js/tetromino.js — Tétrominos, formes, rotations, couleurs */

'use strict';

const TETROMINOES = {
  I: {
    color: '#00ffff',
    glowColor: 'rgba(0,255,255,0.6)',
    shapes: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
    ]
  },
  O: {
    color: '#ffff00',
    glowColor: 'rgba(255,255,0,0.6)',
    shapes: [
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]]
    ]
  },
  T: {
    color: '#ff006e',
    glowColor: 'rgba(255,0,110,0.6)',
    shapes: [
      [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]]
    ]
  },
  S: {
    color: '#00ff88',
    glowColor: 'rgba(0,255,136,0.6)',
    shapes: [
      [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
      [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
      [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]]
    ]
  },
  Z: {
    color: '#ff6b35',
    glowColor: 'rgba(255,107,53,0.6)',
    shapes: [
      [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
      [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]]
    ]
  },
  J: {
    color: '#4361ee',
    glowColor: 'rgba(67,97,238,0.6)',
    shapes: [
      [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]]
    ]
  },
  L: {
    color: '#ff4500',
    glowColor: 'rgba(255,69,0,0.6)',
    shapes: [
      [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
      [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]]
    ]
  }
};

const PIECE_TYPES = ['I','O','T','S','Z','J','L'];

// Wall kick data (SRS — Super Rotation System)
const WALL_KICKS = {
  default: {
    '0->1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '1->0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '1->2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '2->1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '2->3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '3->2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '3->0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '0->3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
  },
  I: {
    '0->1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '1->0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '1->2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    '2->1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '2->3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '3->2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '3->0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '0->3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
  }
};

class Piece {
  constructor(type) {
    this.type = type;
    this.data = TETROMINOES[type];
    this.rotation = 0;
    this.x = 3;
    this.y = 0;
  }

  get shape() {
    return this.data.shapes[this.rotation];
  }

  get color() {
    // Support skin overrides via CSS variables
    const cssVar = `--c-${this.type}`;
    const computed = getComputedStyle(document.body).getPropertyValue(cssVar).trim();
    return computed || this.data.color;
  }

  get glowColor() {
    return this.data.glowColor;
  }

  clone() {
    const p = new Piece(this.type);
    p.rotation = this.rotation;
    p.x = this.x;
    p.y = this.y;
    return p;
  }

  getBlocks() {
    const blocks = [];
    const s = this.shape;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (s[r][c]) {
          blocks.push({ x: this.x + c, y: this.y + r });
        }
      }
    }
    return blocks;
  }

  getWallKicks(fromRot, toRot) {
    const key = `${fromRot}->${toRot}`;
    const table = (this.type === 'I') ? WALL_KICKS.I : WALL_KICKS.default;
    return table[key] || [[0, 0]];
  }
}

// Bag randomizer — avoids same piece twice in a row
class PieceBag {
  constructor() {
    this.bag = [];
    this.lastType = null;
    this.refill();
  }

  refill() {
    this.bag = [...PIECE_TYPES];
    // Shuffle
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
    // If first piece of new bag matches last piece from old bag, swap with second
    if (this.bag[0] === this.lastType && this.bag.length > 1) {
      [this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]];
    }
  }

  next() {
    if (this.bag.length === 0) this.refill();
    const type = this.bag.shift();
    this.lastType = type;
    return new Piece(type);
  }

  peek(count = 5) {
    const result = [];
    let tempBag = [...this.bag];
    for (let i = 0; i < count; i++) {
      if (tempBag.length === 0) {
        tempBag = [...PIECE_TYPES];
        for (let j = tempBag.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [tempBag[j], tempBag[k]] = [tempBag[k], tempBag[j]];
        }
      }
      result.push(tempBag.shift());
    }
    return result;
  }
}
