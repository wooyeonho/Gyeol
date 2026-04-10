/**
 * Expression System
 *
 * Maps mood to facial expression state.
 * Used by ProceduralCreature to animate eyes, mouth, and color overlays.
 */

export type ExpressionState = {
  /** Eye openness: 0 = closed, 1 = normal, 1.5 = wide open */
  eyeOpenness: number;
  /** Eyelid droop: 0 = none, 1 = fully droopy (sad/sleepy) */
  eyelidDroop: number;
  /** Mouth curve: -1 = frown, 0 = neutral, 1 = smile */
  mouthCurve: number;
  /** Mouth openness: 0 = closed, 1 = fully open */
  mouthOpen: number;
  /** Pupil dilation: 0.5 = contracted, 1 = normal, 1.5 = dilated */
  pupilScale: number;
  /** Blush intensity: 0 = none, 1 = full blush */
  blush: number;
  /** Brow angle: -1 = worried, 0 = neutral, 1 = angry/determined */
  browAngle: number;
  /** Overall expression intensity: 0 = subtle, 1 = exaggerated */
  intensity: number;
  /** Head nod: -1 = shake (no), 0 = still, 1 = nod (yes) */
  headGesture: number;
  /** Head tilt: -1 = left, 0 = straight, 1 = right */
  headTilt: number;
};

const EXPRESSIONS: Record<string, Partial<ExpressionState>> = {
  // Positive
  joyful: { eyeOpenness: 0.7, mouthCurve: 1, mouthOpen: 0.3, pupilScale: 1.2, blush: 0.3, headGesture: 0.4, intensity: 0.9 },
  playful: { eyeOpenness: 1.1, mouthCurve: 0.8, mouthOpen: 0.2, pupilScale: 1.3, intensity: 0.8 },
  excited: { eyeOpenness: 1.4, mouthCurve: 0.9, mouthOpen: 0.5, pupilScale: 1.5, intensity: 1.0 },
  proud: { eyeOpenness: 0.9, mouthCurve: 0.5, eyelidDroop: 0.2, browAngle: 0.3, intensity: 0.7 },
  inspired: { eyeOpenness: 1.3, mouthOpen: 0.2, pupilScale: 1.4, intensity: 0.8 },
  loving: { eyeOpenness: 0.8, mouthCurve: 0.7, pupilScale: 1.3, blush: 0.6, eyelidDroop: 0.15, intensity: 0.9 },
  grateful: { eyeOpenness: 0.9, mouthCurve: 0.6, blush: 0.2, intensity: 0.7 },
  mischievous: { eyeOpenness: 1.1, mouthCurve: 0.4, browAngle: 0.5, pupilScale: 0.8, intensity: 0.8 },

  // Calm
  curious: { eyeOpenness: 1.3, pupilScale: 1.4, mouthOpen: 0.1, browAngle: -0.2, headTilt: 0.4, intensity: 0.7 },
  thoughtful: { eyeOpenness: 0.8, eyelidDroop: 0.3, mouthCurve: 0, pupilScale: 0.9, headTilt: -0.2, intensity: 0.5 },
  dreamy: { eyeOpenness: 0.6, eyelidDroop: 0.5, mouthCurve: 0.2, pupilScale: 1.1, intensity: 0.4 },
  focused: { eyeOpenness: 1.1, pupilScale: 0.7, browAngle: 0.2, intensity: 0.6 },
  peaceful: { eyeOpenness: 0.7, mouthCurve: 0.3, eyelidDroop: 0.2, intensity: 0.3 },
  tender: { eyeOpenness: 0.8, mouthCurve: 0.4, blush: 0.3, eyelidDroop: 0.15, intensity: 0.5 },

  // Negative
  melancholy: { eyeOpenness: 0.6, mouthCurve: -0.5, eyelidDroop: 0.6, pupilScale: 0.8, intensity: 0.7 },
  sad: { eyeOpenness: 0.5, mouthCurve: -0.7, eyelidDroop: 0.7, browAngle: -0.5, intensity: 0.8 },
  lonely: { eyeOpenness: 0.7, mouthCurve: -0.3, eyelidDroop: 0.4, pupilScale: 1.1, intensity: 0.6 },
  angry: { eyeOpenness: 1.2, mouthCurve: -0.4, browAngle: 0.8, pupilScale: 0.6, headGesture: -0.5, intensity: 1.0 },
  frustrated: { eyeOpenness: 1.0, mouthCurve: -0.3, browAngle: 0.6, intensity: 0.8 },
  scared: { eyeOpenness: 1.5, mouthOpen: 0.4, pupilScale: 1.5, browAngle: -0.7, intensity: 1.0 },
  shy: { eyeOpenness: 0.6, blush: 0.7, eyelidDroop: 0.4, mouthCurve: 0.1, intensity: 0.6 },
  jealous: { eyeOpenness: 0.9, mouthCurve: -0.2, browAngle: 0.4, pupilScale: 0.7, intensity: 0.7 },

  // Reactive
  surprised: { eyeOpenness: 1.5, mouthOpen: 0.6, pupilScale: 1.5, intensity: 1.0 },
  confused: { eyeOpenness: 1.1, mouthOpen: 0.15, browAngle: -0.5, pupilScale: 1.0, headTilt: 0.6, headGesture: -0.3, intensity: 0.6 },
  bored: { eyeOpenness: 0.5, eyelidDroop: 0.7, mouthCurve: -0.1, intensity: 0.3 },
  energetic: { eyeOpenness: 1.3, mouthCurve: 0.6, mouthOpen: 0.2, pupilScale: 1.2, intensity: 0.9 },
  sleepy: { eyeOpenness: 0.3, eyelidDroop: 0.9, mouthOpen: 0.1, intensity: 0.2 },
};

const DEFAULT_EXPRESSION: ExpressionState = {
  eyeOpenness: 1,
  eyelidDroop: 0,
  mouthCurve: 0,
  mouthOpen: 0,
  pupilScale: 1,
  blush: 0,
  browAngle: 0,
  intensity: 0.5,
  headGesture: 0,
  headTilt: 0,
};

/**
 * Get expression state for a mood.
 * Unknown moods return neutral expression.
 */
export function getExpression(mood: string | null | undefined): ExpressionState {
  if (!mood) return { ...DEFAULT_EXPRESSION };
  const partial = EXPRESSIONS[mood];
  if (!partial) return { ...DEFAULT_EXPRESSION };
  return { ...DEFAULT_EXPRESSION, ...partial };
}

/**
 * Interpolate between two expression states.
 * Used for smooth transitions when mood changes.
 */
export function lerpExpression(
  from: ExpressionState,
  to: ExpressionState,
  t: number,
): ExpressionState {
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {
    eyeOpenness: lerp(from.eyeOpenness, to.eyeOpenness),
    eyelidDroop: lerp(from.eyelidDroop, to.eyelidDroop),
    mouthCurve: lerp(from.mouthCurve, to.mouthCurve),
    mouthOpen: lerp(from.mouthOpen, to.mouthOpen),
    pupilScale: lerp(from.pupilScale, to.pupilScale),
    blush: lerp(from.blush, to.blush),
    browAngle: lerp(from.browAngle, to.browAngle),
    intensity: lerp(from.intensity, to.intensity),
    headGesture: lerp(from.headGesture, to.headGesture),
    headTilt: lerp(from.headTilt, to.headTilt),
  };
}
