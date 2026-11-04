export type MotionPreference = "system" | "full" | "reduced";
export const motionPreferenceEvent = "noreva:motion-preference";
/** Full animation is always enabled for this demo. */
export function motionReduced() {
  return typeof window === "undefined";
}
