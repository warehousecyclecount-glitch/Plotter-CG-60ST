'use strict';
const assert = require('node:assert/strict');
const M = require('../js/model-v3.js');
const Ops = require('../js/design-ops-v3.js');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

function makeSign(qty = 1) {
  const p = M.createProject();
  const { design, text } = M.addTextDesign(p, 'WAREHOUSE', { w:120, h:40, qty, padding:{x:10,y:10} });
  const frame = M.addFrameToDesign(p, design.id, { w:200, h:80 });
  return { p, design, text, frame };
}

function almostEqualPoint(a, b, eps = 1e-8) {
  assert.ok(Math.abs(a.x-b.x) < eps, `x differs: ${a.x} vs ${b.x}`);
  assert.ok(Math.abs(a.y-b.y) < eps, `y differs: ${a.y} vs ${b.y}`);
}

test('translatePlacement moves every object by the same delta', () => {
  const { p, design, text, frame } = makeSign();
  const pl = p.placements.find(x => x.designId === design.id);
  pl.transforms[text.id] = { x:40, y:20, rotation:0 };
  pl.transforms[frame.id] = { x:10, y:5, rotation:0 };
  Ops.translatePlacement(p, pl.id, 25, -7);
  assert.deepEqual(pl.transforms[text.id], { x:65, y:13, rotation:0 });
  assert.deepEqual(pl.transforms[frame.id], { x:35, y:-2, rotation:0 });
});

test('centerTextInFrame centers all quantity copies without moving frames', () => {
  const { p, design, text, frame } = makeSign(3);
  const before = p.placements.map(pl => JSON.parse(JSON.stringify(pl.transforms[frame.id])));
  Ops.centerTextInFrame(p, design.id);
  p.placements.forEach((pl, i) => {
    const ft = pl.transforms[frame.id];
    const tt = pl.transforms[text.id];
    assert.deepEqual(ft, before[i]);
    assert.equal(tt.x + text.size.w / 2, ft.x + frame.size.w / 2);
    assert.equal(tt.y + text.size.h / 2, ft.y + frame.size.h / 2);
    assert.equal(tt.rotation, ft.rotation);
  });
});

test('rotatePlacement keeps object center distances and rotates the whole sign', () => {
  const { p, design, text, frame } = makeSign();
  const pl = p.placements.find(x => x.designId === design.id);
  pl.transforms[frame.id] = { x:0, y:0, rotation:0 };
  pl.transforms[text.id] = { x:20, y:10, rotation:15 };
  const bounds = Ops.getPlacementBounds(p, pl.id);
  const beforeTextCenter = { x:20 + text.size.w/2, y:10 + text.size.h/2 };
  const beforeDistance = Math.hypot(beforeTextCenter.x-bounds.cx, beforeTextCenter.y-bounds.cy);

  Ops.rotatePlacement(p, pl.id, 90, { cx:bounds.cx, cy:bounds.cy });

  const tt = pl.transforms[text.id];
  const ft = pl.transforms[frame.id];
  const afterTextCenter = { x:tt.x + text.size.w/2, y:tt.y + text.size.h/2 };
  const afterDistance = Math.hypot(afterTextCenter.x-bounds.cx, afterTextCenter.y-bounds.cy);
  assert.ok(Math.abs(afterDistance-beforeDistance) < 1e-9);
  assert.equal(tt.rotation, 105);
  assert.equal(ft.rotation, 90);
});

test('rotated bounds account for 90 degree object rotation', () => {
  const p = M.createProject();
  const { design, text } = M.addTextDesign(p, 'A', { w:100, h:40 });
  const pl = p.placements.find(x => x.designId === design.id);
  pl.transforms[text.id] = { x:10, y:20, rotation:90 };
  const b = Ops.getPlacementBounds(p, pl.id);
  assert.ok(Math.abs(b.w - 40) < 1e-9);
  assert.ok(Math.abs(b.h - 100) < 1e-9);
  assert.ok(Math.abs(b.cx - 60) < 1e-9);
  assert.ok(Math.abs(b.cy - 40) < 1e-9);
});

test('shared corner resize preserves the same opposite anchor on every quantity copy', () => {
  const { p, design, frame } = makeSign(2);
  const placements = p.placements.filter(x => x.designId === design.id).sort((a,b)=>a.copy-b.copy);
  placements[0].transforms[frame.id] = { x:20, y:30, rotation:0 };
  placements[1].transforms[frame.id] = { x:300, y:100, rotation:90 };

  const anchorsBefore = placements.map(pl => Ops.getObjectCornerWorld(frame, pl.transforms[frame.id], 'se'));
  Ops.resizeSharedObjectFromCorner(p, design.id, frame.id, 260, 110, 'nw');
  const anchorsAfter = placements.map(pl => Ops.getObjectCornerWorld(frame, pl.transforms[frame.id], 'se'));

  assert.deepEqual(frame.size, { w:260, h:110 });
  almostEqualPoint(anchorsBefore[0], anchorsAfter[0]);
  almostEqualPoint(anchorsBefore[1], anchorsAfter[1]);
  assert.equal(placements[0].transforms[frame.id].rotation, 0);
  assert.equal(placements[1].transforms[frame.id].rotation, 90);
});

test('copyPlacementGeometry preserves internal layout and adds one group offset', () => {
  const { p, design, text, frame } = makeSign(2);
  const [source, target] = p.placements.filter(x => x.designId === design.id).sort((a,b)=>a.copy-b.copy);
  source.transforms[text.id] = { x:80, y:35, rotation:10 };
  source.transforms[frame.id] = { x:50, y:15, rotation:5 };
  Ops.copyPlacementGeometry(p, source.id, target.id, { offsetX:220, offsetY:30 });
  assert.deepEqual(target.transforms[text.id], { x:300, y:65, rotation:10 });
  assert.deepEqual(target.transforms[frame.id], { x:270, y:45, rotation:5 });
});

test('movePlacementBoundsTo preserves internal text-frame offset', () => {
  const { p, design, text, frame } = makeSign();
  const pl = p.placements.find(x => x.designId === design.id);
  pl.transforms[text.id] = { x:70, y:30, rotation:0 };
  pl.transforms[frame.id] = { x:20, y:10, rotation:0 };
  const dxBefore = pl.transforms[text.id].x - pl.transforms[frame.id].x;
  const dyBefore = pl.transforms[text.id].y - pl.transforms[frame.id].y;
  Ops.movePlacementBoundsTo(p, pl.id, 100, 50);
  const b = Ops.getPlacementBounds(p, pl.id);
  assert.equal(b.x, 100);
  assert.equal(b.y, 50);
  assert.equal(pl.transforms[text.id].x - pl.transforms[frame.id].x, dxBefore);
  assert.equal(pl.transforms[text.id].y - pl.transforms[frame.id].y, dyBefore);
});

console.log('\nAll design-ops-v3 tests passed.');


test('V4 edge handles resize only one axis and center-resize keeps center', () => {
  const p = M.createProject();
  const { design, frame } = M.addFrameDesign(p, { w:100,h:60,qty:2 });
  const copies = p.placements.filter(x => x.designId === design.id).sort((a,b)=>a.copy-b.copy);
  const before = copies.map(pl => ({...pl.transforms[frame.id]}));
  Ops.resizeSharedObject(p, design.id, frame.id, 140, 60, 'e');
  assert.strictEqual(frame.size.w, 140); assert.strictEqual(frame.size.h, 60);
  copies.forEach((pl,i)=>assert.strictEqual(pl.transforms[frame.id].x, before[i].x));
  const centers = copies.map(pl => ({x:pl.transforms[frame.id].x+70,y:pl.transforms[frame.id].y+30}));
  Ops.resizeSharedObject(p, design.id, frame.id, 180, 90, 'se', {fromCenter:true});
  copies.forEach((pl,i)=>{ assert.ok(Math.abs((pl.transforms[frame.id].x+90)-centers[i].x)<1e-8); assert.ok(Math.abs((pl.transforms[frame.id].y+45)-centers[i].y)<1e-8); });
});
