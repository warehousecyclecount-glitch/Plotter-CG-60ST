(function (root, factory) {
  'use strict';
  const model = typeof module === 'object' && module.exports
    ? require('./model-v3.js')
    : root?.StickerModelV3;
  const api = factory(model);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StickerDesignOpsV3 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M) {
  'use strict';
  if (!M) throw new Error('StickerModelV3 is required by StickerDesignOpsV3');

  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const rad = degrees => finite(degrees) * Math.PI / 180;
  const normalizeRotation = degrees => ((finite(degrees) % 360) + 360) % 360;

  function markUpdated(project) {
    if (project?.meta) project.meta.updatedAt = new Date().toISOString();
  }

  function placementAndDesign(project, placementId) {
    const placement = M.getPlacement(project, placementId);
    if (!placement) throw new Error(`Unknown placement: ${placementId}`);
    const design = M.getDesign(project, placement.designId);
    if (!design) throw new Error(`Unknown design for placement: ${placementId}`);
    return { placement, design };
  }

  function rotatedObjectBounds(object, transform) {
    const w = finite(object?.size?.w);
    const h = finite(object?.size?.h);
    const x = finite(transform?.x);
    const y = finite(transform?.y);
    const angle = rad(transform?.rotation);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const c = Math.abs(Math.cos(angle));
    const s = Math.abs(Math.sin(angle));
    const halfW = c * w / 2 + s * h / 2;
    const halfH = s * w / 2 + c * h / 2;
    return { x: cx - halfW, y: cy - halfH, w: halfW * 2, h: halfH * 2 };
  }

  function handleLocal(w, h, handle) {
    const map = {
      nw:{x:0,y:0}, n:{x:w/2,y:0}, ne:{x:w,y:0},
      e:{x:w,y:h/2}, se:{x:w,y:h}, s:{x:w/2,y:h},
      sw:{x:0,y:h}, w:{x:0,y:h/2}
    };
    return map[handle] || map.se;
  }

  function oppositeHandle(handle) {
    return ({ nw:'se', n:'s', ne:'sw', e:'w', se:'nw', s:'n', sw:'ne', w:'e' })[handle] || 'nw';
  }

  function getObjectHandleWorld(object, transform, handle) {
    const w = finite(object?.size?.w);
    const h = finite(object?.size?.h);
    const x = finite(transform?.x);
    const y = finite(transform?.y);
    const local = handleLocal(w, h, handle);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const dx = local.x - w / 2;
    const dy = local.y - h / 2;
    const a = rad(transform?.rotation);
    return {
      x: cx + dx * Math.cos(a) - dy * Math.sin(a),
      y: cy + dx * Math.sin(a) + dy * Math.cos(a)
    };
  }

  function getObjectCornerWorld(object, transform, corner) {
    return getObjectHandleWorld(object, transform, corner);
  }

  function topLeftForFixedHandle(worldPoint, newW, newH, rotation, fixedHandle) {
    const local = handleLocal(newW, newH, fixedHandle);
    const dx = local.x - newW / 2;
    const dy = local.y - newH / 2;
    const a = rad(rotation);
    const rotatedX = dx * Math.cos(a) - dy * Math.sin(a);
    const rotatedY = dx * Math.sin(a) + dy * Math.cos(a);
    const cx = worldPoint.x - rotatedX;
    const cy = worldPoint.y - rotatedY;
    return { x:cx-newW/2, y:cy-newH/2 };
  }

  function getPlacementBounds(project, placementId) {
    const { placement, design } = placementAndDesign(project, placementId);
    const objects = M.getObjectsForDesign(project, design.id).filter(o => o.visible !== false);
    if (!objects.length) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(object => {
      const transform = M.ensureTransform(placement, object.id, { x:0, y:0, rotation:0 });
      const b = rotatedObjectBounds(object, transform);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    });
    return { x:minX, y:minY, w:maxX-minX, h:maxY-minY, cx:(minX+maxX)/2, cy:(minY+maxY)/2 };
  }

  function translatePlacement(project, placementId, dx, dy) {
    const { placement, design } = placementAndDesign(project, placementId);
    const moveX = finite(dx);
    const moveY = finite(dy);
    M.getObjectsForDesign(project, design.id).forEach(object => {
      const t = M.ensureTransform(placement, object.id, { x:0, y:0, rotation:0 });
      t.x += moveX;
      t.y += moveY;
    });
    markUpdated(project);
    return placement;
  }

  function movePlacementBoundsTo(project, placementId, x, y) {
    const bounds = getPlacementBounds(project, placementId);
    if (!bounds) return null;
    translatePlacement(project, placementId, finite(x) - bounds.x, finite(y) - bounds.y);
    return getPlacementBounds(project, placementId);
  }

  function rotatePlacement(project, placementId, deltaDegrees, options = {}) {
    const { placement, design } = placementAndDesign(project, placementId);
    const delta = finite(deltaDegrees);
    const bounds = getPlacementBounds(project, placementId);
    if (!bounds) return placement;
    const centerX = finite(options.cx, bounds.cx);
    const centerY = finite(options.cy, bounds.cy);
    const a = rad(delta);
    const cos = Math.cos(a);
    const sin = Math.sin(a);

    M.getObjectsForDesign(project, design.id).forEach(object => {
      const t = M.ensureTransform(placement, object.id, { x:0, y:0, rotation:0 });
      const objectCx = t.x + object.size.w / 2;
      const objectCy = t.y + object.size.h / 2;
      const dx = objectCx - centerX;
      const dy = objectCy - centerY;
      const nextCx = centerX + dx * cos - dy * sin;
      const nextCy = centerY + dx * sin + dy * cos;
      t.x = nextCx - object.size.w / 2;
      t.y = nextCy - object.size.h / 2;
      t.rotation = normalizeRotation(t.rotation + delta);
    });
    markUpdated(project);
    return placement;
  }

  function resizeSharedObject(project, designId, objectId, newWidth, newHeight, draggedHandle, options = {}) {
    const design = M.getDesign(project, designId);
    const object = M.getObject(project, objectId);
    if (!design) throw new Error(`Unknown design: ${designId}`);
    if (!object || !design.objectIds.includes(objectId)) throw new Error(`Object ${objectId} does not belong to design ${designId}`);
    const handles = ['nw','n','ne','e','se','s','sw','w'];
    if (!handles.includes(draggedHandle)) throw new Error(`Unsupported resize handle: ${draggedHandle}`);

    const newW = Math.max(0.001, finite(newWidth, object.size.w));
    const newH = Math.max(0.001, finite(newHeight, object.size.h));
    const fromCenter = options.fromCenter === true;
    const fixedHandle = oppositeHandle(draggedHandle);
    const placements = project.placements.filter(p => p.designId === designId);
    const anchors = placements.map(placement => {
      const t = M.ensureTransform(placement, object.id, { x:0, y:0, rotation:0 });
      return {
        placement,
        rotation: normalizeRotation(t.rotation),
        center:{ x:t.x + object.size.w/2, y:t.y + object.size.h/2 },
        world: getObjectHandleWorld(object, t, fixedHandle)
      };
    });

    object.size.w = newW;
    object.size.h = newH;
    anchors.forEach(({ placement, rotation, center, world }) => {
      const t = M.ensureTransform(placement, object.id, { x:0, y:0, rotation });
      if (fromCenter) {
        t.x = center.x - newW/2;
        t.y = center.y - newH/2;
      } else {
        const topLeft = topLeftForFixedHandle(world, newW, newH, rotation, fixedHandle);
        t.x = topLeft.x;
        t.y = topLeft.y;
      }
      t.rotation = rotation;
    });
    markUpdated(project);
    return object;
  }

  function resizeSharedObjectFromCorner(project, designId, objectId, newWidth, newHeight, draggedCorner) {
    return resizeSharedObject(project, designId, objectId, newWidth, newHeight, draggedCorner, { fromCenter:false });
  }

  function copyPlacementGeometry(project, sourcePlacementId, targetPlacementId, options = {}) {
    const source = M.getPlacement(project, sourcePlacementId);
    const target = M.getPlacement(project, targetPlacementId);
    if (!source) throw new Error(`Unknown source placement: ${sourcePlacementId}`);
    if (!target) throw new Error(`Unknown target placement: ${targetPlacementId}`);
    if (source.designId !== target.designId) throw new Error('Placement geometry can only be copied within the same design');

    const design = M.getDesign(project, source.designId);
    const offsetX = finite(options.offsetX);
    const offsetY = finite(options.offsetY);
    M.getObjectsForDesign(project, design.id).forEach(object => {
      const sourceT = M.ensureTransform(source, object.id, { x:0, y:0, rotation:0 });
      target.transforms[object.id] = {
        x: sourceT.x + offsetX,
        y: sourceT.y + offsetY,
        rotation: normalizeRotation(sourceT.rotation)
      };
    });
    markUpdated(project);
    return target;
  }

  function centerTextInFrame(project, designId, options = {}) {
    const design = M.getDesign(project, designId);
    if (!design) throw new Error(`Unknown design: ${designId}`);
    const text = M.getTextObject(project, designId);
    const frame = M.getFrameObject(project, designId);
    if (!text || !frame) throw new Error(`Design ${designId} must contain both text and frame`);

    const placements = options.placementId
      ? [M.getPlacement(project, options.placementId)].filter(Boolean)
      : project.placements.filter(p => p.designId === designId);

    placements.forEach(placement => {
      if (placement.designId !== designId) throw new Error('placementId does not belong to design');
      const frameT = M.ensureTransform(placement, frame.id, { x:0, y:0, rotation:0 });
      const textT = M.ensureTransform(placement, text.id, { x:0, y:0, rotation:0 });
      textT.x = frameT.x + (frame.size.w - text.size.w) / 2;
      textT.y = frameT.y + (frame.size.h - text.size.h) / 2;
      if (options.matchRotation !== false) textT.rotation = normalizeRotation(frameT.rotation);
    });
    markUpdated(project);
    return placements;
  }

  return Object.freeze({
    rotatedObjectBounds,
    getObjectCornerWorld,
    getObjectHandleWorld,
    getPlacementBounds,
    translatePlacement,
    movePlacementBoundsTo,
    rotatePlacement,
    resizeSharedObject,
    resizeSharedObjectFromCorner,
    copyPlacementGeometry,
    centerTextInFrame,
    normalizeRotation
  });
});
