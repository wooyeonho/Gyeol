import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.dependencies['next'] = '^16.3.5'; // alignment

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
