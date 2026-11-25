// The 3D lab: a room, a bench, a microscope and a tray of 3 glass slides (SCL, YYZ, MAD)
// and an open lab notebook with your notes.
// Built from simple shapes with three.js (units ≈ centimetres, bench top at y = 0).
//
// The page gives it the slides through window.SLIDES and talks to it through window.Lab:
//   Lab.flyIn()                     camera moves from the doorway to the bench
//   Lab.setObjective(k)             rotate the nosepiece to objective k (0 = 4×, 1 = 10×, 2 = 40×)
//   Lab.loadSlide(i, done)          lift slide i out of the box and slide it onto the stage
// It calls back:
//   window.onObjectiveClick(k)      an objective was clicked
//   window.onSlidePick(i)           a slide in the box was clicked
//   window.onSlideReturn(i)         the slide on the stage was clicked (put it back)
//   window.onNotebookClick()        the lab notebook was clicked

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const host = document.getElementById("scene3d");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd6dbdf);
scene.fog = new THREE.Fog(0xd6dbdf, 260, 650);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 1500);

// ---------- light ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa3ab, 0.7));
const key = new THREE.DirectionalLight(0xfffaf2, 1.7);
key.position.set(60, 160, 110);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 10, far: 400 });
key.shadow.bias = -0.0004;
key.shadow.radius = 5;
scene.add(key);

// ---------- materials ----------
const M = {
  white:  new THREE.MeshPhysicalMaterial({ color: 0xf2f3f4, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.35 }),
  black:  new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.5, metalness: 0.15 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xd9dcdf, roughness: 0.16, metalness: 1 }),
  lens:   new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.05, metalness: 0.6 }),
  top:    new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.32, metalness: 0.1 }),
  wood:   new THREE.MeshStandardMaterial({ color: 0x5b2717, roughness: 0.55 }),
  seam:   new THREE.MeshStandardMaterial({ color: 0x2a120a, roughness: 0.8 }),
  wall:   new THREE.MeshStandardMaterial({ color: 0xe9ecee, roughness: 0.95 }),
  floor:  new THREE.MeshStandardMaterial({ color: 0x8b9196, roughness: 0.85 }),
  cab:    new THREE.MeshStandardMaterial({ color: 0xdfe2e4, roughness: 0.6 }),
  glass:  new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.06, thickness: 0.4, transparent: true, opacity: 0.35 }),
  card:   new THREE.MeshStandardMaterial({ color: 0xa88b64, roughness: 0.9 }),
  plate:  new THREE.MeshStandardMaterial({ color: 0xc9cdd0, roughness: 0.5 }),
  amber:  new THREE.MeshPhysicalMaterial({ color: 0x8a4b12, roughness: 0.15, transmission: 0.5, thickness: 1, transparent: true, opacity: 0.9 }),
  boxGrey: new THREE.MeshStandardMaterial({ color: 0x4b5157, roughness: 0.55 }),
};
const add = (geo, mat, x, y, z, parent = scene, shadow = true) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = shadow;
  parent.add(m);
  return m;
};
const RB = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 5, r);
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CYL = (rt, rb, h, s = 48) => new THREE.CylinderGeometry(rt, rb, h, s);

// ======================= THE ROOM =======================
const floor = add(new THREE.PlaneGeometry(1200, 1200), M.floor, 0, -90, 0);
floor.rotation.x = -Math.PI / 2;
add(new THREE.PlaneGeometry(1200, 420), M.wall, 0, 110, -33);                       // back wall
const side = add(new THREE.PlaneGeometry(1200, 420), M.wall, -175, 110, 0);         // left wall
side.rotation.y = Math.PI / 2;

// bench: black top, backsplash, wooden drawers with chrome handles
add(BOX(340, 3, 66), M.top, 0, -1.5, 0);
add(BOX(340, 10, 2), M.top, 0, 5, -32);
add(BOX(334, 84, 60), M.wood, 0, -45, -2);
[-111, 0, 111].forEach(x => {
  add(BOX(1.2, 82, 0.6), M.seam, x - 55.5, -45, 28.4, scene, false);
  [-18, -50].forEach(y => {
    add(BOX(108, 0.8, 0.6), M.seam, x, y + 14, 28.4, scene, false);
    const h = add(CYL(0.9, 0.9, 46, 16), M.chrome, x, y, 31);
    h.rotation.z = Math.PI / 2;
    add(CYL(0.6, 0.6, 3, 12), M.chrome, x - 20, y, 29.6).rotation.x = Math.PI / 2;
    add(CYL(0.6, 0.6, 3, 12), M.chrome, x + 20, y, 29.6).rotation.x = Math.PI / 2;
  });
});

// wall cabinets with glass doors and things on the shelves
function wallCabinet(x) {
  const g = new THREE.Group();
  g.position.set(x, 80, -17);
  scene.add(g);
  add(BOX(80, 62, 1), M.cab, 0, 0, -15, g);                     // back
  add(BOX(1.5, 62, 30), M.cab, -40, 0, 0, g);                   // sides
  add(BOX(1.5, 62, 30), M.cab, 40, 0, 0, g);
  add(BOX(81.5, 1.5, 30), M.cab, 0, 31, 0, g);                  // top / bottom / shelf
  add(BOX(81.5, 1.5, 30), M.cab, 0, -31, 0, g);
  add(BOX(78, 1, 28), M.cab, 0, 2, -1, g);
  add(BOX(38.5, 60, 0.6), M.glass, -19.6, 0, 15, g, false);    // glass doors
  add(BOX(38.5, 60, 0.6), M.glass, 19.6, 0, 15, g, false);
  [-19.6, 19.6].forEach(dx => {
    add(BOX(38.5, 2, 1), M.cab, dx, 29.5, 15, g); add(BOX(38.5, 2, 1), M.cab, dx, -29.5, 15, g);
    add(BOX(2, 60, 1), M.cab, dx - 18.5, 0, 15, g); add(BOX(2, 60, 1), M.cab, dx + 18.5, 0, 15, g);
  });
  add(CYL(0.5, 0.5, 8, 12), M.chrome, -2.5, -18, 16.2, g);       // handles
  add(CYL(0.5, 0.5, 8, 12), M.chrome, 2.5, -18, 16.2, g);
  // shelf contents
  add(BOX(18, 12, 14), M.card, -22, 8.5, -4, g);
  add(BOX(14, 9, 12), M.card, 20, 7, -5, g);
  for (let i = 0; i < 4; i++) add(CYL(2.4, 2.4, 9), M.boxGrey, -2 + i * 5.5, 7, 2, g);
  add(BOX(22, 8, 14), M.card, -14, -26, -4, g);
  for (let i = 0; i < 3; i++) add(CYL(2, 2, 7, 24), M.amber, 12 + i * 5, -26.5, 3, g);
}
wallCabinet(-75);
wallCabinet(15);
[[-40, 18], [72, 18]].forEach(([x, y]) => {                     // wall outlets
  add(BOX(7, 11, 0.6), M.plate, x, y, -32.6);
  add(BOX(2, 2.6, 0.4), M.black, x, y + 2, -32.2); add(BOX(2, 2.6, 0.4), M.black, x, y - 2.4, -32.2);
});
// dropper bottles on the bench
[[-22, -18], [-17.5, -15]].forEach(([x, z]) => {
  add(CYL(1.6, 1.6, 6, 24), M.amber, x, 3, z);
  add(CYL(0.9, 1.2, 2.6, 16), M.black, x, 7.3, z);
});

// ======================= THE MICROSCOPE =======================
const scope = new THREE.Group();
scope.position.set(0, 0, -6);
scene.add(scope);
const s = (geo, mat, x, y, z, parent = scope) => add(geo, mat, x, y, z, parent);

s(RB(22, 2.6, 15, 1.1), M.white, 0, 1.3, 1);
s(CYL(1.7, 1.7, 0.25), M.black, 0, 2.72, 2);
const lampMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff1cf, emissiveIntensity: 0 });
s(new THREE.CircleGeometry(1.25, 40), lampMat, 0, 2.86, 2).rotation.x = -Math.PI / 2;
s(RB(5.6, 24, 6.2, 1.4), M.white, 0, 13.4, -4.6);
s(RB(5.6, 5.2, 13, 1.4), M.white, 0, 26.6, 0.4);
s(RB(7.2, 4.2, 8.4, 1.2), M.white, 0, 30.2, 2.2);
const eyepieces = [];                                   // the cups you look into — clickable
const cupMat = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.5, metalness: 0.15, emissive: 0xe0301e, emissiveIntensity: 0 });
[-1.45, 1.45].forEach(x => {
  const tube = new THREE.Group();
  tube.position.set(x, 31.6, 4.2);
  tube.rotation.x = 0.62;
  scope.add(tube);
  const body = s(CYL(0.85, 0.95, 6), M.black, 0, 3, 0, tube);
  const cup = s(CYL(1.1, 1.1, 1.4), cupMat, 0, 6.4, 0, tube);
  s(CYL(1.12, 1.12, 0.25), M.chrome, 0, 5.6, 0, tube);
  [body, cup].forEach(m => { m.userData.eyepiece = true; eyepieces.push(m); });
});
// a generous invisible click area around the head + eyepieces (the real cups are tiny on screen)
const eyeHit = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
eyeHit.position.set(0, 33, 4);
eyeHit.userData.eyepiece = true;
scope.add(eyeHit);
[-1, 1].forEach(sd => {
  s(CYL(2.7, 2.7, 1.2), M.black, sd * 3.5, 9.2, -4.6).rotation.z = Math.PI / 2;
  s(CYL(1.6, 1.6, 1.1), M.white, sd * 4.6, 9.2, -4.6).rotation.z = Math.PI / 2;
});
const STAGE_Y = 12.1, STAGE_Z = 2;
s(RB(13.5, 0.9, 12, 0.25), M.black, 0, STAGE_Y, STAGE_Z);
const holeMat = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xfff1cf, emissiveIntensity: 0 });
s(new THREE.CircleGeometry(0.9, 32), holeMat, 0, STAGE_Y + 0.46, STAGE_Z).rotation.x = -Math.PI / 2;
s(RB(9.5, 0.55, 2.2, 0.2), M.black, -0.5, STAGE_Y + 0.72, STAGE_Z - 3.4);
s(RB(1.3, 0.55, 5.4, 0.2), M.black, 4.4, STAGE_Y + 0.72, STAGE_Z - 0.6);
s(CYL(0.6, 0.6, 3.2), M.black, 5.6, STAGE_Y - 2.4, STAGE_Z + 4.2);
s(CYL(0.85, 0.85, 1.1), M.black, 5.6, STAGE_Y - 4.2, STAGE_Z + 4.2);
s(CYL(2.1, 1.6, 2.6), M.black, 0, STAGE_Y - 2.1, STAGE_Z);
s(CYL(2.2, 2.2, 0.3), M.chrome, 0, STAGE_Y - 1.1, STAGE_Z);
const stageLight = new THREE.PointLight(0xfff0cc, 0, 16);
stageLight.position.set(0, STAGE_Y + 1.5, STAGE_Z);
scope.add(stageLight);

// nosepiece with 4 objectives (real colour codes: 4× red, 10× yellow, 40× blue, 100× white)
const TILT = 0.34;
const COLOURS = [0xd8382c, 0xe6b422, 0x2f6fd6, 0xf4f4f4];
const pivot = new THREE.Group();
pivot.rotation.x = -TILT;
scope.add(pivot);
const spin = new THREE.Group();
pivot.add(spin);
s(CYL(3.1, 3.5, 1.5), M.chrome, 0, 0, 0, spin);
s(CYL(3.55, 3.55, 0.45, 64), M.black, 0, 0.6, 0, spin);
const objectiveMeshes = [], tips = [];
for (let i = 0; i < 4; i++) {
  const phi = i * Math.PI / 2, len = 2.6 + i * 0.55;
  const og = new THREE.Group();
  og.position.set(2.05 * Math.sin(phi), -0.55, 2.05 * Math.cos(phi));
  og.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(Math.sin(phi) * Math.sin(TILT), -Math.cos(TILT), Math.cos(phi) * Math.sin(TILT)).normalize());
  spin.add(og);
  const parts = [
    s(CYL(0.82, 0.82, len), M.chrome, 0, -len / 2, 0, og),
    s(CYL(0.85, 0.85, 0.3), new THREE.MeshStandardMaterial({ color: COLOURS[i], roughness: 0.4 }), 0, -len * 0.38, 0, og),
    s(CYL(0.82, 0.44, 1.05), M.chrome, 0, -len - 0.52, 0, og),
  ];
  const lens = s(new THREE.CircleGeometry(0.3, 24), M.lens, 0, -len - 1.06, 0, og);
  lens.rotation.x = Math.PI / 2;
  parts.forEach(p => { p.userData.objective = i; objectiveMeshes.push(p); });
  tips.push(lens);
}
const spinFor = k => Math.PI - k * Math.PI / 2;
spin.rotation.y = spinFor(0);
scene.updateMatrixWorld(true);
const tipW = new THREE.Vector3();
tips[0].getWorldPosition(tipW);
const tipL = scope.worldToLocal(tipW.clone());
pivot.position.set(-tipL.x, STAGE_Y + 4.6 - tipL.y, STAGE_Z - tipL.z);

// ======================= SLIDE TRAY + 3 SLIDES =======================
const BOX_POS = new THREE.Vector3(-25, 0, 15);
const boxG = new THREE.Group();
boxG.position.copy(BOX_POS);
boxG.rotation.y = 0.2;
boxG.scale.setScalar(1.4);                              // three big slides, easy to grab
scene.add(boxG);
add(RB(13, 1.6, 13, 0.4), M.boxGrey, 0, 0.8, 0, boxG);                // tray
[-6.2, 6.2].forEach(x => add(BOX(0.6, 2.4, 13), M.boxGrey, x, 1.6, 0, boxG));
[-6.3, 6.3].forEach(z => add(BOX(13, 2.4, 0.6), M.boxGrey, 0, 1.6, z, boxG));
[-2, 2].forEach(z => add(BOX(11.8, 1.9, 0.25), M.black, 0, 1.5, z, boxG));     // slot ribs between the slides
// the lid, hinged on the back top edge and flipped open so its far edge rests on the bench behind the tray
const hinge = new THREE.Group();
hinge.position.set(0, 2.8, -6.6);
hinge.rotation.x = -(Math.PI + Math.asin(2.4 / 13));
boxG.add(hinge);
const lid = add(RB(13, 0.8, 13, 0.4), M.boxGrey, 0, -0.4, 6.5, hinge);
add(BOX(12.6, 0.5, 0.6), M.boxGrey, 0, -0.9, 0.3, hinge);                      // the lid's lip at the hinge

const slides = [];
const slideHitMeshes = [];
const loader = new THREE.TextureLoader();
const SPEC_X = 0.9, SLIDE_SCALE = 1.08 * 1.4;                 // where the specimen sits on its slide
// the slide's resting point on the stage: shifted so the specimen (not the slide's middle) sits over the light
const STAGE_POS = () => scope.localToWorld(new THREE.Vector3(-SPEC_X * SLIDE_SCALE, STAGE_Y + 0.52, STAGE_Z));

function labelTexture(code) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#efeae0"; x.fillRect(0, 0, 256, 256);
  x.fillStyle = "#222"; x.font = "bold 92px 'Space Mono', 'Courier New', monospace";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.save(); x.translate(128, 128); x.rotate(-Math.PI / 2); x.fillText(code, 0, 0); x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// small preview for a neurons slide
function specimenTexture(kind, tint, alive) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#0b0b0d"; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = x.fillStyle = tint;
  const n = alive ? 1 : 0.35;
  if (kind === "neurons") {
    for (let i = 0; i < (alive ? 9 : 5); i++) {
      const px = 20 + Math.random() * 88, py = 20 + Math.random() * 88;
      x.globalAlpha = .5 * n; x.lineWidth = 1;
      for (let d = 0; d < 5; d++) { const a = Math.random() * 6.3; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 16, py + Math.sin(a) * 16); x.stroke(); }
      x.globalAlpha = n; x.beginPath(); x.arc(px, py, 3.5, 0, 7); x.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function warmTexture(tint) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(54, 50, 4, 64, 64, 64);
  g.addColorStop(0, "#fff6d8"); g.addColorStop(.3, tint); g.addColorStop(1, "#5a2410");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

(window.SLIDES || []).forEach((info, i) => {
  const g = new THREE.Group();
  const glass = add(BOX(7.6, 0.12, 2.6),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.04, thickness: 0.12, transparent: true, opacity: 0.8, emissive: 0xe0301e, emissiveIntensity: 0 }),
    0, 0, 0, g);
  const label = add(new THREE.PlaneGeometry(2.3, 2.4), new THREE.MeshStandardMaterial({ map: labelTexture(info.code), roughness: 0.9 }), -2.5, 0.07, 0, g);
  label.rotation.x = -Math.PI / 2;
  const specMat = new THREE.MeshStandardMaterial({ roughness: 0.6, transparent: true, opacity: 0.92 });
  if (info.thumb) loader.load(info.thumb, t => { t.colorSpace = THREE.SRGBColorSpace; specMat.map = t; specMat.needsUpdate = true; });
  else if (info.kind === "neurons") specMat.map = specimenTexture(info.kind, info.tint, info.mood === "alive");
  else specMat.map = warmTexture(info.tint);
  if (info.grey) specMat.color.set(0x9a9a9a);
  const spec = add(new THREE.CircleGeometry(0.85, 48), specMat, SPEC_X, 0.075, 0, g);
  spec.rotation.x = -Math.PI / 2;
  // home: one slot each, back → front: Santiago, Toronto, Madrid
  const home = new THREE.Vector3(0, 2.1, -4 + info.p * 4);
  boxG.updateMatrixWorld(true);
  const homeW = boxG.localToWorld(home.clone());
  g.position.copy(homeW);
  g.rotation.y = boxG.rotation.y;                        // lying flat, like on the stage
  g.scale.setScalar(SLIDE_SCALE);
  scene.add(g);
  [glass, label, spec].forEach(m => { m.userData.slide = i; slideHitMeshes.push(m); });
  slides.push({ g, home: homeW, homeRot: g.rotation.y, glass, i });
});

// ======================= LAB NOTEBOOK (right of the microscope) =======================
const NOTE_W = 15, NOTE_H = NOTE_W * 1815 / 1710;            // the page keeps your scan's proportions
const book = new THREE.Group();
book.position.set(24, 0, 12);
book.rotation.y = -0.22;
scene.add(book);
const notebookHits = [];
const coverMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.7 });
const paperMat = new THREE.MeshStandardMaterial({ color: 0xf6f1e4, roughness: 0.95 });
// folded back on itself: the right half sits underneath the left, so only one page shows, spiral on its right edge
add(RB(NOTE_W + 1.2, 0.4, NOTE_H + 1.4, 0.2), coverMat, 0.25, 0.2, 0.15, book);                     // back cover (folded under)
add(BOX(NOTE_W, 0.6, NOTE_H), paperMat, 0.2, 0.7, 0.1, book);                                        // the folded-under pages
add(RB(NOTE_W + 1.2, 0.3, NOTE_H + 1.4, 0.15), coverMat, 0, 1.15, 0, book);                         // front cover, open flat beneath its pages
add(BOX(NOTE_W, 0.5, NOTE_H), paperMat, 0, 1.55, 0, book);                                           // the visible half's pages
const noteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
const notePage = add(new THREE.PlaneGeometry(NOTE_W, NOTE_H), noteMat, 0, 1.81, 0, book, false);
notePage.rotation.x = -Math.PI / 2;
loader.load("images/notebook/notes-v2.jpg", t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); noteMat.map = t; noteMat.needsUpdate = true; });
for (let k = 0; k < 10; k++)                                                                          // spiral, wrapping the folded edge
  add(new THREE.TorusGeometry(0.85, 0.09, 8, 24), M.chrome, NOTE_W / 2 + 0.35, 1.0, -NOTE_H / 2 + 1.1 + k * (NOTE_H - 2.2) / 9, book);
const pen = add(CYL(0.32, 0.32, 13, 16), new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.35, metalness: 0.3 }), -NOTE_W / 2 - 2.4, 0.35, 1, book);
pen.rotation.set(Math.PI / 2, 0, -0.1);
add(CYL(0.34, 0.34, 2.2, 16), M.chrome, -NOTE_W / 2 - 2.2, 0.35, -5.4, book).rotation.set(Math.PI / 2, 0, -0.1);
book.traverse(o => { if (o.isMesh) { o.userData.notebook = true; notebookHits.push(o); } });

// ---------- tweens ----------
const tweens = [];
const tween = (dur, fn, done) => tweens.push({ t0: performance.now(), dur, fn, done });
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function path(obj, points, rotTo, dur, done) {           // move through points, easing each leg
  const legs = points.length - 1, rot0 = obj.rotation.y;
  tween(dur, t => {
    const f = Math.min(legs - 1e-6, t * legs), k = Math.floor(f), lt = ease(f - k);
    obj.position.lerpVectors(points[k], points[k + 1], lt);
    obj.rotation.y = rot0 + (rotTo - rot0) * ease(Math.min(1, t * 1.6));
  }, done);
}

let lampOn = false;
function setLamp(on) {
  if (on === lampOn) return;
  lampOn = on;
  tween(600, t => {
    const v = on ? t : 1 - t;
    lampMat.emissiveIntensity = v * 3; holeMat.emissiveIntensity = v * 2; stageLight.intensity = v * 45;
  });
}

let onStage = null;
function loadSlide(i, done) {
  const st = STAGE_POS();
  const right = st.clone().add(new THREE.Vector3(Math.sign(BOX_POS.x) * 16, 1, 0));   // come in from the box side
  const bring = () => {
    const sl = slides[i];
    const lift = sl.home.clone().add(new THREE.Vector3(0, 9, 0));
    path(sl.g, [sl.home.clone(), lift, right.clone().add(new THREE.Vector3(0, 4, 0)), right, st], 0, 1700, () => {
      setLamp(true);
      onStage = i;
      done && done();
    });
  };
  if (onStage !== null) {                                 // put the previous slide back first
    const old = slides[onStage];
    onStage = null;
    path(old.g, [st, right, old.home.clone().add(new THREE.Vector3(0, 9, 0)), old.home.clone()], old.homeRot, 1100, bring);
  } else bring();
}

// click the slide on the stage: it goes back to its slot in the tray, and the lamp switches off
function unloadSlide(done) {
  if (onStage === null) { done && done(); return; }
  const st = STAGE_POS(), right = st.clone().add(new THREE.Vector3(Math.sign(BOX_POS.x) * 16, 1, 0));
  const old = slides[onStage];
  onStage = null;
  old.glass.material.emissiveIntensity = 0;
  setLamp(false);
  path(old.g, [st, right, old.home.clone().add(new THREE.Vector3(0, 9, 0)), old.home.clone()], old.homeRot, 1300, done);
}

function setObjective(k) {
  const from = spin.rotation.y;
  let to = spinFor(k);
  while (to - from > Math.PI) to -= Math.PI * 2;
  while (from - to > Math.PI) to += Math.PI * 2;
  tween(750, t => { spin.rotation.y = from + (to - from) * ease(t); });
}

// ======================= CAMERA =======================
const WIDE = { pos: new THREE.Vector3(150, 95, 260), at: new THREE.Vector3(-10, 30, -10) };
const BENCH = { pos: new THREE.Vector3(34, 54, 108), at: new THREE.Vector3(-2, 13, 4) };   // wide enough for tray, microscope and notebook
const cam = { pos: WIDE.pos.clone(), at: WIDE.at.clone() };
function moveCam(to, dur, done) {
  const p0 = cam.pos.clone(), a0 = cam.at.clone();
  tween(dur, t => {
    const e = ease(t);
    cam.pos.lerpVectors(p0, to.pos, e);
    cam.at.lerpVectors(a0, to.at, e);
  }, done);
}
const flyIn = () => moveCam(BENCH, 3600);
// lean in over the eyepieces, as if you're about to look through them
function lookIn(done) {
  const cupW = new THREE.Vector3();
  eyepieces[1].getWorldPosition(cupW);
  cupW.x -= 1.45;                                          // between the two cups
  moveCam({ pos: cupW.clone().add(new THREE.Vector3(0, 7, 9)), at: cupW }, 900, done);
}
const lookOut = () => moveCam(BENCH, 900);

// soft red pulse on the eyepieces: "look here"
let hint = false;
const setHint = on => { hint = on; if (!on) cupMat.emissiveIntensity = 0; };
let mx = 0, my = 0;
addEventListener("pointermove", e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

// ======================= CLICKING =======================
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects([...objectiveMeshes, ...slideHitMeshes, ...eyepieces, eyeHit, ...notebookHits], false)[0];
  return hit ? hit.object.userData : null;
}
let hovered = null;
renderer.domElement.addEventListener("pointermove", e => {
  const u = pick(e);
  renderer.domElement.style.cursor = u ? "pointer" : "default";
  const h = u && u.slide !== undefined ? slides[u.slide] : null;                 // the slide on the stage glows too: it can go back
  if (h !== hovered) {
    if (hovered) hovered.glass.material.emissiveIntensity = 0;
    if (h) h.glass.material.emissiveIntensity = 0.35;
    hovered = h;
  }
});
renderer.domElement.addEventListener("click", e => {
  const u = pick(e);
  if (!u) return;
  if (u.objective !== undefined && window.onObjectiveClick) window.onObjectiveClick(u.objective);
  if (u.slide !== undefined && u.slide !== onStage && window.onSlidePick) window.onSlidePick(u.slide);
  else if (u.slide !== undefined && u.slide === onStage && window.onSlideReturn) window.onSlideReturn(u.slide);
  if (u.eyepiece && window.onEyepieceClick) window.onEyepieceClick();
  if (u.notebook && window.onNotebookClick) window.onNotebookClick();
});

// ======================= LOOP =======================
(function loop(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    const t = Math.max(0, Math.min(1, (now - tw.t0) / tw.dur));   // rAF time can be a hair earlier than t0
    try { tw.fn(t); } catch (err) { console.error(err); }
    if (t >= 1) { tweens.splice(i, 1); tw.done && tw.done(); }
  }
  const off = cam.pos.clone().sub(cam.at);
  const sph = new THREE.Spherical().setFromVector3(off);
  sph.theta += mx * 0.1;
  sph.phi = Math.min(1.45, sph.phi + my * 0.05);
  camera.position.copy(cam.at).add(new THREE.Vector3().setFromSpherical(sph));
  camera.lookAt(cam.at);
  if (hint) cupMat.emissiveIntensity = 0.25 + 0.25 * Math.sin(now / 280);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})(performance.now());

function slideScreen(i) {                                 // where slide i is on screen
  const v = slides[i].g.position.clone().project(camera);
  const r = renderer.domElement.getBoundingClientRect();
  return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
}
window.Lab = { flyIn, setObjective, loadSlide, unloadSlide, slideScreen, lookIn, lookOut, setHint };
window.dispatchEvent(new Event("lab-ready"));
