/* ===== المرحلة الثالثة: مستحضر الأرواح، متجر الماس، المهام اليومية والأسبوعية، VIP ===== */
(function(){
'use strict';
const $ = id => document.getElementById(id);
const VIP_T = [0, 100, 300, 700, 1500, 3000];
const VIP_B = [
  'بدون مزايا بعد',
  '+3% XP و+5% ذهب',
  '+1 فرصة استحضار في كل زنزانة',
  '+50% على مكافآت المهام',
  '+10% إضافية على XP والذهب',
  '+1 حليف كحد أقصى في الفريق'
];
const DSHOP = [
  { id:'dxp',   t:'⚡ دبل XP دائم',   c:300, once:true, vp:30, desc:'كل الـ XP يتضاعف' },
  { id:'dgold', t:'🪙 دبل ذهب دائم', c:300, once:true, vp:30, desc:'كل الذهب يتضاعف' },
  { id:'xp500', t:'📘 500 XP',        c:20,  once:false, vp:2, desc:'تُضاف مباشرة إلى خبرتك' }
];
const DAILY = [
  { id:'kill50', t:'اقتل 50 زومبي',         goal:50,   ev:'kill', g:300,  d:0, v:0 },
  { id:'ab10',   t:'استخدم 10 قدرات',       goal:10,   ev:'ab',   g:200,  d:0, v:0 },
  { id:'sum1',   t:'استحضر حليفًا مرة',     goal:1,    ev:'sum',  g:0,    d:1, v:1 },
  { id:'clr1',   t:'أنهِ زنزانة',           goal:1,    ev:'clr',  g:500,  d:2, v:1 }
];
const WEEKLY = [
  { id:'kill1000', t:'اقتل 1000 زومبي',          goal:1000, ev:'kill', g:2000, d:10, v:5 },
  { id:'boss3',    t:'اقتل 3 زعماء',             goal:3,    ev:'boss', g:0,    d:15, v:8 },
  { id:'clr5',     t:'أنهِ 5 زنزانات',           goal:5,    ev:'clr',  g:1500, d:20, v:10 },
  { id:'buy3',     t:'اشترِ 3 عناصر من المتجر',  goal:3,    ev:'buy',  g:1000, d:5,  v:3 }
];

let allies = [], charges = 3, lastKill = null, lastKillT = 0;

/* ---------- مزايا الـ VIP ---------- */
function vipLvl(){ let v = 0; for(let i = 1; i < VIP_T.length; i++) if((meta.vp || 0) >= VIP_T[i]) v = i; return v; }
function xpMul(){ const v = vipLvl(); return (meta.dxp ? 2 : 1) * (1 + 0.03 * v + (v >= 4 ? 0.10 : 0)); }
function goldMul(){ const v = vipLvl(); return (meta.dgold ? 2 : 1) * (1 + 0.05 * v + (v >= 4 ? 0.10 : 0)); }
function baseCharges(){ return 3 + (vipLvl() >= 2 ? 1 : 0); }
function maxAllies(){ return 3 + (vipLvl() >= 5 ? 1 : 0); }
function questMul(){ return vipLvl() >= 3 ? 1.5 : 1; }

/* ---------- المهام ---------- */
function periodKey(kind){
  const days = Math.floor(Date.now() / 86400000);
  return kind === 'd' ? new Date().toISOString().slice(0, 10) : 'w' + Math.floor((days + 3) / 7);
}
function qState(kind){
  const key = periodKey(kind), m = kind === 'd' ? 'qd' : 'qw';
  if(!meta[m] || meta[m].key !== key) meta[m] = { key, p:{}, c:{} };
  return meta[m];
}
function progress(ev, n = 1){
  for(const [kind, list] of [['d', DAILY], ['w', WEEKLY]]){
    const st = qState(kind);
    for(const q of list){
      if(q.ev !== ev) continue;
      st.p[q.id] = Math.min(q.goal, (st.p[q.id] || 0) + n);
    }
  }
}
function claim(kind, id){
  const list = kind === 'd' ? DAILY : WEEKLY, q = list.find(x => x.id === id), st = qState(kind);
  if(!q || st.c[id] || (st.p[id] || 0) < q.goal) return;
  st.c[id] = true;
  meta.gold += Math.round(q.g * questMul() * goldMul());
  meta.dia += Math.round(q.d * questMul());
  meta.vp = (meta.vp || 0) + q.v;
  saveMeta(); renderQ();
}

/* ---------- متجر الماس ---------- */
function renderDShop(){
  let h = `<h2>💎 متجر الماس</h2><p>💎 ماسك: <b>${meta.dia}</b> · VIP: <b>${vipLvl()}</b> (${meta.vp || 0} نقطة)</p><div class="list">`;
  DSHOP.forEach(it => {
    const owned = it.once && meta[it.id];
    h += `<div class="row">${it.t}<br><small>${it.desc} · +${it.vp} نقطة VIP</small><br>
      <button data-buy="${it.id}" ${owned || meta.dia < it.c ? 'disabled' : ''}>${owned ? '✅ مملوك' : '💎 ' + it.c}</button></div>`;
  });
  h += `</div><button class="alt" data-back="1">🔙 رجوع</button>`;
  const c = $('p3dshop-c'); c.innerHTML = h;
  c.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => dBuy(b.dataset.buy));
  c.querySelector('[data-back]').onclick = showMenu;
}
function dBuy(id){
  const it = DSHOP.find(x => x.id === id); if(!it) return;
  if(it.once && meta[id]) return;
  if(meta.dia < it.c) return;
  meta.dia -= it.c;
  if(it.once) meta[id] = true;
  else window.addXp(500);
  meta.vp = (meta.vp || 0) + it.vp;
  saveMeta(); renderDShop();
}

/* ---------- المهام: واجهة ---------- */
function block(kind, list){
  const st = qState(kind);
  return list.map(q => {
    const p = Math.min(q.goal, st.p[q.id] || 0), done = p >= q.goal, cl = st.c[q.id];
    return `<div class="row">${q.t}<br><small>${p}/${q.goal} · 🪙${Math.round(q.g * questMul())} · 💎${Math.round(q.d * questMul())} · ⭐VIP ${q.v}</small><br>
      ${cl ? '✅ تم الاستلام' : done ? `<button data-c="${kind}:${q.id}">استلام</button>` : ''}</div>`;
  }).join('');
}
function renderQ(){
  let h = `<h2>📜 المهام</h2><h3>يومية</h3><div class="list">${block('d', DAILY)}</div>
           <h3>أسبوعية</h3><div class="list">${block('w', WEEKLY)}</div>
           <button class="alt" data-back="1">🔙 رجوع</button>`;
  const c = $('p3q-c'); c.innerHTML = h;
  c.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const [k, id] = b.dataset.c.split(':'); claim(k, id); });
  c.querySelector('[data-back]').onclick = showMenu;
}

/* ---------- صفحة VIP ---------- */
function renderVip(){
  const v = vipLvl(), pts = meta.vp || 0, next = VIP_T[v + 1];
  let h = `<h2>👑 VIP ${v}</h2><p>النقاط: <b>${pts}</b>${next ? ` · للمستوى التالي: ${next - pts}` : ' · أعلى مستوى'}</p><div class="list">`;
  for(let i = 1; i < VIP_T.length; i++){
    h += `<div class="row">${i <= v ? '✅' : '🔒'} VIP ${i} (${VIP_T[i]} نقطة)<br><small>${VIP_B[i]}</small></div>`;
  }
  h += `</div><p class="hint">تكسب نقاط VIP من شراء الماس، ومن مهام معينة فقط.</p><button class="alt" data-back="1">🔙 رجوع</button>`;
  const c = $('p3vip-c'); c.innerHTML = h;
  c.querySelector('[data-back]').onclick = showMenu;
}

/* ---------- الحلفاء (مستحضر الأرواح) ---------- */
function summon(){
  if(state !== 'play') return;
  if(!lastKill || performance.now() - lastKillT > 12000){ floatText(player.x, player.y - 30, 'لا يوجد وحش قريب', '#ccc'); return; }
  if(charges <= 0){ floatText(player.x, player.y - 30, 'انتهت فرص الاستحضار', '#f88'); return; }
  if(allies.length >= maxAllies()){ floatText(player.x, player.y - 30, 'الفريق ممتلئ', '#f88'); return; }
  if(player.mana < 20){ floatText(player.x, player.y - 30, 'مانا غير كافية', '#f88'); return; }
  player.mana -= 20; charges--;
  const boss = lastKill.boss, hp = (boss ? 400 : 70) * (1 + dIdx * 0.2);
  allies.push({ x:player.x + rand(-20, 20), y:player.y + rand(-20, 20), hp, maxHp:hp, boss,
    dmg:(boss ? 40 : 12) * (1 + dIdx * 0.15), cd:0.5, r:boss ? 18 : 11, ang:Math.random() * TAU });
  progress('sum', 1);
  floatText(player.x, player.y - 40, '🔮 حليف جديد!', '#b388ff');
  sfx(660, 0.2, 'sine', 0.05, 1.5);
  lastKill = null; saveMeta();
}

/* ---------- الخطافات ---------- */
window.P3 = {
  xpMul, goldMul,
  reset(){ allies = []; charges = baseCharges(); lastKill = null; },
  onKill(e){
    lastKill = { type: e.boss ? 'boss' : e.type, boss: !!e.boss }; lastKillT = performance.now();
    progress('kill', 1);
    if(e.boss) progress('boss', 1);
  },
  onAbility(){ progress('ab', 1); },
  onClear(win){ if(win) progress('clr', 1); saveMeta(); },
  onBuy(){ progress('buy', 1); },
  update(dt){
    for(const a of allies){
      a.cd -= dt; a.ang += dt * 1.5;
      const idx = allies.indexOf(a);
      const tx = player.x + Math.cos(a.ang + idx * 2.1) * 48, ty = player.y + Math.sin(a.ang + idx * 2.1) * 48;
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy) || 1, step = Math.min(d, Math.min(260, d * 4) * dt);
      a.x += dx / d * step; a.y += dy / d * step;
      if(a.cd <= 0){
        let best = null, bd = 380 * 380;
        for(const e of enemies){
          if(e.dead) continue;
          const ex = e.x - a.x, ey = e.y - a.y, dd = ex * ex + ey * ey;
          if(dd < bd){ bd = dd; best = e; }
        }
        if(best){
          const ex = best.x - a.x, ey = best.y - a.y, dl = Math.hypot(ex, ey) || 1;
          bullets.push({ x:a.x, y:a.y, vx:ex / dl * 520, vy:ey / dl * 520, r:a.boss ? 8 : 5, dmg:a.dmg, life:1.2,
            pierce:0, col:a.boss ? '#ff6bd6' : '#b388ff', hit:null, dead:false, ang:0 });
          a.cd = a.boss ? 1.1 : 0.9;
        } else a.cd = 0.1;
      }
      for(const e of enemies){
        if(e.dead) continue;
        const dx2 = e.x - a.x, dy2 = e.y - a.y, rr = e.r + a.r;
        if(dx2 * dx2 + dy2 * dy2 < rr * rr) a.hp -= e.dmg * 0.6 * dt;
      }
    }
    allies = allies.filter(a => a.hp > 0);
    const btn = $('p3sum');
    btn.style.display = state === 'play' ? 'block' : 'none';
    btn.textContent = `🔮 استحضار (${charges})`;
  },
  draw(ctx){
    for(const a of allies){
      const sx = a.x - camX, sy = a.y - camY, h = a.boss ? 80 : 34, hy = sy - h / 2 - 6;
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = a.boss ? '#ff6bd6' : '#b388ff';
      ctx.beginPath(); ctx.arc(sx, sy, a.r + 6, 0, TAU); ctx.fill(); ctx.restore();
      const img = a.boss ? VAR.boss : VAR.runner;
      if(!drawSpr(img || SPR.zombie, sx, sy, h)){
        ctx.fillStyle = '#b388ff'; ctx.beginPath(); ctx.arc(sx, sy, a.r, 0, TAU); ctx.fill();
      }
      const bw = 28;
      ctx.fillStyle = '#000a'; ctx.fillRect(sx - bw / 2, hy, bw, 3);
      ctx.fillStyle = '#6cf'; ctx.fillRect(sx - bw / 2, hy, bw * clamp(a.hp / a.maxHp, 0, 1), 3);
    }
  }
};

/* ---------- الواجهة ---------- */
function mkOv(id){
  const d = document.createElement('div'); d.className = 'ov'; d.id = id;
  d.innerHTML = `<div class="box"><div id="${id}-c"></div></div>`;
  document.body.appendChild(d);
}
function init(){
  meta.vp = meta.vp || 0; meta.dia = meta.dia || 0;
  mkOv('p3dshop'); mkOv('p3q'); mkOv('p3vip');
  const sumBtn = document.createElement('button');
  sumBtn.id = 'p3sum';
  sumBtn.style.cssText = 'position:fixed;right:10px;bottom:110px;z-index:6;display:none;padding:10px 14px;font-size:15px;min-width:0';
  sumBtn.onclick = summon;
  document.body.appendChild(sumBtn);

  const anchor = $('soundBtnMenu');
  [['💎 متجر الماس', () => { hideOverlays(); renderDShop(); $('p3dshop').classList.add('show'); }],
   ['📜 المهام', () => { hideOverlays(); renderQ(); $('p3q').classList.add('show'); }],
   ['👑 VIP', () => { hideOverlays(); renderVip(); $('p3vip').classList.add('show'); }]
  ].forEach(([label, fn]) => {
    const b = document.createElement('button');
    b.className = 'alt'; b.textContent = label; b.onclick = fn;
    anchor.insertAdjacentElement('beforebegin', b);
  });

  window.addEventListener('keydown', e => { if(e.key.toLowerCase() === 'f') summon(); });
}
init();
})();
