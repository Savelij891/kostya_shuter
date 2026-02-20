const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  menu: document.getElementById("menu"),
  hud: document.getElementById("hud"),
  mobileControls: document.getElementById("mobileControls"),
  startBtn: document.getElementById("startBtn"),
  backBtn: document.getElementById("backBtn"),
  playerName: document.getElementById("playerName"),
  modeSelect: document.getElementById("modeSelect"),
  mapSelect: document.getElementById("mapSelect"),
  weaponSelect: document.getElementById("weaponSelect"),
  scoreLine: document.getElementById("scoreLine"),
  timerLine: document.getElementById("timerLine"),
  mapLine: document.getElementById("mapLine"),
  playerLine: document.getElementById("playerLine"),
  weaponLine: document.getElementById("weaponLine"),
  ammoLine: document.getElementById("ammoLine"),
  hpLine: document.getElementById("hpLine"),
  moveStick: document.getElementById("moveStick"),
  aimStick: document.getElementById("aimStick"),
  fireBtn: document.getElementById("fireBtn"),
  reloadBtn: document.getElementById("reloadBtn"),
  nextWeaponBtn: document.getElementById("nextWeaponBtn"),
};

const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
const keys = new Set();
const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };
const cam = { x: 0, y: 0 };

const mobile = {
  move: { x: 0, y: 0, id: null },
  aim: { x: 0, y: 0, id: null },
  fireDown: false,
};

const weapons = [
  { id: "ak", name: "AK-12", dmg: 24, rate: 8.5, mag: 30, reload: 1.9, speed: 980, spread: 0.06, range: 980 },
  { id: "smg", name: "Vector SMG", dmg: 16, rate: 13, mag: 34, reload: 1.5, speed: 920, spread: 0.085, range: 760 },
  { id: "dmr", name: "M110 DMR", dmg: 41, rate: 3.8, mag: 12, reload: 2.2, speed: 1200, spread: 0.03, range: 1300 },
];

const maps = {
  school15: {
    name: "Школа 15 Expanded",
    width: 3200,
    height: 2200,
    palette: { g1: "#5d7150", g2: "#4b5c44", line: "#738962", w1: "#9ca8b1", w2: "#838f97" },
    spawns: [{ x: 260, y: 260 }, { x: 2900, y: 1900 }],
    obstacles: [
      { x: 420, y: 420, w: 500, h: 220 }, { x: 1100, y: 310, w: 310, h: 560 }, { x: 1580, y: 980, w: 540, h: 300 },
      { x: 2280, y: 380, w: 430, h: 220 }, { x: 2520, y: 920, w: 290, h: 540 }, { x: 780, y: 1320, w: 430, h: 220 },
      { x: 1320, y: 1540, w: 350, h: 420 }, { x: 1860, y: 1460, w: 350, h: 280 }, { x: 2360, y: 1630, w: 420, h: 300 },
    ],
  },
  tv4: {
    name: "Теле4 Industrial",
    width: 3400,
    height: 2400,
    palette: { g1: "#5a616e", g2: "#4a5260", line: "#6f7786", w1: "#7f8b94", w2: "#69747c" },
    spawns: [{ x: 260, y: 2100 }, { x: 3120, y: 310 }],
    obstacles: [
      { x: 320, y: 420, w: 560, h: 260 }, { x: 1160, y: 460, w: 440, h: 240 }, { x: 1760, y: 360, w: 300, h: 640 },
      { x: 2310, y: 520, w: 580, h: 260 }, { x: 820, y: 980, w: 230, h: 760 }, { x: 1200, y: 1240, w: 520, h: 320 },
      { x: 1910, y: 1260, w: 360, h: 700 }, { x: 2490, y: 1390, w: 480, h: 260 }, { x: 520, y: 1860, w: 530, h: 260 },
    ],
  },
  dust2: {
    name: "Dust2 Remake XL",
    width: 3600,
    height: 2500,
    palette: { g1: "#806c4d", g2: "#6e5b42", line: "#99835f", w1: "#c7b188", w2: "#b49769" },
    spawns: [{ x: 280, y: 2300 }, { x: 3360, y: 260 }],
    obstacles: [
      { x: 340, y: 360, w: 700, h: 240 }, { x: 1220, y: 280, w: 300, h: 560 }, { x: 1680, y: 720, w: 700, h: 220 },
      { x: 2500, y: 290, w: 620, h: 260 }, { x: 620, y: 980, w: 240, h: 920 }, { x: 1080, y: 1220, w: 520, h: 240 },
      { x: 1860, y: 1140, w: 360, h: 740 }, { x: 2440, y: 1240, w: 720, h: 240 }, { x: 1380, y: 1860, w: 940, h: 250 },
    ],
  },
};

const game = {
  running: false,
  mode: "bots",
  mapKey: "school15",
  map: maps.school15,
  playerName: "Костя",
  player: null,
  bots: [],
  bullets: [],
  score: { ct: 0, t: 0 },
  timeLeft: 180,
  tex: null,
  lastTs: 0,
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(min, max) { return min + Math.random() * (max - min); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function ang(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function makePattern(draw, s = 128) {
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const g = c.getContext("2d");
  draw(g, s);
  return ctx.createPattern(c, "repeat");
}

function buildTextures(map) {
  return {
    ground: makePattern((g, s) => {
      g.fillStyle = map.palette.g1;
      g.fillRect(0, 0, s, s);
      g.fillStyle = map.palette.g2;
      for (let i = 0; i < 120; i++) {
        g.globalAlpha = 0.18;
        g.beginPath();
        g.arc(rand(0, s), rand(0, s), rand(2, 8), 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 0.27;
      g.strokeStyle = map.palette.line;
      g.lineWidth = 1;
      for (let i = 0; i < 9; i++) {
        const y = i * 14 + rand(-4, 4);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(s, y + rand(-2, 2));
        g.stroke();
      }
      g.globalAlpha = 1;
    }),
    wall: makePattern((g, s) => {
      g.fillStyle = map.palette.w1;
      g.fillRect(0, 0, s, s);
      g.strokeStyle = map.palette.w2;
      g.lineWidth = 2;
      const h = 18;
      for (let y = 0; y < s; y += h) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(s, y);
        g.stroke();
        const shift = (Math.floor(y / h) % 2) * 16;
        for (let x = shift; x < s; x += 32) {
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x, y + h);
          g.stroke();
        }
      }
    }),
  };
}

function weaponById(id) { return weapons.find(w => w.id === id) || weapons[0]; }
function currentWeapon(u) { return weapons[u.weaponIndex] || weapons[0]; }

function createUnit(x, y, team, isPlayer = false, weaponId = "ak") {
  const w = weaponById(weaponId);
  return {
    x, y, team, isPlayer, dead: false,
    hp: 100, r: 24, dir: 0, vx: 0, vy: 0,
    speed: isPlayer ? 245 : 190,
    weaponIndex: Math.max(0, weapons.findIndex(xw => xw.id === w.id)),
    ammo: w.mag,
    cooldown: 0,
    reloading: 0,
    dashCd: 0,
    aiShift: rand(0, Math.PI * 2),
  };
}

function resetRound() {
  game.map = maps[game.mapKey];
  game.tex = buildTextures(game.map);
  game.player = createUnit(game.map.spawns[0].x, game.map.spawns[0].y, "ct", true, ui.weaponSelect.value);
  game.bots = [];
  game.bullets = [];
  game.timeLeft = 180;

  if (game.mode === "duel") {
    game.bots.push(createUnit(game.map.spawns[1].x, game.map.spawns[1].y, "t", false, "dmr"));
  } else {
    for (let i = 0; i < 5; i++) {
      const isT = i < 3;
      const sp = isT ? game.map.spawns[1] : game.map.spawns[0];
      const bot = createUnit(sp.x + rand(-180, 180), sp.y + rand(-160, 160), isT ? "t" : "ct", false, i % 3 === 0 ? "smg" : "ak");
      game.bots.push(bot);
    }
  }
}

function blocked(x, y, r = 0) {
  const m = game.map;
  if (x - r < 20 || y - r < 20 || x + r > m.width - 20 || y + r > m.height - 20) return true;
  for (const o of m.obstacles) {
    if (x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h) return true;
  }
  return false;
}

function moveCollide(u, dt) {
  const nx = u.x + u.vx * dt;
  const ny = u.y + u.vy * dt;
  if (!blocked(nx, u.y, u.r)) u.x = nx;
  if (!blocked(u.x, ny, u.r)) u.y = ny;
}

function shoot(u) {
  const w = currentWeapon(u);
  if (u.dead || u.reloading > 0 || u.cooldown > 0 || u.ammo <= 0) return;
  u.cooldown = 1 / w.rate;
  u.ammo -= 1;
  const a = u.dir + (Math.random() - 0.5) * w.spread;
  game.bullets.push({
    x: u.x + Math.cos(a) * (u.r + 20),
    y: u.y + Math.sin(a) * (u.r + 20),
    vx: Math.cos(a) * w.speed,
    vy: Math.sin(a) * w.speed,
    life: w.range / w.speed,
    dmg: w.dmg,
    team: u.team,
  });
}

function startReload(u) {
  const w = currentWeapon(u);
  if (u.dead || u.reloading > 0 || u.ammo === w.mag) return;
  u.reloading = w.reload;
}

function nextWeapon(u) {
  u.weaponIndex = (u.weaponIndex + 1) % weapons.length;
  const w = currentWeapon(u);
  u.reloading = 0;
  u.ammo = Math.min(u.ammo, w.mag);
}

function playerControl(dt) {
  const p = game.player;
  if (!p || p.dead) return;

  let mx = 0, my = 0;
  if (keys.has("KeyW")) my -= 1;
  if (keys.has("KeyS")) my += 1;
  if (keys.has("KeyA")) mx -= 1;
  if (keys.has("KeyD")) mx += 1;

  if (Math.hypot(mobile.move.x, mobile.move.y) > 0.05) {
    mx = mobile.move.x;
    my = mobile.move.y;
  }

  const l = Math.hypot(mx, my) || 1;
  p.vx = Math.abs(mx) + Math.abs(my) > 0.05 ? (mx / l) * p.speed : 0;
  p.vy = Math.abs(mx) + Math.abs(my) > 0.05 ? (my / l) * p.speed : 0;

  let tx = mouse.x + cam.x;
  let ty = mouse.y + cam.y;
  if (Math.hypot(mobile.aim.x, mobile.aim.y) > 0.2) {
    tx = p.x + mobile.aim.x * 400;
    ty = p.y + mobile.aim.y * 400;
  }
  p.dir = ang(p.x, p.y, tx, ty);

  if (keys.has("Space") && p.dashCd <= 0) {
    p.vx *= 2.5;
    p.vy *= 2.5;
    p.dashCd = 2.6;
  }

  if (mouse.down || mobile.fireDown) shoot(p);
  if (keys.has("KeyR")) startReload(p);

  moveCollide(p, dt);
}

function botControl(u, i, dt) {
  if (u.dead) return;
  u.aiShift += dt;

  let target = game.player;
  if (u.team === "ct") {
    target = game.bots.find(x => !x.dead && x.team === "t") || game.player;
  }
  if (!target || target.dead) return;

  const a = ang(u.x, u.y, target.x, target.y);
  const d = dist(u.x, u.y, target.x, target.y);
  const prefer = u.team === "t" ? 430 : 320;
  const forward = d > prefer ? 1 : (d < prefer - 80 ? -1 : 0);
  const strafe = Math.sin(u.aiShift * 1.8 + i) * 0.9;
  const dx = Math.cos(a) * forward - Math.sin(a) * strafe;
  const dy = Math.sin(a) * forward + Math.cos(a) * strafe;
  const l = Math.hypot(dx, dy) || 1;

  u.vx = (dx / l) * u.speed;
  u.vy = (dy / l) * u.speed;
  u.dir = a;

  if (Math.random() < 0.003 && u.dashCd <= 0) {
    u.vx *= 2.1;
    u.vy *= 2.1;
    u.dashCd = 2.9;
  }

  if (d < currentWeapon(u).range * 0.9) shoot(u);
  if (u.ammo <= 0) startReload(u);

  moveCollide(u, dt);
}

function updateUnits(dt) {
  for (const u of [game.player, ...game.bots]) {
    if (!u) continue;
    u.cooldown = Math.max(0, u.cooldown - dt);
    u.dashCd = Math.max(0, u.dashCd - dt);
    if (u.reloading > 0) {
      u.reloading -= dt;
      if (u.reloading <= 0) {
        u.reloading = 0;
        u.ammo = currentWeapon(u).mag;
      }
    }
  }
}

function updateBullets(dt) {
  const targets = () => [game.player, ...game.bots];

  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.life <= 0 || blocked(b.x, b.y, 1)) {
      game.bullets.splice(i, 1);
      continue;
    }

    let hit = false;
    for (const t of targets()) {
      if (!t || t.dead || t.team === b.team) continue;
      if (dist(b.x, b.y, t.x, t.y) < t.r) {
        t.hp -= b.dmg;
        if (t.hp <= 0) {
          t.dead = true;
          if (t.isPlayer) {
            game.score.t += 1;
            setTimeout(() => game.running && resetRound(), 650);
          } else {
            if (b.team === "ct") game.score.ct += 1; else game.score.t += 1;
            setTimeout(() => {
              if (!game.running) return;
              const sp = t.team === "ct" ? game.map.spawns[0] : game.map.spawns[1];
              Object.assign(t, createUnit(sp.x + rand(-120, 120), sp.y + rand(-120, 120), t.team, false, currentWeapon(t).id));
            }, 1200);
          }
        }
        hit = true;
        break;
      }
    }
    if (hit) game.bullets.splice(i, 1);
  }
}

function updateCam() {
  if (!game.player) return;
  cam.x = clamp(game.player.x - innerWidth / 2, 0, Math.max(0, game.map.width - innerWidth));
  cam.y = clamp(game.player.y - innerHeight / 2, 0, Math.max(0, game.map.height - innerHeight));
}

function roundedFill(x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
  ctx.fill();
}

function drawMap() {
  const m = game.map;
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  ctx.fillStyle = game.tex.ground;
  ctx.fillRect(0, 0, m.width, m.height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < m.width; x += 200) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, m.height);
    ctx.stroke();
  }
  for (let y = 0; y < m.height; y += 200) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(m.width, y);
    ctx.stroke();
  }

  for (const o of m.obstacles) {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(o.x + 8, o.y + 10, o.w, o.h);
    ctx.fillStyle = game.tex.wall;
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = "rgba(25,30,35,0.4)";
    ctx.lineWidth = 3;
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, m.width - 20, m.height - 20);

  ctx.restore();
}

function drawWeapon(x, y, dir, w) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(dir);
  const len = w.id === "dmr" ? 44 : w.id === "smg" ? 30 : 38;
  const body = w.id === "dmr" ? "#313842" : w.id === "smg" ? "#2f353d" : "#4a4f56";
  ctx.fillStyle = body;
  ctx.fillRect(8, -5, len, 10);
  ctx.fillStyle = "#191f26";
  ctx.fillRect(10 + len * 0.45, -8, 10, 6);
  ctx.fillStyle = "#cf9a2f";
  ctx.fillRect(10 + len * 0.65, -2, 10, 4);
  ctx.fillStyle = "#15191f";
  ctx.fillRect(12, 5, 12, 7);
  ctx.restore();
}

function drawUnit(u) {
  if (u.dead) return;
  const sx = u.x - cam.x;
  const sy = u.y - cam.y;
  const w = currentWeapon(u);

  ctx.save();
  ctx.translate(sx, sy);

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 16, u.r * 0.9, u.r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(u.dir);

  const ct = u.team === "ct";
  const armor = ct ? "#2c6ea9" : "#a34a3f";
  const cloth = ct ? "#4f7ea4" : "#8b675a";
  const skin = "#d7b28d";

  ctx.fillStyle = cloth;
  roundedFill(-16, -13, 32, 30, 8);

  ctx.fillStyle = armor;
  roundedFill(-12, -9, 24, 20, 6);

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(-3, -18, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#26282e";
  ctx.fillRect(-12, -28, 18, 5);
  ctx.fillStyle = "#0b0e12";
  ctx.fillRect(6, -20, 4, 6);

  drawWeapon(0, 2, 0, w);

  ctx.fillStyle = "#1d2229";
  ctx.fillRect(-14, 16, 9, 10);
  ctx.fillRect(5, 16, 9, 10);

  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(sx - 21, sy - 42, 42, 6);
  ctx.fillStyle = ct ? "#34da88" : "#ff5f6f";
  ctx.fillRect(sx - 21, sy - 42, 42 * clamp(u.hp / 100, 0, 1), 6);
}

function drawBullets() {
  for (const b of game.bullets) {
    ctx.strokeStyle = b.team === "ct" ? "#9ad8ff" : "#ffba7f";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(b.x - cam.x, b.y - cam.y);
    ctx.lineTo(b.x - cam.x - b.vx * 0.012, b.y - cam.y - b.vy * 0.012);
    ctx.stroke();
  }
}

function drawCrosshair() {
  if (isTouch) return;
  ctx.save();
  ctx.translate(mouse.x, mouse.y);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, 0); ctx.lineTo(-4, 0);
  ctx.moveTo(10, 0); ctx.lineTo(4, 0);
  ctx.moveTo(0, -10); ctx.lineTo(0, -4);
  ctx.moveTo(0, 10); ctx.lineTo(0, 4);
  ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  if (!game.tex) return;
  drawMap();
  drawBullets();
  drawUnit(game.player);
  for (const b of game.bots) drawUnit(b);
  drawCrosshair();
}

function updateHUD() {
  const p = game.player;
  if (!p) return;
  const w = currentWeapon(p);
  ui.scoreLine.textContent = `CT ${game.score.ct} : ${game.score.t} T`;
  const mm = String(Math.floor(game.timeLeft / 60)).padStart(2, "0");
  const ss = String(Math.floor(game.timeLeft % 60)).padStart(2, "0");
  ui.timerLine.textContent = `${mm}:${ss}`;
  ui.mapLine.textContent = `Карта: ${game.map.name}`;
  ui.playerLine.textContent = game.playerName;
  ui.weaponLine.textContent = `Оружие: ${w.name}${p.reloading > 0 ? " (reload...)" : ""}`;
  ui.ammoLine.textContent = `Патроны: ${p.ammo}/${w.mag}`;
  ui.hpLine.textContent = `HP: ${Math.max(0, Math.floor(p.hp))}`;
}

function tick(ts) {
  if (!game.running) return;
  if (!game.lastTs) game.lastTs = ts;
  let dt = (ts - game.lastTs) / 1000;
  game.lastTs = ts;
  dt = Math.min(dt, 0.033);

  game.timeLeft = Math.max(0, game.timeLeft - dt);
  if (game.timeLeft <= 0) resetRound();

  playerControl(dt);
  game.bots.forEach((b, i) => botControl(b, i, dt));
  updateUnits(dt);
  updateBullets(dt);
  updateCam();
  render();
  updateHUD();

  requestAnimationFrame(tick);
}

function stickValue(clientX, clientY, stickEl) {
  const r = stickEl.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const max = r.width * 0.36;
  const len = Math.hypot(dx, dy) || 1;
  const px = (dx / len) * Math.min(max, len);
  const py = (dy / len) * Math.min(max, len);
  const knob = stickEl.querySelector(".stick-knob");
  knob.style.transform = `translate(${px}px, ${py}px)`;
  return { x: clamp(px / max, -1, 1), y: clamp(py / max, -1, 1) };
}

function resetStick(stickEl, state) {
  const knob = stickEl.querySelector(".stick-knob");
  knob.style.transform = "translate(0px,0px)";
  state.x = 0;
  state.y = 0;
}

function setMobileUI(show) {
  if (show) ui.mobileControls.classList.remove("hidden");
  else ui.mobileControls.classList.add("hidden");
}

function startGame() {
  game.playerName = (ui.playerName.value || "Костя").trim().slice(0, 20);
  game.mode = ui.modeSelect.value;
  game.mapKey = ui.mapSelect.value;
  game.score.ct = 0;
  game.score.t = 0;
  game.running = true;
  game.lastTs = 0;

  ui.menu.classList.add("hidden");
  ui.hud.classList.remove("hidden");
  ui.backBtn.disabled = false;
  setMobileUI(isTouch);

  resetRound();
  updateCam();
  updateHUD();
  requestAnimationFrame(tick);
}

function stopGame() {
  game.running = false;
  ui.menu.classList.remove("hidden");
  ui.hud.classList.add("hidden");
  ui.backBtn.disabled = true;
  setMobileUI(false);
  render();
}

function bindEvents() {
  window.addEventListener("resize", () => { resizeCanvas(); render(); });

  addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (e.code === "KeyR" && game.player) startReload(game.player);
    if (e.code === "KeyQ" && game.player) nextWeapon(game.player);
  });
  addEventListener("keyup", (e) => keys.delete(e.code));

  canvas.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  canvas.addEventListener("mousedown", () => { mouse.down = true; if (game.player) shoot(game.player); });
  addEventListener("mouseup", () => { mouse.down = false; });

  ui.startBtn.addEventListener("click", startGame);
  ui.backBtn.addEventListener("click", stopGame);

  ui.fireBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    mobile.fireDown = true;
    if (game.player) shoot(game.player);
  }, { passive: false });
  ui.fireBtn.addEventListener("touchend", () => { mobile.fireDown = false; });

  ui.reloadBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.player) startReload(game.player);
  }, { passive: false });

  ui.nextWeaponBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.player) nextWeapon(game.player);
  }, { passive: false });

  function claimStick(e, side) {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (side === "move" && mobile.move.id === null) {
      mobile.move.id = t.identifier;
      Object.assign(mobile.move, stickValue(t.clientX, t.clientY, ui.moveStick));
    }
    if (side === "aim" && mobile.aim.id === null) {
      mobile.aim.id = t.identifier;
      Object.assign(mobile.aim, stickValue(t.clientX, t.clientY, ui.aimStick));
    }
  }

  function handleMove(e) {
    let used = false;
    for (const t of Array.from(e.changedTouches)) {
      if (mobile.move.id === t.identifier) {
        Object.assign(mobile.move, stickValue(t.clientX, t.clientY, ui.moveStick));
        used = true;
      }
      if (mobile.aim.id === t.identifier) {
        Object.assign(mobile.aim, stickValue(t.clientX, t.clientY, ui.aimStick));
        used = true;
      }
    }
    if (used) e.preventDefault();
  }

  function releaseTouch(e) {
    for (const t of Array.from(e.changedTouches)) {
      if (mobile.move.id === t.identifier) {
        mobile.move.id = null;
        resetStick(ui.moveStick, mobile.move);
      }
      if (mobile.aim.id === t.identifier) {
        mobile.aim.id = null;
        resetStick(ui.aimStick, mobile.aim);
      }
    }
  }

  ui.moveStick.addEventListener("touchstart", (e) => claimStick(e, "move"), { passive: false });
  ui.aimStick.addEventListener("touchstart", (e) => claimStick(e, "aim"), { passive: false });
  addEventListener("touchmove", handleMove, { passive: false });
  addEventListener("touchend", releaseTouch);
  addEventListener("touchcancel", releaseTouch);
}

function init() {
  ui.weaponSelect.innerHTML = weapons.map(w => `<option value="${w.id}">${w.name}</option>`).join("");
  resizeCanvas();
  bindEvents();
  setMobileUI(false);
  render();
}

init();
