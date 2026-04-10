/**
 * Gesture Language System
 *
 * Maps conversational context to physical gestures (nod, shake, tilt, etc.)
 * that animate the creature mesh via rotations and scale transforms.
 * Used alongside the expression system to give the creature body language.
 */

export type GestureType = "nod" | "shake" | "tilt" | "bounce" | "spin" | "wave";

export type CreatureGesture = {
  type: GestureType;
  /** 0..1 how pronounced the gesture is */
  intensity: number;
  /** Duration in seconds */
  duration: number;
};

export interface GestureContext {
  messageType: string;
  emotion: string;
  agreement: boolean;
}

export interface GestureTransform {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleY: number;
}

/**
 * Choose a response gesture based on conversational context.
 *
 * Priority order:
 *   1. Agreement/disagreement (nod vs shake)
 *   2. Emotion-specific gestures (curiosity → tilt, excitement → bounce)
 *   3. Message-type fallbacks (greeting → wave, question → tilt)
 *   4. Default: gentle nod
 */
export function getResponseGesture(context: GestureContext): CreatureGesture {
  const { messageType, emotion, agreement } = context;

  // Agreement/disagreement takes precedence
  if (agreement) {
    return { type: "nod", intensity: 0.6, duration: 0.8 };
  }
  // Explicit disagreement only when agreement is false AND emotion/message supports it
  if (
    !agreement &&
    (emotion === "angry" || emotion === "frustrated" ||
     messageType === "disagreement" || messageType === "correction")
  ) {
    return { type: "shake", intensity: 0.5, duration: 0.7 };
  }

  // Emotion-driven gestures
  if (emotion === "curious" || emotion === "confused" || emotion === "puzzled") {
    return { type: "tilt", intensity: 0.5, duration: 1.0 };
  }
  if (emotion === "excited" || emotion === "joyful" || emotion === "thrilled") {
    return { type: "bounce", intensity: 0.7, duration: 1.2 };
  }
  if (emotion === "playful" || emotion === "mischievous") {
    return { type: "spin", intensity: 0.4, duration: 1.0 };
  }

  // Message-type fallbacks
  if (messageType === "greeting" || messageType === "farewell") {
    return { type: "wave", intensity: 0.5, duration: 1.0 };
  }
  if (messageType === "question") {
    return { type: "tilt", intensity: 0.4, duration: 0.9 };
  }

  // Default: a subtle nod of acknowledgement
  return { type: "nod", intensity: 0.3, duration: 0.6 };
}

/**
 * Compute transform values for a gesture at a given elapsed time.
 *
 * @param gesture  The gesture to animate
 * @param elapsed  Seconds since the gesture started (0 .. gesture.duration)
 * @returns        Rotation (radians) and scaleY offset to apply to the creature mesh
 *
 * Each gesture type uses a different oscillation pattern:
 *   - nod:    small rotation around X (forward/back head bob)
 *   - shake:  small rotation around Y (side-to-side head turn)
 *   - tilt:   slight Z rotation (cock head to one side)
 *   - bounce: Y-axis spring via scaleY oscillation
 *   - spin:   continuous Y rotation
 *   - wave:   combined X/Y oscillation (friendly sway)
 */
export function applyGesture(gesture: CreatureGesture, elapsed: number): GestureTransform {
  const { type, intensity, duration } = gesture;

  // Normalised progress 0..1, clamped
  const progress = Math.min(1, Math.max(0, elapsed / duration));
  // Envelope: ramp up quickly, sustain, then ease out
  const envelope = Math.sin(progress * Math.PI);
  const amp = intensity * envelope;

  // Oscillation frequency — gestures use 2-4 cycles over their duration
  const phase = elapsed * Math.PI * 2;

  switch (type) {
    case "nod": {
      // Forward/back rotation around X — 3 nod cycles
      const nodAngle = Math.sin(phase * 3 / duration) * 0.15 * amp;
      return { rotationX: nodAngle, rotationY: 0, rotationZ: 0, scaleY: 1 };
    }
    case "shake": {
      // Side-to-side rotation around Y — 4 shake cycles
      const shakeAngle = Math.sin(phase * 4 / duration) * 0.12 * amp;
      return { rotationX: 0, rotationY: shakeAngle, rotationZ: 0, scaleY: 1 };
    }
    case "tilt": {
      // Lean to one side via Z rotation — holds the tilt then releases
      const tiltAngle = 0.2 * amp;
      return { rotationX: 0, rotationY: 0, rotationZ: tiltAngle, scaleY: 1 };
    }
    case "bounce": {
      // Vertical spring via scaleY — base lift + oscillating bounce
      const bounceDecay = 1 - progress * 0.5; // decreases over time
      const bounceOsc = Math.abs(Math.sin(elapsed * Math.PI * 6 / duration)); // 3 full bounces
      // Base lift (0.04) ensures scaleY > 1 whenever envelope > 0, plus oscillation peaks
      const bounceY = 1 + (0.04 + bounceOsc * 0.08) * amp * bounceDecay;
      return { rotationX: 0, rotationY: 0, rotationZ: 0, scaleY: bounceY };
    }
    case "spin": {
      // Continuous Y rotation over the duration
      const spinAngle = progress * Math.PI * 2 * intensity;
      return { rotationX: 0, rotationY: spinAngle, rotationZ: 0, scaleY: 1 };
    }
    case "wave": {
      // Friendly sway: combined X/Y oscillation
      const waveX = Math.sin(phase * 2 / duration) * 0.08 * amp;
      const waveY = Math.cos(phase * 2 / duration) * 0.06 * amp;
      return { rotationX: waveX, rotationY: waveY, rotationZ: 0, scaleY: 1 };
    }
    default:
      return { rotationX: 0, rotationY: 0, rotationZ: 0, scaleY: 1 };
  }
}
