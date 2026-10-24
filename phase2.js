/* ===== المرحلة الثانية: الحقيبة والمعدات، متجر العناصر، القدرات، الموسوعة ===== */
(function(){
'use strict';
const $ = id => document.getElementById(id);
const RAR  = ['F','E','D','C','B','A','S','SS','SSS'];
const RCOL = ['#aab','#6c6','#5af','#3cc','#b7f','#f6c','#fc3','#f80','#f33'];
const RVAL = [1,2,3,4,6,8,10,13,16];
const RPRICE = [60,120,250,500,1000,2000,4000,8000,16000];
const SLOTS = ['charm','helm','armor','boots'];
const SLOT_NAME = { charm:'عصا سحرية', helm:'خوذة', armor:'درع', boots:'حذاء' };
const SLOT_ICON = { charm:'🪄', helm:'⛑️', armor:'🛡️', boots:'🥾' };
const IST = ['health','rate','speed','dmg','magnet','armor','regen','mana'];
const IST_NAME = { health:'صحة', rate:'سرعة إطلاق', speed:'سرعة حركة', dmg:'ضرر', magnet:'جذب', armor:'درع', regen:'تجدد', mana:'مانا' };
const DEX_ORDER = ['walker','runner','fat','spitter','boss'];
const DEX_NAME = { walker:'زومبي عادي', runner:'زومبي سريع', fat:'زومبي ضخم', spitter:'زومبي البصّاق', boss:'زعيم الزنزانة' };
const ABIL = [
  { ic:'🛡️', name:'درع الروح',      cost:30, cd:12, desc:'يمتص كل ضرر لمدة 4 ثوانٍ' },
  { ic:'💥', name:'انفجار الروح',   cost:40, cd:8,  desc:'انفجار حولك يضرب الأعداء القريبين' },
  { ic:'🩸', name:'امتصاص الحياة',  cost:35, cd:15, desc:'يستعيد 25% من حياتك' }
];
const ab = ABIL.map(() => ({ cdT:0 }));
let shieldT = 0, abBtn = [];

function ensure(){
  meta.inv = meta.inv || []; meta.eq = meta.eq || {}; meta.shop = meta.shop || [];
  if(meta.shopKey === undefined) meta.shopKey = -1;
  meta.coll = meta.coll || []; meta.dex = meta.dex || {};
  meta.tok = meta.tok || 0;
  if(meta.lastLvl === undefined) meta.lastLvl = meta.lvl;
  SLOTS.forEach(s => { if(meta.eq[s] === undefined) meta.eq[s] = null; });
}
ensure();

const maxRar = () => Math.min(8, Math.floor(meta.cleared / 25));
const statsText = it => Object.keys(it.stats).map(k => `+${it.stats[k]} ${IST_NAME[k]}`).join(' · ');
const badge = r => `<b style="color:${RCOL[r]}">${RAR[r]}</b>`;
function mk(maxR){
  const r = Math.min(maxR, Math.floor(Math.random() * Math.random() * (maxR + 2)));
  const slot = SLOTS[(Math.random() * SLOTS.length) | 0];
  const n = 1 + (r >= 4 ? 1 : 0) + (r >= 7 ? 1 : 0);
  const pool = IST.slice(), stats = {};
  for(let i = 0; i < n; i++){
    const k = pool.splice((Math.random() * pool.length) | 0, 1)[0];
    stats[k] = Math.max(1, Math.round(RVAL[r] * (0.7 + Math.random() * 0.6)));
  }
  return { uid: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), slot, r, stats };
}
function eq(k){
  let s = 0;
  for(const sl of SLOTS){ const it = meta.eq && meta.eq[sl]; if(it && it.stats[k]) s += it.stats[k]; }
  return s;
}
function afterChange(){ saveMeta(); if(window.recalcMax) recalcMax(); }

/* ---------- المتجر ---------- */
function refreshShop(){
  if(meta.shopKey !== meta.cleared){
    meta.shop = [0,1,2,3,4,5].map(() => { const it = mk(maxRar()); it.price = RPRICE[it.r]; return it; });
    meta.shopKey = meta.cleared; saveMeta();
  }
}
function renderShop(){
  ensure(); refreshShop();
  let h = `<h2>🏪 متجر العناصر</h2><p>🪙 ذهبك: ${meta.gold} · يتجدد مع كل زنزانة تنجحها</p><div class="list">`;
  meta.shop.forEach((it, i) => {
    if(!it){ h += `<div class="row">✖ تم الشراء</div>`; return; }
    h += `<div class="row">${SLOT_ICON[it.slot]} ${badge(it.r)} ${SLOT_NAME[it.slot]}<br><small>${statsText(it)}</small><br>
      <button data-buy="${i}" ${meta.gold < it.price ? 'disabled' : ''}>شراء 🪙 ${it.price}</button></div>`;
  });
  h += `</div><button class="alt" data-back="1">🔙 رجوع</button>`;
  $('p2shop-c').innerHTML = h;
  $('p2shop-c').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buy(+b.dataset.buy));
  $('p2shop-c').querySelector('[data-back]').onclick = showMenu;
}
function buy(i){
  const it = meta.shop[i];
  if(!it || meta.gold < it.price) return;
  meta.gold -= it.price;
  const copy = { uid:it.uid, slot:it.slot, r:it.r, stats:it.stats };
  meta.inv.push(copy); meta.shop[i] = null;
  saveMeta();
  if(window.P3) P3.onBuy();
  renderShop();
}

/* ---------- الحقيبة ---------- */
function renderInv(){
  ensure();
  let h = `<h2>🎒 الحقيبة</h2><p>المعدات المجهزة:</p>`;
  SLOTS.forEach(s => {
    const it = meta.eq[s];
    h += `<div class="row">${SLOT_ICON[s]} ${SLOT_NAME[s]}: ${it
      ? `${badge(it.r)} <small>${statsText(it)}</small> <button class="alt" data-un="${s}">نزع</button>`
      : 'فارغة'}</div>`;
  });
  h += `<p>العناصر (${meta.inv.length}):</p><div class="list">`;
  meta.inv.slice().sort((a, b) => b.r - a.r).forEach(it => {
    h += `<div class="row">${SLOT_ICON[it.slot]} ${badge(it.r)} ${SLOT_NAME[it.slot]}<br><small>${statsText(it)}</small><br>
      <button data-eq="${it.uid}">تجهيز</button>
      <button class="alt" data-sell="${it.uid}">بيع 🪙${Math.floor(RPRICE[it.r] / 2)}</button></div>`;
  });
  h += `</div><button class="alt" data-back="1">🔙 رجوع</button>`;
  const c = $('p2inv-c'); c.innerHTML = h;
  c.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => equip(b.dataset.eq));
  c.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => sellInv(b.dataset.sell));
  c.querySelectorAll('[data-un]').forEach(b => b.onclick = () => unequip(b.dataset.un));
  c.querySelector('[data-back]').onclick = showMenu;
}
function equip(uid){
  const idx = meta.inv.findIndex(x => x.uid === uid); if(idx < 0) return;
  const it = meta.inv[idx], old = meta.eq[it.slot];
  meta.inv.splice(idx, 1);
  if(old) meta.inv.push(old);
  meta.eq[it.slot] = it;
  afterChange(); renderInv();
}
function unequip(slot){
  const it = meta.eq[slot]; if(!it) return;
  meta.eq[slot] = null; meta.inv.push(it);
  afterChange(); renderInv();
}
function sellInv(uid){
  const idx = meta.inv.findIndex(x => x.uid === uid); if(idx < 0) return;
  const it = meta.inv[idx];
  meta.inv.splice(idx, 1); meta.gold += Math.floor(RPRICE[it.r] / 2);
  afterChange(); renderInv();
}

/* ---------- الموسوعة ---------- */
const sellVal = k => 100 * (DEX_ORDER.indexOf(k) + 1);
function renderDex(){
  ensure();
  let h = `<h2>📖 الموسوعة</h2><p>🎟 فرص الحفظ المتاحة: <b>${meta.tok}</b> (كل مستوى يعطيك 3)</p><div class="list">`;
  DEX_ORDER.forEach(k => {
    const killed = meta.dex[k] || 0;
    const copies = meta.coll.filter(x => x === k).length;
    h += `<div class="row">${killed ? '👾' : '❔'} <b>${killed ? DEX_NAME[k] : '???'}</b>
      <br><small>${killed ? `قتلت: ${killed} · محفوظ: ${copies}` : 'لم تُقتل بعد'}</small><br>
      ${killed && meta.tok > 0 ? `<button data-save="${k}">حفظ (1 فرصة)</button>` : ''}
      ${copies ? `<button class="alt" data-sell="${k}">بيع 🪙${sellVal(k)}</button>` : ''}</div>`;
  });
  h += `</div><button class="alt" data-back="1">🔙 رجوع</button>`;
  const c = $('p2dex-c'); c.innerHTML = h;
  c.querySelectorAll('[data-save]').forEach(b => b.onclick = () => { meta.tok--; meta.coll.push(b.dataset.save); afterChange(); renderDex(); });
  c.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
    const k = b.dataset.sell, i = meta.coll.indexOf(k); if(i < 0) return;
    meta.coll.splice(i, 1); meta.gold += sellVal(k); afterChange(); renderDex();
  });
  c.querySelector('[data-back]').onclick = showMenu;
}

/* ---------- القدرات ---------- */
function cast(i){
  if(state !== 'play') return;
  const a = ABIL[i], s = ab[i];
  if(s.cdT > 0 || player.mana < a.cost){ sfx(200, 0.05, 'sine', 0.02); return; }
  player.mana -= a.cost; s.cdT = a.cd;
  if(window.P3) P3.onAbility();
  if(i === 0){
    shieldT = 4;
    fx.push({ type:'ring', x:player.x, y:player.y, max:40, life:0.4, total:0.4, col:'#7fd1ff' });
    floatText(player.x, player.y - 30, '🛡 درع!', '#7fd1ff');
  } else if(i === 1){
    const R = 160, dmg = 60 * (1 + 0.15 * L('dmg'));
    fx.push({ type:'ring', x:player.x, y:player.y, max:R, life:0.45, total:0.45, col:'#ff8c42' });
    for(const e of enemies){
      if(e.dead) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      if(dx*dx + dy*dy < R*R) damageEnemy(e, dmg, '#ff8c42');
    }
    shake = Math.max(shake, 6);
  } else {
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.25);
    floatText(player.x, player.y - 30, '+25%', '#7dff9e');
  }
  sfx(520, 0.12, 'triangle', 0.05, 1.4);
}

/* ---------- الواجهة ---------- */
function mkOv(id){
  const d = document.createElement('div');
  d.className = 'ov'; d.id = id;
  d.innerHTML = `<div class="box"><div id="${id}-c"></div></div>`;
  document.body.appendChild(d);
  return d;
}
function init(){
  const css = document.createElement('style');
  css.textContent = `
    .list{max-height:52vh;overflow:auto;text-align:right}
    .row{background:#0008;border-radius:10px;padding:8px;margin:6px 0;font-size:14px;color:#cde;line-height:1.6}
    .row button{min-width:0;padding:7px 12px;font-size:14px;margin:4px 2px}
    #p2abil{position:fixed;right:10px;bottom:30px;z-index:6;display:none;gap:10px}
    #p2abil button{width:62px;height:62px;border-radius:50%;padding:0;min-width:0;margin:0;font-size:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
    #p2abil small{font-size:11px;margin-top:2px}`;
  document.head.appendChild(css);

  mkOv('p2shop'); mkOv('p2inv'); mkOv('p2dex');

  const anchor = $('shopFromMenu');
  const items = [
    ['🎒 الحقيبة', () => { hideOverlays(); renderInv(); $('p2inv').classList.add('show'); }],
    ['🏪 متجر العناصر', () => { hideOverlays(); renderShop(); $('p2shop').classList.add('show'); }],
    ['📖 الموسوعة', () => { hideOverlays(); renderDex(); $('p2dex').classList.add('show'); }]
  ];
  let last = anchor;
  items.forEach(([label, fn]) => {
    const b = document.createElement('button');
    b.className = 'alt'; b.textContent = label; b.onclick = fn;
    last.insertAdjacentElement('afterend', b); last = b;
  });

  const bar = document.createElement('div'); bar.id = 'p2abil';
  ABIL.forEach((a, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${a.ic}</span><small>${a.cost}🔷</small>`;
    b.onclick = () => cast(i);
    bar.appendChild(b); abBtn.push(b);
  });
  document.body.appendChild(bar);

  window.addEventListener('keydown', e => {
    const i = ['q','e','r'].indexOf(e.key.toLowerCase());
    if(i >= 0 && state === 'play') cast(i);
  });
}

/* ---------- الخطافات التي تستدعيها اللعبة ---------- */
window.P2 = {
  eq,
  reset(){ shieldT = 0; ab.forEach(a => a.cdT = 0); },
  absorb(dmg){
    if(shieldT > 0){ floatText(player.x, player.y - 26, 'امتص!', '#7fd1ff'); return true; }
    return false;
  },
  onKill(e){
    const k = e.boss ? 'boss' : e.type;
    meta.dex[k] = (meta.dex[k] || 0) + 1;
    if(e.final || Math.random() < 0.012){
      const it = mk(maxRar());
      meta.inv.push(it); saveMeta();
      floatText(e.x, e.y - 24, `🎁 ${RAR[it.r]} ${SLOT_NAME[it.slot]}`, RCOL[it.r]);
    }
  },
  update(dt){
    ensure();
    if(meta.lvl > meta.lastLvl){ meta.tok += 3 * (meta.lvl - meta.lastLvl); meta.lastLvl = meta.lvl; saveMeta(); }
    shieldT = Math.max(0, shieldT - dt);
    ab.forEach(a => a.cdT = Math.max(0, a.cdT - dt));
    $('p2abil').style.display = state === 'play' ? 'flex' : 'none';
    ABIL.forEach((a, i) => {
      const s = ab[i];
      abBtn[i].lastElementChild.textContent = s.cdT > 0 ? Math.ceil(s.cdT) + 's' : a.cost + '🔷';
      abBtn[i].style.opacity = (s.cdT > 0 || player.mana < a.cost) ? 0.5 : 1;
    });
  },
  draw(ctx){
    if(shieldT > 0){
      const sx = player.x - camX, sy = player.y - camY;
      ctx.strokeStyle = 'rgba(127,209,255,.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, sy, 26 + Math.sin(performance.now() / 80) * 2, 0, TAU); ctx.stroke();
    }
  }
};

init();
})();
