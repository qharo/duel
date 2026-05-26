function generateArt(canvasEl) {
    if (!canvasEl) return;
    const parent = canvasEl.parentElement;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;
    canvasEl.width = w * dpr;
    canvasEl.height = h * dpr;
    canvasEl.style.width = w + 'px';
    canvasEl.style.height = h + 'px';
    const ctx = canvasEl.getContext('2d');
    ctx.scale(dpr, dpr);

    const baseColors = [
        'rgba(255,45,120,ALPHA)',
        'rgba(0,212,255,ALPHA)',
        'rgba(241,196,15,ALPHA)',
        'rgba(83,52,131,ALPHA)',
        'rgba(233,69,96,ALPHA)',
    ];

    function c(idx, alpha) { return baseColors[idx].replace('ALPHA', alpha); }

    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, w, h);

    const polyCount = 4 + Math.floor(Math.random() * 6);
    for (let i = 0; i < polyCount; i++) {
        const sides = 3 + Math.floor(Math.random() * 5);
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const r = 20 + Math.random() * 80;
        const rot = Math.random() * Math.PI * 2;
        const ci = Math.floor(Math.random() * baseColors.length);
        ctx.beginPath();
        for (let j = 0; j < sides; j++) {
            const a = rot + (j / sides) * Math.PI * 2;
            const px = cx + Math.cos(a) * r * (0.5 + Math.random() * 0.5);
            const py = cy + Math.sin(a) * r * (0.5 + Math.random() * 0.5);
            j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = c(ci, '0.4');
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = c(ci, '0.05');
        ctx.fill();
    }

    const circleCount = 6 + Math.floor(Math.random() * 8);
    for (let i = 0; i < circleCount; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const radius = 5 + Math.random() * 40;
        const ci = Math.floor(Math.random() * baseColors.length);
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, c(ci, '0.3'));
        gradient.addColorStop(0.5, c(ci, '0.1'));
        gradient.addColorStop(1, c(ci, '0'));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c(ci, '0.15');
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    const points = [];
    for (let i = 0; i < 12; i++) {
        points.push({ x: Math.random() * w, y: Math.random() * h });
    }
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const dx = points[i].x - points[j].x;
            const dy = points[i].y - points[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < w * 0.4) {
                const ci = Math.floor(Math.random() * baseColors.length);
                ctx.beginPath();
                ctx.moveTo(points[i].x, points[i].y);
                ctx.lineTo(points[j].x, points[j].y);
                ctx.strokeStyle = c(ci, `${(0.05 + (1 - dist / (w * 0.4)) * 0.15).toFixed(2)}`);
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }

    for (let i = 0; i < 5; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        ctx.fillStyle = c(Math.floor(Math.random() * 3), '0.6');
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
