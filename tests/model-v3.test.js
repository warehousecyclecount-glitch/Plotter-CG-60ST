'use strict';
const assert = require('node:assert/strict');
const M = require('../js/model-v3.js');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const legacy = {
  unit: 'mm', paper: { w: 600, h: 300 }, margin: 10, gap: 5,
  items: [
    { id:'item-1', text:'WAREHOUSE', font:'Arial', weight:'700', w:200, h:50, qty:2, frame:true, frameW:220, frameH:70, padX:10, padY:10, visible:true },
    { id:'item-2', text:'EXIT', font:'Tahoma', weight:'400', w:70, h:30, qty:1, frame:false, frameW:null, frameH:null, padX:5, padY:5, visible:true }
  ],
  placements: [
    { id:'pl-item-1-0', itemId:'item-1', copy:0, textX:20, textY:20, frameX:10, frameY:10, rotation:15 },
    { id:'pl-item-1-1', itemId:'item-1', copy:1, textX:250, textY:20, frameX:240, frameY:10, rotation:0 },
    { id:'pl-item-2-0', itemId:'item-2', copy:0, textX:20, textY:120, frameX:15, frameY:115, rotation:90 }
  ]
};

test('schema version and project defaults', () => {
  const p = M.createProject();
  assert.equal(p.schemaVersion, 3);
  assert.deepEqual(p.paper, { w:600, h:300 });
});

test('legacy migration preserves paper and layout', () => {
  const p = M.migrateLegacyState(legacy);
  assert.deepEqual(p.paper, legacy.paper);
  assert.equal(p.layout.margin, 10);
  assert.equal(p.layout.gap, 5);
  assert.equal(M.validateProject(p).ok, true);
});

test('legacy text + frame becomes separate objects in one design', () => {
  const p = M.migrateLegacyState(legacy);
  const d = p.designs.find(x => x.legacyId === 'item-1');
  assert.ok(d);
  assert.equal(M.getObjectsForDesign(p, d.id).length, 2);
  assert.equal(M.getTextObject(p, d.id).type, 'text');
  assert.equal(M.getFrameObject(p, d.id).type, 'frame');
  assert.deepEqual(M.getFrameObject(p, d.id).size, { w:220, h:70 });
});

test('legacy roundtrip preserves editable V2 geometry', () => {
  const p = M.migrateLegacyState(legacy);
  const roundtrip = M.toLegacyState(p);
  assert.equal(roundtrip.items.length, legacy.items.length);
  assert.equal(roundtrip.placements.length, legacy.placements.length);
  const a = roundtrip.placements.find(x => x.id === 'pl-item-1-0');
  assert.equal(a.textX, 20);
  assert.equal(a.textY, 20);
  assert.equal(a.frameX, 10);
  assert.equal(a.frameY, 10);
  assert.equal(a.rotation, 15);
});

test('frame-only design is valid and receives placements', () => {
  const p = M.createProject();
  const { design, frame } = M.addFrameDesign(p, { w:300, h:80, qty:3 });
  assert.equal(M.getTextObject(p, design.id), null);
  assert.equal(frame.size.w, 300);
  assert.equal(frame.size.h, 80);
  assert.equal(p.placements.filter(x => x.designId === design.id).length, 3);
  assert.equal(M.validateProject(p).ok, true);
});

test('text design can receive a frame later', () => {
  const p = M.createProject();
  const { design, text } = M.addTextDesign(p, 'STORAGE', { w:180, h:40, padding:{x:8,y:6} });
  const frame = M.addFrameToDesign(p, design.id);
  assert.equal(frame.size.w, text.size.w + 16);
  assert.equal(frame.size.h, text.size.h + 12);
  assert.equal(M.getObjectsForDesign(p, design.id).length, 2);
});

test('quantity rebuild preserves existing placement transforms', () => {
  const p = M.createProject();
  const { design, text } = M.addTextDesign(p, 'A', { qty:1 });
  const first = p.placements.find(x => x.designId === design.id);
  first.transforms[text.id].x = 123;
  first.transforms[text.id].y = 45;
  M.setQuantity(p, design.id, 3);
  const again = p.placements.find(x => x.designId === design.id && x.copy === 0);
  assert.equal(again.transforms[text.id].x, 123);
  assert.equal(again.transforms[text.id].y, 45);
  assert.equal(p.placements.filter(x => x.designId === design.id).length, 3);
});

test('validation rejects broken object references', () => {
  const p = M.createProject();
  const d = M.createDesign(p, { objectIds:['missing'], qty:1 });
  M.ensurePlacements(p, d.id);
  const result = M.validateProject(p);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(x => x.includes('missing object')));
});

console.log('\nAll model-v3 tests passed.');
