import { state } from '../state.js';
import { showView, hideOverlays, updateTurnDisplay } from '../view-utils.js';
import { setupCanvas } from '../canvas-utils.js';

export const connect4Impl = {
    board: null,
    currentTurn: 'X',
    gameActive: false,
    winLine: null,
    cols: 7,
    rows: 6,

    initGame() {
        this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
        this.currentTurn = 'X';
        this.winLine = null;
        this.gameActive = true;
        state.gameActive = true;
        document.getElementById('gameBadge').textContent = 'CONNECT FOUR';
        this.render();
        this.updateTurn();
        hideOverlays();
        showView('game-view');
    },

    render() {
        const s = setupCanvas('gameCanvas', this.cols, this.rows, 10);
        this._s = s;
        const ctx = s.ctx;
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, s.totalW, s.totalH);

        const ox = s.margin;
        const oy = s.margin;

        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(ox, oy, s.cellSize * this.cols, s.cellSize * this.rows);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cx = ox + c * s.cellSize + s.cellSize / 2;
                const cy = oy + r * s.cellSize + s.cellSize / 2;
                const radius = s.cellSize * 0.38;
                const val = this.board[r][c];
                if (val === 'X') {
                    ctx.fillStyle = '#ff2d78';
                    ctx.shadowColor = 'rgba(255,45,120,0.4)';
                    ctx.shadowBlur = 8;
                } else if (val === 'O') {
                    ctx.fillStyle = '#00d4ff';
                    ctx.shadowColor = 'rgba(0,212,255,0.4)';
                    ctx.shadowBlur = 8;
                } else {
                    ctx.fillStyle = '#0a0a1a';
                    ctx.shadowBlur = 0;
                }
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                if (!val) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        if (this.winLine) {
            for (const pos of this.winLine) {
                const cx = ox + pos.c * s.cellSize + s.cellSize / 2;
                const cy = oy + pos.r * s.cellSize + s.cellSize / 2;
                const val = this.board[pos.r][pos.c];
                ctx.fillStyle = val === 'X' ? 'rgba(255,45,120,0.3)' : 'rgba(0,212,255,0.3)';
                ctx.beginPath();
                ctx.arc(cx, cy, s.cellSize * 0.42, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = val === 'X' ? '#ff6b9a' : '#33ddff';
                ctx.shadowColor = val === 'X' ? 'rgba(255,107,154,0.8)' : 'rgba(51,221,255,0.8)';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(cx, cy, s.cellSize * 0.38, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    },

    handleClick(x, y) {
        if (!this.gameActive || this.currentTurn !== state.mySymbol) return;
        const s = this._s;
        if (!s) return;
        const col = Math.floor((x - s.margin) / s.cellSize);
        if (col < 0 || col >= this.cols) return;

        let row = -1;
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.board[r][col] === null) { row = r; break; }
        }
        if (row === -1) return;

        this.board[row][col] = state.mySymbol;
        state.conn.send({ type: 'move', col, row });
        this.currentTurn = state.opponentSymbol;
        this.render();
        this.updateTurn();
        this.checkGameOver(row, col);
    },

    handleMove(data) {
        if (!this.gameActive) return;
        this.board[data.row][data.col] = state.opponentSymbol;
        this.currentTurn = state.mySymbol;
        this.render();
        this.updateTurn();
        this.checkGameOver(data.row, data.col);
    },

    checkGameOver(row, col) {
        const result = this._checkWin(row, col);
        if (result) {
            this.gameActive = false;
            state.gameActive = false;
            this.winLine = result.line;
            this.render();
            if (result.winner) state.scores[result.winner]++;
            else state.scores.draws++;
            this.showResult(result);
            return;
        }
        if (this.board.every(r => r.every(c => c !== null))) {
            this.gameActive = false;
            state.gameActive = false;
            state.scores.draws++;
            this.render();
            this.showResult({ winner: null });
        }
    },

    _checkWin(row, col) {
        const sym = this.board[row][col];
        if (!sym) return null;
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (const [dr, dc] of dirs) {
            const cells = [{ r: row, c: col }];
            for (let d = -1; d <= 1; d += 2) {
                for (let step = 1; step < 4; step++) {
                    const nr = row + dr * step * d;
                    const nc = col + dc * step * d;
                    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) break;
                    if (this.board[nr][nc] !== sym) break;
                    cells.push({ r: nr, c: nc });
                }
            }
            if (cells.length >= 4) return { winner: sym, line: cells.slice(0, 4) };
        }
        return null;
    },

    showResult(result) {
        const t = document.getElementById('gameoverTitle');
        const s = document.getElementById('gameoverSub');
        if (result.winner) {
            if (result.winner === state.mySymbol) {
                t.className = 'overlay-title text-win'; t.textContent = 'YOU WIN!';
            } else {
                t.className = 'overlay-title text-lose'; t.textContent = 'YOU LOSE!';
            }
            s.textContent = `${result.winner} CONNECTS FOUR!`;
        } else {
            t.className = 'overlay-title text-draw'; t.textContent = 'DRAW!';
            s.textContent = 'BOARD IS FULL';
        }
        document.getElementById('gameoverOverlay').classList.remove('hidden');
        updateTurnDisplay('GAME OVER', false);
    },

    updateTurn() {
        if (!this.gameActive) { updateTurnDisplay('GAME OVER', false); return; }
        updateTurnDisplay(
            this.currentTurn === state.mySymbol ? 'YOUR TURN' : 'OPPONENT\'S TURN',
            this.currentTurn === state.mySymbol
        );
    },

    handlePlayAgain() { this.initGame(); },
    cleanup() {},
};
