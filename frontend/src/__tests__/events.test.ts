import { describe, it, expect } from "vitest";
import { formatDefaultMessage, EVENT_TYPES } from "../lib/events";

describe("formatDefaultMessage", () => {
  it("covers every event type", () => {
    for (const type of EVENT_TYPES) {
      const msg = formatDefaultMessage("Marie-Philip", "Poulin", type);
      expect(msg).toContain("Marie-Philip Poulin");
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("goal message", () => {
    expect(formatDefaultMessage("Marie-Philip", "Poulin", "goal")).toBe("Marie-Philip Poulin scored!");
  });

  it("assist message", () => {
    expect(formatDefaultMessage("Sarah", "Nurse", "assist")).toBe("Sarah Nurse got an assist!");
  });

  it("quality_shot message", () => {
    expect(formatDefaultMessage("Sarah", "Nurse", "quality_shot")).toBe("Sarah Nurse had a quality shot!");
  });

  it("hit_laid message", () => {
    expect(formatDefaultMessage("Sarah", "Nurse", "hit_laid")).toBe("Sarah Nurse laid a hit!");
  });

  it("hit_received message", () => {
    expect(formatDefaultMessage("Sarah", "Nurse", "hit_received")).toBe("Sarah Nurse took a hit!");
  });

  it("penalty message", () => {
    expect(formatDefaultMessage("Sarah", "Nurse", "penalty")).toBe("Sarah Nurse took a penalty!");
  });
});
