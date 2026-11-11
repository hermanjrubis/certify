/**
 * Layer and Project data model (pure functions).
 */

export const SIZE_STEPS = [0.45, 0.55, 0.65, 0.75, 0.85];

export function createId() {
  return 'L' + Math.random().toString(36).slice(2, 9);
}

export function createNameLayer(column = 'Name') {
  return {
    id: createId(),
    type: 'text',
    name: 'Recipient name',
    text: `{${column}}`,
    font: 'Great Vibes',
    color: '#1F2A1B',
    align: 'center',
    autoFit: true,
    sizePct: 0.75,
    xPct: 20,
    yPct: 45,
    wPct: 60,
    hPct: 15
  };
}

export function createTextLayer(overrides = {}) {
  return {
    id: createId(),
    type: 'text',
    name: 'Text',
    text: 'Your text',
    font: 'EB Garamond',
    color: '#1F2A1B',
    align: 'center',
    autoFit: true,
    sizePct: 0.75,
    xPct: 25,
    yPct: 62,
    wPct: 50,
    hPct: 7,
    ...overrides
  };
}

export function createImageLayer({ src, naturalWidth, naturalHeight }, templateAspect = 1.414, overrides = {}) {
  const wPct = 20;
  const hPct = 20 * (naturalHeight / naturalWidth) * templateAspect;
  return {
    id: createId(),
    type: 'image',
    name: 'Image',
    src,
    naturalWidth,
    naturalHeight,
    opacity: 1,
    keepAspect: true,
    xPct: (100 - wPct) / 2,
    yPct: (100 - hPct) / 2,
    wPct,
    hPct,
    ...overrides
  };
}

export function createShapeLayer(shape = 'line', overrides = {}) {
  const base = {
    id: createId(),
    type: 'shape',
    shape,
    stroke: '#C8A24A',
    fill: null,
    strokeWidthPct: 0.3
  };

  let specific = {};
  if (shape === 'line') {
    specific = {
      name: 'Line',
      xPct: 20,
      yPct: 55,
      wPct: 60,
      hPct: 2
    };
  } else if (shape === 'rect') {
    specific = {
      name: 'Box',
      xPct: 30,
      yPct: 30,
      wPct: 40,
      hPct: 30
    };
  } else if (shape === 'ellipse') {
    specific = {
      name: 'Circle',
      xPct: 40,
      yPct: 35,
      wPct: 20,
      hPct: 28
    };
  } else {
    specific = {
      name: 'Shape',
      xPct: 25,
      yPct: 25,
      wPct: 50,
      hPct: 50
    };
  }

  return {
    ...base,
    ...specific,
    ...overrides
  };
}

export function addLayer(layers, layer) {
  return [...layers, layer];
}

export function removeLayer(layers, id) {
  return layers.filter(layer => layer.id !== id);
}

export function updateLayer(layers, id, patch) {
  return layers.map(layer => layer.id === id ? { ...layer, ...patch } : layer);
}

export function moveLayer(layers, id, delta) {
  const idx = layers.findIndex(layer => layer.id === id);
  if (idx === -1) return [...layers];

  const targetIdx = idx + delta;
  if (targetIdx < 0 || targetIdx >= layers.length) return [...layers];

  const result = [...layers];
  const item = result.splice(idx, 1)[0];
  result.splice(targetIdx, 0, item);
  return result;
}

export function duplicateLayer(layers, id) {
  const idx = layers.findIndex(layer => layer.id === id);
  if (idx === -1) return { layers: [...layers], newId: null };

  const orig = layers[idx];
  const newId = createId();
  const copy = {
    ...orig,
    id: newId,
    name: `${orig.name} copy`,
    xPct: orig.xPct + 2,
    yPct: orig.yPct + 2
  };

  const newLayers = [...layers];
  newLayers.splice(idx + 1, 0, copy);
  return { layers: newLayers, newId };
}

export function createDefaultProject() {
  return {
    version: 2,
    title: 'Untitled batch',
    hasCustomTitle: false,
    template: null,
    layers: [createNameLayer()],
    recipients: {
      columns: ['Name'],
      rows: [],
      source: 'paste',
      fileName: null
    }
  };
}

export function migrateProject(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const def = createDefaultProject();

  if (raw.version === 2) {
    return {
      version: 2,
      title: typeof raw.title === 'string' ? raw.title : def.title,
      hasCustomTitle: typeof raw.hasCustomTitle === 'boolean' ? raw.hasCustomTitle : false,
      template: raw.template || null,
      layers: Array.isArray(raw.layers) ? raw.layers : def.layers,
      recipients: {
        columns: Array.isArray(raw.recipients?.columns) ? raw.recipients.columns : def.recipients.columns,
        rows: Array.isArray(raw.recipients?.rows) ? raw.recipients.rows : def.recipients.rows,
        source: raw.recipients?.source || def.recipients.source,
        fileName: raw.recipients?.fileName || null
      }
    };
  }

  // Check for v1 project signature
  if ('textField' in raw || 'names' in raw || 'template' in raw || ('title' in raw && 'hasCustomTitle' in raw)) {
    let layers = [];
    if (raw.textField) {
      const tf = raw.textField;
      const tplH = raw.template?.height || 1414;
      const boxHeightPx = ((tf.hPct || 15) / 100) * tplH;
      let sizePct = 0.75;
      if (tf.maxFontSizePx && boxHeightPx > 0) {
        sizePct = tf.maxFontSizePx / boxHeightPx;
        sizePct = Math.max(0.2, Math.min(1, sizePct));
      }

      layers.push({
        id: createId(),
        type: 'text',
        name: 'Recipient name',
        text: '{Name}',
        font: tf.font || 'Great Vibes',
        color: tf.color || '#1F2A1B',
        align: tf.align || 'center',
        autoFit: tf.autoFit !== undefined ? tf.autoFit : true,
        sizePct,
        xPct: tf.xPct ?? 20,
        yPct: tf.yPct ?? 45,
        wPct: tf.wPct ?? 60,
        hPct: tf.hPct ?? 15
      });
    } else {
      layers.push(createNameLayer());
    }

    const rows = Array.isArray(raw.names) ? raw.names.map(n => ({ Name: String(n) })) : [];

    return {
      version: 2,
      title: typeof raw.title === 'string' ? raw.title : 'Untitled batch',
      hasCustomTitle: Boolean(raw.hasCustomTitle),
      template: raw.template || null,
      layers,
      recipients: {
        columns: ['Name'],
        rows,
        source: 'paste',
        fileName: null
      }
    };
  }

  return null;
}


/** Move a layer to the very top ('front') or bottom ('back') of the stack. */
export function moveLayerToEdge(layers, id, edge) {
  const idx = layers.findIndex(layer => layer.id === id);
  if (idx === -1) return [...layers];
  const result = [...layers];
  const [item] = result.splice(idx, 1);
  if (edge === 'front') result.push(item);
  else result.unshift(item);
  return result;
}

/**
 * Position patch that aligns a layer to an edge or the center of the
 * certificate. how: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'.
 */
export function alignPatch(layer, how) {
  const round = (v) => Number(v.toFixed(2));
  switch (how) {
    case 'left': return { xPct: 0 };
    case 'center': return { xPct: round((100 - layer.wPct) / 2) };
    case 'right': return { xPct: round(100 - layer.wPct) };
    case 'top': return { yPct: 0 };
    case 'middle': return { yPct: round((100 - layer.hPct) / 2) };
    case 'bottom': return { yPct: round(100 - layer.hPct) };
    default: return {};
  }
}

/**
 * Paste a copied layer: new id, unlocked, placed at (xPct, yPct) when given
 * (centered on that point), otherwise offset 2% from the original.
 * Always kept fully inside the certificate. Added on top of the stack.
 */
export function pasteLayer(layers, clip, at = null) {
  const newId = createId();
  let xPct = clip.xPct + 2;
  let yPct = clip.yPct + 2;
  if (at) {
    xPct = at.xPct - clip.wPct / 2;
    yPct = at.yPct - clip.hPct / 2;
  }
  xPct = Math.min(Math.max(0, xPct), 100 - clip.wPct);
  yPct = Math.min(Math.max(0, yPct), 100 - clip.hPct);
  const copy = {
    ...clip,
    id: newId,
    locked: false,
    xPct: Number(xPct.toFixed(2)),
    yPct: Number(yPct.toFixed(2))
  };
  return { layers: [...layers, copy], newId };
}
