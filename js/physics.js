/* js/physics.js — Chute, collision, lock delay, T-Spin */

'use strict';

class Physics {
  constructor(grid) {
    this.grid = grid;
    this.lockDelay = 500; // ms
    this.lockTimer = 0;
    this.lockResets = 0;
    this.maxLockResets = 15;
    this.isTouching = false;
    this.lastMoveTime = 0;
  }

  reset() {
    this.lockTimer = 0;
    this.lockResets = 0;
    this.isTouching = false;
    this.lastMoveTime = 0;
  }

  // Check if a piece can be at position (piece.x + dx, piece.y + dy) with rotation
  canPlace(piece, dx = 0, dy = 0, newRot = null) {
    const rot = newRot !== null ? newRot : piece.rotation;
    const shape = piece.data.shapes[rot];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (shape[r][c]) {
          const nx = piece.x + c + dx;
          const ny = piece.y + r + dy;
          if (this.grid.isOccupied(nx, ny)) return false;
          if (nx < 0 || nx >= COLS) return false;
          if (ny >= ROWS) return false;
        }
      }
    }
    return true;
  }

  // Move piece left/right. Returns true if moved.
  moveHorizontal(piece, dir) {
    if (this.canPlace(piece, dir, 0)) {
      piece.x += dir;
      this.onMove(piece);
      return true;
    }
    return false;
  }

  // Soft drop (move down by 1). Returns true if moved.
  softDrop(piece) {
    if (this.canPlace(piece, 0, 1)) {
      piece.y += 1;
      this.lockTimer = 0; // reset lock timer on soft drop
      return true;
    }
    return false;
  }

  // Hard drop — move piece to bottom, return number of cells dropped
  hardDrop(piece) {
    let dropped = 0;
    while (this.canPlace(piece, 0, 1)) {
      piece.y += 1;
      dropped++;
    }
    return dropped;
  }

  // Attempt rotation with wall kick. Returns { success, tSpin }
  rotate(piece, dir = 1) {
    const fromRot = piece.rotation;
    const toRot = ((piece.rotation + dir) + 4) % 4;
    const kicks = piece.getWallKicks(fromRot, toRot);

    for (const [dx, dy] of kicks) {
      // Note: SRS uses [col, row] offset convention
      if (this.canPlace(piece, dx, -dy, toRot)) {
        const oldX = piece.x;
        const oldY = piece.y;
        piece.x += dx;
        piece.y += (-dy);
        piece.rotation = toRot;

        const tSpin = this.detectTSpin(piece, dx, -dy, fromRot, toRot);
        this.onMove(piece);
        return { success: true, tSpin };
      }
    }
    return { success: false, tSpin: false };
  }

  // T-Spin detection (3-corner rule)
  detectTSpin(piece, kickDx, kickDy, fromRot, toRot) {
    if (piece.type !== 'T') return false;

    // 3-corner T-Spin: check 4 corners of T bounding box
    const corners = [
      { x: piece.x, y: piece.y },
      { x: piece.x + 2, y: piece.y },
      { x: piece.x, y: piece.y + 2 },
      { x: piece.x + 2, y: piece.y + 2 }
    ];

    let filled = 0;
    for (const c of corners) {
      if (this.grid.isOccupied(c.x, c.y)) filled++;
    }

    // T-Spin requires at least 3 corners filled
    if (filled < 3) return false;

    // If last kick was non-zero, it might be a mini T-spin (we treat all as T-spin for simplicity)
    return true;
  }

  // Ghost piece position
  getGhostPosition(piece) {
    const ghost = piece.clone();
    while (this.canPlace(ghost, 0, 1)) {
      ghost.y += 1;
    }
    return ghost;
  }

  // Called after any player move — resets lock if appropriate
  onMove(piece) {
    if (!this.canPlace(piece, 0, 1)) {
      if (this.lockResets < this.maxLockResets) {
        this.lockTimer = 0;
        this.lockResets++;
      }
    }
    this.lastMoveTime = Date.now();
  }

  // Update lock delay. Returns true if should lock.
  updateLock(piece, dt) {
    const touching = !this.canPlace(piece, 0, 1);
    if (touching) {
      this.lockTimer += dt;
      if (this.lockTimer >= this.lockDelay) return true;
    } else {
      this.lockTimer = 0;
      this.lockResets = 0;
    }
    this.isTouching = touching;
    return false;
  }

  // Lock timer progress 0..1
  get lockProgress() {
    if (!this.isTouching) return 0;
    return Math.min(this.lockTimer / this.lockDelay, 1);
  }
}
