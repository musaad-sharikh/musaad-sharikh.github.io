import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLanguage, oppositeOf, LANGS, DEFAULT_LANG } from '../js/i18n.js';

test('query parameter wins over storage', () => {
  assert.equal(resolveLanguage({ search: '?lang=ar', stored: 'en' }), 'ar');
  assert.equal(resolveLanguage({ search: '?lang=en', stored: 'ar' }), 'en');
});

test('storage is used when no query parameter is present', () => {
  assert.equal(resolveLanguage({ search: '', stored: 'ar' }), 'ar');
});

test('unknown values fall back to the default', () => {
  assert.equal(resolveLanguage({ search: '?lang=fr', stored: null }), DEFAULT_LANG);
  assert.equal(resolveLanguage({ search: '', stored: 'klingon' }), DEFAULT_LANG);
  assert.equal(resolveLanguage({}), DEFAULT_LANG);
});

test('oppositeOf flips between the two supported languages', () => {
  assert.equal(oppositeOf('en'), 'ar');
  assert.equal(oppositeOf('ar'), 'en');
});

test('exactly two languages are supported', () => {
  assert.deepEqual([...LANGS], ['en', 'ar']);
});
