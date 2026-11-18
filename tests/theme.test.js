import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('../index.html');
const css = read('../styles.css');
const js = read('../app.js');
const freeHtml = read('../free.html');
const freeJs = read('../free.js');

test('main and free pages have no dark-theme control', () => {
  assert.doesNotMatch(html, /id=["']themeBtn["']/);
  assert.doesNotMatch(freeHtml, /id=["']themeBtn["']/);
});

test('studio stylesheet exposes only the light theme palette', () => {
  assert.doesNotMatch(css, /:root\[data-theme=["']dark["']\]/);
  assert.doesNotMatch(css, /color-scheme:\s*dark\s*;/i);
  assert.match(css, /color-scheme:\s*light\s*;/i);
});

test('main and free pages overwrite any saved dark preference', () => {
  assert.match(js, /setAttribute\(["']data-theme["'],\s*["']light["']\)/);
  assert.match(js, /localStorage\.setItem\(["']hds-theme["'],\s*["']light["']\)/);
  assert.doesNotMatch(js, /saved\s*===\s*["']dark["']/);
  assert.match(freeJs, /setAttribute\(["']data-theme["'],\s*["']light["']\)/);
  assert.match(freeJs, /localStorage\.setItem\(["']hds-theme["'],\s*["']light["']\)/);
  assert.doesNotMatch(freeJs, /saved\s*===\s*["']dark["']/);
});
