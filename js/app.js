// ===== DOM =====
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

const confettiCanvas = document.getElementById('confetti');
const cctx = confettiCanvas.getContext('2d');

const winModal = document.getElementById('winModal');
const winText = document.getElementById('winText');
const winOkBtn = document.getElementById('winOkBtn');

let items = [];
let rotation = 0;
let spinning = false;

// ===== Settings / Storage =====
const STORAGE_KEY = 'luckywheel_items_v1';
const AUTO_REMOVE_KEY = 'luckywheel_autoremove_v1';

let autoRemoveEnabled = (localStorage.getItem(AUTO_REMOVE_KEY) ?? '0') === '1';

// ===== Admin mode (ẩn Weight) =====
const isAdminFromQuery = new URLSearchParams(location.search).get('admin') === '1';
let adminMode = isAdminFromQuery;

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'w') {
    toggleAdminMode();
  }
});

function toggleAdminMode(){
  adminMode = !adminMode;
  renderEditor();

  // feedback nhẹ (không bắt buộc)
  const msg = adminMode ? "Admin: ON (hiện Weight)" : "Admin: OFF (ẩn Weight)";
  console.log(msg);
}


// ===== Helpers =====
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }

function syncItemsFromEditor(){
  const wrap = document.getElementById('items');
  if(!wrap) return;

  const rows = wrap.querySelectorAll('.row');
  rows.forEach((row, idx) => {
    const inputs = row.querySelectorAll('input');
    if(!inputs || inputs.length < 2) return;

    const txt = inputs[0].value ?? '';
    const col = inputs[1].value ?? '#444';

    // weight chỉ có khi adminMode bật
    let wVal = items[idx]?.weight ?? 0;
    if (adminMode && inputs[2]) {
      const v = Number(inputs[2].value);
      wVal = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
    }

    if(items[idx]){
      items[idx].text = txt;
      items[idx].color = col;
      items[idx].weight = wVal;
    }
  });
}


function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}

function normalizeHex(c){
  if(!c) return '';
  return String(c).trim().toLowerCase();
}

function usedColorsSet(){
  const set = new Set();
  for(const it of items){
    set.add(normalizeHex(it.color));
  }
  return set;
}

// Palette đẹp, dễ nhìn
const NICE_COLORS = [
  "#ff4d4f","#faad14","#52c41a","#1890ff","#722ed1",
  "#13c2c2","#eb2f96","#fa541c","#2f54eb","#a0d911",
  "#fadb14","#36cfc9","#9254de","#ff7a45","#40a9ff",
  "#73d13d","#ff85c0","#ffc53d","#5cdbd3","#b37feb"
];

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function pickNewColor(){
  const used = usedColorsSet();
  const candidates = NICE_COLORS.filter(c => !used.has(normalizeHex(c)));
  if(candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];

  for(let k=0;k<60;k++){
    const hue = Math.floor(Math.random()*360);
    const sat = 75 + Math.floor(Math.random()*10);
    const lig = 50 + Math.floor(Math.random()*10);
    const c = hslToHex(hue, sat, lig);
    if(!used.has(normalizeHex(c))) return c;
  }
  return "#7c4dff";
}

function updateAutoRemoveUI(){
  const btn = document.getElementById('autoRemoveBtn');
  if(!btn) return;
  btn.textContent = `Auto remove: ${autoRemoveEnabled ? 'ON' : 'OFF'}`;
  btn.classList.toggle('on', autoRemoveEnabled);
}

// ===== Modal (OK mới tắt) =====
function showWinModal(prizeText){
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

// ===== Confetti (rực rỡ full màn hình) =====
function resizeConfetti(){
  const dpr = window.devicePixelRatio || 1;
  confettiCanvas.width = Math.floor(window.innerWidth * dpr);
  confettiCanvas.height = Math.floor(window.innerHeight * dpr);
  confettiCanvas.style.width = window.innerWidth + 'px';
  confettiCanvas.style.height = window.innerHeight + 'px';
  cctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

function launchConfetti(durationMs = 2600){
  const particles = [];
  const W = window.innerWidth, H = window.innerHeight;

  const bursts = [];
  for(let i=0;i<10;i++){
    bursts.push({
      x: Math.random()*W,
      y: H*(0.15 + Math.random()*0.35),
      n: 140,
      spread: 3.2,
      power: 12
    });
  }

  for(const b of bursts){
    for(let i=0;i<b.n;i++){
      const a = (-Math.PI/2) + (Math.random()-0.5)*b.spread;
      const v = (b.power*0.7 + Math.random()*b.power);
      particles.push({
        x: b.x, y: b.y,
        vx: Math.cos(a)*v,
        vy: Math.sin(a)*v,
        g: 20 + Math.random()*14,
        size: 6 + Math.random()*6,
        rot: Math.random()*Math.PI,
        vr: (Math.random()-0.5)*14,
        life: durationMs*(0.85 + Math.random()*0.6),
        t: 0,
        color: `hsl(${Math.floor(Math.random()*360)}, 95%, 60%)`,
      });
    }
  }

  let last = performance.now();
  const t0 = last;

  function frame(now){
    const dt = Math.min(0.033, (now-last)/1000);
    last = now;

    cctx.clearRect(0,0,window.innerWidth,window.innerHeight);

    for(const p of particles){
      p.t += dt*1000;
      p.vy += p.g*dt;

      p.x += p.vx*dt*70;
      p.y += p.vy*dt*70;
      p.rot += p.vr*dt;

      const alpha = Math.max(0, 1 - (p.t / p.life));
      if(alpha <= 0) continue;

      cctx.save();
      cctx.globalAlpha = alpha;
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.fillStyle = p.color;

      const w = p.size;
      const h = p.size*(0.6 + Math.random()*0.7);
      cctx.fillRect(-w/2, -h/2, w, h);

      cctx.restore();
    }

    if(now - t0 < durationMs){
      requestAnimationFrame(frame);
    } else {
      cctx.clearRect(0,0,window.innerWidth,window.innerHeight);
    }
  }

  requestAnimationFrame(frame);
}

// ===== LocalStorage persistence =====
function toPayload(){
  return items.map(x => ({ id:x.id, text:x.text, color:x.color, weight:x.weight }));
}
function fromPayload(arr){
  return (arr ?? []).map(x => ({
    id: x.id ?? uid(),
    text: x.text ?? '',
    color: x.color ?? pickNewColor(),
    weight: Number.isFinite(+x.weight) ? +x.weight : 0
  }));
}
function saveToLocal(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toPayload()));
}
function loadFromLocal(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    return fromPayload(JSON.parse(raw));
  }catch{
    return null;
  }
}

// ===== Load / Save =====
async function load(){
  const saved = loadFromLocal();

  if(saved && saved.length >= 2){
    items = saved;
  } else {
    items = [
  { id:"1", text:"Giải Nhất", color:"#ff4d4f", weight:1 },
  { id:"2", text:"Giải Nhì",  color:"#faad14", weight:1 },
  { id:"3", text:"Giải Ba",  color:"#52c41a", weight:1 },
  { id:"4", text:"Chúc may mắn lần sau", color:"#1890ff", weight:1 },
];

    saveToLocal();
  }

  renderEditor();
  drawWheel();
}

async function save(){
  if(items.length < 2){ alert('Cần ít nhất 2 ô.'); return; }
  saveToLocal();
  drawWheel();
}

// ===== Editor UI =====
function renderEditor(){
  document.getElementById('countPill').textContent = `${items.length} ô`;
  const wrap = document.getElementById('items');
  wrap.innerHTML = '';

  items.forEach((it, idx)=>{
    const row = document.createElement('div');
    row.className = 'row';
    row.style.gridTemplateColumns = adminMode ? '1.2fr .7fr .5fr auto' : '1.4fr .8fr auto';

    row.innerHTML = `
      <input placeholder="Nội dung ô" value="${escapeHtml(it.text)}"/>
      <input type="color" value="${it.color}"/>
      ${adminMode ? `<input type="number" min="0" max="100" step="1" value="${it.weight ?? 0}" title="Weight(%)"/>` : ``}
      <button class="secondary" title="Xoá">🗑️</button>
    `;

    const inputs = row.querySelectorAll('input');
    const txt = inputs[0];
    const col = inputs[1];
    const w = adminMode ? inputs[2] : null;
    const del = row.querySelector('button');

    txt.addEventListener('input', e=> { it.text = e.target.value; drawWheel(); });
    col.addEventListener('input', e=> { it.color = e.target.value; drawWheel(); });

   // debounce lưu để không spam localStorage
let saveTimer = null;
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToLocal(), 150);
}

if(w){
  w.addEventListener('input', e=> {
    const v = Number(e.target.value);
    // cho phép 0..100, rỗng/NaN => 0
    let ww = Number.isFinite(v) ? v : 0;
    ww = Math.max(0, Math.min(100, ww));
    it.weight = ww;

    scheduleSave(); // ✅ lưu ngay
  });
}


    del.addEventListener('click', ()=>{
      items.splice(idx,1);
      saveToLocal();
      renderEditor();
      drawWheel();
    });

    wrap.appendChild(row);
  });
}

// ===== Wheel Drawing =====
function drawWheel(){
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const cx = W/2, cy = H/2;
  const r = Math.min(W,H)*0.44;

  // --- Wheel (rotates) ---
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  const n = Math.max(items.length, 1);
  const step = (Math.PI * 2) / n;

  for(let i=0;i<n;i++){
    const it = items[i] || { text:'—', color:'#444' };
    const label = it.text || '';
    const color = it.color || '#444';

    const a0 = i*step;
    const a1 = a0 + step;

    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,r,a0,a1);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.save();
    ctx.rotate(a0 + step/2);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.font = 'bold 34px ui-sans-serif, system-ui';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 8;
    ctx.fillText(label.slice(0,22), r - 22, 12);
    ctx.restore();
  }

  // hub
  ctx.beginPath();
  ctx.arc(0,0,r*0.18,0,Math.PI*2);
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
  ctx.arc(-capR*0.25, -capR*0.25, capR*0.35, 0, Math.PI*2);
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
  ctx.lineTo(-needleW, -capR*0.15);
  ctx.lineTo(needleW, -capR*0.15);
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
  ctx.lineTo(0, -capR*0.15);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // center pin
  ctx.beginPath();
  ctx.arc(0, 0, capR*0.28, 0, Math.PI*2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  ctx.restore();
}

// ===== Winner calculation (needle angle defined by POINTER_ANGLE) =====
function getIndexFromRotation(rot){
  const n = items.length;
  if(n === 0) return -1;
  const step = TAU / n;

  // góc của kim trong hệ bánh xe (0 ở bên phải, tăng theo chiều kim đồng hồ)
  // theta là góc (trên bánh) đang nằm đúng dưới kim
  let theta = (POINTER_ANGLE - rot) % TAU;
  if(theta < 0) theta += TAU;

  // đẩy vào trong ô để tránh đúng biên (floating error)
  theta = (theta + step * 1e-6) % TAU;

  return Math.floor(theta / step);
}


function findRotationForIndex(targetIndex){
  const n = items.length;
  const step = TAU / n;

  // Chọn 1 góc nằm "sâu" trong ô targetIndex để tránh rơi đúng biên
  const inside = step * 0.25; // cách biên 25% mỗi bên
  const theta = targetIndex * step + inside + Math.random() * (step - 2*inside);

  // Muốn: theta (trên bánh) nằm đúng dưới kim:
  // theta + rot = POINTER_ANGLE  (mod TAU)
  // => rot = POINTER_ANGLE - theta
  let rot = POINTER_ANGLE - theta;

  // Không normalize ở đây cũng được, nhưng normalize giúp ổn định số
  rot = normAngle(rot);

  // BẢO HIỂM: nếu do mod/float vẫn lệch (hiếm), thử quét vài điểm trong ô
  if(getIndexFromRotation(rot) !== targetIndex){
    for(let k=0;k<40;k++){
      const t2 = targetIndex*step + inside + Math.random()*(step-2*inside);
      const r2 = normAngle(POINTER_ANGLE - t2);
      if(getIndexFromRotation(r2) === targetIndex) return r2;
    }
  }
  return rot;
}


function easeOutQuint(t){ return 1 - Math.pow(1 - t, 5); }

function pickWeightedIndex(){
  const n = items.length;
  if(n === 0) return -1;

  // đọc % (0..100); NaN/<=0 coi như "chưa set"
  const raw = items.map(it => {
    const v = Number(it.weight);
    return (Number.isFinite(v) && v > 0) ? Math.min(100, v) : 0;
  });

  // Nếu có ô 100% (hoặc hơn) => chắc chắn vào ô có % lớn nhất
  const maxV = Math.max(...raw);
  if (maxV >= 100){
    // nếu nhiều ô cùng max (>=100) thì random giữa chúng
    const candidates = [];
    for(let i=0;i<n;i++) if(raw[i] === maxV) candidates.push(i);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const specifiedIdx = [];
  const unspecifiedIdx = [];
  for(let i=0;i<n;i++){
    if(raw[i] > 0) specifiedIdx.push(i);
    else unspecifiedIdx.push(i);
  }

  // Không ai set % => chia đều
  if(specifiedIdx.length === 0){
    return Math.floor(Math.random() * n);
  }

  const sum = specifiedIdx.reduce((acc,i)=>acc + raw[i], 0);

  // Tạo prob cho mỗi ô (tổng = 1)
  const prob = new Array(n).fill(0);

  if (sum >= 100){
    // sum > 100 => scale về 100%
    for(const i of specifiedIdx){
      prob[i] = raw[i] / sum;
    }
    // unspecified = 0
  } else {
    if (unspecifiedIdx.length > 0){
      // còn % => chia đều cho các ô chưa set
      const remain = 100 - sum;
      for(const i of specifiedIdx){
        prob[i] = raw[i] / 100;
      }
      const each = (remain / 100) / unspecifiedIdx.length;
      for(const i of unspecifiedIdx){
        prob[i] = each;
      }
    } else {
      // tất cả đều có % nhưng sum < 100 => chuẩn hoá theo tỉ lệ tương đối
      for(const i of specifiedIdx){
        prob[i] = raw[i] / sum;
      }
    }
  }

  // Random theo prob
  let r = Math.random();
  for(let i=0;i<n;i++){
    r -= prob[i];
    if(r <= 0) return i;
  }
  return n - 1;
}

// ===== Fix spin slow after first time: normalize + delta from current =====
const TAU = Math.PI * 2;
// Góc kim (marker). -PI/2 = hướng lên (12h). Nếu bạn đổi kim sang vị trí khác, chỉ cần đổi giá trị này.
const POINTER_ANGLE = -Math.PI/2;
function normAngle(a){
  a = a % TAU;
  if (a < 0) a += TAU;
  return a;
}

// ===== Remove winner =====
async function removeWinnerAndSave(winnerIndex){
  if(items.length <= 2) return;
  items.splice(winnerIndex, 1);
  saveToLocal();
  renderEditor();
  drawWheel();
}

// ===== Spin =====
// ===== Spin (natural max, không nhảy, settle không vượt biên) =====
async function spin(){
  syncItemsFromEditor?.();
  if(spinning) return;
  if(items.length < 2){ alert('Cần ít nhất 2 ô.'); return; }

  spinning = true;
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('resultBox').innerHTML = `Kết quả: <b>đang quay...</b>`;

  // Giữ rotation nhỏ để tránh số quá lớn sau nhiều lần quay
  rotation = normAngle(rotation);
  const start = rotation;

  const n = items.length;
  const step = TAU / n;

  // 1) Chọn ô theo weight (logic của bạn)
  const targetIndex = pickWeightedIndex();

  // 2) Chọn điểm dừng "sâu trong ô" để chừa khoảng cho wobble (tự nhiên)
  // chừa mỗi bên ít nhất 30% lát cắt
  const margin = step * 0.30;
  const theta =
    targetIndex * step +
    margin +
    Math.random() * (step - 2 * margin);

  // 3) Góc cần đạt (không normalize để tránh snap, nhưng vẫn ok)
  // muốn: theta nằm dưới kim => theta + rot ≡ POINTER_ANGLE
  const desiredRot = POINTER_ANGLE - theta;

  // 4) Thêm nhiều vòng quay (âm = cùng chiều bạn đang dùng)
  const extraSpins = 9 + Math.floor(Math.random() * 6); // 9..14 vòng
  let end = desiredRot - extraSpins * TAU;
  while(end >= start) end -= TAU;

  // 5) Animate giảm tốc tự nhiên
  const dur = 5200 + Math.random() * 1200;
  const t0 = performance.now();
  function easeOutQuint(t){ return 1 - Math.pow(1 - t, 5); }

  function frame(now){
    const t = Math.min(1, (now - t0) / dur);
    rotation = start + (end - start) * easeOutQuint(t);
    drawWheel();

    if(t < 1){
      requestAnimationFrame(frame);
      return;
    }

    // ===== 6) SETTLE: dao động tắt dần, kẹp amplitude để không vượt biên =====
    // Tính theta hiện tại dưới kim tại end
    let thetaEnd = (POINTER_ANGLE - end) % TAU;
    if(thetaEnd < 0) thetaEnd += TAU;

    const low = targetIndex * step;
    const high = low + step;

    // khoảng cách tới biên của ô (đảm bảo settle không vượt biên)
    const distToLow = thetaEnd - low;
    const distToHigh = high - thetaEnd;

    // Amplitude tối đa cho phép (trừ chút đệm an toàn)
    let Amax = Math.min(distToLow, distToHigh) - step * 0.03;
    if(!Number.isFinite(Amax) || Amax < 0) Amax = 0;

    // Nếu vì lý do nào đó Amax quá nhỏ (rất hiếm), bỏ settle
    const settleMs = 520 + Math.random()*180; // 520..700ms
    const s0 = performance.now();

    // Amplitude thực tế: 55%..95% Amax, random dấu để tự nhiên
    const sign = Math.random() < 0.5 ? -1 : 1;
    const A = sign * (Amax * (0.55 + Math.random()*0.40));

    // Tham số dao động tắt dần
    const omega = 22 + Math.random()*6;  // tần số
    const k = 7 + Math.random()*3;       // tắt dần

    function settle(ts){
      const dt = (ts - s0) / 1000; // giây
      const u = Math.min(1, (ts - s0) / settleMs);

      if(Amax > 0){
        // rotation là end + dao động (dao động theo rot => theta đổi ngược, nhưng vẫn nằm trong biên do kẹp A)
        const wobble = A * Math.exp(-k * dt) * Math.sin(omega * dt);
        rotation = end + wobble;
      } else {
        rotation = end;
      }

      drawWheel();

      if(u < 1){
        requestAnimationFrame(settle);
        return;
      }

      // ===== 7) CHỐT KẾT QUẢ THEO GÓC THẬT (visual) =====
      const stopIndex = getIndexFromRotation(rotation);

      spinning = false;
      document.getElementById('spinBtn').disabled = false;

      const label = items[stopIndex]?.text ?? '—';
      document.getElementById('resultBox').innerHTML = `Kết quả: <b>${escapeHtml(label)}</b>`;
      launchConfetti(2600);

      (async () => {
        await showWinModal(label);
        if (autoRemoveEnabled) await removeWinnerAndSave(stopIndex);
      })();
    }

    requestAnimationFrame(settle);
  }

  requestAnimationFrame(frame);
}

// ===== Buttons =====
function shuffle(){
  for(let i=items.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  saveToLocal();
  renderEditor();
  drawWheel();
}

  function resetSample(){
    items = [
      { id:"1", text:"Giải Nhất", color:"#ff4d4f", weight:0 },
      { id:"2", text:"Giải Nhì",  color:"#faad14", weight:0 },
      { id:"3", text:"Giải Ba",   color:"#52c41a", weight:0 },
      { id:"4", text:"Chúc may mắn lần sau", color:"#1890ff", weight:0 },
    ];
    saveToLocal();
    renderEditor();
    drawWheel();
  }



// ===== Events =====
document.getElementById('spinBtn').addEventListener('click', spin);
document.getElementById('saveBtn').addEventListener('click', save);
// Mobile: long-press nút Lưu để bật/tắt Admin (ẩn/hiện Weight)
(() => {
  const saveBtn = document.getElementById('saveBtn');
  if(!saveBtn) return;

  let pressTimer = null;

  const start = () => {
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      toggleAdminMode();
      // rung nhẹ (nếu hỗ trợ)
      if (navigator.vibrate) navigator.vibrate(40);
    }, 1200);
  };

  const cancel = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  };

  saveBtn.addEventListener('pointerdown', start);
  saveBtn.addEventListener('pointerup', cancel);
  saveBtn.addEventListener('pointercancel', cancel);
  saveBtn.addEventListener('pointerleave', cancel);
})();
// Mobile: chạm 5 lần vào tiêu đề để bật/tắt Admin
(() => {
  const title = document.getElementById('titleTap');
  if(!title) return;

  let taps = 0;
  let timer = null;

  title.style.cursor = 'pointer';

  title.addEventListener('click', () => {
    taps++;
    clearTimeout(timer);

    timer = setTimeout(() => {
      taps = 0;
    }, 700);

    if(taps >= 5){
      taps = 0;
      toggleAdminMode();
      if (navigator.vibrate) navigator.vibrate(40);
    }
  });
})();


document.getElementById('addBtn').addEventListener('click', ()=>{
  items.push({ id: uid(), text: "Ô mới", color: pickNewColor(), weight: 0 });
  saveToLocal();
  renderEditor();
  drawWheel();
});

document.getElementById('shuffleBtn').addEventListener('click', shuffle);
document.getElementById('resetBtn').addEventListener('click', resetSample);

document.getElementById('autoRemoveBtn').addEventListener('click', ()=>{
  autoRemoveEnabled = !autoRemoveEnabled;
  localStorage.setItem(AUTO_REMOVE_KEY, autoRemoveEnabled ? '1' : '0');
  updateAutoRemoveUI();
});

// ===== Start =====
load();
updateAutoRemoveUI();
