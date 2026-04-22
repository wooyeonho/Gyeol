const fs = require("fs");
const path = "components/procedural-creature.tsx";
let code = fs.readFileSync(path, "utf-8");

code = code.replace(/const positions = useMemo\(\(\) => \{[\s\S]*?\}, \[count\]\);/g, `const [positions] = useState(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 0.8;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      ageRef.current[i] = Math.random();
      velRef.current[i * 3]     = (Math.random() - 0.5) * 0.002;
      velRef.current[i * 3 + 1] = 0.005 + Math.random() * 0.008;
      velRef.current[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return arr;
  });`);

fs.writeFileSync(path, code, "utf-8");
