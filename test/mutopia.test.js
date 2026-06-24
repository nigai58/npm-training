import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLilyHeader, headerToWork } from '../src/sources/mutopia.js';

const SAMPLE = `
\\header {
  title = "Suite 1 for Cello Solo"
  opus = "BWV 1007"
  composer = "Johann Sebastian Bach"
  mutopiatitle = "Suite 1 for Cello Solo"
  mutopiacomposer = "BachJS"
  mutopiaopus = "BWV1007"
  mutopiainstrument = "Cello"
  source = "Schirmer, 1916"
  style = "Baroque"
  license = "Public Domain"
  footer = "Mutopia-2018/01/19-517"
}`;

test('parseLilyHeader: フィールドを抽出する', () => {
  const f = parseLilyHeader(SAMPLE);
  assert.equal(f.mutopiatitle, 'Suite 1 for Cello Solo');
  assert.equal(f.mutopiainstrument, 'Cello');
  assert.equal(f.license, 'Public Domain');
});

test('headerToWork: 正規化済みworkに変換', () => {
  const f = parseLilyHeader(SAMPLE);
  const w = headerToWork(f, { composerKey: 'BachJS', headerPath: 'ftp/BachJS/x/header.ily' });
  assert.equal(w.title, 'Suite 1 for Cello Solo');
  assert.equal(w.composer.name, 'Johann Sebastian Bach');
  assert.equal(w.instrumentation, 'Cello');
  assert.equal(w.year, 1916);
  assert.equal(w.licenseRedistributable, true);
  assert.match(w.sourceUrl, /piece-info\.cgi\?id=517/);
  assert.ok(w.tags.includes('Baroque'));
  assert.equal(w.files[0].instrument, 'Cello');
});
