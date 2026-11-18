import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('studio has no dark-theme control', () => {
  assert.doesNotMatch(html, /id=["']themeBtn["']/);
});

test('studio stylesheet exposes only the light theme palette', () => {
  assert.doesNotMatch(css, /:root\[data-theme=["']dark["']\]/);
  assert.doesNotMatch(css, /color-scheme:\s*dark\s*;/i);
  assert.match(css, /color-scheme:\s*light\s*;/i);
});

test('studio forcibly replaces any saved dark preference with light', () => {
  assert.match(js, /setAttribute\(["']data-theme["'],\s*["']light["']\)/);
  assert.match(js, /localStorage\.setItem\(["']hds-theme["'],\s*["']light["']\)/);
  assert.doesNotMatch(js, /saved\s*===\s*["']dark["']/);
});
