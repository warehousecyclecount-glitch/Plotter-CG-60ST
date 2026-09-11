(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StickerModelV3 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA_VERSION = 3;
  const DEFAULT_PAPER = Object.freeze({ w: 680, h: 520 });
  const DEFAULT_LAYOUT = Object.freeze({ margin: 10, gap: 5 });

  const deepClone = value => JSON.parse(JSON.stringify(value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const positive = (value, fallback = 1) => Math.max(0.001, finite(value, fallback));
  const nonNegative = (value, fallback = 0) => Math.max(0, finite(value, fallback));
  const integer = (value, fallback = 1) => Math.max(1, Math.floor(finite(value, fallback)));

  function createProject(options = {}) {
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: {
        name: String(options.name || 'Untitled'),
        createdAt: options.createdAt || new Date().toISOString(),
        updatedAt: options.updatedAt || new Date().toISOString()
      },
      unit: options.unit === 'cm' ? 'cm' : 'mm',
      paper: {
        w: positive(options.paper?.w, DEFAULT_PAPER.w),
        h: positive(options.paper?.h, DEFAULT_PAPER.h)
      },
      layout: {
        margin: nonNegative(options.layout?.margin, DEFAULT_LAYOUT.margin),
        gap: nonNegative(options.layout?.gap, DEFAULT_LAYOUT.gap)
      },
      workspace: {
        guides: { x: [], y: [] }
      },
      objects: [],
      designs: [],
      placements: [],
      counters: { design: 0, object: 0, placement: 0 }
    };
  }

  function nextId(project, kind) {
    if (!project.counters) project.counters = { design: 0, object: 0, placement: 0 };
    project.counters[kind] = (project.counters[kind] || 0) + 1;
    const prefix = kind === 'design' ? 'design' : kind === 'placement' ? 'pl' : 'obj';
    return `${prefix}-${project.counters[kind]}`;
  }

  function touch(project) {
    if (!project.meta) project.meta = { name: 'Untitled' };
    project.meta.updatedAt = new Date().toISOString();
  }

  function getDesign(project, id) {
    return project.designs.find(d => d.id === id) || null;
  }

  function getObject(project, id) {
    return project.objects.find(o => o.id === id) || null;
  }

  function getPlacement(project, id) {
    return project.placements.find(p => p.id === id) || null;
  }

  function getObjectsForDesign(project, designId) {
    const design = getDesign(project, designId);
    if (!design) return [];
    const ids = new Set(design.objectIds || []);
    return project.objects.filter(o => ids.has(o.id));
  }

  function getTextObject(project, designId) {
    return getObjectsForDesign(project, designId).find(o => o.type === 'text') || null;
  }

  function getFrameObject(project, designId) {
    return getObjectsForDesign(project, designId).find(o => o.type === 'frame') || null;
  }

  function createTextObject(project, options = {}) {
    const object = {
      id: options.id || nextId(project, 'object'),
      type: 'text',
      name: String(options.name || options.text || 'ข้อความ'),
      text: String(options.text ?? 'ข้อความ'),
      font: {
        family: String(options.font?.family || options.fontFamily || 'Arial'),
        weight: String(options.font?.weight || options.fontWeight || '700')
      },
      size: {
        w: positive(options.size?.w ?? options.w, 100),
        h: positive(options.size?.h ?? options.h, 50)
      },
      visible: options.visible !== false,
      locked: options.locked === true,
      aspectLocked: options.aspectLocked === true,
      legacyId: options.legacyId || null
    };
    project.objects.push(object);
    touch(project);
    return object;
  }

  function createFrameObject(project, options = {}) {
    const object = {
      id: options.id || nextId(project, 'object'),
      type: 'frame',
      name: String(options.name || 'กรอบ'),
      size: {
        w: positive(options.size?.w ?? options.w, 120),
        h: positive(options.size?.h ?? options.h, 70)
      },
      visible: options.visible !== false,
      locked: options.locked === true,
      aspectLocked: options.aspectLocked === true,
      legacyId: options.legacyId || null
    };
    project.objects.push(object);
    touch(project);
    return object;
  }

  function createDesign(project, options = {}) {
    const design = {
      id: options.id || nextId(project, 'design'),
      name: String(options.name || 'ชุดงาน'),
      objectIds: Array.from(new Set(options.objectIds || [])),
      qty: integer(options.qty, 1),
      padding: {
        x: nonNegative(options.padding?.x ?? options.padX, 5),
        y: nonNegative(options.padding?.y ?? options.padY, 5)
      },
      visible: options.visible !== false,
      locked: options.locked === true,
      legacyId: options.legacyId || null
    };
    project.designs.push(design);
    touch(project);
    return design;
  }

  function attachObject(project, designId, objectId) {
    const design = getDesign(project, designId);
    const object = getObject(project, objectId);
    if (!design) throw new Error(`Unknown design: ${designId}`);
    if (!object) throw new Error(`Unknown object: ${objectId}`);
    if (!design.objectIds.includes(objectId)) design.objectIds.push(objectId);
    touch(project);
    return design;
  }

  function addTextDesign(project, text = 'ข้อความ', options = {}) {
    const object = createTextObject(project, { ...options, text });
    const design = createDesign(project, {
      name: options.designName || String(text || 'ข้อความ'),
      objectIds: [object.id],
      qty: options.qty,
      padding: options.padding,
      legacyId: options.legacyId
    });
    ensurePlacements(project, design.id);
    return { design, text: object };
  }

  function addFrameDesign(project, options = {}) {
    const frame = createFrameObject(project, options);
    const design = createDesign(project, {
      name: options.designName || 'กรอบ',
      objectIds: [frame.id],
      qty: options.qty,
      padding: options.padding,
      legacyId: options.legacyId
    });
    ensurePlacements(project, design.id);
    return { design, frame };
  }

  function addFrameToDesign(project, designId, options = {}) {
    const design = getDesign(project, designId);
    if (!design) throw new Error(`Unknown design: ${designId}`);
    const existing = getFrameObject(project, designId);
    if (existing) return existing;
    const text = getTextObject(project, designId);
    const padX = nonNegative(options.padX ?? design.padding?.x, 5);
    const padY = nonNegative(options.padY ?? design.padding?.y, 5);
    design.padding = { x: padX, y: padY };
    const frame = createFrameObject(project, {
      w: options.w ?? (text ? text.size.w + padX * 2 : 120),
      h: options.h ?? (text ? text.size.h + padY * 2 : 70),
      name: options.name || 'กรอบ'
    });
    attachObject(project, designId, frame.id);
    ensurePlacements(project, designId);

    if (text) {
      project.placements.filter(p => p.designId === designId).forEach(p => {
        const textT = ensureTransform(p, text.id);
        p.transforms[frame.id] = {
          x: finite(options.x, textT.x - padX),
          y: finite(options.y, textT.y - padY),
          rotation: finite(options.rotation, 0)
        };
      });
    }
    touch(project);
    return frame;
  }

  function removeObject(project, objectId) {
    project.objects = project.objects.filter(o => o.id !== objectId);
    project.designs.forEach(d => { d.objectIds = d.objectIds.filter(id => id !== objectId); });
    project.placements.forEach(p => { if (p.transforms) delete p.transforms[objectId]; });
    touch(project);
  }

  function removeDesign(project, designId) {
    const design = getDesign(project, designId);
    if (!design) return false;
    const ids = new Set(design.objectIds || []);
    project.designs = project.designs.filter(d => d.id !== designId);
    project.objects = project.objects.filter(o => !ids.has(o.id));
    project.placements = project.placements.filter(p => p.designId !== designId);
    touch(project);
    return true;
  }

  function defaultTransform(index, object, design) {
    const baseX = 20 + (index % 4) * 45;
    const baseY = 20 + Math.floor(index / 4) * 45;
    if (object.type === 'frame') {
      return { x: baseX - (design.padding?.x || 5), y: baseY - (design.padding?.y || 5), rotation: 0 };
    }
    return { x: baseX, y: baseY, rotation: 0 };
  }

  function ensureTransform(placement, objectId, fallback = { x: 0, y: 0, rotation: 0 }) {
    if (!placement.transforms) placement.transforms = {};
    if (!placement.transforms[objectId]) placement.transforms[objectId] = deepClone(fallback);
    const t = placement.transforms[objectId];
    t.x = finite(t.x, fallback.x || 0);
    t.y = finite(t.y, fallback.y || 0);
    t.rotation = finite(t.rotation, fallback.rotation || 0);
    return t;
  }

  function ensurePlacements(project, onlyDesignId = null) {
    const existing = new Map(project.placements.map(p => [`${p.designId}:${p.copy}`, p]));
    const next = [];
    let globalIndex = 0;

    project.designs.forEach(design => {
      const shouldRebuild = !onlyDesignId || design.id === onlyDesignId;
      if (!shouldRebuild) {
        const kept = project.placements.filter(p => p.designId === design.id);
        kept.forEach(p => next.push(p));
        globalIndex += kept.length;
        return;
      }

      const objects = getObjectsForDesign(project, design.id);
      for (let copy = 0; copy < design.qty; copy += 1) {
        const key = `${design.id}:${copy}`;
        let placement = existing.get(key);
        if (!placement) {
          placement = {
            id: nextId(project, 'placement'),
            designId: design.id,
            copy,
            locked: false,
            transforms: {}
          };
        }
        placement.copy = copy;
        placement.designId = design.id;
        objects.forEach(object => ensureTransform(placement, object.id, defaultTransform(globalIndex, object, design)));
        Object.keys(placement.transforms || {}).forEach(objectId => {
          if (!design.objectIds.includes(objectId)) delete placement.transforms[objectId];
        });
        next.push(placement);
        globalIndex += 1;
      }
    });

    if (onlyDesignId) {
      const untouched = project.placements.filter(p => p.designId !== onlyDesignId);
      project.placements = untouched.concat(next.filter(p => p.designId === onlyDesignId));
    } else {
      project.placements = next;
    }
    touch(project);
    return project.placements;
  }

  function setQuantity(project, designId, qty) {
    const design = getDesign(project, designId);
    if (!design) throw new Error(`Unknown design: ${designId}`);
    design.qty = integer(qty, 1);
    ensurePlacements(project, designId);
    return design.qty;
  }

  function fitFrameToText(project, designId) {
    const design = getDesign(project, designId);
    const text = getTextObject(project, designId);
    let frame = getFrameObject(project, designId);
    if (!design) throw new Error(`Unknown design: ${designId}`);
    if (!text) throw new Error(`Design ${designId} has no text object`);
    if (!frame) frame = addFrameToDesign(project, designId);
    frame.size.w = text.size.w + design.padding.x * 2;
    frame.size.h = text.size.h + design.padding.y * 2;
    project.placements.filter(p => p.designId === designId).forEach(p => {
      const textT = ensureTransform(p, text.id);
      const frameT = ensureTransform(p, frame.id);
      frameT.x = textT.x - design.padding.x;
      frameT.y = textT.y - design.padding.y;
    });
    touch(project);
    return frame;
  }

  function cloneDesign(project, designId, options = {}) {
    const source = getDesign(project, designId);
    if (!source) throw new Error(`Unknown design: ${designId}`);
    const sourceObjects = getObjectsForDesign(project, designId);
    const idMap = new Map();
    const clonedObjects = sourceObjects.map(object => {
      const copy = deepClone(object);
      copy.id = nextId(project, 'object');
      copy.legacyId = null;
      project.objects.push(copy);
      idMap.set(object.id, copy.id);
      return copy;
    });
    const clone = createDesign(project, {
      name: options.name || `${source.name} copy`,
      objectIds: clonedObjects.map(o => o.id),
      qty: options.qty || 1,
      padding: deepClone(source.padding)
    });
    ensurePlacements(project, clone.id);

    const sourcePlacement = project.placements.find(p => p.designId === source.id);
    const clonePlacement = project.placements.find(p => p.designId === clone.id);
    if (sourcePlacement && clonePlacement) {
      sourceObjects.forEach(sourceObject => {
        const sourceT = sourcePlacement.transforms[sourceObject.id];
        const cloneObjectId = idMap.get(sourceObject.id);
        if (sourceT && cloneObjectId) {
          clonePlacement.transforms[cloneObjectId] = {
            x: sourceT.x + finite(options.offsetX, 10),
            y: sourceT.y + finite(options.offsetY, 10),
            rotation: sourceT.rotation
          };
        }
      });
    }
    touch(project);
    return clone;
  }

  function migrateLegacyState(legacy = {}) {
    const project = createProject({
      name: legacy.name || 'Migrated V2 project',
      unit: legacy.unit,
      paper: legacy.paper,
      layout: { margin: legacy.margin, gap: legacy.gap }
    });

    const itemToDesign = new Map();
    const partIds = new Map();

    (legacy.items || []).forEach(item => {
      const text = createTextObject(project, {
        text: item.text,
        fontFamily: item.font,
        fontWeight: item.weight,
        w: item.w,
        h: item.h,
        visible: item.visible,
        legacyId: item.id
      });
      const objectIds = [text.id];
      let frame = null;
      if (item.frame) {
        frame = createFrameObject(project, {
          w: item.frameW || positive(item.w, 1) + nonNegative(item.padX, 5) * 2,
          h: item.frameH || positive(item.h, 1) + nonNegative(item.padY, 5) * 2,
          visible: item.visible,
          legacyId: item.id
        });
        objectIds.push(frame.id);
      }
      const design = createDesign(project, {
        name: item.text || 'ข้อความ',
        objectIds,
        qty: item.qty,
        padding: { x: item.padX, y: item.padY },
        visible: item.visible,
        legacyId: item.id
      });
      itemToDesign.set(item.id, design.id);
      partIds.set(item.id, { textId: text.id, frameId: frame?.id || null });
    });

    project.placements = [];
    (legacy.placements || []).forEach(old => {
      const designId = itemToDesign.get(old.itemId);
      if (!designId) return;
      const ids = partIds.get(old.itemId);
      const placement = {
        id: old.id || nextId(project, 'placement'),
        designId,
        copy: Math.max(0, Math.floor(finite(old.copy, 0))),
        locked: false,
        transforms: {}
      };
      placement.transforms[ids.textId] = {
        x: finite(old.textX, 0),
        y: finite(old.textY, 0),
        rotation: finite(old.rotation, 0)
      };
      if (ids.frameId) {
        placement.transforms[ids.frameId] = {
          x: finite(old.frameX, 0),
          y: finite(old.frameY, 0),
          rotation: finite(old.frameRotation, 0)
        };
      }
      project.placements.push(placement);
    });

    ensurePlacements(project);
    touch(project);
    return project;
  }

  function toLegacyState(project) {
    const items = [];
    const placements = [];

    project.designs.forEach(design => {
      const text = getTextObject(project, design.id);
      const frame = getFrameObject(project, design.id);
      if (!text) return;
      const legacyId = design.legacyId || design.id;
      items.push({
        id: legacyId,
        text: text.text,
        font: text.font.family,
        weight: text.font.weight,
        w: text.size.w,
        h: text.size.h,
        qty: design.qty,
        frame: !!frame,
        frameW: frame?.size.w ?? null,
        frameH: frame?.size.h ?? null,
        padX: design.padding.x,
        padY: design.padding.y,
        visible: design.visible !== false && text.visible !== false
      });

      project.placements.filter(p => p.designId === design.id).forEach(p => {
        const textT = ensureTransform(p, text.id);
        const frameT = frame ? ensureTransform(p, frame.id) : { x: textT.x - design.padding.x, y: textT.y - design.padding.y, rotation: 0 };
        placements.push({
          id: p.id,
          itemId: legacyId,
          copy: p.copy,
          textX: textT.x,
          textY: textT.y,
          frameX: frameT.x,
          frameY: frameT.y,
          rotation: textT.rotation
        });
      });
    });

    return {
      unit: project.unit,
      paper: deepClone(project.paper),
      margin: project.layout.margin,
      gap: project.layout.gap,
      items,
      placements
    };
  }

  function validateProject(project) {
    const errors = [];
    const warnings = [];
    if (!project || typeof project !== 'object') return { ok: false, errors: ['Project is not an object'], warnings };
    if (project.schemaVersion !== SCHEMA_VERSION) errors.push(`Unsupported schemaVersion: ${project.schemaVersion}`);
    if (!project.paper || finite(project.paper.w) <= 0 || finite(project.paper.h) <= 0) errors.push('Paper dimensions must be greater than zero');

    const objectIds = new Set();
    (project.objects || []).forEach(object => {
      if (!object.id) errors.push('Object without id');
      if (objectIds.has(object.id)) errors.push(`Duplicate object id: ${object.id}`);
      objectIds.add(object.id);
      if (!['text', 'frame'].includes(object.type)) errors.push(`Unsupported object type: ${object.type}`);
      if (!object.size || finite(object.size.w) <= 0 || finite(object.size.h) <= 0) errors.push(`Invalid size for object: ${object.id}`);
    });

    const designIds = new Set();
    (project.designs || []).forEach(design => {
      if (!design.id) errors.push('Design without id');
      if (designIds.has(design.id)) errors.push(`Duplicate design id: ${design.id}`);
      designIds.add(design.id);
      if (!Array.isArray(design.objectIds) || design.objectIds.length === 0) warnings.push(`Design ${design.id} has no objects`);
      (design.objectIds || []).forEach(id => { if (!objectIds.has(id)) errors.push(`Design ${design.id} references missing object ${id}`); });
      if (finite(design.qty) < 1) errors.push(`Design ${design.id} has invalid quantity`);
    });

    const placementKeys = new Set();
    (project.placements || []).forEach(placement => {
      if (!designIds.has(placement.designId)) errors.push(`Placement ${placement.id} references missing design ${placement.designId}`);
      const key = `${placement.designId}:${placement.copy}`;
      if (placementKeys.has(key)) errors.push(`Duplicate placement copy: ${key}`);
      placementKeys.add(key);
      const design = getDesign(project, placement.designId);
      if (design) {
        (design.objectIds || []).forEach(objectId => {
          if (!placement.transforms || !placement.transforms[objectId]) errors.push(`Placement ${placement.id} missing transform for ${objectId}`);
        });
      }
    });

    return { ok: errors.length === 0, errors, warnings };
  }

  function serializeProject(project, pretty = true) {
    const validation = validateProject(project);
    if (!validation.ok) throw new Error(`Project validation failed: ${validation.errors.join('; ')}`);
    const copy = deepClone(project);
    copy.meta.updatedAt = new Date().toISOString();
    return JSON.stringify(copy, null, pretty ? 2 : 0);
  }

  function parseProject(json) {
    const project = typeof json === 'string' ? JSON.parse(json) : deepClone(json);
    project.workspace ||= { guides:{ x:[], y:[] } };
    project.workspace.guides ||= { x:[], y:[] };
    if (!Array.isArray(project.workspace.guides.x)) project.workspace.guides.x = [];
    if (!Array.isArray(project.workspace.guides.y)) project.workspace.guides.y = [];
    (project.objects || []).forEach(o => { o.locked = o.locked === true; o.aspectLocked = o.aspectLocked === true; });
    (project.designs || []).forEach(d => { d.locked = d.locked === true; });
    (project.placements || []).forEach(p => { p.locked = p.locked === true; });
    const validation = validateProject(project);
    if (!validation.ok) throw new Error(`Project validation failed: ${validation.errors.join('; ')}`);
    return project;
  }

  return Object.freeze({
    SCHEMA_VERSION,
    createProject,
    createTextObject,
    createFrameObject,
    createDesign,
    addTextDesign,
    addFrameDesign,
    addFrameToDesign,
    attachObject,
    removeObject,
    removeDesign,
    getDesign,
    getObject,
    getPlacement,
    getObjectsForDesign,
    getTextObject,
    getFrameObject,
    ensureTransform,
    ensurePlacements,
    setQuantity,
    fitFrameToText,
    cloneDesign,
    migrateLegacyState,
    toLegacyState,
    validateProject,
    serializeProject,
    parseProject,
    deepClone
  });
});
