function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    updateBackButton();
}

function updateBackButton() {
    const btn = document.getElementById('headerBack');
    const active = document.querySelector('.view.active');
    const isLanding = active && active.id === 'landing-view';
    btn.classList.toggle('hidden', isLanding || state.viewStack.length === 0);
}

function pushView(id) {
    state.viewStack.push(id);
    showView(id);
}

function hideOverlays() {
    document.getElementById('gameoverOverlay').classList.add('hidden');
    document.getElementById('disconnectOverlay').classList.add('hidden');
}

function updateTurnDisplay(text, active) {
    const el = document.getElementById('turnDisplay');
    el.textContent = text;
    el.className = 'turn-display' + (active ? ' active' : '');
}

function setStatus(el, className, text) {
    el.className = 'status ' + className;
    el.textContent = text;
    el.classList.remove('hidden');
}
