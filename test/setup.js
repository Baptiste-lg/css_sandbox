import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..');

// Load index.html body into jsdom (strip script tags to avoid double-loading)
const html = readFileSync(resolve(root, 'index.html'), 'utf-8');
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (bodyMatch) {
  document.body.innerHTML = bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
}

// Stub canvas getContext — jsdom doesn't implement it, minimap needs it
const noop = () => {};
const ctxStub = {
  scale: noop, clearRect: noop, fillRect: noop, beginPath: noop, arc: noop,
  fill: noop, stroke: noop, moveTo: noop, lineTo: noop,
  fillStyle: '', strokeStyle: '', globalAlpha: 1, font: '',
  measureText: () => ({ width: 0 }),
};
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };

// Stub iframe srcdoc — create a minimal fake contentWindow per iframe
// (returning `window` itself causes infinite recursion on jsdom teardown)
Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
  get() {
    if (!this._fakeContentWindow) {
      this._fakeContentWindow = {
        postMessage: noop,
        close: noop,
        document: { write: noop, close: noop, open: noop },
      };
    }
    return this._fakeContentWindow;
  },
  configurable: true,
});

// Evaluate scripts in global scope using indirect eval
const indirectEval = eval;

function loadScript(filename) {
  const code = readFileSync(resolve(root, filename), 'utf-8');
  indirectEval(code);
}

loadScript('lzstring.js');
loadScript('highlight.js');
loadScript('app.js');
