/* js/hold-queue.js — Hold & Next Queue */

'use strict';

const NEXT_PREVIEW_COUNT = 5;

class HoldQueue {
  constructor() {
    this.held = null;
    this.canHold = true; // resets when new piece spawns
  }

  reset() {
    this.held = null;
    this.canHold = true;
  }

  // Attempt hold swap. Returns { swapped, newPiece }
  // Returns newPiece from bag if nothing held, or swaps with held.
  swap(currentPiece, bag) {
    if (!this.canHold) return { swapped: false, newPiece: null };

    this.canHold = false;

    if (!this.held) {
      this.held = currentPiece.type;
      return { swapped: true, newPiece: bag.next() };
    } else {
      const heldType = this.held;
      this.held = currentPiece.type;
      const p = new Piece(heldType);
      p.x = 3; p.y = 0;
      return { swapped: true, newPiece: p };
    }
  }

  // Allow hold again (call when new piece spawns)
  refresh() {
    this.canHold = true;
  }

  // Draw held piece on canvas
  draw(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(22, 33, 62, 0.5)';
    ctx.fillRect(0, 0, width, height);

    if (!this.held) return;

    const piece = new Piece(this.held);
    drawMiniPiece(ctx, piece, width, height, this.canHold ? 1.0 : 0.4);
  }
}

class NextQueue {
  constructor() {
    this.previews = [];
  }

  update(bag) {
    this.previews = bag.peek(NEXT_PREVIEW_COUNT);
  }

  // Draw the next pieces on the canvas
  draw(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(22, 33, 62, 0.5)';
    ctx.fillRect(0, 0, width, height);

    const slotH = height / NEXT_PREVIEW_COUNT;
    for (let i = 0; i < this.previews.length; i++) {
      const piece = new Piece(this.previews[i]);
      const alpha = 1 - i * 0.15;
      const scale = 1 - i * 0.06;
      drawMiniPiece(ctx, piece, width, slotH * scale, alpha, 0, slotH * i + (slotH - slotH * scale) / 2);
    }
  }
}

// Helper: draw a small tetromino centered in a box
function drawMiniPiece(ctx, piece, boxW, boxH, alpha = 1, offsetX = 0, offsetY = 0) {
  const shape = piece.shape;

  // Find bounds
  let minC = 4, maxC = 0, minR = 4, maxR = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (shape[r][c]) {
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
      }
    }
  }
  const pieceW = (maxC - minC + 1);
  const pieceH = (maxR - minR + 1);
  const blockSize = Math.min(Math.floor(boxW / 5), Math.floor(boxH / 4), 16);
  const startX = offsetX + (boxW - pieceW * blockSize) / 2;
  const startY = offsetY + (boxH - pieceH * blockSize) / 2;

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (shape[r][c]) {
        const px = startX + (c - minC) * blockSize;
        const py = startY + (r - minR) * blockSize;
        drawBlock(ctx, px, py, blockSize, piece.color, piece.glowColor, alpha);
      }
    }
  }
}
