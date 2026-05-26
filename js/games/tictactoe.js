const tictactoeImpl = {
    board: null,
    currentTurn: 'X',
    winLine: null,
    gameActive: false,

    initGame() {
        this.board = Array(9).fill(null);
        this.currentTurn = 'X';
        this.winLine = null;
        this.gameActive = true;
        state.gameActive = true;
        document.getElementById('gameBadge').textContent = 'TIC-TAC-TOE';
        this.render();
        this.updateTurn();
        hideOverlays();
        showView('game-view');
    },

    render() {
        const s = setupCanvas('gameCanvas', 3, 3, 20);
        this._s = s;
        const ctx = s.ctx;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, s.totalW, s.totalH);
        drawGrid(ctx, 3, 3, s.cellSize, s.margin, s.margin, s.margin);

        for (let i = 0; i < 9; i++) {
            const r = Math.floor(i / 3);
            const c = i % 3;
            const x = s.margin + c * s.cellSize;
            const y = s.margin + r * s.cellSize;
            const mark = this.board[i];
            if (!mark) continue;
            const isWin = this.winLine && this.winLine.includes(i);
            ctx.font = `${s.cellSize * 0.6}px 'Press Start 2P', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (mark === 'X') {
                ctx.fillStyle = isWin ? '#ff6b9a' : '#ff2d78';
                ctx.shadowColor = isWin ? 'rgba(255,107,154,0.8)' : 'rgba(255,45,120,0.5)';
            } else {
                ctx.fillStyle = isWin ? '#33ddff' : '#00d4ff';
                ctx.shadowColor = isWin ? 'rgba(51,221,255,0.8)' : 'rgba(0,212,255,0.5)';
            }
            ctx.shadowBlur = isWin ? 25 : 12;
            ctx.fillText(mark, x + s.cellSize / 2, y + s.cellSize / 2);
            ctx.shadowBlur = 0;
        }
    },

    handleClick(x, y) {
        if (!this.gameActive || this.currentTurn !== state.mySymbol) return;
        const s = this._s;
        if (!s) return;
        const col = Math.floor((x - s.margin) / s.cellSize);
        const row = Math.floor((y - s.margin) / s.cellSize);
        if (col < 0 || col > 2 || row < 0 || row > 2) return;
        const idx = row * 3 + col;
        if (this.board[idx] !== null) return;

        this.board[idx] = state.mySymbol;
        state.conn.send({ type: 'move', index: idx });
        this.currentTurn = state.opponentSymbol;
        this.render();
        this.updateTurn();
        this.checkGameOver();
    },

    handleMove(data) {
        if (!this.gameActive) return;
        this.board[data.index] = state.opponentSymbol;
        this.currentTurn = state.mySymbol;
        this.render();
        this.updateTurn();
        this.checkGameOver();
    },

    checkGameOver() {
        const result = this._checkWin(this.board);
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
        if (!this.board.includes(null)) {
            this.gameActive = false;
            state.gameActive = false;
            state.scores.draws++;
            this.render();
            this.showResult({ winner: null });
        }
    },

    _checkWin(b) {
        const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (const l of lines) {
            if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]])
                return { winner: b[l[0]], line: l };
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
            s.textContent = `${result.winner} TAKES THE ROUND!`;
        } else {
            t.className = 'overlay-title text-draw'; t.textContent = 'DRAW!';
            s.textContent = 'NO WINNER THIS ROUND';
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
