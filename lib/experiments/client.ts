"use client";

import { useEffect, useState } from "react";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import {
  EXPERIMENT,
  EXPERIMENT_VARIANTS,
  FEATURE_FLAGS,
  type ExperimentKey,
  type FeatureFlagKey,
  type FirstMessageOnboardingVariant,
} from "@/lib/experiments/catalog";

const ASSIGNMENT_PREFIX = "gyeol_experiment_assignment:";
const ASSIGNMENT_TRACKED_PREFIX = "gyeol_experiment_tracked:";
const FLAG_OVERRIDE_PREFIX = "gyeol_flag_override:";

function getStoredExperimentVariant(key: ExperimentKey) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`${ASSIGNMENT_PREFIX}${key}`);
  } catch {
    return null;
  }
}

function setStoredExperimentVariant(key: ExperimentKey, variant: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ASSIGNMENT_PREFIX}${key}`, variant);
  } catch {}
}

function markTracked(key: ExperimentKey) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ASSIGNMENT_TRACKED_PREFIX}${key}`, "1");
  } catch {}
}

function wasTracked(key: ExperimentKey) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${ASSIGNMENT_TRACKED_PREFIX}${key}`) === "1";
  } catch {
    return false;
  }
}

function assignVariant(key: ExperimentKey): string {
  const existing = getStoredExperimentVariant(key);
  if (existing) return existing;

  const variants = EXPERIMENT_VARIANTS[key];
  const next = variants[Math.floor(Math.random() * variants.length)] ?? variants[0];
  setStoredExperimentVariant(key, next);
  return next;
}

function trackAssignmentIfNeeded(key: ExperimentKey, variant: string) {
  if (wasTracked(key)) return;
  trackClientEvent(CLIENT_EVENT.experimentAssigned, {
    experiment_key: key,
    variant,
  });
  markTracked(key);
}

function resolveFeatureFlag(key: FeatureFlagKey) {
  if (typeof window === "undefined") return FEATURE_FLAGS[key];
  try {
    const override = window.localStorage.getItem(`${FLAG_OVERRIDE_PREFIX}${key}`);
    if (override === "true") return true;
    if (override === "false") return false;
    return FEATURE_FLAGS[key];
  } catch {
    return FEATURE_FLAGS[key];
  }
}

export function useFeatureFlag(key: FeatureFlagKey) {
  const [enabled] = useState(() => resolveFeatureFlag(key));
  return enabled;
}

export function useFirstMessageOnboardingVariant(): FirstMessageOnboardingVariant {
  const [variant] = useState<FirstMessageOnboardingVariant>(
    () => assignVariant(EXPERIMENT.firstMessageOnboarding) as FirstMessageOnboardingVariant
  );

  useEffect(() => {
    trackAssignmentIfNeeded(EXPERIMENT.firstMessageOnboarding, variant);
  }, [variant]);

  return variant;
}
