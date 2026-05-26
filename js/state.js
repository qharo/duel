const state = {
    peer: null,
    conn: null,
    roomCode: null,
    isHost: false,
    currentGame: null,
    gameActive: false,
    mySymbol: null,
    opponentSymbol: null,
    scores: { X: 0, O: 0, draws: 0 },
    viewStack: [],
    gameImpl: null,
};

const _gameRegistry = {};
function registerGame(id, impl) { _gameRegistry[id] = impl; }
function getGameImpl(id) { return _gameRegistry[id]; }

function getGameImplForCurrent() {
    return state.currentGame ? _gameRegistry[state.currentGame] : null;
}

const GAME_DEFS = [
    { id: 'tictactoe', name: 'TIC-TAC-TOE', icon: '❌⭕', desc: 'Classic 3-in-a-row duel' },
    { id: 'connect4', name: 'CONNECT FOUR', icon: '🔴🔵', desc: 'Drop 4 in a row to win' },
    { id: 'battleship', name: 'BATTLESHIP', icon: '🚢💥', desc: 'Sink all enemy ships' },
];
