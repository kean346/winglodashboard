"use client";
import { create } from "zustand";
/** Presentation only: persisted tour and business progress keep their existing independent owners. */
export const useGuidePresentation = create<{ tourOpen: boolean; participating: boolean }>(() => ({
  tourOpen: false,
  participating: false,
}));
