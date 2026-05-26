import { state } from '../state.js';
import { showView, hideOverlays, updateTurnDisplay } from '../view-utils.js';
import { setupCanvas, drawGrid } from '../canvas-utils.js';

export const battleshipImpl = {
    gridSize: 6,
    ships: [
        { id: 'carrier', length: 3, label: 'CARRIER' },
        { id: 'cruiser', length: 2, label: 'CRUISER' },
        { id: 'destroyer', length: 2, label: 'DESTROYER' },
    ],
    phase: 'setup',
    myBoard: null,
    targetBoard: null,
    myShips: null,
    myShipCells: null,
    currentShipIndex: 0,
    shipDirection: 0,
    opponentReady: false,
    myReady: false,
    sunkShips: null,
    opponentSunkShips: null,
    totalShipCells: 0,
    opponentHitCells: null,

    initGame() {
        this.gridSize = 6;
        this.phase = 'setup';
        this.myBoard = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(null));
        this.targetBoard = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(null));
        this.myShips = [];
        this.myShipCells = new Set();
        this.currentShipIndex = 0;
        this.shipDirection = 0;
        this.opponentReady = false;
        this.myReady = false;
        this.sunkShips = new Set();
        this.opponentSunkShips = new Set();
        this.opponentHitCells = new Set();
        this.totalShipCells = this.ships.reduce((sum, s) => sum + s.length, 0);
        state.gameActive = true;

        document.getElementById('gameBadge').textContent = 'BATTLESHIP';
        this.render();
        hideOverlays();
        showView('game-view');
        document.getElementById('gameCanvas').classList.remove('no-click');
        updateTurnDisplay('PLACE YOUR SHIPS [R=ROTATE]', true);
    },

    render() {
        const s = setupCanvas('gameCanvas', this.gridSize, this.gridSize, 20);
        this._s = s;
        const ctx = s.ctx;
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, s.totalW, s.totalH);

        const ox = s.margin;
        const oy = s.margin;
        const cs = s.cellSize;

        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = `${Math.min(cs * 0.25, 10)}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let c = 0; c < this.gridSize; c++)
            ctx.fillText(String.fromCharCode(65 + c), ox + c * cs + cs / 2, oy - cs * 0.35);
        for (let r = 0; r < this.gridSize; r++)
            ctx.fillText(String(r + 1), ox - cs * 0.35, oy + r * cs + cs / 2);

        drawGrid(ctx, this.gridSize, this.gridSize, cs, s.margin, ox, oy);

        if (this.phase === 'setup') {
            this._renderSetup(ctx, ox, oy, cs);
        } else {
            this._renderBattle(ctx, ox, oy, cs, s);
        }
    },

    _renderSetup(ctx, ox, oy, cs) {
        for (const ship of this.myShips) {
            for (let i = 0; i < ship.length; i++) {
                const r = ship.dir === 0 ? ship.row : ship.row + i;
                const c = ship.dir === 0 ? ship.col + i : ship.col;
                ctx.fillStyle = 'rgba(0,212,255,0.3)';
                ctx.fillRect(ox + c * cs + 2, oy + r * cs + 2, cs - 4, cs - 4);
                ctx.fillStyle = 'rgba(0,212,255,0.6)';
                ctx.font = `${cs * 0.3}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('■', ox + c * cs + cs / 2, oy + r * cs + cs / 2);
            }
        }

        const idx = this.currentShipIndex;
        if (idx < this.ships.length) {
            ctx.fillStyle = 'rgba(241,196,15,0.6)';
            ctx.font = `${Math.min(cs * 0.2, 9)}px 'Press Start 2P', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const dir = this.shipDirection === 0 ? 'H' : 'V';
            ctx.fillText(`PLACE ${this.ships[idx].label} [${this.ships[idx].length}] (${dir})`, ox + this.gridSize * cs / 2, oy + this.gridSize * cs + 6);
        } else {
            ctx.fillStyle = '#4caf50';
            ctx.font = `${Math.min(cs * 0.22, 10)}px 'Press Start 2P', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('PRESS ENTER OR CLICK "CONFIRM"', ox + this.gridSize * cs / 2, oy + this.gridSize * cs + 6);
        }
    },

    _renderBattle(ctx, ox, oy, cs, s) {
        const boardW = this.gridSize * cs;
        const gap = cs * 0.3;

        // My board (left)
        const myOx = ox;
        ctx.fillStyle = 'rgba(0,212,255,0.15)';
        ctx.font = `${Math.min(cs * 0.2, 8)}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('MY SHIPS', myOx + boardW / 2, oy - 4);
        drawGrid(ctx, this.gridSize, this.gridSize, cs, s.margin, myOx, oy);
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.myBoard[r][c]) {
                    ctx.fillStyle = 'rgba(0,212,255,0.4)';
                    ctx.fillRect(myOx + c * cs + 2, oy + r * cs + 2, cs - 4, cs - 4);
                }
                if (this.opponentHitCells.has(`${r},${c}`)) {
                    ctx.fillStyle = this.myBoard[r][c] ? 'rgba(255,45,120,0.6)' : 'rgba(255,255,255,0.15)';
                    ctx.font = `${cs * 0.35}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.myBoard[r][c] ? '✕' : '○', myOx + c * cs + cs / 2, oy + r * cs + cs / 2);
                }
            }
        }

        // Target board (right)
        const targetOx = ox + boardW + gap;
        ctx.fillStyle = 'rgba(255,45,120,0.15)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('ATTACK', targetOx + boardW / 2, oy - 4);
        drawGrid(ctx, this.gridSize, this.gridSize, cs, s.margin, targetOx, oy);
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const val = this.targetBoard[r][c];
                if (val === 'hit') {
                    ctx.fillStyle = 'rgba(255,45,120,0.5)';
                    ctx.fillRect(targetOx + c * cs + 2, oy + r * cs + 2, cs - 4, cs - 4);
                    ctx.fillStyle = '#ff2d78';
                    ctx.font = `${cs * 0.35}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('✕', targetOx + c * cs + cs / 2, oy + r * cs + cs / 2);
                } else if (val === 'miss') {
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.beginPath();
                    ctx.arc(targetOx + c * cs + cs / 2, oy + r * cs + cs / 2, cs * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    },

    _canPlace(row, col, length, dir) {
        if (dir === 0) {
            if (col + length > this.gridSize) return false;
            for (let i = 0; i < length; i++)
                if (this.myShipCells.has(`${row},${col + i}`)) return false;
        } else {
            if (row + length > this.gridSize) return false;
            for (let i = 0; i < length; i++)
                if (this.myShipCells.has(`${row + i},${col}`)) return false;
        }
        return true;
    },

    _placeShip(row, col, length, dir, shipId) {
        const cells = [];
        for (let i = 0; i < length; i++) {
            const r = dir === 0 ? row : row + i;
            const c = dir === 0 ? col + i : col;
            this.myBoard[r][c] = shipId;
            this.myShipCells.add(`${r},${c}`);
            cells.push([r, c]);
        }
        return cells;
    },

    handleClick(x, y) {
        if (state.gameActive && this.phase === 'setup') {
            this._handleSetupClick(x, y);
        } else if (state.gameActive && this.phase === 'attack' && this.currentTurn === state.mySymbol) {
            this._handleAttackClick(x, y);
        }
    },

    _handleSetupClick(x, y) {
        if (this.currentShipIndex >= this.ships.length) return;
        const s = this._s;
        if (!s) return;
        const col = Math.floor((x - s.margin) / s.cellSize);
        const row = Math.floor((y - s.margin) / s.cellSize);
        if (col < 0 || col >= this.gridSize || row < 0 || row >= this.gridSize) return;

        const ship = this.ships[this.currentShipIndex];
        if (!this._canPlace(row, col, ship.length, this.shipDirection)) return;

        const cells = this._placeShip(row, col, ship.length, this.shipDirection, ship.id);
        this.myShips.push({ row, col, length: ship.length, dir: this.shipDirection, id: ship.id, cells });
        this.currentShipIndex++;
        this.render();

        if (this.currentShipIndex >= this.ships.length) {
            updateTurnDisplay('CONFIRM YOUR SHIPS [ENTER]', true);
        } else {
            updateTurnDisplay(`PLACE ${this.ships[this.currentShipIndex].label} [R=ROTATE]`, true);
        }
    },

    confirmPlacement() {
        if (this.currentShipIndex < this.ships.length) return;
        this.myReady = true;
        state.conn.send({ type: 'ready', ships: this.myShips });
        this.phase = 'wait';
        updateTurnDisplay('WAITING FOR OPPONENT...', false);
        if (this.opponentReady) this._startBattle();
    },

    handleReady(data) {
        this.opponentReady = true;
        if (this.myReady) {
            this._startBattle();
        } else {
            updateTurnDisplay('OPPONENT READY! CONFIRM YOUR SHIPS', true);
        }
    },

    _startBattle() {
        this.phase = 'attack';
        this.currentTurn = state.isHost ? 'X' : 'O';
        this.render();
        if (this.currentTurn === state.mySymbol) {
            updateTurnDisplay('YOUR ATTACK', true);
        } else {
            updateTurnDisplay('WAITING FOR ATTACK...', false);
        }
    },

    handleAttack(data) {
        const { x, y } = data;
        const hit = this.myShipCells.has(`${y},${x}`);
        let sunk = null;
        if (hit) {
            this.opponentHitCells.add(`${y},${x}`);
            const shipId = this.myBoard[y][x];
            const ship = this.myShips.find(s => s.id === shipId);
            if (ship && ship.cells.every(([r, c]) => this.opponentHitCells.has(`${r},${c}`))) {
                sunk = shipId;
                this.sunkShips.add(shipId);
            }
        }
        state.conn.send({ type: 'result', x, y, hit, sunk });

        if (this.sunkShips.size === this.ships.length) {
            this._gameOver(false);
            return;
        }

        this.phase = 'attack';
        this.currentTurn = state.mySymbol;
        updateTurnDisplay('YOUR ATTACK', true);
        this.render();
    },

    handleResult(data) {
        const { x, y, hit, sunk } = data;
        this.targetBoard[y][x] = hit ? 'hit' : 'miss';
        if (sunk) this.opponentSunkShips.add(sunk);
        this.render();

        if (this.opponentSunkShips.size === this.ships.length) {
            this._gameOver(true);
            return;
        }

        this.phase = 'attack';
        this.currentTurn = state.opponentSymbol;
        updateTurnDisplay('OPPONENT\'S TURN', false);
    },

    _handleAttackClick(x, y) {
        const s = this._s;
        if (!s) return;
        const cs = s.cellSize;
        const boardW = this.gridSize * cs;
        const gap = cs * 0.3;
        const canFitDual = s.totalW >= boardW * 2 + gap + s.margin * 2;
        let ox = s.margin;
        if (canFitDual) ox = s.margin + boardW + gap;
        const oy = s.margin;

        const col = Math.floor((x - ox) / cs);
        const row = Math.floor((y - oy) / cs);
        if (col < 0 || col >= this.gridSize || row < 0 || row >= this.gridSize) return;
        if (this.targetBoard[row][col] !== null) return;

        state.conn.send({ type: 'attack', x: col, y: row });
        this.phase = 'opponentTurn';
        updateTurnDisplay('ATTACK SENT...', false);
    },

    _gameOver(won) {
        this.phase = 'gameover';
        state.gameActive = false;
        if (won) state.scores[state.mySymbol]++;
        else state.scores[state.opponentSymbol]++;

        const t = document.getElementById('gameoverTitle');
        const s = document.getElementById('gameoverSub');
        if (won) {
            t.className = 'overlay-title text-win'; t.textContent = 'YOU WIN!';
            s.textContent = 'ALL ENEMY SHIPS SUNK!';
        } else {
            t.className = 'overlay-title text-lose'; t.textContent = 'YOU LOSE!';
            s.textContent = 'ALL YOUR SHIPS SUNK!';
        }
        document.getElementById('gameoverOverlay').classList.remove('hidden');
        updateTurnDisplay('GAME OVER', false);
    },

    handlePlayAgain() { this.initGame(); },
    cleanup() {},
};
