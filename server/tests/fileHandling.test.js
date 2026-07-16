const test = require('node:test');
const assert = require('node:assert/strict');

const { buildStoredFileName, getAllowedMimeTypes, getFileExtension } = require('../utils/fileUtils');

test('builds a unique stored file name and preserves extension', () => {
  const stored = buildStoredFileName('report.pdf');
  assert.match(stored, /\.pdf$/);
  assert.notEqual(stored, 'report.pdf');
});

test('allows only the configured document types', () => {
  const allowed = getAllowedMimeTypes();
  assert.equal(allowed.pdf, 'application/pdf');
  assert.equal(allowed.docx, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});

test('extracts the extension safely', () => {
  assert.equal(getFileExtension('archive.TXT'), 'txt');
  assert.equal(getFileExtension('noextension'), '');
});
