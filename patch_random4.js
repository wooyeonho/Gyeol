const fs = require("fs");
const path = "components/procedural-creature.tsx";
let code = fs.readFileSync(path, "utf-8");

code = code.replace(/const count = VISUAL_CONFIG.rarityParticleCount;[\s\S]*?const positions = dataRef.current.p;/m, `const count = VISUAL_CONFIG.rarityParticleCount;
  // Initialize positions, velocities, and ages consistently across renders
  // using refs instead of useMemo to avoid calling Math.random() during render.
  const posRef = useRef<THREE.BufferAttribute | null>(null);

  // Calculate initial data outside of the render cycle
  const initialData = useMemo(() => {
    const p = new Float32Array(count * 3);
    const v = new Float32Array(count * 3);
    const a = new Float32Array(count);

    // Generate pseudo-random deterministic initial positions so we don't call Math.random()
    // directly during render phase (violating React rules).
    const pseudoRandom = (seed: number) => {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      p[i * 3]     = (pseudoRandom(i*7+1) - 0.5) * 0.8;
      p[i * 3 + 1] = (pseudoRandom(i*7+2) - 0.5) * 0.8;
      p[i * 3 + 2] = (pseudoRandom(i*7+3) - 0.5) * 0.8;
      a[i] = pseudoRandom(i*7+4);
      v[i * 3]     = (pseudoRandom(i*7+5) - 0.5) * 0.002;
      v[i * 3 + 1] = 0.005 + pseudoRandom(i*7+6) * 0.008;
      v[i * 3 + 2] = (pseudoRandom(i*7+7) - 0.5) * 0.002;
    }
    return { p, v, a };
  }, [count]);

  const velRef = useRef<Float32Array>(initialData.v);
  const ageRef = useRef<Float32Array>(initialData.a);
  const positions = initialData.p;`);

fs.writeFileSync(path, code, "utf-8");
