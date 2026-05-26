import { state, registerGame, getGameImplForCurrent, GAME_DEFS } from './state.js';
import { showView, pushView, hideOverlays, updateTurnDisplay, setStatus } from './view-utils.js';
import { generateArt } from './art.js';
import { tictactoeImpl } from './games/tictactoe.js';
import { connect4Impl } from './games/connect4.js';
import { battleshipImpl } from './games/battleship.js';

// ── Register games ──
registerGame('tictactoe', tictactoeImpl);
registerGame('connect4', connect4Impl);
registerGame('battleship', battleshipImpl);

// ── Landing: build game cards ──
function init() {
    const grid = document.getElementById('gameGrid');
    GAME_DEFS.forEach(g => {
        const card = document.createElement('div');
        card.className = 'bg-[#111116] border-2 border-[#1a1a2e] p-6 cursor-pointer text-center transition-all duration-200 hover:border-[#00d4ff] hover:shadow-[0_0_25px_rgba(0,212,255,0.2)] hover:-translate-y-0.5';
        card.innerHTML = `
            <div class="text-2xl mb-3">${g.icon}</div>
            <div class="text-[10px] text-white mb-1.5 tracking-wider">${g.name}</div>
            <div class="text-[6px] text-[#666] leading-relaxed">${g.desc}</div>
        `;
        card.addEventListener('click', () => pickGame(g.id));
        grid.appendChild(card);
    });
}

// ── P2P ──
function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function pickGame(gameId) {
    state.currentGame = gameId;
    const def = GAME_DEFS.find(g => g.id === gameId);
    document.getElementById('lobbyTitle').textContent = def ? def.name : 'GAME';
    goToLobby();
}

function goToLobby() {
    state.viewStack.length = 0;
    pushView('lobby-view');
    generateArt(document.getElementById('lobbyArt'));
}

function showJoinView() {
    document.getElementById('codeInput').value = '';
    document.getElementById('codeInput').focus();
    document.getElementById('joinStatus').classList.add('hidden');
    pushView('join-view');
    generateArt(document.getElementById('joinArt'));
}

function createRoom() {
    state.roomCode = generateCode();
    state.isHost = true;
    document.getElementById('codeDisplay').textContent = state.roomCode;
    document.getElementById('startBtn').classList.add('hidden');
    const st = document.getElementById('hostStatus');
    st.className = 'status status-waiting';
    st.textContent = 'WAITING FOR OPPONENT...';
    pushView('host-view');
    generateArt(document.getElementById('hostArt'));

    state.peer = new Peer(state.roomCode);
    state.peer.on('connection', (connection) => {
        state.conn = connection;
        state.conn.on('data', handleMessage);
        state.conn.on('close', handleDisconnect);
        document.getElementById('startBtn').classList.remove('hidden');
        const st = document.getElementById('hostStatus');
        st.className = 'status status-connected';
        st.textContent = 'OPPONENT CONNECTED!';
    });
    state.peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            setStatus(document.getElementById('hostStatus'), 'status-error', 'CODE TAKEN. CREATE AGAIN.');
        }
    });
}

function joinRoom() {
    const input = document.getElementById('codeInput');
    const code = input.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
        setStatus(document.getElementById('joinStatus'), 'status-error', 'ENTER A 6-CHAR CODE');
        return;
    }
    state.roomCode = code;
    state.isHost = false;
    const st = document.getElementById('joinStatus');
    setStatus(st, 'status-connecting', 'CONNECTING...');
    pushView('join-view');
    generateArt(document.getElementById('joinArt'));

    state.peer = new Peer();
    state.peer.on('open', () => {
        state.conn = state.peer.connect(state.roomCode);
        state.conn.on('open', () => {
            state.conn.on('data', handleMessage);
            state.conn.on('close', handleDisconnect);
            setStatus(st, 'status-connected', 'CONNECTED! WAITING FOR HOST...');
        });
        state.conn.on('error', () => setStatus(st, 'status-error', 'CONNECTION FAILED'));
    });
    state.peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') {
            setStatus(document.getElementById('joinStatus'), 'status-error', 'ROOM NOT FOUND');
        } else {
            setStatus(document.getElementById('joinStatus'), 'status-error', 'CONNECTION ERROR');
        }
    });
}

function startGame() {
    const impl = getGameImplForCurrent();
    if (!impl) return;
    const symbols = ['X', 'O'];
    const hostSym = symbols[Math.random() < 0.5 ? 0 : 1];
    state.mySymbol = hostSym;
    state.opponentSymbol = state.mySymbol === 'X' ? 'O' : 'X';
    state.conn.send({ type: 'start', symbol: state.opponentSymbol });
    state.gameImpl = impl;
    impl.initGame();
}

function handleMessage(data) {
    switch (data.type) {
        case 'start':
            state.mySymbol = data.symbol;
            state.opponentSymbol = state.mySymbol === 'X' ? 'O' : 'X';
            const impl = getGameImplForCurrent();
            if (impl) {
                state.gameImpl = impl;
                impl.initGame();
            }
            break;
        case 'move':
            if (state.gameActive && state.gameImpl && state.gameImpl.handleMove)
                state.gameImpl.handleMove(data);
            break;
        case 'play-again':
            if (state.gameImpl && state.gameImpl.handlePlayAgain)
                state.gameImpl.handlePlayAgain();
            break;
        case 'ready':
            if (state.gameImpl && state.gameImpl.handleReady)
                state.gameImpl.handleReady(data);
            break;
        case 'attack':
            if (state.gameImpl && state.gameImpl.handleAttack)
                state.gameImpl.handleAttack(data);
            break;
        case 'result':
            if (state.gameImpl && state.gameImpl.handleResult)
                state.gameImpl.handleResult(data);
            break;
    }
}

function playAgain() {
    if (state.conn && state.conn.open) {
        state.conn.send({ type: 'play-again' });
    }
    if (state.gameImpl && state.gameImpl.handlePlayAgain) {
        state.gameImpl.handlePlayAgain();
    }
}

function handleDisconnect() {
    state.gameActive = false;
    document.getElementById('disconnectOverlay').classList.remove('hidden');
}

function leaveGame() {
    cleanupGame();
    goToLanding();
}

function cleanupGame() {
    if (state.gameImpl && state.gameImpl.cleanup) state.gameImpl.cleanup();
    state.gameImpl = null;
    state.mySymbol = null;
    state.opponentSymbol = null;
    state.gameActive = false;
    hideOverlays();
}

function cleanup() {
    if (state.conn) { try { state.conn.close(); } catch(e) {} state.conn = null; }
    if (state.peer) { try { state.peer.destroy(); } catch(e) {} state.peer = null; }
    cleanupGame();
    state.roomCode = null;
    state.currentGame = null;
    state.isHost = false;
}

function goToLanding() {
    cleanup();
    state.viewStack.length = 0;
    showView('landing-view');
}

function handleBack() {
    const activeView = document.querySelector('.view.active');
    if (activeView && activeView.id === 'game-view') {
        leaveGame();
        return;
    }
    if (state.viewStack.length < 2) { goToLanding(); return; }
    const currentView = state.viewStack[state.viewStack.length - 1];
    if (currentView === 'host-view' || currentView === 'join-view') {
        cancelRoom();
        return;
    }
    state.viewStack.pop();
    const prev = state.viewStack[state.viewStack.length - 1];
    showView(prev);
    if (prev === 'landing-view') cleanup();
}

function cancelRoom() {
    const savedGame = state.currentGame;
    cleanup();
    state.currentGame = savedGame;
    if (state.viewStack.length >= 2) {
        state.viewStack.pop();
        showView(state.viewStack[state.viewStack.length - 1]);
    } else {
        goToLanding();
    }
}

function copyCode() {
    if (!state.roomCode) return;
    navigator.clipboard.writeText(state.roomCode).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'COPIED!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'COPY';
            btn.classList.remove('copied');
        }, 2000);
    });
}

// ── Canvas click handler ──
function handleCanvasClick(e) {
    if (!state.gameImpl || !state.gameActive) return;
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (e.clientX - rect.left) * (canvas.width / rect.width / dpr);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height / dpr);
    if (state.gameImpl.handleClick) state.gameImpl.handleClick(x, y);
}

// ── Keyboard shortcuts ──
function handleKeyDown(e) {
    if (e.key === 'r' || e.key === 'R') {
        if (state.gameImpl === battleshipImpl && battleshipImpl.phase === 'setup' && battleshipImpl.currentShipIndex < battleshipImpl.ships.length) {
            battleshipImpl.shipDirection = 1 - battleshipImpl.shipDirection;
            battleshipImpl.render();
        }
    }
    if (e.key === 'Enter') {
        if (state.gameImpl === battleshipImpl && battleshipImpl.phase === 'setup' && battleshipImpl.currentShipIndex >= battleshipImpl.ships.length) {
            battleshipImpl.confirmPlacement();
        }
    }
}

// ── Resize ──
let resizeTimer = null;
function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        ['lobbyArt', 'hostArt', 'joinArt'].forEach(id => {
            const c = document.getElementById(id);
            if (c && c.offsetParent !== null) generateArt(c);
        });
        if (state.gameImpl && state.gameImpl.render) state.gameImpl.render();
    }, 200);
}

// ── Bootstrap ──
document.addEventListener('DOMContentLoaded', () => {
    // Expose for onclick handlers in HTML
    window.pickGame = pickGame;
    window.showJoinView = showJoinView;
    window.createRoom = createRoom;
    window.joinRoom = joinRoom;
    window.startGame = startGame;
    window.handleBack = handleBack;
    window.cancelRoom = cancelRoom;
    window.goToLanding = goToLanding;
    window.leaveGame = leaveGame;
    window.playAgain = playAgain;
    window.copyCode = copyCode;

    document.getElementById('gameCanvas').addEventListener('click', handleCanvasClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    init();
});
