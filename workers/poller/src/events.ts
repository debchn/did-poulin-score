import type {
  PxpEvent,
  PxpGoal,
  PxpShot,
  PxpBlockedShot,
  PxpHit,
  PxpPenalty,
} from "./hockeytech";

export type EventType =
  | "goal"
  | "assist"
  | "quality_shot"
  | "hit_laid"
  | "penalty";
// Note: "hit_received" is in the schema/UI but the play-by-play feed only
// exposes the hitter, not the hittee. Omitted here until the API exposes it.

export interface PollerEvent {
  eventKey: string;  // globally unique dedup key stored in internal.seen_events
  eventType: EventType;
  playerId: number;
  playerFirstName: string;
  playerLastName: string;
}

function isQualityShot(description: string): boolean {
  // Values starting with "Quality": "Quality on net", "Quality blocked", "Quality goal"
  // Exclude "Quality goal" — those are caught by the goal event.
  return (
    description.startsWith("Quality") && description !== "Quality goal"
  );
}

export function extractEvents(pbp: PxpEvent[]): PollerEvent[] {
  const events: PollerEvent[] = [];

  for (const raw of pbp) {
    switch (raw.event) {
      case "goal": {
        const e = raw as PxpGoal;
        // Scorer
        events.push({
          eventKey: `goal:${e.id}`,
          eventType: "goal",
          playerId: parseInt(e.goal_scorer.player_id, 10),
          playerFirstName: e.goal_scorer.first_name,
          playerLastName: e.goal_scorer.last_name,
        });
        // Assists — separate event keys so each dedup independently
        if (e.assist1_player) {
          events.push({
            eventKey: `assist:${e.id}:${e.assist1_player.player_id}`,
            eventType: "assist",
            playerId: parseInt(e.assist1_player.player_id, 10),
            playerFirstName: e.assist1_player.first_name,
            playerLastName: e.assist1_player.last_name,
          });
        }
        if (e.assist2_player) {
          events.push({
            eventKey: `assist:${e.id}:${e.assist2_player.player_id}`,
            eventType: "assist",
            playerId: parseInt(e.assist2_player.player_id, 10),
            playerFirstName: e.assist2_player.first_name,
            playerLastName: e.assist2_player.last_name,
          });
        }
        break;
      }

      case "shot": {
        const e = raw as PxpShot;
        // Skip shots that were goals — already handled above
        if (e.game_goal_id) break;
        if (!isQualityShot(e.shot_quality_description)) break;
        events.push({
          eventKey: `shot:${e.id}`,
          eventType: "quality_shot",
          playerId: parseInt(e.player.player_id, 10),
          playerFirstName: e.player.first_name,
          playerLastName: e.player.last_name,
        });
        break;
      }

      case "blocked_shot": {
        const e = raw as PxpBlockedShot;
        if (!isQualityShot(e.shot_quality_description)) break;
        events.push({
          eventKey: `blocked_shot:${e.id}`,
          eventType: "quality_shot",
          playerId: parseInt(e.player.player_id, 10),
          playerFirstName: e.player.first_name,
          playerLastName: e.player.last_name,
        });
        break;
      }

      case "hit": {
        const e = raw as PxpHit;
        events.push({
          eventKey: `hit:${e.id}`,
          eventType: "hit_laid",
          playerId: parseInt(e.hitter.player_id, 10),
          playerFirstName: e.hitter.first_name,
          playerLastName: e.hitter.last_name,
        });
        break;
      }

      case "penalty": {
        const e = raw as PxpPenalty;
        events.push({
          eventKey: `penalty:${e.id}`,
          eventType: "penalty",
          playerId: parseInt(e.player_penalized_info.player_id, 10),
          playerFirstName: e.player_penalized_info.first_name,
          playerLastName: e.player_penalized_info.last_name,
        });
        break;
      }
    }
  }

  return events;
}

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
    case "penalty":      return `${name} took a penalty!`;
  }
}
