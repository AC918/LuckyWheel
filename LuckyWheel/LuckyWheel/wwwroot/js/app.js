// ===== DOM =====
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

const winModal = document.getElementById('winModal');
const winText = document.getElementById('winText');
const winOkBtn = document.getElementById('winOkBtn');

const confettiCanvas = document.getElementById('confetti');
const cctx = confettiCanvas.getContext('2d');

let items = [];
let rotation = 0;
let spinning = false;

let autoRemoveEnabled = (localStorage.getItem('autoRemoveEnabled') ?? '0') === '1';

function updateAutoRemoveUI() {
    const btn = document.getElementById('autoRemoveBtn');
    if (!btn) return;
    btn.textContent = `Auto remove: ${autoRemoveEnabled ? 'ON' : 'OFF'}`;
    btn.classList.toggle('on', autoRemoveEnabled);
}


// ===== Admin mode (ẩn Weight) =====
const isAdminFromQuery = new URLSearchParams(location.search).get('admin') === '1';
let adminMode = isAdminFromQuery;

window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'w') {
        adminMode = !adminMode;
        renderEditor();
    }
});

// ===== Helpers =====
function uid() { return Math.random().toString(16).slice(2) + Date.now().toString(16); }

function escapeHtml(s) {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function normalizeHex(c) {
    if (!c) return '';
    return String(c).trim().toLowerCase();
}

function usedColorsSet() {
    const set = new Set();
    for (const it of items) {
        set.add(normalizeHex(it.color ?? it.Color));
    }
    return set;
}

// Palette đẹp, dễ nhìn
const NICE_COLORS = [
    "#ff4d4f", "#faad14", "#52c41a", "#1890ff", "#722ed1",
    "#13c2c2", "#eb2f96", "#fa541c", "#2f54eb", "#a0d911",
    "#fadb14", "#36cfc9", "#9254de", "#ff7a45", "#40a9ff",
    "#73d13d", "#ff85c0", "#ffc53d", "#5cdbd3", "#b37feb"
];

function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function pickNewColor() {
    const used = usedColorsSet();
    const candidates = NICE_COLORS.filter(c => !used.has(normalizeHex(c)));
    if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];

    for (let k = 0; k < 60; k++) {
        const hue = Math.floor(Math.random() * 360);
        const sat = 75 + Math.floor(Math.random() * 10);
        const lig = 50 + Math.floor(Math.random() * 10);
        const c = hslToHex(hue, sat, lig);
        if (!used.has(normalizeHex(c))) return c;
    }
    return "#7c4dff";
}

// ===== Modal =====
function showWinModal(prizeText) {
    return new Promise((resolve) => {
        winText.textContent = prizeText;
        winModal.classList.remove('hidden');

        const onOk = () => {
            winModal.classList.add('hidden');
            winOkBtn.removeEventListener('click', onOk);
            resolve();
        };

        winOkBtn.addEventListener('click', onOk);
    });
}


// ===== Confetti =====
function resizeConfetti() {
    const dpr = window.devicePixelRatio || 1;
    confettiCanvas.width = Math.floor(window.innerWidth * dpr);
    confettiCanvas.height = Math.floor(window.innerHeight * dpr);
    confettiCanvas.style.width = window.innerWidth + 'px';
    confettiCanvas.style.height = window.innerHeight + 'px';
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

function launchConfetti(durationMs = 2600) {
    const particles = [];
    const W = window.innerWidth, H = window.innerHeight;

    // tạo nhiều burst phủ toàn màn hình
    const bursts = [];
    for (let i = 0; i < 10; i++) {
        bursts.push({
            x: Math.random() * W,
            y: H * (0.15 + Math.random() * 0.35),  // nổ từ nửa trên
            n: 140,                             // rất nhiều hạt
            spread: 3.2,
            power: 12
        });
    }

    for (const b of bursts) {
        for (let i = 0; i < b.n; i++) {
            const a = (-Math.PI / 2) + (Math.random() - 0.5) * b.spread;
            const v = (b.power * 0.7 + Math.random() * b.power);
            particles.push({
                x: b.x, y: b.y,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v,
                g: 20 + Math.random() * 14,
                size: 6 + Math.random() * 6,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 14,
                life: durationMs * (0.85 + Math.random() * 0.6),
                t: 0,
                color: `hsl(${Math.floor(Math.random() * 360)}, 95%, 60%)`,
            });
        }
    }

    let last = performance.now();
    const t0 = last;

    function frame(now) {
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;

        cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (const p of particles) {
            p.t += dt * 1000;
            p.vy += p.g * dt;

            // tăng tốc di chuyển để nhìn “bùng nổ”
            p.x += p.vx * dt * 70;
            p.y += p.vy * dt * 70;
            p.rot += p.vr * dt;

            const alpha = Math.max(0, 1 - (p.t / p.life));
            if (alpha <= 0) continue;

            cctx.save();
            cctx.globalAlpha = alpha;
            cctx.translate(p.x, p.y);
            cctx.rotate(p.rot);
            cctx.fillStyle = p.color;

            // confetti dạng rectangle + 1 số dạng “dải”
            const w = p.size;
            const h = p.size * (0.6 + Math.random() * 0.7);
            cctx.fillRect(-w / 2, -h / 2, w, h);

            cctx.restore();
        }

        if (now - t0 < durationMs) {
            requestAnimationFrame(frame);
        } else {
            cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }

    requestAnimationFrame(frame);
}


// ===== API =====
async function load() {
    const res = await fetch('/api/wheel');
    items = await res.json();

    // normalize keys (để code dùng it.text/it.color/it.weight thống nhất)
    items = items.map(x => ({
        id: x.id ?? x.Id ?? uid(),
        text: x.text ?? x.Text ?? '',
        color: x.color ?? x.Color ?? pickNewColor(),
        weight: x.weight ?? x.Weight ?? 1
    }));

    renderEditor();
    drawWheel();
}

async function save() {
    if (items.length < 2) { alert('Cần ít nhất 2 ô.'); return; }

    const payload = items.map(x => ({
        Id: x.id, Text: x.text, Color: x.color, Weight: x.weight
    }));

    const res = await fetch('/api/wheel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) { alert('Lưu thất bại'); return; }
    drawWheel();
}

// ===== Editor UI =====
function renderEditor() {
    document.getElementById('countPill').textContent = `${items.length} ô`;
    const wrap = document.getElementById('items');
    wrap.innerHTML = '';

    items.forEach((it, idx) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.style.gridTemplateColumns = adminMode ? '1.2fr .7fr .5fr auto' : '1.4fr .8fr auto';

        row.innerHTML = `
      <input placeholder="Nội dung ô" value="${escapeHtml(it.text)}"/>
      <input type="color" value="${it.color}"/>
      ${adminMode ? `<input type="number" min="0.1" step="0.1" value="${it.weight}" title="Weight"/>` : ``}
      <button class="secondary" title="Xoá">🗑️</button>
    `;

        const inputs = row.querySelectorAll('input');
        const txt = inputs[0];
        const col = inputs[1];
        const w = adminMode ? inputs[2] : null;
        const del = row.querySelector('button');

        txt.addEventListener('input', e => { it.text = e.target.value; drawWheel(); });
        col.addEventListener('input', e => { it.color = e.target.value; drawWheel(); });

        if (w) {
            w.addEventListener('input', e => {
                const v = parseFloat(e.target.value || '1');
                it.weight = Number.isFinite(v) ? v : 1;
            });
        }

        del.addEventListener('click', () => {
            items.splice(idx, 1);
            renderEditor();
            drawWheel();
        });

        wrap.appendChild(row);
    });
}

// ===== Wheel Drawing =====
function drawWheel() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const r = Math.min(W, H) * 0.44;

    // --- Wheel (rotates) ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    const n = Math.max(items.length, 1);
    const step = (Math.PI * 2) / n;

    for (let i = 0; i < n; i++) {
        const it = items[i] || { text: '—', color: '#444' };
        const label = it.text || '';
        const color = it.color || '#444';

        const a0 = i * step;
        const a1 = a0 + step;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, a0, a1);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,.25)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.save();
        ctx.rotate(a0 + step / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.font = 'bold 34px ui-sans-serif, system-ui';
        ctx.shadowColor = 'rgba(0,0,0,.35)';
        ctx.shadowBlur = 8;
        ctx.fillText(label.slice(0, 22), r - 22, 12);
        ctx.restore();
    }

    // hub (rotates but it’s a circle so ok)
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.restore(); // stop rotation effect

    // --- Center needle (does NOT rotate) ---
    ctx.save();
    ctx.translate(cx, cy);

    const capR = r * 0.12;

    // cap
    ctx.beginPath();
    ctx.arc(0, 0, capR, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.stroke();

    // cap highlight
    ctx.beginPath();
    ctx.arc(-capR * 0.25, -capR * 0.25, capR * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.fill();

    // needle
    const needleLen = r * 0.30;
    const needleW = r * 0.028;

    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;

    ctx.beginPath();
    ctx.moveTo(0, -needleLen);
    ctx.lineTo(-needleW, -capR * 0.15);
    ctx.lineTo(needleW, -capR * 0.15);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fill();

    // outline
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.stroke();

    // inner highlight
    ctx.beginPath();
    ctx.moveTo(0, -needleLen + 10);
    ctx.lineTo(0, -capR * 0.15);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // center pin
    ctx.beginPath();
    ctx.arc(0, 0, capR * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fill();

    ctx.restore();
}

// ===== Winner calculation (needle points UP) =====
function getIndexFromRotation(rot) {
    const n = items.length;
    if (n === 0) return -1;
    const step = (Math.PI * 2) / n;

    // needle direction is up: -PI/2
    let angle = (-Math.PI / 2 - rot) % (Math.PI * 2);
    if (angle < 0) angle += Math.PI * 2;

    return Math.floor(angle / step);
}

function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }
const TAU = Math.PI * 2;

function normAngle(a) {
    a = a % TAU;
    if (a < 0) a += TAU;
    return a;
}


// ===== Remove winner and save =====
async function removeWinnerAndSave(winnerIndex) {
    if (items.length <= 2) {
        showToast("Còn ít ô quá nên không xóa.");
        return;
    }
    items.splice(winnerIndex, 1);
    renderEditor();
    drawWheel();

    // save to server
    const payload = items.map(x => ({ Id: x.id, Text: x.text, Color: x.color, Weight: x.weight }));
    const res = await fetch('/api/wheel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) showToast("Xóa xong nhưng lưu server thất bại.");
}

// ===== Spin =====
async function spin() {
    if (spinning) return;
    if (items.length < 2) { alert('Cần ít nhất 2 ô.'); return; }

    spinning = true;
    document.getElementById('spinBtn').disabled = true;
    document.getElementById('resultBox').innerHTML = `Kết quả: <b>đang quay...</b>`;

    const n = items.length;
    const targetIndex = Math.floor(Math.random() * n);

    const step = (Math.PI * 2) / n;
    const targetAngleCenter = targetIndex * step + step / 2;

    // needle up => (-PI/2 - rot) == targetAngleCenter
    // desiredRot: góc tuyệt đối (kim hướng lên)
    const desiredRot = -Math.PI / 2 - targetAngleCenter;

    // Luôn tính end dựa trên rotation hiện tại để lần nào cũng quay "đã"
    const extraSpins = 12 + Math.random() * 6;
    const start = rotation;

    // Normalize góc hiện tại và góc đích về [0..2PI)
    const curN = normAngle(start);
    const desN = normAngle(desiredRot);

    // delta để đi tới đúng ô trúng, và ép quay theo chiều "âm" (quay tiếp, không bị ít vòng)
    let delta = desN - curN;
    if (delta > 0) delta -= TAU; // ép quay theo chiều âm cho kịch tính

    // end = start + delta - thêm nhiều vòng
    const end = start + delta - extraSpins * TAU;


    const dur = 5600 + Math.random() * 900;          // lâu hơn cho hồi hộp
    const t0 = performance.now();

    function frame(now) {
        const t = Math.min(1, (now - t0) / dur);
        rotation = start + (end - start) * easeOutQuint(t);
        drawWheel();

        if (t < 1) {
            requestAnimationFrame(frame);
            return;
        }

        else {
            spinning = false;
            document.getElementById('spinBtn').disabled = false;

            rotation = normAngle(rotation);

            const idx = getIndexFromRotation(rotation);
            const win = items[idx];
            const label = win?.text ?? '—';

            document.getElementById('resultBox').innerHTML = `Kết quả: <b>${escapeHtml(label)}</b>`;

            // 1) Bắn pháo hoa full màn hình
            launchConfetti(2600);

            // 2) + 3) Modal OK rồi mới xóa (bọc async)
            (async () => {
                await showWinModal(label);
                if (autoRemoveEnabled) {
                    await removeWinnerAndSave(idx);
                }
            })();
        }

    }

    requestAnimationFrame(frame);
}

// ===== Buttons =====
function shuffle() {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    renderEditor();
    drawWheel();
}

function resetSample() {
    items = [
        { id: "1", text: "Giải Nhất", color: "#ff4d4f", weight: 1 },
        { id: "2", text: "Giải Nhì", color: "#faad14", weight: 2 },
        { id: "3", text: "Giải Ba", color: "#52c41a", weight: 3 },
        { id: "4", text: "Chúc may mắn lần sau", color: "#1890ff", weight: 4 },
    ];
    renderEditor();
    drawWheel();
}

// Hook events
document.getElementById('spinBtn').addEventListener('click', spin);
document.getElementById('saveBtn').addEventListener('click', save);
document.getElementById('addBtn').addEventListener('click', () => {
    items.push({ id: uid(), text: "Ô mới", color: pickNewColor(), weight: 1 });
    renderEditor();
    drawWheel();
});
document.getElementById('autoRemoveBtn').addEventListener('click', () => {
    autoRemoveEnabled = !autoRemoveEnabled;
    localStorage.setItem('autoRemoveEnabled', autoRemoveEnabled ? '1' : '0');
    updateAutoRemoveUI();
});

document.getElementById('shuffleBtn').addEventListener('click', shuffle);
document.getElementById('resetBtn').addEventListener('click', resetSample);

// Start
load();
updateAutoRemoveUI();

