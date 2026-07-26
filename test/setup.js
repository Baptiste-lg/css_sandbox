import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..');

// Load index.html body into jsdom (strip script tags to avoid double-loading)
const html = readFileSync(resolve(root, 'index.html'), 'utf-8');
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (bodyMatch) {
  document.body.innerHTML = bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
}

// jsdom doesn't support iframe srcdoc rendering — stub contentWindow
Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
  get() {
    return window;
  },
  configurable: true,
});

// jsdom doesn't implement getComputedStyle fully — stub lineHeight
const origGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = function (el) {
  const style = origGetComputedStyle.call(window, el);
  return new Proxy(style, {
    get(target, prop) {
      if (prop === 'lineHeight') return '19.5px';
      return target[prop];
    },
  });
};

// Evaluate scripts in order against the global window
function loadScript(filename) {
  const code = readFileSync(resolve(root, filename), 'utf-8');
  const fn = new Function(code);
  fn.call(window);
}

loadScript('lzstring.js');
loadScript('highlight.js');
loadScript('app.js');
