import fs from 'fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

packageJson.dependencies.next = "^16.3.1";

packageJson.overrides = {
  "@babel/core": "^7.29.7",
  "@opentelemetry/core": "^2.8.0",
  "brace-expansion": "^1.1.18",
  "fast-uri": "^3.1.5",
  "js-yaml": "^4.3.1",
  "nanoid": "^3.3.18",
  "next": "^16.3.1",
  "postcss": "^8.5.23",
  "sharp": "^0.35.1",
  "undici": "^8.10.0",
  "uuid": "^11.1.1",
  "vite": "^8.1.5",
  "ws": "^8.21.3"
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
