const fs = require("fs");
const path = "components/procedural-creature.tsx";
let code = fs.readFileSync(path, "utf-8");

code = code.replace(/const count = VISUAL_CONFIG.rarityParticleCount;/, `const count = VISUAL_CONFIG.rarityParticleCount;
  // Initialize positions, velocities, and ages consistently across renders
  const initialData = useMemo(() => {
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
    return { p, v, a };
  }, [count]);
`);

code = code.replace(/const velRef = useRef<Float32Array>\(new Float32Array\(count \* 3\)\);/, `const velRef = useRef<Float32Array>(initialData.v);`);
code = code.replace(/const ageRef = useRef<Float32Array>\(new Float32Array\(count\)\);/, `const ageRef = useRef<Float32Array>(initialData.a);`);
code = code.replace(/const \[positions\] = useState\(\(\) => \{[\s\S]*?\}\);/, `const positions = initialData.p;`);

fs.writeFileSync(path, code, "utf-8");
