/**
 * Force-Based Creature Behavior System
 *
 * Replaces the discrete state machine (10 preset behaviors) with emergent
 * behavior driven by physics. DNA + mood + environment + memory combine
 * to produce forces every frame — the creature's movement is never the
 * same twice.
 *
 * Design philosophy: "selection" → "emergence"
 * Instead of choosing a behavior preset, internal state generates forces
 * and physics determines the result.
 *
 * Force sources:
 * 1. Perlin wander — DNA-shaped exploration impulse (curiosity, openness)
 * 2. Pointer attraction/repulsion — warmth pulls toward user, fear pushes away
 * 3. Energy modulation — conversation energy scales all forces
 * 4. Boundary repulsion — soft containment within viewport
 * 5. Mood drift — emotional state biases movement patterns
 * 6. Rest tendency — stability/sleepiness pulls toward center
 */

import type { CreatureDNA } from "@/lib/genome/dna";

// ─── Types ───────────────────────────────────────────────────────────

export type Vec2 = { x: number; y: number };

export interface ForceState {
  /** Current position offset from center (-1..1 normalized) */
  position: Vec2;
  /** Current velocity */
  velocity: Vec2;
  /** Current rotation offset (radians) */
  rotation: number;
  /** Rotational velocity */
  angularVelocity: number;
  /** Scale pulse (1 = normal) — force-driven breathing */
  scalePulse: number;
  /** Internal wander phase — accumulates over time */
  wanderPhase: number;
  /** Internal mood momentum — smoothly transitions between mood influences */
  moodMomentum: Vec2;
}

export interface ForceEnvironment {
  /** Normalized pointer position (-1..1) */
  pointer: Vec2;
  /** Whether the user is actively interacting */
  isActive: boolean;
  /** Whether the creature is being spoken to (streaming) */
  isStreaming: boolean;
  /** Seconds since last interaction */
  idleSeconds: number;
  /** 0..1 conversation energy */
  conversationEnergy: number;
  /** 0..1 vitality */
  vitality: number;
  /** Current mood string */
  mood: string | null;
  /** Touch affinity delta (recent touch quality) */
  recentTouchAffinity: number;
  /** Number of recent touches */
  recentTouchCount: number;
  /** Elapsed time in seconds (monotonic) */
  time: number;
  /** Delta time for this frame */
  dt: number;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Base viewport bounds — DNA can expand this range */
const BASE_BOUNDS = 0.35;
/** Damping factor — how quickly velocity decays (0 = no damping, 1 = instant stop) */
const LINEAR_DAMPING = 0.92;
const ANGULAR_DAMPING = 0.88;
/** Base max velocity — DNA can push beyond this */
const BASE_MAX_VELOCITY = 0.8;
const MAX_ANGULAR_VELOCITY = 2.0;

/**
 * Derive effective movement bounds from DNA.
 * Curious, independent, playful creatures roam wider.
 * Stable, warm creatures stay closer to center.
 */
function getEffectiveBounds(dna: CreatureDNA): number {
  const expansion = dna.curiosity * 0.15 + dna.independence * 0.1 + dna.playfulness * 0.08
    - dna.stability * 0.05;
  return BASE_BOUNDS + Math.max(0, expansion);
}

/**
 * Derive effective max velocity from DNA.
 * Intense, energetic creatures move faster.
 */
function getEffectiveMaxVelocity(dna: CreatureDNA): number {
  const boost = dna.intensity * 0.3 + dna.playfulness * 0.2 + dna.curiosity * 0.15
    - dna.stability * 0.1;
  return BASE_MAX_VELOCITY + Math.max(0, boost);
}

// ─── Perlin-like noise ───────────────────────────────────────────────

/**
 * Simplified 2D value noise using sine combinations.
 * Not true Perlin but captures the essential smooth randomness.
 * Multiple octaves create organic, non-repeating motion.
 */
function smoothNoise(x: number, y: number): number {
  return (
    Math.sin(x * 1.0 + y * 0.7) * 0.5 +
    Math.sin(x * 2.3 - y * 1.8) * 0.25 +
    Math.sin(x * 0.4 + y * 3.1) * 0.15 +
    Math.cos(x * 1.7 + y * 0.3) * 0.1
  );
}

/**
 * DNA-seeded noise offset — ensures each creature has unique wander patterns.
 * The seed creates a permanent phase offset so identical DNA at the same time
 * still produces distinct movement.
 */
function dnaSeed(dna: CreatureDNA): number {
  return (
    dna.curiosity * 127.1 +
    dna.playfulness * 311.7 +
    dna.independence * 74.7 +
    dna.warmth * 43.3
  );
}

// ─── Initial State ───────────────────────────────────────────────────

export function createForceState(): ForceState {
  return {
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    angularVelocity: 0,
    scalePulse: 1,
    wanderPhase: 0,
    moodMomentum: { x: 0, y: 0 },
  };
}

// ─── Force Computation ───────────────────────────────────────────────

/**
 * Compute the net force acting on the creature this frame.
 * All forces are in normalized viewport space (-1..1).
 *
 * This is the heart of the system: DNA + mood + environment → force vector.
 * The same DNA at different moments produces different forces because of
 * time-varying noise and environmental changes.
 */
export function computeForces(
  dna: CreatureDNA,
  env: ForceEnvironment,
  state: ForceState,
): Vec2 {
  let fx = 0;
  let fy = 0;

  const seed = dnaSeed(dna);

  // ── 1. Perlin Wander ──────────────────────────────────────────────
  // The creature's innate urge to explore. Curiosity and openness
  // increase wander strength; stability dampens it.
  const wanderStrength =
    dna.curiosity * 0.4 +
    dna.openness * 0.25 +
    dna.playfulness * 0.2 -
    dna.stability * 0.15;
  const wanderSpeed =
    0.3 + dna.playfulness * 0.4 + dna.intensity * 0.2 - dna.stability * 0.15;

  const wt = state.wanderPhase;
  const wx = smoothNoise(wt * wanderSpeed + seed, wt * 0.7 + seed * 0.3);
  const wy = smoothNoise(wt * wanderSpeed * 0.8 + seed * 0.5, wt * 0.5 - seed * 0.2);

  fx += wx * wanderStrength * 0.15;
  fy += wy * wanderStrength * 0.12;

  // ── 2. Pointer Attraction / Repulsion ─────────────────────────────
  // Warm, empathic creatures are drawn toward the user's pointer.
  // Scared or independent creatures may flee.
  if (env.isActive || env.idleSeconds < 10) {
    const dx = env.pointer.x - state.position.x;
    const dy = env.pointer.y - state.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const ndx = dx / dist;
    const ndy = dy / dist;

    // Attraction: warmth + empathy pull toward pointer
    const socialPull = dna.warmth * 0.35 + dna.empathy * 0.25 - dna.independence * 0.2;

    if (socialPull > 0.1) {
      // Approach but don't overlap — inverse-square falloff at close range
      const approachForce = socialPull * Math.min(1, dist * 2) * 0.08;
      fx += ndx * approachForce;
      fy += ndy * approachForce;
    }

    // Repulsion: if recently touched negatively, flee
    if (env.recentTouchAffinity < -0.3 && dna.stability < 0.5) {
      const fleeStrength = (1 - dna.assertiveness) * 0.12;
      fx -= ndx * fleeStrength;
      fy -= ndy * fleeStrength;
    }

    // Curiosity: oscillate around pointer (not directly toward it)
    if (dna.curiosity > 0.5 && dist > 0.1) {
      const orbitAngle = Math.atan2(dy, dx) + Math.PI / 2;
      const orbitStrength = (dna.curiosity - 0.5) * 0.06;
      fx += Math.cos(orbitAngle) * orbitStrength;
      fy += Math.sin(orbitAngle) * orbitStrength;
    }
  }

  // ── 3. Mood Drift ─────────────────────────────────────────────────
  // Different moods create different movement biases.
  // This isn't a preset — it's a force that combines with everything else.
  const moodForce = getMoodForce(env.mood, dna, env.time, seed);
  fx += moodForce.x;
  fy += moodForce.y;

  // ── 4. Energy Modulation ──────────────────────────────────────────
  // Conversation energy amplifies all forces. A creature that just had
  // an active conversation moves more vigorously.
  const energyMult = 0.4 + env.conversationEnergy * 1.2 + env.vitality * 0.4;
  fx *= energyMult;
  fy *= energyMult;

  // ── 5. Rest Tendency ──────────────────────────────────────────────
  // When idle, stable creatures drift toward center. Unstable ones keep moving.
  if (env.idleSeconds > 30) {
    const restStrength = dna.stability * 0.04 * Math.min(1, (env.idleSeconds - 30) / 60);
    fx -= state.position.x * restStrength;
    fy -= state.position.y * restStrength;
  }

  // Sleep: strongly pull toward center, reduce all forces
  if (env.idleSeconds > 120) {
    const sleepFactor = Math.min(1, (env.idleSeconds - 120) / 60);
    fx = fx * (1 - sleepFactor * 0.8) - state.position.x * sleepFactor * 0.08;
    fy = fy * (1 - sleepFactor * 0.8) - state.position.y * sleepFactor * 0.08;
  }

  // ── 6. Boundary Repulsion ─────────────────────────────────────────
  // Soft walls — force increases exponentially near edges.
  const boundaryForce = computeBoundaryForce(state.position, dna);
  fx += boundaryForce.x;
  fy += boundaryForce.y;

  return { x: fx, y: fy };
}

/**
 * Compute rotational force (torque) for the creature.
 * The creature turns toward its direction of travel, with DNA-influenced
 * rotation tendencies.
 */
export function computeTorque(
  dna: CreatureDNA,
  env: ForceEnvironment,
  state: ForceState,
): number {
  let torque = 0;
  const seed = dnaSeed(dna);

  // Turn toward velocity direction (creatures face where they're going)
  if (Math.abs(state.velocity.x) > 0.001 || Math.abs(state.velocity.y) > 0.001) {
    const targetAngle = Math.atan2(state.velocity.y, state.velocity.x);
    let angleDiff = targetAngle - state.rotation;
    // Normalize to -PI..PI
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    torque += angleDiff * 0.3;
  }

  // Playful creatures spin more
  if (dna.playfulness > 0.6) {
    torque += smoothNoise(env.time * 0.5 + seed, env.time * 0.3) * dna.playfulness * 0.15;
  }

  // Curious creatures tilt toward pointer
  if (dna.curiosity > 0.5 && env.isActive) {
    const angleToPointer = Math.atan2(
      env.pointer.y - state.position.y,
      env.pointer.x - state.position.x,
    );
    let diff = angleToPointer - state.rotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    torque += diff * dna.curiosity * 0.1;
  }

  return torque;
}

/**
 * Compute force-driven scale pulse.
 * Instead of a fixed breathing animation, the creature's scale oscillates
 * based on internal energy and DNA.
 */
export function computeScalePulse(
  dna: CreatureDNA,
  env: ForceEnvironment,
  state: ForceState,
): number {
  const speed = state.velocity;
  const speedMag = Math.sqrt(speed.x * speed.x + speed.y * speed.y);

  // Base breathing — DNA-driven rate and depth
  const breathRate = 0.8 + dna.stability * 0.4 - dna.intensity * 0.2;
  const breathDepth = 0.02 + dna.warmth * 0.02 + dna.openness * 0.01;
  const breathe = Math.sin(env.time * breathRate * Math.PI * 2) * breathDepth;

  // Heartbeat — stronger when excited or moving fast
  const heartStrength = 0.015 + env.conversationEnergy * 0.025 + speedMag * 0.03;
  const heartbeat = Math.pow(Math.max(0, Math.sin(env.time * Math.PI * 4)), 3) * heartStrength;

  // Squash/stretch from velocity (moving fast = stretched in direction of travel)
  const movementPulse = speedMag * 0.05;

  return 1 + breathe + heartbeat + movementPulse;
}

// ─── Physics Integration ─────────────────────────────────────────────

/**
 * Step the force simulation forward by dt seconds.
 * This is the main update function called every frame.
 *
 * Returns a new ForceState with updated position, velocity, rotation.
 * Pure function — no side effects.
 */
export function stepForceSimulation(
  dna: CreatureDNA,
  env: ForceEnvironment,
  prev: ForceState,
): ForceState {
  const dt = Math.min(env.dt, 0.05); // Cap at 50ms to prevent explosion
  if (dt <= 0) return prev;

  // Compute forces
  const force = computeForces(dna, env, prev);
  const torque = computeTorque(dna, env, prev);

  // Semi-implicit Euler integration
  let vx = prev.velocity.x * LINEAR_DAMPING + force.x * dt;
  let vy = prev.velocity.y * LINEAR_DAMPING + force.y * dt;

  // Clamp velocity — DNA-dependent max speed
  const maxVel = getEffectiveMaxVelocity(dna);
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > maxVel) {
    const scale = maxVel / speed;
    vx *= scale;
    vy *= scale;
  }

  let px = prev.position.x + vx * dt;
  let py = prev.position.y + vy * dt;

  // Hard clamp position to bounds (safety net) — DNA-dependent
  const bounds = getEffectiveBounds(dna);
  const hardBound = bounds * 1.2;
  px = Math.max(-hardBound, Math.min(hardBound, px));
  py = Math.max(-hardBound, Math.min(hardBound, py));

  // Angular
  let av = prev.angularVelocity * ANGULAR_DAMPING + torque * dt;
  if (Math.abs(av) > MAX_ANGULAR_VELOCITY) {
    av = Math.sign(av) * MAX_ANGULAR_VELOCITY;
  }
  const rotation = prev.rotation + av * dt;

  // Scale pulse
  const scalePulse = computeScalePulse(dna, env, prev);

  // Advance wander phase (time-based, DNA-influenced speed)
  const wanderAdvance = dt * (0.5 + dna.curiosity * 0.5 + dna.playfulness * 0.3);

  // Smooth mood momentum
  const moodForce = getMoodForce(env.mood, dna, env.time, dnaSeed(dna));
  const momentumLerp = 0.02;
  const moodMomentum = {
    x: prev.moodMomentum.x + (moodForce.x - prev.moodMomentum.x) * momentumLerp,
    y: prev.moodMomentum.y + (moodForce.y - prev.moodMomentum.y) * momentumLerp,
  };

  return {
    position: { x: px, y: py },
    velocity: { x: vx, y: vy },
    rotation,
    angularVelocity: av,
    scalePulse,
    wanderPhase: prev.wanderPhase + wanderAdvance,
    moodMomentum,
  };
}

// ─── Helper: Mood → Force ────────────────────────────────────────────

/**
 * Convert mood to a force bias.
 * Each mood creates a unique movement "flavor" that combines with DNA forces.
 * Not a preset behavior — just an additional force vector.
 */
function getMoodForce(
  mood: string | null,
  dna: CreatureDNA,
  time: number,
  seed: number,
): Vec2 {
  const t = time;
  const s = seed;

  switch (mood) {
    // Joyful: upward bounce, wide circles
    case "joyful":
    case "excited":
    case "thrilled":
      return {
        x: Math.sin(t * 1.5 + s) * 0.04,
        y: Math.abs(Math.sin(t * 2.5 + s)) * 0.03, // upward bias
      };

    // Playful: erratic, fast direction changes
    case "playful":
    case "mischievous":
      return {
        x: smoothNoise(t * 2 + s, t * 1.5) * 0.06,
        y: smoothNoise(t * 1.8 + s * 0.5, t * 2.2) * 0.06,
      };

    // Curious: slow approach toward random points
    case "curious":
    case "puzzled":
      return {
        x: smoothNoise(t * 0.3 + s, t * 0.2) * 0.03,
        y: smoothNoise(t * 0.25 + s * 0.7, t * 0.35) * 0.03,
      };

    // Sad/melancholy: slow downward drift, minimal horizontal
    case "sad":
    case "melancholy":
    case "lonely":
    case "nostalgic":
      return {
        x: smoothNoise(t * 0.15 + s, t * 0.1) * 0.01,
        y: -0.015 + smoothNoise(t * 0.1 + s, t * 0.2) * 0.005,
      };

    // Angry: sharp, aggressive movements
    case "angry":
    case "frustrated":
      return {
        x: smoothNoise(t * 3 + s, t * 2) * 0.05 * dna.intensity,
        y: smoothNoise(t * 2.5 + s * 0.3, t * 3) * 0.04 * dna.intensity,
      };

    // Scared: jittery, retreating (deterministic noise, not Math.random)
    case "scared":
    case "anxious":
      return {
        x: smoothNoise(t * 4 + s, t * 3.5 + s * 0.7) * 0.02 * (1 - dna.stability),
        y: smoothNoise(t * 3.5 + s * 0.3, t * 4 + s * 0.5) * 0.02 * (1 - dna.stability),
      };

    // Peaceful: very gentle, centered drift
    case "peaceful":
    case "serene":
    case "calm":
      return {
        x: smoothNoise(t * 0.1 + s, t * 0.08) * 0.008,
        y: smoothNoise(t * 0.08 + s * 0.5, t * 0.12) * 0.008,
      };

    // Dreamy: slow floating, slight upward
    case "dreamy":
    case "whimsical":
      return {
        x: smoothNoise(t * 0.2 + s, t * 0.15) * 0.02,
        y: 0.005 + smoothNoise(t * 0.15 + s * 0.3, t * 0.2) * 0.015,
      };

    // Energetic: big sweeping movements
    case "energetic":
      return {
        x: smoothNoise(t * 1.2 + s, t * 0.9) * 0.05,
        y: smoothNoise(t * 1.0 + s * 0.5, t * 1.3) * 0.04,
      };

    // Proud: stable, elevated position
    case "proud":
    case "confident":
      return {
        x: smoothNoise(t * 0.2 + s, t * 0.15) * 0.01,
        y: 0.01 + smoothNoise(t * 0.15 + s, t * 0.2) * 0.005,
      };

    // Shy: small movements, stay near center
    case "shy":
    case "embarrassed":
      return {
        x: smoothNoise(t * 0.3 + s, t * 0.2) * 0.01,
        y: smoothNoise(t * 0.25 + s * 0.5, t * 0.3) * 0.01,
      };

    // Sleepy: very slow, downward
    case "sleepy":
    case "bored":
      return {
        x: smoothNoise(t * 0.08 + s, t * 0.06) * 0.005,
        y: -0.008,
      };

    // Loving: gentle sway toward center (toward the user)
    case "loving":
    case "tender":
    case "affectionate":
    case "grateful":
    case "touched":
      return {
        x: Math.sin(t * 0.5 + s) * 0.015,
        y: Math.sin(t * 0.3 + s * 0.7) * 0.01,
      };

    // Default: neutral gentle wander
    default:
      return {
        x: smoothNoise(t * 0.2 + s, t * 0.15) * 0.015,
        y: smoothNoise(t * 0.15 + s * 0.5, t * 0.2) * 0.012,
      };
  }
}

// ─── Helper: Boundary Force ──────────────────────────────────────────

/**
 * Soft boundary repulsion — exponentially stronger near edges.
 * Creates an invisible "soft wall" that the creature bounces off of.
 */
function computeBoundaryForce(position: Vec2, dna: CreatureDNA): Vec2 {
  let fx = 0;
  let fy = 0;

  const bounds = getEffectiveBounds(dna);
  const margin = bounds * 0.3; // Start pushing at 70% of bounds

  if (position.x > bounds - margin) {
    const penetration = (position.x - (bounds - margin)) / margin;
    fx -= penetration * penetration * 0.3;
  } else if (position.x < -(bounds - margin)) {
    const penetration = (-(bounds - margin) - position.x) / margin;
    fx += penetration * penetration * 0.3;
  }

  if (position.y > bounds - margin) {
    const penetration = (position.y - (bounds - margin)) / margin;
    fy -= penetration * penetration * 0.3;
  } else if (position.y < -(bounds - margin)) {
    const penetration = (-(bounds - margin) - position.y) / margin;
    fy += penetration * penetration * 0.3;
  }

  return { x: fx, y: fy };
}
