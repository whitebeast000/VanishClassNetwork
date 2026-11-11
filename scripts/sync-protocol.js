// Copies protocol/protocol.ts into the app and the backend.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, 'protocol', 'protocol.ts');
const targets = [
  path.join(root, 'src', 'types', 'protocol.ts'),
  path.join(root, 'backend', 'src', 'types', 'protocol.ts'),
];

const banner =
  '// AUTO-COPIED from /protocol/protocol.ts. DO NOT EDIT HERE.\n' +
  '// Edit the source file and run: npm run sync-protocol\n\n';
const content = fs.readFileSync(source, 'utf8');

for (const t of targets) {
  fs.writeFileSync(t, banner + content);
  console.log('synced ->', path.relative(root, t));
}