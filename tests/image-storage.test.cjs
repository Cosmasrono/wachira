const { test } = require('node:test');
const assert = require('node:assert/strict');
const { imageExtension, imageNamePattern } = require('../src/lib/image-storage.ts');

test('uploads recognize JPEG, PNG and WebP bytes, not a supplied filename', () => {
  assert.equal(imageExtension(Buffer.from([255, 216, 255, ...Array(9).fill(0)])), 'jpg');
  assert.equal(imageExtension(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])), 'png');
  assert.equal(imageExtension(Buffer.from('RIFF0000WEBP')), 'webp');
  assert.equal(imageExtension(Buffer.from('<svg onload="alert(1)"></svg>')), null);
  assert.equal(imageExtension(Buffer.from('not an image')), null);
  assert.equal(imageExtension(Buffer.alloc(0)), null);
});

test('image retrieval allows generated names and rejects traversal and executable extensions', () => {
  assert.equal(imageNamePattern.test('a'.repeat(32) + '.jpg'), true);
  for (const name of ['../.env', '..\\.env', 'photo.svg', 'photo.html', 'a'.repeat(32) + '.jpg/../.env']) {
    assert.equal(imageNamePattern.test(name), false);
  }
});
