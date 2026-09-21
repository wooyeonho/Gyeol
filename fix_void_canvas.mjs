import fs from 'fs';
let content = fs.readFileSync('components/void-canvas-inner.tsx', 'utf-8');

content = content.replace(
  /const tapDecay = useRef\(0\);/,
  'const tapDecay = useRef(0);\n  const { isMobile } = useDevicePerformance();'
);

fs.writeFileSync('components/void-canvas-inner.tsx', content);
