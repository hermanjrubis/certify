import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCertificate } from '../js/certificateRenderer.js';

function createFakeCtx() {
  const calls = [];
  let currentFont = '16px serif';
  let currentFontSize = 16;

  const ctx = {
    calls,
    save: () => calls.push({ type: 'save' }),
    restore: () => calls.push({ type: 'restore' }),
    clearRect: (x, y, w, h) => calls.push({ type: 'clearRect', x, y, w, h }),
    drawImage: (img, x, y, w, h) => calls.push({ type: 'drawImage', img, x, y, w, h }),
    fillText: (text, x, y) => calls.push({ type: 'fillText', text, x, y, font: currentFont, fontSize: currentFontSize }),
    strokeRect: (x, y, w, h) => calls.push({ type: 'strokeRect', x, y, w, h }),
    fillRect: (x, y, w, h) => calls.push({ type: 'fillRect', x, y, w, h }),
    beginPath: () => calls.push({ type: 'beginPath' }),
    moveTo: (x, y) => calls.push({ type: 'moveTo', x, y }),
    lineTo: (x, y) => calls.push({ type: 'lineTo', x, y }),
    stroke: () => calls.push({ type: 'stroke' }),
    fill: () => calls.push({ type: 'fill' }),
    ellipse: (x, y, rx, ry, rot, sAngle, eAngle) => calls.push({ type: 'ellipse', x, y, rx, ry }),
    measureText: (text) => ({ width: (text || '').length * currentFontSize * 0.5 })
  };

  Object.defineProperty(ctx, 'font', {
    get() { return currentFont; },
    set(val) {
      currentFont = val;
      const match = String(val).match(/(\d+(?:\.\d+)?)px/);
      if (match) currentFontSize = parseFloat(match[1]);
    }
  });

  return ctx;
}

test('renders template, text layer with row value, and shape in array order', () => {
  const ctx = createFakeCtx();
  const templateImg = { id: 'template' };
  const layers = [
    {
      id: 'L1',
      type: 'shape',
      shape: 'rect',
      stroke: '#C8A24A',
      fill: null,
      strokeWidthPct: 0.3,
      xPct: 10,
      yPct: 10,
      wPct: 80,
      hPct: 80
    },
    {
      id: 'L2',
      type: 'text',
      name: 'Recipient',
      text: '{Name}',
      font: 'Great Vibes',
      color: '#000000',
      align: 'center',
      autoFit: true,
      sizePct: 0.75,
      xPct: 20,
      yPct: 45,
      wPct: 60,
      hPct: 15
    }
  ];

  const reports = renderCertificate(
    ctx,
    { templateImg, layers, images: new Map() },
    { Name: 'Ana' },
    { width: 2000, height: 1414 }
  );

  const drawTemplateIdx = ctx.calls.findIndex(c => c.type === 'drawImage' && c.img === templateImg);
  const strokeRectIdx = ctx.calls.findIndex(c => c.type === 'strokeRect');
  const fillTextCall = ctx.calls.find(c => c.type === 'fillText');

  assert.ok(drawTemplateIdx !== -1, 'template should be drawn');
  assert.ok(strokeRectIdx > drawTemplateIdx, 'strokeRect called after drawImage');
  assert.ok(fillTextCall, 'fillText should be called');
  assert.equal(fillTextCall.text, 'Ana');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].layerId, 'L2');
});

test('halving resolution halves fontSize and x position (Review Focus 4)', () => {
  const layers = [
    {
      id: 'L1',
      type: 'text',
      text: '{Name}',
      font: 'Great Vibes',
      align: 'center',
      autoFit: true,
      sizePct: 0.75,
      xPct: 20,
      yPct: 40,
      wPct: 60,
      hPct: 20
    }
  ];

  const ctxFull = createFakeCtx();
  renderCertificate(
    ctxFull,
    { templateImg: null, layers, images: new Map() },
    { Name: 'Short' },
    { width: 2000, height: 1414 }
  );

  const ctxHalf = createFakeCtx();
  renderCertificate(
    ctxHalf,
    { templateImg: null, layers, images: new Map() },
    { Name: 'Short' },
    { width: 1000, height: 707 }
  );

  const textFull = ctxFull.calls.find(c => c.type === 'fillText');
  const textHalf = ctxHalf.calls.find(c => c.type === 'fillText');

  assert.ok(textFull && textHalf);
  // fontSize halves within ±1px
  assert.ok(Math.abs(textFull.fontSize / 2 - textHalf.fontSize) <= 1);
  // x position halves within ±1px
  assert.ok(Math.abs(textFull.x / 2 - textHalf.x) <= 1);
});

test('long name in narrow box reports worthALook === true', () => {
  const ctx = createFakeCtx();
  const layers = [
    {
      id: 'L1',
      type: 'text',
      text: '{Name}',
      font: 'Great Vibes',
      align: 'center',
      autoFit: true,
      sizePct: 0.75,
      xPct: 40,
      yPct: 40,
      wPct: 20, // narrow box
      hPct: 15
    }
  ];

  const reports = renderCertificate(
    ctx,
    { templateImg: null, layers, images: new Map() },
    { Name: 'Dr. Alexander Bartholomew III' },
    { width: 2000, height: 1414 }
  );

  assert.equal(reports.length, 1);
  assert.equal(reports[0].worthALook, true);
});

test('row = null renders Recipient Name placeholder', () => {
  const ctx = createFakeCtx();
  const layers = [
    {
      id: 'L1',
      type: 'text',
      text: '{Name}',
      font: 'Great Vibes',
      align: 'center',
      autoFit: true,
      sizePct: 0.75,
      xPct: 20,
      yPct: 45,
      wPct: 60,
      hPct: 15
    }
  ];

  renderCertificate(
    ctx,
    { templateImg: null, layers, images: new Map() },
    null,
    { width: 2000, height: 1414 }
  );

  const fillTextCall = ctx.calls.find(c => c.type === 'fillText');
  assert.ok(fillTextCall);
  assert.equal(fillTextCall.text, 'Recipient Name');
});

