export function setupCanvas(id, cols, rows, margin) {
    const canvas = document.getElementById(id);
    const wrap = canvas.parentElement;
    const wrapRect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const maxW = Math.min(wrapRect.width, 520);
    const maxH = Math.min(wrapRect.height || 400, 500);
    const cellSize = Math.floor(Math.min((maxW - margin * 2) / cols, (maxH - margin * 2) / rows));
    const totalW = cellSize * cols + margin * 2;
    const totalH = cellSize * rows + margin * 2;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { canvas, ctx, cellSize, totalW, totalH, margin, cols, rows };
}

export function drawGrid(ctx, cols, rows, cellSize, margin, ox, oy) {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(ox, oy + r * cellSize);
        ctx.lineTo(ox + cols * cellSize, oy + r * cellSize);
        ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(ox + c * cellSize, oy);
        ctx.lineTo(ox + c * cellSize, oy + rows * cellSize);
        ctx.stroke();
    }
}
