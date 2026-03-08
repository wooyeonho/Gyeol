"use client";

import { useRef, useState, useEffect } from "react";

type ARViewerProps = {
  color?: string;
  size?: number;
  onPositionSave?: (position: [number, number, number]) => void;
};

export default function ARViewer({ color = "#a0a0ff", size = 0.3, onPositionSave }: ARViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [savedPosition, setSavedPosition] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.xr) {
      setSupported(false);
      return;
    }
    navigator.xr.isSessionSupported("immersive-ar").then(setSupported).catch(() => setSupported(false));
  }, []);

  const startAR = async () => {
    if (!containerRef.current || supported !== true) return;
    try {
      const { Scene, WebGLRenderer, SphereGeometry, MeshBasicMaterial, Mesh, PerspectiveCamera } = await import("three");
      const scene = new Scene();
      const camera = new PerspectiveCamera(70, 1, 0.01, 100);
      const renderer = new WebGLRenderer({ antialias: true, alpha: true });
      renderer.xr.enabled = true;
      const w = containerRef.current.offsetWidth;
      const h = containerRef.current.offsetHeight;
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);

      const geometry = new SphereGeometry(size, 32, 32);
      const material = new MeshBasicMaterial({ color });
      const sphere = new Mesh(geometry, material);
      sphere.position.set(0, 0, -1);
      scene.add(sphere);

      const session = await (navigator as any).xr.requestSession("immersive-ar", {
        optionalFeatures: ["dom-overlay"],
        domOverlay: containerRef.current.querySelector("[data-dom-overlay]") ?? undefined,
      });
      setSessionActive(true);
      session.addEventListener("end", () => {
        setSessionActive(false);
        if (renderer.domElement.parentNode) renderer.domElement.remove();
        renderer.dispose();
      });

      renderer.xr.setSession(session);

      const onSelect = () => {
        const pos = sphere.position.clone();
        setSavedPosition([pos.x, pos.y, pos.z]);
        onPositionSave?.([pos.x, pos.y, pos.z]);
      };
      session.addEventListener("select", onSelect);

      function animate(_t: number, frame?: XRFrame) {
        if (!frame || !renderer.xr.isPresenting) return;
        renderer.render(scene, camera);
      }
      renderer.setAnimationLoop(animate);
    } catch (e) {
      console.error("AR session failed", e);
      setSupported(false);
    }
  };

  if (supported === null) {
    return (
      <div className="rounded-xl bg-white/5 p-4 text-center text-white/50 text-sm">
        Checking AR support...
      </div>
    );
  }
  if (supported === false) {
    return (
      <div className="rounded-xl bg-white/5 p-4 text-center text-white/50 text-sm">
        AR is not supported on this device. Try Chrome on Android.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full aspect-[4/3] max-h-[70vh] bg-black rounded-xl overflow-hidden">
      <div data-dom-overlay className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
        {!sessionActive ? (
          <button
            type="button"
            onClick={startAR}
            className="px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium"
          >
            Start AR
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                if (savedPosition) onPositionSave?.(savedPosition);
              }}
              className="px-4 py-2 rounded-full bg-white/20 text-white text-sm"
            >
              Save position
            </button>
            <p className="text-white/60 text-xs self-center">Tap to place. Use &quot;Save position&quot; to remember.</p>
          </>
        )}
      </div>
    </div>
  );
}
