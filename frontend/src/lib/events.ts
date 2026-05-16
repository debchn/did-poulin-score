export const EVENT_TYPES = [
  "goal",
  "assist",
  "quality_shot",
  "hit_laid",
  "hit_received",
  "penalty",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_LABELS: Record<EventType, string> = {
  goal: "Goal",
  assist: "Assist",
  quality_shot: "Quality shot (no goal)",
  hit_laid: "Hit (laid)",
  hit_received: "Hit (received)",
  penalty: "Penalty taken",
};

export function formatDefaultMessage(
  firstName: string,
  lastName: string,
  eventType: EventType
): string {
  const name = `${firstName} ${lastName}`;
  switch (eventType) {
    case "goal":         return `${name} scored!`;
    case "assist":       return `${name} got an assist!`;
    case "quality_shot": return `${name} had a quality shot!`;
    case "hit_laid":     return `${name} laid a hit!`;
    case "hit_received": return `${name} took a hit!`;
    case "penalty":      return `${name} took a penalty!`;
  }
}
