import fs from 'fs';

const filePath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));

pkg.overrides = pkg.overrides || {};
pkg.overrides['brace-expansion'] = '1.1.21';

fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2));
