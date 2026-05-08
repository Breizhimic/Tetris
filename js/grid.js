/* js/grid.js — Gestion de la grille 10x20 */

'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30; // pixels per block

class Grid {
  constructor() {
    this.reset();
  }

  reset() {
    // 2D array: null = empty, or { color, glowColor, type }
    this.cells = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.clearingRows = []; // rows currently being animated
  }

  isInBounds(x, y) {
    return x >= 0 && x < COLS && y >= 0 && y < ROWS;
  }

  isOccupied(x, y) {
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y < 0) return false;
    return this.cells[y][x] !== null;
  }

  // Lock a piece into the grid
  lockPiece(piece) {
    const blocks = piece.getBlocks();
    for (const b of blocks) {
      if (b.y >= 0 && b.y < ROWS) {
        this.cells[b.y][b.x] = {
          color: piece.color,
          glowColor: piece.glowColor,
          type: piece.type
        };
      }
    }
  }

  // Find complete rows (returns array of row indices, bottom-up)
  findCompleteRows() {
    const complete = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.cells[r].every(cell => cell !== null)) {
        complete.push(r);
      }
    }
    return complete;
  }

  // Remove specified rows and shift everything down
  clearRows(rows) {
    // Sort descending so we clear from bottom up
    rows = [...rows].sort((a, b) => b - a);
    for (const r of rows) {
      this.cells.splice(r, 1);
      this.cells.unshift(Array(COLS).fill(null));
    }
  }

  // Check if game over (any block in top 2 rows after lock)
  isGameOver() {
    for (let c = 0; c < COLS; c++) {
      if (this.cells[0][c] !== null || this.cells[1][c] !== null) return true;
    }
    return false;
  }

  // Draw the grid on a canvas context
  draw(ctx, particles) {
    const W = COLS * BLOCK;
    const H = ROWS * BLOCK;

    // Background
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.07)';
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, H); ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(W, r * BLOCK); ctx.stroke();
    }

    // Draw locked blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.cells[r][c];
        if (cell) {
          drawBlock(ctx, c * BLOCK, r * BLOCK, BLOCK, cell.color, cell.glowColor);
        }
      }
    }
  }
}

// ── Standalone block drawing helper ──
function drawBlock(ctx, x, y, size, color, glowColor, alpha = 1, ghost = false) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const pad = ghost ? 2 : 1;
  const bx = x + pad;
  const by = y + pad;
  const bw = size - pad * 2;
  const bh = size - pad * 2;

  if (ghost) {
    // Ghost piece: outlined only
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.restore();
    return;
  }

  // Glow shadow
  ctx.shadowColor = glowColor || color;
  ctx.shadowBlur = 12;

  // Main block
  ctx.fillStyle = color;
  ctx.fillRect(bx, by, bw, bh);

  // Inner highlight (top-left)
  const grad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = grad;
  ctx.fillRect(bx, by, bw, bh);

  // Top edge highlight
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(bx, by, bw, 2);

  // Left edge highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(bx, by, 2, bh);

  // Bottom/right shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(bx, by + bh - 2, bw, 2);
  ctx.fillRect(bx + bw - 2, by, 2, bh);

  ctx.restore();
}
