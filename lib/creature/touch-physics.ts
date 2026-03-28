/**
 * Touch Physics Engine — Zelda-like freedom of interaction with the creature.
 *
 * Tracks touch gestures (tap, stroke, hold, flick) on the creature body,
 * computes physics responses (bounce, squish, recoil), and feeds into
 * the affinity tracker for non-chat intimacy changes.
 */

export type TouchType = "tap" | "stroke" | "hold" | "flick" | "poke";
export type BodyPart = "head" | "body" | "eye" | "appendage" | "unknown";

export interface TouchEvent {
  type: TouchType;
  part: BodyPart;
  /** Duration in ms (for hold/stroke) */
  duration: number;
  /** Velocity magnitude (for flick detection) */
  velocity: number;
  /** Timestamp */
  timestamp: number;
}

export interface PhysicsResponse {
  /** Scale bounce: 1.0 = normal, >1 = expand, <1 = squish */
  scaleBounce: number;
  /** Rotation impulse in radians */
  rotationImpulse: { x: number; y: number; z: number };
  /** Emissive flash intensity 0..1 */
  flashIntensity: number;
  /** Eye reaction: "widen" | "squint" | "blink" | "none" */
  eyeReaction: "widen" | "squint" | "blink" | "none";
  /** Haptic pattern to trigger */
  hapticPattern: "tap" | "success" | "send" | "receive";
  /** Sound effect */
  soundEffect: "send" | "receive" | "streak" | null;
  /** Affinity delta — how much this touch changes intimacy */
  affinityDelta: number;
}

/**
 * Classify a pointer gesture into a TouchType based on duration and velocity.
 */
export function classifyTouch(
  durationMs: number,
  velocity: number,
  pointerMoveDistance: number,
): TouchType {
  if (durationMs < 150 && velocity < 2) return "tap";
  if (durationMs < 150 && velocity >= 5) return "flick";
  if (durationMs >= 500 && pointerMoveDistance < 20) return "hold";
  if (pointerMoveDistance >= 30 && durationMs > 100) return "stroke";
  return "poke";
}

/**
 * Detect which body part was touched based on normalized hit point.
 * y > 0.3 = head region, |x| > 0.3 = appendage, near center = body
 */
export function detectBodyPart(
  hitPoint: { x: number; y: number; z: number },
): BodyPart {
  const { x, y, z } = hitPoint;
  if (y > 0.25) return "head";
  if (Math.abs(x) > 0.3) return "appendage";
  if (Math.abs(z) > 0.25 && y > 0.1) return "eye";
  return "body";
}

/**
 * Compute physics response for a given touch event.
 * Zelda-like: every touch produces a visible, satisfying reaction.
 */
export function computePhysicsResponse(touch: TouchEvent): PhysicsResponse {
  switch (touch.type) {
    case "tap":
      return {
        scaleBounce: touch.part === "head" ? 1.12 : 1.08,
        rotationImpulse: {
          x: touch.part === "head" ? -0.08 : 0,
          y: 0,
          z: touch.part === "appendage" ? 0.15 : 0,
        },
        flashIntensity: 0.4,
        eyeReaction: touch.part === "eye" ? "blink" : "widen",
        hapticPattern: "tap",
        soundEffect: "send",
        affinityDelta: 0.3,
      };

    case "stroke":
      return {
        scaleBounce: 1.04,
        rotationImpulse: { x: 0, y: 0, z: 0.03 },
        flashIntensity: 0.2,
        eyeReaction: "squint", // happy squint from petting
        hapticPattern: "success",
        soundEffect: "receive",
        affinityDelta: Math.min(2.0, touch.duration / 500), // longer stroke = more affinity
      };

    case "hold":
      return {
        scaleBounce: 0.96, // gentle squish
        rotationImpulse: { x: 0, y: 0, z: 0 },
        flashIntensity: 0.6,
        eyeReaction: "squint", // content
        hapticPattern: "success",
        soundEffect: "streak",
        affinityDelta: Math.min(3.0, touch.duration / 1000),
      };

    case "flick":
      return {
        scaleBounce: 0.88, // squish then bounce back
        rotationImpulse: {
          x: (Math.random() - 0.5) * 0.3,
          y: (Math.random() - 0.5) * 0.2,
          z: (Math.random() - 0.5) * 0.3,
        },
        flashIntensity: 0.7,
        eyeReaction: "widen", // surprised
        hapticPattern: "send",
        soundEffect: "send",
        affinityDelta: -0.5, // flicking reduces affinity slightly
      };

    case "poke":
      return {
        scaleBounce: 1.06,
        rotationImpulse: { x: -0.05, y: 0, z: 0 },
        flashIntensity: 0.3,
        eyeReaction: "blink",
        hapticPattern: "tap",
        soundEffect: "send",
        affinityDelta: 0.1,
      };
  }
}

/**
 * Physics state that decays over time — used in the animation loop.
 */
export interface TouchPhysicsState {
  /** Current scale multiplier from touch bounce (decays to 1.0) */
  scaleMult: number;
  /** Current rotation impulse (decays to 0) */
  rotImpulse: { x: number; y: number; z: number };
  /** Current flash intensity (decays to 0) */
  flash: number;
  /** Eye reaction (clears after duration) */
  eyeReaction: "widen" | "squint" | "blink" | "none";
  /** Eye reaction remaining ms */
  eyeReactionMs: number;
  /** Cumulative affinity from touches this session */
  sessionAffinity: number;
  /** Touch count this session */
  touchCount: number;
  /** Last touch timestamp */
  lastTouchAt: number;
}

export function createInitialPhysicsState(): TouchPhysicsState {
  return {
    scaleMult: 1,
    rotImpulse: { x: 0, y: 0, z: 0 },
    flash: 0,
    eyeReaction: "none",
    eyeReactionMs: 0,
    sessionAffinity: 0,
    touchCount: 0,
    lastTouchAt: 0,
  };
}

/**
 * Apply a physics response to the current state.
 */
export function applyPhysicsResponse(
  state: TouchPhysicsState,
  response: PhysicsResponse,
  timestamp: number,
): TouchPhysicsState {
  return {
    scaleMult: response.scaleBounce,
    rotImpulse: {
      x: state.rotImpulse.x + response.rotationImpulse.x,
      y: state.rotImpulse.y + response.rotationImpulse.y,
      z: state.rotImpulse.z + response.rotationImpulse.z,
    },
    flash: Math.min(1, state.flash + response.flashIntensity),
    eyeReaction: response.eyeReaction,
    eyeReactionMs: response.eyeReaction === "blink" ? 300 : response.eyeReaction === "none" ? 0 : 800,
    sessionAffinity: state.sessionAffinity + response.affinityDelta,
    touchCount: state.touchCount + 1,
    lastTouchAt: timestamp,
  };
}

/**
 * Tick the physics state — called every frame to decay values.
 */
export function tickPhysicsState(
  state: TouchPhysicsState,
  dtMs: number,
): TouchPhysicsState {
  const decay = Math.exp(-dtMs / 200); // ~200ms half-life for bounce
  const slowDecay = Math.exp(-dtMs / 400); // slower for rotation

  return {
    ...state,
    scaleMult: 1 + (state.scaleMult - 1) * decay,
    rotImpulse: {
      x: state.rotImpulse.x * slowDecay,
      y: state.rotImpulse.y * slowDecay,
      z: state.rotImpulse.z * slowDecay,
    },
    flash: state.flash * decay,
    eyeReactionMs: Math.max(0, state.eyeReactionMs - dtMs),
    eyeReaction: state.eyeReactionMs - dtMs <= 0 ? "none" : state.eyeReaction,
  };
}
