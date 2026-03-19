import { useEffect, useState } from "react";
import { getCircadianTint } from "@/lib/circadian";

/** Tracks the circadian (time-of-day) tint overlay. Refreshes hourly and on visibility change. */
export function useCircadianTint() {
  const [circadian, setCircadian] = useState(() => getCircadianTint());

  useEffect(() => {
    const update = () => setCircadian(getCircadianTint());
    const id = setInterval(update, 60 * 60 * 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return circadian;
}
