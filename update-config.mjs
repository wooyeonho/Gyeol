import fs from 'fs';

let content = fs.readFileSync('next.config.ts', 'utf8');
content = content.replace(/  experimental: \{\n    viewTransition: true,\n  \},\n/, '');
fs.writeFileSync('next.config.ts', content);
