// Visual Self Portrait — the story, the eyepiece view, the door, the notebook.
// Runs before js/microscope.js (the 3D lab), which reads window.SLIDES.

/*
  ============ THE STORY ============
  3 glass slides on the tray, labelled by airport: SCL, YYZ, MAD. Click one → it slides onto
  the stage → click the eyepieces to look. The wheel on the right turns the
  nosepiece: ×4 → ×10 → ×40, with a rush of grey streaks between lenses.

    ×4    the place        a photo of the whole scene
    ×10   one moment       a closer photo
    ×40   the chemistry    SCL oxytocin · YYZ cortisol · MAD BDNF
          between YYZ and MAD: the catalyst, noradrenaline → adrenaline (full screen)

  photo : the image file ("" = warm placeholder until you add one)
  focus : where to look in the photo, as "x% y%";  zoom : 1 = whole photo
*/
const places = [
  { key: "chile", code: "SCL", tint: "#ffc35a", mood: "alive", tone: "warm", cells: [
    { photo: "images/chile/x4.jpg",   focus: "48% 58%", zoom: 1 },     // ×4  family by the lake (SCL)
    { photo: "images/chile/x10.jpg",  focus: "50% 45%", zoom: 1 },     // ×10 chocolate face
    { kind: "molecules" } ] },
  { key: "toronto", code: "YYZ", tint: "#9fb0c2", mood: "fading", tone: "cold", cells: [
    { photo: "images/toronto/x4.jpg", focus: "45% 50%", zoom: 1 },     // ×4  Niagara in winter (YYZ)
    { photo: "images/toronto/x10.jpg", focus: "38% 48%", zoom: 1 },    // ×10 the quiet look
    { kind: "molecules" } ] },
  { key: "madrid", code: "MAD", tint: "#ff8457", mood: "alive", tone: "", cells: [
    { photo: "images/madrid/x4.jpg",  focus: "50% 58%", zoom: 1 },     // ×4  friends at the Christmas market (MAD)
    { photo: "images/madrid/x10.jpg", focus: "42% 40%", zoom: 1 },     // ×10 the big smile
    { kind: "molecules" } ] }
];
const cities = [{ lon: -70.67, lat: -33.45 }, { lon: -79.38, lat: 43.65 }, { lon: -3.70, lat: 40.42 }];
const OBJECTIVES = [4, 10, 40];
/* =================================== */

// hand the slides to the 3D lab
const thumb = src => src.replace(/\/([^/]+\.jpg)$/, "/thumbs/$1");
window.SLIDES = places.map((pl, p) => ({
  p, code: pl.code, tint: pl.tint, grey: pl.tone === "cold", mood: pl.mood,
  thumb: pl.cells[0].photo ? thumb(pl.cells[0].photo) : "", kind: "photo"
}));

const $ = id => document.getElementById(id);
const content = $("content"), world = $("world"), blackout = $("blackout");
const rand = (a, b) => a + Math.random() * (b - a);
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

let loaded = null, obj = 0, busy = false, anim = null, sawToronto = false;
const seen = new Set();
function stopAnim() { if (anim) cancelAnimationFrame(anim); anim = null; }

// ---------- before any slide: the globe ----------
let landData = null;
const landReady = (window.d3 && window.topojson)
  ? fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json")
      .then(r => r.json()).then(w => { landData = topojson.feature(w, w.objects.land); }).catch(() => {})
  : Promise.resolve();
function drawGlobe() {
  content.innerHTML = "";
  if (!window.d3) return;
  const proj = d3.geoOrthographic().scale(455).translate([500, 500]).rotate([44, -8]).clipAngle(90);
  const path = d3.geoPath(proj);
  const svg = d3.create("svg").attr("viewBox", "0 0 1000 1000");
  const g = svg.append("defs").append("radialGradient").attr("id", "ocean").attr("cx", "38%").attr("cy", "32%");
  g.append("stop").attr("offset", "0%").attr("stop-color", "#2a2c2e");
  g.append("stop").attr("offset", "100%").attr("stop-color", "#050505");
  svg.append("path").datum({ type: "Sphere" }).attr("d", path).attr("fill", "url(#ocean)").attr("stroke", "rgba(236,230,218,.35)");
  svg.append("path").datum(d3.geoGraticule10()).attr("d", path).attr("fill", "none").attr("stroke", "rgba(236,230,218,.10)").attr("stroke-width", .7);
  if (landData) svg.append("path").datum(landData).attr("d", path).attr("fill", "#ece6da").attr("stroke", "#fff").attr("stroke-width", .4);
  for (let i = 0; i < cities.length - 1; i++) {
    svg.append("path").datum({ type: "LineString", coordinates: [[cities[i].lon, cities[i].lat], [cities[i + 1].lon, cities[i + 1].lat]] })
      .attr("d", path).attr("class", "route").attr("pathLength", 1).style("transition-delay", (0.3 + i * 2.3) + "s");
  }
  cities.forEach(c => {
    const [x, y] = proj([c.lon, c.lat]);
    svg.append("circle").attr("class", "city-ring").attr("cx", x).attr("cy", y).attr("r", 7);
    svg.append("circle").attr("class", "city-dot").attr("cx", x).attr("cy", y).attr("r", 7);
  });
  content.appendChild(svg.node());
}
function playGlobe() { content.querySelectorAll(".route").forEach(r => { r.classList.remove("draw"); void r.getBoundingClientRect(); r.classList.add("draw"); }); }

// ---------- 40× / 100×: the photo ----------
function sunGradient(i) {
  const h = [0, -18, 16][i] || 0;
  return `radial-gradient(circle at ${50 + h}% ${38 + h / 2}%, #fff6d8 0%, #ffd277 14%, #f29b45 36%, #8a3d1c 70%, #2a1208 100%)`;
}
function drawPhoto(place, slide, s, zoom) {
  content.innerHTML = "";
  const box = document.createElement("div");
  box.className = "tone-" + (place.tone || "none");
  box.style.cssText = "position:absolute;inset:0";
  content.appendChild(box);
  if (!slide.photo) { box.innerHTML = `<div class="sun" style="background:${sunGradient(s)};${zoom > 1 ? "transform:scale(2.2)" : ""}"></div>`; return; }
  const img = new Image();
  img.className = "photo"; img.alt = ""; img.src = slide.photo;
  img.style.setProperty("--z", zoom);
  img.style.setProperty("--focus", slide.focus);
  box.appendChild(img);
}

// ---------- canvas runner ----------
function startCanvas(scene) {
  content.innerHTML = "";
  const cv = document.createElement("canvas");
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = cv.height = Math.round((content.clientWidth || 600) * dpr);
  content.appendChild(cv);
  const ctx = cv.getContext("2d");
  const k = cv.width / 1000, t0 = performance.now();
  let tt = 0, last = t0;                       // scene time advances per frame, so firing and movement stay in step on any machine
  (function loop(now) { tt += Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; ctx.setTransform(k, 0, 0, k, 0, 0); scene.draw(ctx, tt); anim = requestAnimationFrame(loop); })(t0);
}

// ---------- 400×: neurons ----------
function makeNeurons(place) {
  const alive = place.mood === "alive", tint = place.tint;
  const neurons = [];
  let tries = 0;
  while (neurons.length < 15 && tries++ < 3000) {
    const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 400;
    const x = 500 + Math.cos(a) * r, y = 500 + Math.sin(a) * r;
    if (!neurons.every(n => Math.hypot(n.x - x, n.y - y) > 150)) continue;
    const path = new Path2D();
    const branch = (x0, y0, ang, len, depth) => {
      const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      path.moveTo(x0, y0); path.quadraticCurveTo((x0 + x1) / 2 + rand(-14, 14), (y0 + y1) / 2 + rand(-14, 14), x1, y1);
      if (depth > 0) { branch(x1, y1, ang + rand(.25, .6), len * rand(.5, .7), depth - 1); branch(x1, y1, ang - rand(.25, .6), len * rand(.5, .7), depth - 1); }
    };
    const nd = 5 + Math.floor(rand(0, 3));
    for (let d = 0; d < nd; d++) branch(x, y, d * Math.PI * 2 / nd + rand(-.3, .3), rand(45, 85), 2);
    neurons.push({ x, y, r: rand(8, 14), path, glow: 0, life: 1, fadeAt: alive ? 1e9 : rand(3, 14), phase: rand(0, 6) });
  }
  const links = [];
  neurons.forEach((n, i) => {
    neurons.map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) })).filter(o => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2)
      .forEach(({ j }) => {
        if (links.some(l => l.a === j && l.b === i)) return;
        const m = neurons[j];
        const nx = -(m.y - n.y), ny = m.x - n.x, nl = Math.hypot(nx, ny) || 1, off = rand(-50, 50);
        links.push({ a: i, b: j, cx: (n.x + m.x) / 2 + nx / nl * off, cy: (n.y + m.y) / 2 + ny / nl * off });
      });
  });
  const pulses = [];
  let nextSpawn = 0;
  const spawn = (li, fromA, t) => pulses.push({ li, fromA, t0: t, speed: alive ? rand(.55, .9) : rand(.16, .28), dieAt: alive ? 1 : rand(.25, .7) });
  const at = (l, p, fromA) => { const A = neurons[fromA ? l.a : l.b], B = neurons[fromA ? l.b : l.a], u = 1 - p; return [u * u * A.x + 2 * u * p * l.cx + p * p * B.x, u * u * A.y + 2 * u * p * l.cy + p * p * B.y]; };
  return { draw(ctx, t) {
    const bg = ctx.createRadialGradient(500, 500, 0, 500, 500, 520);
    bg.addColorStop(0, alive ? rgba(tint, .10) : "#0c0e11"); bg.addColorStop(1, "#000");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1000, 1000);
    if (t > nextSpawn && links.length) { spawn(Math.floor(Math.random() * links.length), Math.random() < .5, t); nextSpawn = t + (alive ? rand(.08, .2) : rand(1.4, 2.8)); }
    ctx.lineWidth = 1.4;
    links.forEach(l => { const A = neurons[l.a], B = neurons[l.b]; ctx.strokeStyle = rgba(tint, .1 * Math.min(A.life, B.life)); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(l.cx, l.cy, B.x, B.y); ctx.stroke(); });
    neurons.forEach(n => {
      if (!alive && t > n.fadeAt) n.life = Math.max(.12, n.life - .002);
      n.glow *= alive ? .95 : .97;
      const breathe = alive ? 1 + Math.sin(t * 1.6 + n.phase) * .06 : 1;
      ctx.save(); ctx.translate(n.x, n.y); ctx.scale(breathe, breathe); ctx.translate(-n.x, -n.y);
      ctx.lineWidth = 1.3; ctx.strokeStyle = rgba(tint, (alive ? .45 : .28) * n.life + n.glow * .4); ctx.stroke(n.path); ctx.restore();
      const R = n.r * (3 + n.glow * 4);
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, R);
      g.addColorStop(0, rgba(tint, (.55 + n.glow * .45) * n.life)); g.addColorStop(1, rgba(tint, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, R, 0, 7); ctx.fill();
      ctx.fillStyle = rgba(tint, .9 * n.life); ctx.beginPath(); ctx.arc(n.x, n.y, n.r * .55, 0, 7); ctx.fill();
    });
    ctx.globalCompositeOperation = "lighter";
    for (let i = pulses.length - 1; i >= 0; i--) {
      const s = pulses[i], l = links[s.li];
      const p = (t - s.t0) * s.speed;
      if (p >= s.dieAt) {
        pulses.splice(i, 1);
        if (alive) {
          const target = s.fromA ? l.b : l.a;
          neurons[target].glow = 1;
          if (Math.random() < .55) { const out = links.map((L, k) => ({ L, k })).filter(o => o.L.a === target || o.L.b === target); if (out.length) { const o = out[Math.floor(Math.random() * out.length)]; spawn(o.k, o.L.a === target, t); } }
        }
        continue;
      }
      const [x, y] = at(l, p, s.fromA);
      const fade = alive ? 1 : 1 - p / s.dieAt;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
      g.addColorStop(0, rgba(alive ? "#ffffff" : tint, .9 * fade)); g.addColorStop(.3, rgba(tint, .5 * fade)); g.addColorStop(1, rgba(tint, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }};
}

// ---------- molecules: skeletal formulas, bond length = 1 ----------
// Built from the real structures: oxytocin (6-residue ring closed by an S–S bridge + 3-residue tail),
// cortisol (steroid: three 6-rings + one 5-ring), and the catecholamines, which share one skeleton:
// dopamine → (+OH) noradrenaline → (+CH3) adrenaline. Extras are tagged ex:1 / ex:2 so they can fade.
const MOL = (() => {
  const D = d => d * Math.PI / 180;
  const mk = () => ({ a: [], b: [] });
  const at = (m, x, y, el = "", ex = 0) => {
    const i = m.a.findIndex(p => Math.hypot(p.x - x, p.y - y) < .08);
    if (i >= 0) return i;
    m.a.push({ x, y, el, ex }); return m.a.length - 1;
  };
  const bd = (m, i, j, o = 1, c = null, ex = 0) => {
    if (m.b.some(b => (b.i === i && b.j === j) || (b.i === j && b.j === i))) return;
    m.b.push({ i, j, o, c, ex });
  };
  const br = (m, i, ang, el = "", o = 1, ex = 0) => {
    const A = m.a[i], j = at(m, A.x + Math.cos(D(ang)), A.y + Math.sin(D(ang)), el, ex);
    bd(m, i, j, o, null, ex); return j;
  };
  const hex = (m, cx, cy, dbl = []) => {
    const ids = [];
    for (let k = 0; k < 6; k++) ids.push(at(m, cx + Math.cos(D(-90 + 60 * k)), cy + Math.sin(D(-90 + 60 * k))));
    for (let k = 0; k < 6; k++) bd(m, ids[k], ids[(k + 1) % 6], dbl.includes(k) ? 2 : 1, [cx, cy]);
    return ids;
  };
  const ringOff = (m, i, ang, n, arom) => {            // n-ring hanging off atom i
    const A = m.a[i], r = 1 / (2 * Math.sin(Math.PI / n));
    const cx = A.x + Math.cos(D(ang)) * (1 + r), cy = A.y + Math.sin(D(ang)) * (1 + r);
    const ids = [];
    for (let k = 0; k < n; k++) { const t = D(ang) + Math.PI + k * 2 * Math.PI / n; ids.push(at(m, cx + Math.cos(t) * r, cy + Math.sin(t) * r)); }
    bd(m, i, ids[0]);
    for (let k = 0; k < n; k++) bd(m, ids[k], ids[(k + 1) % n], arom && k % 2 === 0 ? 2 : 1, [cx, cy]);
    return ids;
  };
  const ringOn = (m, i, j, n, towardAng) => {           // n-ring built on the bond i–j
    const A = m.a[i], B = m.a[j], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    let nx = -(B.y - A.y), ny = B.x - A.x;
    if (nx * Math.cos(D(towardAng)) + ny * Math.sin(D(towardAng)) < 0) { nx = -nx; ny = -ny; }
    const ap = 1 / (2 * Math.tan(Math.PI / n)), r = 1 / (2 * Math.sin(Math.PI / n));
    const cx = mx + nx * ap, cy = my + ny * ap;
    const ta = Math.atan2(A.y - cy, A.x - cx), tb = Math.atan2(B.y - cy, B.x - cx);
    let d = tb - ta; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const ids = [i, j];
    for (let q = 1; q <= n - 2; q++) ids.push(at(m, cx + Math.cos(tb + d * q) * r, cy + Math.sin(tb + d * q) * r));
    for (let k = 1; k < n; k++) bd(m, ids[k], ids[(k + 1) % n], 1, [cx, cy]);
    return ids;
  };
  const finish = m => {
    const xs = m.a.map(p => p.x), ys = m.a.map(p => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    m.a.forEach(p => { p.x -= cx; p.y -= cy; });
    m.b.forEach(b => { if (b.c) b.c = [b.c[0] - cx, b.c[1] - cy]; });
    m.r = Math.max(...m.a.map(p => Math.hypot(p.x, p.y)));
    return m;
  };

  // catecholamines (dopamine skeleton; ex:1 = β-OH of noradrenaline, ex:2 = N-methyl of adrenaline)
  const cat = mk();
  const ring = hex(cat, 0, 0, [0, 2, 4]);
  br(cat, ring[5], 210, "O"); br(cat, ring[4], 150, "O");
  const c7 = br(cat, ring[2], 30), c8 = br(cat, c7, -30), n = br(cat, c8, 30, "N");
  br(cat, c7, 90, "O", 1, 1);
  br(cat, n, -30, "", 1, 2);

  // cortisol
  const cor = mk();
  const A = hex(cor, 0, 0, [2]);
  hex(cor, 1.732, 0);
  const C = hex(cor, 2.598, -1.5);
  const Dr = ringOn(cor, C[1], C[2], 5, 0);
  br(cor, A[4], 150, "O", 2);                    // C3 ketone
  br(cor, A[1], -90);                            // C10 methyl
  br(cor, C[5], 210, "O");                       // C11 OH
  br(cor, C[1], -90);                            // C13 methyl
  const c17 = Dr[Dr.length - 1];
  br(cor, c17, 0, "O");                          // C17 OH
  const c20 = br(cor, c17, -60); br(cor, c20, -120, "O", 2);
  const c21 = br(cor, c20, 0); br(cor, c21, -60, "O");

  // oxytocin: 20-atom ring (Cys1…Cys6 + S–S), side chains, Pro-Leu-Gly-NH2 tail
  const oxy = mk();
  const N = 20, R = 1 / (2 * Math.sin(Math.PI / N));
  const th = k => 171 + 18 * k;
  const els = { 0: "S", 1: "S", 5: "N", 8: "N", 11: "N", 14: "N", 17: "N" };
  const rg = [];
  for (let k = 0; k < N; k++) { const rr = R + (k % 2 ? .14 : -.14); rg.push(at(oxy, Math.cos(D(th(k))) * rr, Math.sin(D(th(k))) * rr, els[k] || "")); }
  for (let k = 0; k < N; k++) bd(oxy, rg[k], rg[(k + 1) % N]);
  [4, 7, 10, 13, 16].forEach(k => br(oxy, rg[k], th(k), "O", 2));       // backbone C=O
  br(oxy, rg[3], th(3), "N");                                             // Cys1 NH2
  { const cb = br(oxy, rg[6], th(6)); const r6 = ringOff(oxy, cb, th(6) + 30, 6, true); br(oxy, r6[3], th(6) + 30, "O"); }   // Tyr
  { const cb = br(oxy, rg[9], th(9)); br(oxy, cb, th(9) - 60); const cg = br(oxy, cb, th(9) + 60); br(oxy, cg, th(9)); }       // Ile
  { const c1 = br(oxy, rg[12], th(12)), c2 = br(oxy, c1, th(12) + 60), c3 = br(oxy, c2, th(12)); br(oxy, c3, th(12) + 60, "O", 2); br(oxy, c3, th(12) - 60, "N"); } // Gln
  { const c1 = br(oxy, rg[15], th(15)), c2 = br(oxy, c1, th(15) - 60); br(oxy, c2, th(15), "O", 2); br(oxy, c2, th(15) - 120, "N"); } // Asn
  { // tail, zigzag outward from Cys6 Cα
    const phi = th(18); let s = 1, cur = rg[18];
    const step = el => { const j = br(oxy, cur, phi + 30 * s, el); const side = phi + 90 * s; s = -s; cur = j; return side; };
    let side = step(""); br(oxy, cur, side, "O", 2);                   // Cys6 C'
    side = step("N"); const nPro = cur;
    step(""); ringOn(oxy, nPro, cur, 5, side);                          // Pro ring
    side = step(""); br(oxy, cur, side, "O", 2);
    step("N");
    side = step(""); { const cb = br(oxy, cur, side), cg = br(oxy, cb, side + 60); br(oxy, cg, side); br(oxy, cg, side + 120); }   // Leu
    side = step(""); br(oxy, cur, side, "O", 2);
    step("N"); step("");
    side = step(""); br(oxy, cur, side, "O", 2);
    step("N");
  }
  return { cat: finish(cat), cortisol: finish(cor), oxytocin: finish(oxy) };
})();

// draws a molecule centred at (0,0) of the current transform, s px per bond, using the current stroke/fill
// o.ex1 / o.ex2: visibility of the noradrenaline / adrenaline extras; o.exOff: extras drift outward (bonds)
function drawMol(ctx, m, s, o = {}) {
  const ex1 = o.ex1 ?? 1, ex2 = o.ex2 ?? 1, off = o.exOff || 0, base = ctx.globalAlpha;
  const vis = e => e === 1 ? ex1 : e === 2 ? ex2 : 1;
  const P = i => { const p = m.a[i]; if (!p.ex || !off) return [p.x * s, p.y * s]; const d = Math.hypot(p.x, p.y) || 1; return [(p.x + p.x / d * off) * s, (p.y + p.y / d * off) * s]; };
  for (const pass of [0, 1, 2]) {
    const a = pass === 0 ? 1 : pass === 1 ? ex1 : ex2;
    if (a <= .01) continue;
    ctx.globalAlpha = base * a;
    ctx.beginPath();
    m.b.forEach(b => {
      if ((b.ex || 0) !== pass) return;
      const [x1, y1] = P(b.i), [x2, y2] = P(b.j);
      if (b.o === 2 && b.c) {
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        const cx = b.c[0] * s, cy = b.c[1] * s, sh = .22, f = .18;
        const ix1 = x1 + (cx - x1) * sh, iy1 = y1 + (cy - y1) * sh, ix2 = x2 + (cx - x2) * sh, iy2 = y2 + (cy - y2) * sh;
        ctx.moveTo(ix1 + (ix2 - ix1) * f, iy1 + (iy2 - iy1) * f); ctx.lineTo(ix2 - (ix2 - ix1) * f, iy2 - (iy2 - iy1) * f);
      } else if (b.o === 2) {
        const L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L * .09 * s, ny = (x2 - x1) / L * .09 * s;
        ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny); ctx.moveTo(x1 - nx, y1 - ny); ctx.lineTo(x2 - nx, y2 - ny);
      } else { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
    });
    ctx.stroke();
    if (o.dots !== false) {
      ctx.beginPath();
      m.a.forEach((p, i) => {
        if (!p.el || (p.ex || 0) !== pass) return;
        const [x, y] = P(i), r = Math.max(1.2, (p.el === "S" ? .24 : .13) * s);
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 7);
      });
      ctx.fill();
    }
  }
  ctx.globalAlpha = base;
}
// glow + crisp line, like light through the lens
function glowMol(ctx, m, s, color, a, lw, o) {
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.globalAlpha = a * .16; ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = lw * 4.5; drawMol(ctx, m, s, Object.assign({ dots: false }, o));
  ctx.globalAlpha = a; ctx.lineWidth = lw; drawMol(ctx, m, s, o);
  ctx.globalAlpha = 1;
}

// ---------- ×40: the chemistry of each place ----------
// BDNF is a protein, not a small molecule: two identical chains (a homodimer), each folded into
// flat β-strands. Drawn as two ribbons wrapped around each other, one per chain.
const BDNF_CHAIN = (() => {
  const pts = [];
  // four antiparallel strands joined by hairpin loops, leaning so the two chains interlock
  const strands = [[-34, -8], [-20, 4], [-6, -6], [8, 6]];
  strands.forEach(([x, dy], i) => {
    const up = i % 2 === 0, y0 = up ? 30 : -30, y1 = up ? -30 : 30;
    for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([x + Math.sin(u * Math.PI) * 3, y0 + (y1 - y0) * u + dy]); }
    if (i < strands.length - 1) {                         // the loop over to the next strand
      const nx = strands[i + 1][0], ly = y1 + dy + (up ? -8 : 8);
      for (let k = 1; k < 6; k++) { const u = k / 6; pts.push([x + (nx - x) * u, ly + Math.sin(u * Math.PI) * (up ? -6 : 6)]); }
    }
  });
  pts.push([20, 44]);                                     // the tail that reaches across to the partner
  return pts;
})();
function drawBDNF(ctx, s, colA, colB, a, glow = 0) {
  ctx.lineCap = ctx.lineJoin = "round";
  [[colA, 1], [colB, -1]].forEach(([col, flip]) => {
    ctx.save(); ctx.scale(flip, flip);                    // the second chain is the first, turned 180°
    const trace = () => { ctx.beginPath(); BDNF_CHAIN.forEach(([x, y], i) => i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)); };
    ctx.globalAlpha = a * (.14 + glow * .2); ctx.strokeStyle = col; ctx.lineWidth = 9 * s; trace(); ctx.stroke();
    ctx.globalAlpha = a; ctx.lineWidth = 3.2 * s; trace(); ctx.stroke();
    ctx.globalAlpha = a * .7; ctx.strokeStyle = "#fff6ea"; ctx.lineWidth = .9 * s; trace(); ctx.stroke();   // the ribbon's light edge
    // strand arrowheads
    ctx.globalAlpha = a; ctx.fillStyle = col;
    [8, 22, 36].forEach(i => {
      const [x1, y1] = BDNF_CHAIN[i - 1], [x2, y2] = BDNF_CHAIN[i], ang = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath(); ctx.moveTo((x2 + Math.cos(ang) * 4) * s, (y2 + Math.sin(ang) * 4) * s);
      ctx.lineTo((x2 + Math.cos(ang + 2.3) * 4.5) * s, (y2 + Math.sin(ang + 2.3) * 4.5) * s);
      ctx.lineTo((x2 + Math.cos(ang - 2.3) * 4.5) * s, (y2 + Math.sin(ang - 2.3) * 4.5) * s); ctx.fill();
    });
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

// ×40: a web of neurons firing, releasing each place's chemical where the signal lands.
//   SCL  oxytocin — warm, quick firing; each molecule that reaches another neuron sets it off too
//   YYZ  cortisol — slow signals that die halfway; what's released never clears, sinks and piles up,
//                   and the more there is, the dimmer and quieter the web gets
//   MAD  BDNF     — the growth factor; every dimer that docks makes its neuron grow new branches
//                   and reach for new connections: the web grows back while you watch
function makeMolecules(place) { return sceneWeb(place); }
// seconds at YYZ ×40 before 2:13 AM — every time you look, not just the first (?crisis=N in the address overrides it)
const CRISIS_AFTER = +new URLSearchParams(location.search).get("crisis") || 9;
function sceneWeb(place) {
  const key = place.key, tint = place.tint, gold = "#ffc35a";
  const C = {
    chile:   { n: 15, fire: [.2, .45],   speed: [.5, .8],   release: 2 },
    toronto: { n: 14, fire: [1.3, 2.6],  speed: [.16, .26], release: 3 },
    madrid:  { n: 14, fire: [.2, .45],   speed: [.55, .9],  release: 1 },
  }[key];
  const grows = key === "madrid", sick = key === "toronto";
  const neurons = [];
  let tries = 0;
  while (neurons.length < C.n && tries++ < 4000) {
    const a = rand(0, 7), r = Math.sqrt(Math.random()) * 400, x = 500 + Math.cos(a) * r, y = 500 + Math.sin(a) * r;
    if (neurons.every(n => Math.hypot(n.x - x, n.y - y) > 150)) neurons.push({ x, y, r: rand(8, 13), segs: [], glow: 0, life: 1, ph: rand(0, 7), fadeAt: sick ? rand(25, 90) : 1e9 });
  }
  const sprout = (n, x, y, ang, len, w, p) => { const s = { x1: x, y1: y, x2: x + Math.cos(ang) * len, y2: y + Math.sin(ang) * len, ang, w, p }; n.segs.push(s); return s; };
  const branch = (n, x, y, ang, len, depth, w) => {
    const s = sprout(n, x, y, ang + rand(-.2, .2), len, w, 1);
    if (depth > 0) { branch(n, s.x2, s.y2, ang + rand(.25, .6), len * rand(.5, .7), depth - 1, w * .7); branch(n, s.x2, s.y2, ang - rand(.25, .6), len * rand(.5, .7), depth - 1, w * .7); }
    else s.tip = true;
  };
  neurons.forEach(n => { const nd = 5 + Math.floor(rand(0, 3)); for (let d = 0; d < nd; d++) branch(n, n.x, n.y, d * 6.283 / nd, rand(40, 75), grows ? 0 : 2, 1.6); });
  const links = [];
  const link = (i, j, p) => {
    if (i === j || links.some(l => (l.a === i && l.b === j) || (l.a === j && l.b === i))) return;
    const A = neurons[i], B = neurons[j], nx = -(B.y - A.y), ny = B.x - A.x, nl = Math.hypot(nx, ny) || 1, off = rand(-50, 50);
    links.push({ a: i, b: j, p, cx: (A.x + B.x) / 2 + nx / nl * off, cy: (A.y + B.y) / 2 + ny / nl * off });
  };
  neurons.forEach((n, i) => neurons.map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) })).filter(o => o.j !== i)
    .sort((a, b) => a.d - b.d).slice(0, grows ? 1 : 2).forEach(({ j }) => link(i, j, 1)));
  const grow = n => {                                   // BDNF lands: new branches, and maybe a new connection
    const tips = n.segs.filter(s => s.p >= 1 && s.tip);
    for (let k = 0; k < 4 && tips.length; k++) {
      const s = tips.splice(Math.floor(Math.random() * tips.length), 1)[0];
      if (Math.hypot(s.x2 - 500, s.y2 - 500) > 470 || s.w < .5) continue;
      s.tip = false;
      sprout(n, s.x2, s.y2, s.ang + rand(.2, .6), rand(22, 40), s.w * .75, 0).tip = true;
      sprout(n, s.x2, s.y2, s.ang - rand(.2, .6), rand(22, 40), s.w * .75, 0).tip = true;
    }
    const i = neurons.indexOf(n);
    const near = neurons.map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) })).filter(o => o.j !== i && o.d < 340)
      .filter(o => !links.some(l => (l.a === i && l.b === o.j) || (l.b === i && l.a === o.j))).sort((a, b) => a.d - b.d)[0];
    if (near && Math.random() < .6) link(i, near.j, 0);
  };
  const at = (l, p, fromA) => { const A = neurons[fromA ? l.a : l.b], B = neurons[fromA ? l.b : l.a], u = 1 - p; return [u * u * A.x + 2 * u * p * l.cx + p * p * B.x, u * u * A.y + 2 * u * p * l.cy + p * p * B.y]; };
  const pulses = [], mols = [], rings = [];
  const fire = (li, fromA, t) => pulses.push({ li, fromA, t0: t, speed: rand(...C.speed), dieAt: sick ? rand(.25, .75) : 1 });
  const release = (n, t) => {
    for (let k = 0; k < C.release; k++) {
      const a = rand(0, 7), v = rand(70, 120);
      const others = neurons.filter(o => o !== n);
      mols.push({ x: n.x, y: n.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: rand(0, 7), vr: rand(-.8, .8), age: 0, from: n, bound: false,
                  to: grows ? others.sort((p, q) => Math.hypot(p.x - n.x, p.y - n.y) - Math.hypot(q.x - n.x, q.y - n.y))[Math.floor(Math.random() * 3)] : null });
    }
  };
  let nextFire = 0, last = 0, nextLeak = 1, crisisFired = false;
  return { draw(ctx, t) {
    const dt = Math.min(.05, t - last); last = t;
    const cortLoad = sick ? Math.min(1, mols.length / 120) : 0;
    if (sick && viewing && t > CRISIS_AFTER && !crisisFired && !crisisOn) { crisisFired = true; breakingPoint(); }
    if (sick && t > nextLeak && mols.length < 150) {      // cortisol keeps arriving, faster and faster
      release(neurons[Math.floor(Math.random() * neurons.length)], t); mols.splice(mols.length - C.release + 1);
      nextLeak = t + Math.max(.35, 1.6 - t * .012);
    }
    // background
    const bg = ctx.createRadialGradient(500, 500, 0, 500, 500, 520);
    bg.addColorStop(0, sick ? "#0e1114" : rgba(tint, .07)); bg.addColorStop(1, "#000");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1000, 1000);
    // firing
    const live = links.filter(l => l.p >= 1);
    if (t > nextFire && live.length) {
      const l = live[Math.floor(Math.random() * live.length)];
      fire(links.indexOf(l), Math.random() < .5, t);
      nextFire = t + rand(...C.fire) * (1 + cortLoad * 2.5);
    }
    // links (axons)
    ctx.lineWidth = 1.4;
    links.forEach(l => {
      l.p = Math.min(1, l.p + dt * .5);
      const A = neurons[l.a], B = neurons[l.b];
      ctx.strokeStyle = rgba(tint, .12 * Math.min(A.life, B.life));
      ctx.beginPath(); ctx.moveTo(A.x, A.y);
      if (l.p >= 1) ctx.quadraticCurveTo(l.cx, l.cy, B.x, B.y);
      else { const [x, y] = at(l, l.p, true); ctx.lineTo(x, y); }
      ctx.stroke();
    });
    // neurons: dendrites + soma
    ctx.lineCap = "round";
    neurons.forEach(n => {
      if (sick && t > n.fadeAt) n.life = Math.max(.12, n.life - .0018);
      if (sick) n.life = Math.min(n.life, 1 - cortLoad * .8);
      n.glow *= sick ? .97 : .95;
      const breathe = sick ? 1 : 1 + Math.sin(t * 1.6 + n.ph) * .05;
      n.segs.forEach(s => {
        if (s.p < 1) s.p = Math.min(1, s.p + dt * 1.2);
        ctx.strokeStyle = rgba(tint, (sick ? .34 : .42) * n.life + n.glow * .35); ctx.lineWidth = s.w;
        const x2 = s.x1 + (s.x2 - s.x1) * s.p, y2 = s.y1 + (s.y2 - s.y1) * s.p;
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(x2, y2); ctx.stroke();
        if (s.p < 1) { const g = ctx.createRadialGradient(x2, y2, 0, x2, y2, 9); g.addColorStop(0, rgba("#fff1e0", .9)); g.addColorStop(1, rgba(tint, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x2, y2, 9, 0, 7); ctx.fill(); }
      });
      const R = n.r * (2.4 + n.glow * 2.6) * breathe;
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, R);
      g.addColorStop(0, rgba(tint, (.45 + n.glow * .4) * n.life)); g.addColorStop(1, rgba(tint, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, R, 0, 7); ctx.fill();
      ctx.fillStyle = rgba(tint, .9 * n.life); ctx.beginPath(); ctx.arc(n.x, n.y, n.r * .55, 0, 7); ctx.fill();
    });
    ctx.globalCompositeOperation = "lighter";
    // signals travelling down the axons; where they land, the neuron releases its chemical
    for (let i = pulses.length - 1; i >= 0; i--) {
      const s = pulses[i], l = links[s.li], p = (t - s.t0) * s.speed;
      if (p >= s.dieAt) {
        pulses.splice(i, 1);
        if (!sick) {
          const target = neurons[s.fromA ? l.b : l.a];
          target.glow = 1; release(target, t);
          if (Math.random() < .45) { const out = links.map((L, k) => ({ L, k })).filter(o => o.L.p >= 1 && (neurons[o.L.a] === target || neurons[o.L.b] === target)); if (out.length) { const o = out[Math.floor(Math.random() * out.length)]; fire(o.k, neurons[o.L.a] === target, t); } }
        } else { const n = neurons[s.fromA ? l.a : l.b]; release(n, t); }   // stress leaks out where the signal started
        continue;
      }
      const [x, y] = at(l, p, s.fromA), fade = sick ? 1 - p / s.dieAt : 1;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 24);
      g.addColorStop(0, rgba(sick ? tint : "#ffffff", .9 * fade)); g.addColorStop(.3, rgba(tint, .5 * fade)); g.addColorStop(1, rgba(tint, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.fill();
    }
    rings.forEach(r => { const u = (t - r.t0) / 1.1; if (u > 1) return; ctx.strokeStyle = rgba("#ffe2c4", .55 * (1 - u)); ctx.lineWidth = 2 * (1 - u) + .4; ctx.beginPath(); ctx.arc(r.x, r.y, 14 + u * 70, 0, 7); ctx.stroke(); });
    for (let i = rings.length - 1; i >= 0; i--) if (t - rings[i].t0 > 1.1) rings.splice(i, 1);
    ctx.globalCompositeOperation = "source-over";
    // the chemical
    for (let i = mols.length - 1; i >= 0; i--) {
      const m = mols[i];
      m.age += dt;
      if (sick) {                                       // cortisol: heavy, sinks, never clears
        m.vx *= .96; m.vy = m.vy * .96 + 14 * dt; m.vy = Math.min(m.vy, 22);
        m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.vr * dt * .3;
        const dx = m.x - 500, dy = m.y - 500, d = Math.hypot(dx, dy);
        if (d > 455) { m.x = 500 + dx / d * 455; m.y = 500 + dy / d * 455; m.vy = 0; m.vx = 0; m.vr = 0; }
      } else {
        if (m.to) { const dx = m.to.x - m.x, dy = m.to.y - m.y, d = Math.hypot(dx, dy) || 1; m.vx += dx / d * 140 * dt; m.vy += dy / d * 140 * dt; }   // BDNF heads for its neuron
        const drag = Math.pow(m.to ? .35 : .55, dt); m.vx *= drag; m.vy *= drag; m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.vr * dt;
        if (m.age > .6 && !m.bound) {                   // reaching another neuron
          const n = m.to ? (Math.hypot(m.to.x - m.x, m.to.y - m.y) < 30 ? m.to : null) : neurons.find(n => n !== m.from && Math.hypot(n.x - m.x, n.y - m.y) < 38);
          if (n) {
            m.bound = true; n.glow = Math.max(n.glow, .7);
            if (grows) { grow(n); rings.push({ x: n.x, y: n.y, t0: t }); mols.splice(i, 1); continue; }
            if (Math.random() < .3) { const out = links.map((L, k) => ({ L, k })).filter(o => o.L.p >= 1 && (neurons[o.L.a] === n || neurons[o.L.b] === n)); if (out.length) { const o = out[Math.floor(Math.random() * out.length)]; fire(o.k, neurons[o.L.a] === n, t); } }
          }
        }
      }
      const life = sick ? 1 : Math.max(0, 1 - Math.max(0, m.age - 2.2) / 2);
      if (life <= 0) { mols.splice(i, 1); continue; }
      const a = Math.min(1, m.age * 3) * life;
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
      if (key === "chile") glowMol(ctx, MOL.oxytocin, 3.6, m.bound ? "#fff0cf" : tint, .8 * a, 1.1);
      else if (sick) glowMol(ctx, MOL.cortisol, 5.4, "#c3ccd6", .7 * a, 1.2);
      else drawBDNF(ctx, .42, tint, gold, .9 * a);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
    if (sick) {                                         // the view closes in as it fills up
      const v = ctx.createRadialGradient(500, 500, 480 - cortLoad * 300, 500, 500, 520);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${.3 + cortLoad * .55})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, 1000, 1000);
    }
    if (mols.length > 160) mols.splice(0, mols.length - 160);
  }};
}

// ---------- labels for the chemistry at ×40 ----------
const CHEM = {
  oxytocin: { name: "Oxytocin", formula: "C<sub>43</sub>H<sub>66</sub>N<sub>12</sub>O<sub>12</sub>S<sub>2</sub>",
              fn: "The bonding hormone. Released through touch, closeness and trust, it builds attachment to family and friends: the feeling of being home." },
  cortisol: { name: "Cortisol", formula: "C<sub>21</sub>H<sub>30</sub>O<sub>5</sub>",
              fn: "The stress hormone. Released under pressure, isolation and lack of sleep. When it stays high, it wears neurons down and dims mood." },
  noradrenaline: { name: "Noradrenaline", formula: "C<sub>8</sub>H<sub>11</sub>NO<sub>3</sub>",
              fn: "The brain's alarm signal. Sharpens alertness and sets off fight-or-flight." },
  adrenaline: { name: "Adrenaline", formula: "C<sub>9</sub>H<sub>13</sub>NO<sub>3</sub>",
              fn: "Made from noradrenaline when the enzyme PNMT adds a methyl group. Racing heart, fast breathing, panic." },
  bdnf: { name: "BDNF", formula: "(BDNF)<sub>2</sub> &nbsp;·&nbsp; protein dimer",
              fn: "Brain-derived neurotrophic factor, the growth factor. Helps neurons survive, branch and form new connections. Exercise, learning and community raise it." },
};
const chemHTML = k => { const c = CHEM[k]; return `<div class="chem"><div class="what">×40 specimen</div><h2>${c.name}</h2><div class="formula">${c.formula}</div><p>${c.fn}</p></div>`; };
const chemnote = $("chemnote");
let noteTimer = null;
function showChemNote(key) {
  clearTimeout(noteTimer);
  chemnote.classList.remove("on");
  if (!key) return;
  noteTimer = setTimeout(() => { chemnote.innerHTML = chemHTML(key); chemnote.classList.add("on"); }, 900);   // once the lens has settled
}

// ---------- what the eyepiece shows ----------
function render() {
  stopAnim();
  updateWheel();
  if (!loaded) { drawGlobe(); return; }
  const place = places[loaded.p], cell = place.cells[obj];
  seen.add(loaded.p * 3 + obj);
  showChemNote(cell.kind === "molecules" ? { chile: "oxytocin", toronto: "cortisol", madrid: "bdnf" }[place.key] : null);
  if (cell.kind === "neurons") startCanvas(makeNeurons(place));
  else if (cell.kind === "molecules") startCanvas(makeMolecules(place));
  else drawPhoto(place, cell, obj, cell.zoom || 1);
}
function focusIn(delay) {
  content.classList.add("blur");
  void content.offsetWidth;
  setTimeout(() => { content.classList.remove("blur"); if (!loaded) playGlobe(); }, delay);
}
function flicker() { blackout.classList.remove("flick"); void blackout.offsetWidth; blackout.classList.add("flick"); }

// ---------- the magnification wheel (the edge of the nosepiece, on the right) ----------
const wheel = $("wheel");
const wheelLabels = OBJECTIVES.map((o, k) => {
  const sp = document.createElement("span");
  sp.textContent = "×" + o;
  sp.onclick = e => { e.stopPropagation(); setObjective(k); };
  wheel.appendChild(sp);
  return sp;
});
const STEP = 38;                                  // degrees between values on the wheel
function updateWheel() {
  const turn = -obj * STEP;                       // the ticks turn with the wheel
  wheel.style.transform = `rotate(${turn}deg)`;
  wheelLabels.forEach((sp, k) => {
    // like your sketch: the next value peeks in above, and the wheel wraps (×40 sits below ×4)
    const d = ((k - obj + 4) % 3) - 1;            // -1 below, 0 at the mark, 1 above
    const A = d * STEP, local = A - turn;
    sp.style.transform = `translate(-50%, -50%) rotate(${local}deg) translateX(calc(var(--wr) * -.86)) rotate(${-A}deg)`;
    sp.classList.toggle("on", k === obj);
  });
}
function markObjective() { updateWheel(); }
updateWheel();
// drag the wheel: pull down for more magnification, up for less
(() => {
  const mw = $("magwheel");
  let y0 = null;
  mw.addEventListener("pointerdown", e => { y0 = e.clientY; mw.setPointerCapture(e.pointerId); e.stopPropagation(); });
  mw.addEventListener("pointermove", e => {
    if (y0 === null) return;
    const dy = e.clientY - y0;
    if (Math.abs(dy) > 45) { setObjective(obj + (dy > 0 ? 1 : -1)); y0 = e.clientY; }
  });
  mw.addEventListener("pointerup", () => { y0 = null; });
  mw.addEventListener("click", e => e.stopPropagation());
})();
function setObjective(k) {
  if (busy || ended || k === obj || k < 0 || k >= OBJECTIVES.length) return;
  busy = true;
  const prev = obj;
  obj = k;
  markObjective();
  window.Lab && Lab.setObjective(k);
  if (!loaded || !viewing) { if (loaded) render(); else updateWheel(); setTimeout(() => { busy = false; }, 500); return; }
  zoomTo(k > prev ? 1 : -1, () => { busy = false; });
}
// ---------- changing lenses: rush through grey streaks and dots ----------
const zoomfx = $("zoomfx");
const flecks = Array.from({ length: 230 }, () => ({ a: rand(0, 7), z: rand(.05, 1), b: rand(.02, .11), w: rand(.5, 1.8), dot: Math.random() < .35 }));
function zoomTo(dir, done) {                         // dir 1 = more magnification (rush in), -1 = less (pull back)
  const dpr = Math.min(2, devicePixelRatio || 1);
  zoomfx.width = zoomfx.height = Math.round((content.clientWidth || 600) * dpr);
  const ctx = zoomfx.getContext("2d"), W = zoomfx.width, c = W / 2, unit = W * .72;
  const DUR = 900, t0 = performance.now();
  let last = t0, swapped = false;
  content.classList.add("zooming");
  content.style.transform = `scale(${dir > 0 ? 2.6 : .45})`; content.style.filter = "blur(10px) brightness(.6)";
  (function frame(now) {
    const p = Math.min(1, (now - t0) / DUR), dt = (now - last) / 1000; last = now;
    const env = Math.sin(Math.PI * p);               // streaks swell, then settle
    if (!swapped && p > .38) {                       // the new lens, arriving from the other side of the rush
      swapped = true;
      render();
      content.classList.remove("zooming");
      content.style.transform = `scale(${dir > 0 ? .55 : 2.2})`; void content.offsetWidth;
      content.classList.add("zooming"); content.style.transition = "transform .55s cubic-bezier(.15,.6,.25,1), filter .55s ease-out";
      content.style.transform = ""; content.style.filter = "";
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, W);
    const veil = ctx.createRadialGradient(c, c, 0, c, c, c);               // the field darkens while the lens moves
    veil.addColorStop(0, "rgba(14,14,15,.55)"); veil.addColorStop(1, "rgba(6,6,7,.9)");
    ctx.fillStyle = veil; ctx.fillRect(0, 0, W, W);
    const speed = (1.2 + env * 4.5) * dir;
    flecks.forEach(f => {
      const z0 = f.z;
      f.z -= dt * speed * .4;
      if (f.z <= .03) { f.z = rand(.55, 1); f.a = rand(0, 7); return; }
      if (f.z > 1) { f.z = rand(.03, .3); f.a = rand(0, 7); return; }
      const r0 = f.b / z0 * unit, r1 = f.b / f.z * unit, a = Math.min(1, .25 + (1 - f.z) * 1.4);
      ctx.strokeStyle = ctx.fillStyle = `rgba(200,203,206,${.85 * a})`;
      if (f.dot) { ctx.beginPath(); ctx.arc(c + Math.cos(f.a) * r1, c + Math.sin(f.a) * r1, f.w * (1 + env) * dpr, 0, 7); ctx.fill(); }
      else {
        ctx.lineWidth = f.w * (1 + env * 1.5) * dpr;
        ctx.beginPath(); ctx.moveTo(c + Math.cos(f.a) * r0, c + Math.sin(f.a) * r0); ctx.lineTo(c + Math.cos(f.a) * r1, c + Math.sin(f.a) * r1); ctx.stroke();
      }
    });
    zoomfx.style.opacity = env;
    if (p < 1) requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, W, W); zoomfx.style.opacity = 0; setTimeout(() => { content.classList.remove("zooming"); content.style.transition = ""; done && done(); }, 250); }
  })(t0);
}
window.onObjectiveClick = setObjective;

// ---------- looking through the eyepieces ----------
const eyeview = $("eyeview");
let viewing = false;
function openView() {
  if (viewing || ended || !window.Lab) return;
  viewing = true;
  Lab.setHint(false);
  Lab.lookIn(() => { eyeview.classList.add("open"); render(); focusIn(520); });
}
function closeView() {
  if (!viewing) return;
  viewing = false;
  showChemNote(null);
  eyeview.classList.remove("open");
  window.Lab && Lab.lookOut();
}
window.onEyepieceClick = openView;
eyeview.addEventListener("click", e => { if (e.target === eyeview || e.target.id === "closeview") closeView(); });

// ---------- picking a slide from the box ----------
// clicking the slide that's on the stage puts it back in the tray
window.onSlideReturn = () => {
  if (busy || !window.Lab || viewing || !loaded) return;
  busy = true;
  Lab.setHint(false);
  Lab.unloadSlide(() => { loaded = null; render(); busy = false; });
};
window.onSlidePick = i => {
  if (busy || ended || !window.Lab || viewing) return;
  const { p } = window.SLIDES[i];
  busy = true;
  if (obj !== 0) { obj = 0; Lab.setObjective(0); }         // like a real microscope: always start on the lowest lens
  updateWheel();
  Lab.loadSlide(i, () => {
    const show = () => {
      loaded = { p };
      if (places[p].key === "toronto") sawToronto = true;
      render();
      busy = false;
      Lab.setHint(true);                               // the eyepieces glow: look through me
        };
    show();
  });
};

// ---------- the lab notebook ----------
const notebook = $("notebook");
window.onNotebookClick = () => { if (!viewing && !busy) notebook.classList.add("open"); };
notebook.onclick = () => notebook.classList.remove("open");

// ---------- the breaking point, inside YYZ ×40: 2:13 AM, then noradrenaline → adrenaline ----------
// Noradrenaline floods the screen and takes on a methyl group (PNMT), becoming adrenaline:
// C8H11NO3 + CH3 → C9H13NO3. Full screen, nothing responds: the heartbeat speeds up, vision
// tunnels, the image splits — then black, and Madrid.
let crisisOn = false;
function breakingPoint() {
  const box = $("interlude"), clock = $("clock");
  crisisOn = true; busy = true;
  const cv = box.querySelector("canvas"); if (cv) cv.style.opacity = 0;
  const times = ["2:09", "2:10", "2:11", "2:12", "2:13"];
  const showT = s => clock.innerHTML = s.replace(":", '<span class="colon">:</span>') + "<small>AM</small>";
  showT(times[0]);
  box.classList.add("on");
  setTimeout(() => clock.classList.add("on"), 500);
  times.forEach((s, i) => setTimeout(() => showT(s), 900 + i * 900));
  setTimeout(() => {                                     // 2:13 — the alarm goes off
    clock.classList.remove("on");
    setTimeout(() => {
      const cv2 = box.querySelector("canvas"); if (cv2) cv2.style.opacity = 1;
      catalyst(() => { busy = false; closeView(); setTimeout(() => $("afternote").classList.add("on"), 1300); });   // back at the bench: what just happened
    }, 800);
  }, 900 + times.length * 900 + 1500);
}
function catalyst(then) {
  const box = $("interlude");
  crisisOn = true;
  let cv = box.querySelector("canvas");
  if (cv) cv.style.opacity = 1;
  if (!cv) { cv = document.createElement("canvas"); cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%"; box.prepend(cv); }
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, U = Math.min(W, H) / 1000;
  box.classList.add("on");
  const cnote = $("crisisnote");
  cnote.innerHTML = chemHTML("noradrenaline") + '<div class="step">+ CH<sub>3</sub> &nbsp;—PNMT→</div>' + chemHTML("adrenaline");
  cnote.querySelectorAll(".what").forEach(w => w.textContent = "the catalyst");
  setTimeout(() => cnote.classList.add("on"), 1200);
  const CHAOS = 8.2;
  const mols = [];
  // what's left of Toronto: cortisol, dissolving as the alarm takes over
  const cort = Array.from({ length: 14 }, () => ({ x: rand(0, W), y: rand(0, H), rot: rand(0, 7), s: rand(.9, 1.3) }));
  const spawn = (t, x, y) => { const a = rand(0, 7), v = rand(1.5, 4);
    mols.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: rand(0, 7), vr: rand(-3, 3),
                methylAt: t + rand(.6, 3.5), s: rand(.8, 1.4), born: 0 }); };
  // the web, across the whole screen, firing faster and faster: noradrenaline released where each signal lands
  const web = [];
  for (let tries = 0; web.length < 22 && tries < 3000; tries++) {
    const x = rand(.06, .94) * W, y = rand(.08, .92) * H;
    if (web.every(n => Math.hypot(n.x - x, n.y - y) > Math.min(W, H) * .16)) web.push({ x, y, glow: 0, dend: Array.from({ length: 6 }, () => [rand(0, 7), rand(40, 110) * U]) });
  }
  const axons = [];
  web.forEach((n, i) => web.map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) })).filter(o => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2)
    .forEach(({ j }) => { if (!axons.some(l => l.a === j && l.b === i)) axons.push({ a: i, b: j }); }));
  const sparks = [];
  let nextBeat = .4, beatT = -9, nextSpawn = 0, t0 = performance.now(), last = t0;
  let t = 0;
  (function frame(now) {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; t += dt;   // advances per frame: a slow machine plays it slower, never skips it
    const u = Math.min(1, t / CHAOS);
    if (t < CHAOS) {
      if (t > nextSpawn) { for (let i = 0; i < 1 + u * 3; i++) { const l = axons[Math.floor(Math.random() * axons.length)]; sparks.push({ l, fromA: Math.random() < .5, t0: t, v: rand(1.2, 2.2) + u * 3 }); } nextSpawn = t + .16 - u * .1; }
      if (t > nextBeat) { beatT = t; nextBeat = t + (.95 - .62 * Math.pow(u, 1.2)); }
      const beat = Math.exp(-(t - beatT) * 7);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(0,0,0,${.5 - u * .3})`; ctx.fillRect(0, 0, W, H);
      const shake = (2 + u * 14) * beat * U * 1.5;
      ctx.translate(rand(-shake, shake), rand(-shake, shake));
      const ca = Math.max(0, 1 - t / 2.5);
      if (ca > 0) cort.forEach(c => { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); glowMol(ctx, MOL.cortisol, 15 * U * c.s, "#9fb0c2", .5 * ca, 1.6 * U * 1.4); ctx.restore(); });
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1.4 * U * 1.5;
      axons.forEach(l => { const A = web[l.a], B = web[l.b]; ctx.strokeStyle = `rgba(255,70,60,${.12 + u * .1})`; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); });
      web.forEach(n => {
        n.glow *= .9;
        ctx.strokeStyle = `rgba(255,90,80,${.18 + n.glow * .4})`;
        ctx.beginPath(); n.dend.forEach(([a, L]) => { ctx.moveTo(n.x, n.y); ctx.lineTo(n.x + Math.cos(a) * L, n.y + Math.sin(a) * L); }); ctx.stroke();
        const R = (22 + n.glow * 40) * U * 1.5, g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, R);
        g.addColorStop(0, `rgba(255,220,210,${.5 + n.glow * .5})`); g.addColorStop(.3, `rgba(255,50,40,${.35 + n.glow * .4})`); g.addColorStop(1, "rgba(255,40,30,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, R, 0, 7); ctx.fill();
      });
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i], p = (t - sp.t0) * sp.v;
        const A = web[sp.fromA ? sp.l.a : sp.l.b], B = web[sp.fromA ? sp.l.b : sp.l.a];
        if (p >= 1) { sparks.splice(i, 1); B.glow = 1; for (let k = 0; k < 2; k++) spawn(t, B.x, B.y); continue; }
        const x = A.x + (B.x - A.x) * p, y = A.y + (B.y - A.y) * p, R = 26 * U * 1.5;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(.35, "rgba(255,60,50,.6)"); g.addColorStop(1, "rgba(255,40,30,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
      }
      while (mols.length > 260) mols.shift();
      const ab = (1 + u * 9) * U * (1 + beat);
      mols.forEach(m => {
        m.born = Math.min(1, m.born + dt * 2);
        const j = (2 + u * 10) * U;
        m.x += m.vx * U * 60 * dt + rand(-j, j); m.y += m.vy * U * 60 * dt + rand(-j, j);
        m.rot += m.vr * dt * (1 + u * 3);
        const s = 15 * U * m.s * (1 + beat * .12);
        const o = { ex1: 1, ex2: Math.min(1, Math.max(0, (t - m.methylAt) / .5)) };   // noradrenaline → adrenaline
        [["#ff2b2b", ab], ["#43e0ff", -ab]].forEach(([c, dx]) => {
          ctx.save(); ctx.translate(m.x + dx, m.y); ctx.rotate(m.rot);
          glowMol(ctx, MOL.cat, s, c, .55 * m.born, 1.6 * U * 1.4, o);
          ctx.restore();
        });
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const R = Math.hypot(W, H) / 2;
      const v = ctx.createRadialGradient(W / 2, H / 2, R * (.75 - u * .62), W / 2, H / 2, R * (1.05 - u * .45));
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(.55, `rgba(120,0,0,${.25 + beat * .35})`); v.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      requestAnimationFrame(frame);
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      cnote.classList.remove("on");
      setTimeout(() => { flicker(); setTimeout(() => { box.classList.remove("on"); crisisOn = false; then(); }, 140); }, 1600);   // a beat of silence
    }
  })(t0);
}

// ---------- ending ----------
const ended = false;                       // no closing frame: the story ends in Madrid, under the lens

// ---------- keyboard + scroll ----------
document.addEventListener("keydown", e => {
  if (crisisOn) return;
  if (!entered) { if (["Enter", " ", "ArrowRight"].includes(e.key)) { e.preventDefault(); enter(); } return; }
  if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); setObjective(obj + 1); }
  if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); setObjective(obj - 1); }
  if (e.key === "Escape") { notebook.classList.remove("open"); $("afternote").classList.remove("on"); closeView(); }
  if (e.key === "Enter" || e.key.toLowerCase() === "v") viewing ? closeView() : openView();
});
let wheelLock = 0;
addEventListener("wheel", e => {
  if (crisisOn || Date.now() < wheelLock || !entered || !viewing) return;
  if (e.deltaY < -10) { setObjective(obj + 1); wheelLock = Date.now() + 800; }
  if (e.deltaY > 10) { setObjective(obj - 1); wheelLock = Date.now() + 800; }
}, { passive: true });
$("scope").addEventListener("click", e => { e.stopPropagation(); setObjective(obj === 2 ? 0 : obj + 1); });

// ---------- the way in: push the door, walk through, and you're in the lab ----------
const entry = $("entry");
let entered = false;
function enter() {
  if (entered) return;
  entered = true;
  entry.classList.add("open");                                   // the door swings inward
  setTimeout(() => { entry.classList.add("through"); window.Lab && Lab.flyIn(); }, 900);   // walk through it
  setTimeout(() => entry.classList.add("gone"), 2700);
  setTimeout(() => $("howto").classList.add("on"), 3900);       // once you're standing at the bench
}
entry.onclick = enter;
const hideHowto = () => { if (location.protocol !== "file:") $("howto").classList.remove("on"); };
$("howtoOk").onclick = hideHowto;
$("afternoteOk").onclick = () => $("afternote").classList.remove("on");
addEventListener("pointerdown", e => { if (!e.target.closest("#howto")) hideHowto(); }, true);   // any click in the lab also puts it away
setTimeout(enter, 6500);                                         // lets itself open if nobody pushes
render();
landReady.then(() => { if (!loaded) { render(); if (entered) playGlobe(); } });

// ---------- opened as a local file? ----------
// Browsers won't run the 3D lab (an ES module) from file://, so say how to open it properly instead of showing an empty room.
if (location.protocol === "file:") {
  const card = $("howto");
  card.innerHTML = `<h2>Open it through a server</h2>
    <p>This page was opened directly as a file, and browsers block the 3D lab that way.</p>
    <ol>
      <li>In this folder, double-click <b>Open preview.command</b>. It opens the site in your browser.</li>
      <li>Or open the published GitHub Pages link.</li>
    </ol>`;
  entered = true;                                  // keeps the door from opening onto an empty room
  entry.classList.add("gone");
  card.classList.add("on");
  card.style.bottom = "auto"; card.style.top = "50%"; card.style.transform = "translate(-50%, -50%)";
}
