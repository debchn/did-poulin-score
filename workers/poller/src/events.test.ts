import { describe, it, expect } from "vitest";
import { extractEvents, formatDefaultMessage } from "./events";
import type { PxpEvent } from "./hockeytech";

// ── Fixtures from actual API sample (game 137) ────────────────────────────────

const goalEvent: PxpEvent = {
  event: "goal",
  id: "695",
  goal_player_id: "161",
  assist1_player_id: "60",
  assist2_player_id: "71",
  time: "10:02",
  time_formatted: "10:02",
  period: "1st",
  period_id: "1",
  goal_scorer: { player_id: "161", first_name: "Tereza", last_name: "Vanišová", team_id: "5", team_code: "OTT" },
  assist1_player: { player_id: "60", first_name: "Jincy", last_name: "Roese", team_id: "5", team_code: "OTT" },
  assist2_player: { player_id: "71", first_name: "Jocelyne", last_name: "Larocque", team_id: "5", team_code: "OTT" },
} as PxpEvent;

const qualityShotEvent: PxpEvent = {
  event: "shot",
  id: "8132",
  player_id: "50",
  goalie_id: "28",
  period_id: "1",
  time_formatted: "1:40",
  shot_quality_description: "Quality on net",
  game_goal_id: "",
  player: { player_id: "50", first_name: "Ashton", last_name: "Bell", team_id: "5", team_code: "OTT" },
} as PxpEvent;

const nonQualityShotEvent: PxpEvent = {
  event: "shot",
  id: "8200",
  player_id: "50",
  period_id: "1",
  time_formatted: "5:00",
  shot_quality_description: "Non quality on net",
  game_goal_id: "",
  player: { player_id: "50", first_name: "Ashton", last_name: "Bell", team_id: "5", team_code: "OTT" },
} as PxpEvent;

const goalShotEvent: PxpEvent = {
  event: "shot",
  id: "8300",
  player_id: "161",
  period_id: "1",
  time_formatted: "10:02",
  shot_quality_description: "Quality goal",
  game_goal_id: "695",
  player: { player_id: "161", first_name: "Tereza", last_name: "Vanišová", team_id: "5", team_code: "OTT" },
} as PxpEvent;

const qualityBlockedShotEvent: PxpEvent = {
  event: "blocked_shot",
  id: "2314",
  player_id: "125",
  period_id: "1",
  time: "01:13",
  shot_quality_description: "Quality blocked",
  player: { player_id: "125", first_name: "Victoria", last_name: "Bach", team_id: "5", team_code: "OTT" },
} as PxpEvent;

const hitEvent: PxpEvent = {
  event: "hit",
  id: "3490",
  period: "1",
  time_formatted: "3:28",
  hitter: { player_id: "84", first_name: "Kati", last_name: "Tabin", team_id: "3", team_code: "MTL" },
} as PxpEvent;

const penaltyEvent: PxpEvent = {
  event: "penalty",
  id: "867",
  period_id: "1",
  time_off_formatted: "15:03",
  lang_penalty_description: "Interference",
  player_penalized_info: { player_id: "200", first_name: "Anna", last_name: "Kjellbin", team_id: "3", team_code: "MTL" },
} as PxpEvent;

// ── extractEvents ─────────────────────────────────────────────────────────────

describe("extractEvents", () => {
  it("extracts goal + two assists from one goal event", () => {
    const events = extractEvents([goalEvent]);
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ eventKey: "goal:695", eventType: "goal", playerId: 161 });
    expect(events[1]).toMatchObject({ eventKey: "assist:695:60", eventType: "assist", playerId: 60 });
    expect(events[2]).toMatchObject({ eventKey: "assist:695:71", eventType: "assist", playerId: 71 });
  });

  it("extracts quality_shot from 'Quality on net' shot", () => {
    const events = extractEvents([qualityShotEvent]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventKey: "shot:8132", eventType: "quality_shot", playerId: 50 });
  });

  it("ignores non-quality shots", () => {
    expect(extractEvents([nonQualityShotEvent])).toHaveLength(0);
  });

  it("ignores shot events that were goals (game_goal_id set)", () => {
    expect(extractEvents([goalShotEvent])).toHaveLength(0);
  });

  it("extracts quality_shot from 'Quality blocked' blocked_shot event", () => {
    const events = extractEvents([qualityBlockedShotEvent]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventKey: "blocked_shot:2314", eventType: "quality_shot", playerId: 125 });
  });

  it("extracts hit_laid from hit event", () => {
    const events = extractEvents([hitEvent]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventKey: "hit:3490", eventType: "hit_laid", playerId: 84 });
  });

  it("extracts penalty from penalty event", () => {
    const events = extractEvents([penaltyEvent]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventKey: "penalty:867", eventType: "penalty", playerId: 200 });
  });

  it("ignores unknown event types", () => {
    const unknown = [{ event: "faceoff", id: "1" }] as PxpEvent[];
    expect(extractEvents(unknown)).toHaveLength(0);
  });

  it("dedup keys are unique across event types with same id", () => {
    const events = extractEvents([goalEvent, penaltyEvent, hitEvent]);
    const keys = events.map((e) => e.eventKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ── formatDefaultMessage ──────────────────────────────────────────────────────

describe("formatDefaultMessage", () => {
  it("goal", () => expect(formatDefaultMessage("Tereza", "Vanišová", "goal")).toBe("Tereza Vanišová scored!"));
  it("assist", () => expect(formatDefaultMessage("Jincy", "Roese", "assist")).toBe("Jincy Roese got an assist!"));
  it("quality_shot", () => expect(formatDefaultMessage("Sarah", "Nurse", "quality_shot")).toBe("Sarah Nurse had a quality shot!"));
  it("hit_laid", () => expect(formatDefaultMessage("Kati", "Tabin", "hit_laid")).toBe("Kati Tabin laid a hit!"));
  it("penalty", () => expect(formatDefaultMessage("Anna", "Kjellbin", "penalty")).toBe("Anna Kjellbin took a penalty!"));
});
