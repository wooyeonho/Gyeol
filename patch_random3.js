const fs = require("fs");
const path = "components/procedural-creature.tsx";
let code = fs.readFileSync(path, "utf-8");

code = code.replace(/const count = VISUAL_CONFIG.rarityParticleCount;[\s\S]*?const positions = initialData.p;/m, `const count = VISUAL_CONFIG.rarityParticleCount;
  // Initialize positions, velocities, and ages consistently across renders
  // using refs instead of useMemo to avoid calling Math.random() during render.
  const posRef = useRef<THREE.BufferAttribute | null>(null);
  const dataRef = useRef<{ p: Float32Array; v: Float32Array; a: Float32Array } | null>(null);

  if (!dataRef.current) {
    const p = new Float32Array(count * 3);
    const v = new Float32Array(count * 3);
    const a = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3]     = (Math.random() - 0.5) * 0.8;
      p[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      p[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      a[i] = Math.random();
      v[i * 3]     = (Math.random() - 0.5) * 0.002;
      v[i * 3 + 1] = 0.005 + Math.random() * 0.008;
      v[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    dataRef.current = { p, v, a };
  }

  const velRef = useRef<Float32Array>(dataRef.current.v);
  const ageRef = useRef<Float32Array>(dataRef.current.a);
  const positions = dataRef.current.p;`);

fs.writeFileSync(path, code, "utf-8");
