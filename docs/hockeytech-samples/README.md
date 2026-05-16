# HockeyTech PWHL API — Sample Responses

Captured 2026-05-15. All files are pretty-printed JSON.

## Base URL

```
https://lscluster.hockeytech.com/feed/index.php
  ?feed=<modulekit|statviewfeed|gc>
  &key=446521baf8c38984
  &client_code=pwhl
```

## Season IDs (from `seasons.json`)

| season_id | name                    | playoff |
|-----------|-------------------------|---------|
| 9         | 2026 Playoffs           | yes     |
| 8         | 2025-26 Regular Season  | no      |
| 7         | 2025-26 Preseason       | no      |
| 6         | 2025 Playoffs           | yes     |
| 5         | 2024-25 Regular Season  | no      |
| 4         | 2024-25 Preseason       | no      |
| 3         | 2024 Playoffs           | yes     |
| 1         | 2024 Regular Season     | no      |
| 2         | 2024 Preseason          | no      |

## Team IDs (from `teams-by-season-s8-2025-26.json`)

| id | name                  | code |
|----|-----------------------|------|
| 1  | Boston Fleet          | BOS  |
| 2  | Minnesota Frost       | MIN  |
| 3  | Montréal Victoire     | MTL  |
| 4  | New York Sirens       | NY   |
| 5  | Ottawa Charge         | OTT  |
| 6  | Toronto Sceptres      | TOR  |
| 8  | Seattle Torrent       | SEA  |
| 9  | Vancouver Goldeneyes  | VAN  |

Note: IDs are not contiguous (no 7). The 2026 Playoffs season (9) has 4 teams:
Boston, Minnesota, Montréal, Ottawa. Team set changes each season — always
fetch dynamically.

---

## Endpoint Reference

### `feed=modulekit` endpoints

#### `view=seasons` → `seasons.json`
```
SiteKit.Seasons[] → { season_id, season_name, shortname, career, playoff, start_date, end_date }
```
`career="1"` means stats count for career totals. `playoff="1"` for playoff seasons.

---

#### `view=teamsbyseason&season_id=N` → `teams-by-season-s8-2025-26.json`
```
SiteKit.Teamsbyseason[] → { id, name, city, code, nickname, team_caption,
                             division_id, division_long_name, division_short_name,
                             team_logo_url }
```
Only returns teams active in that season segment. Playoff seasons return subset.

---

#### `view=roster&team_id=N&season_id=N` → `roster-team{N}-s8-2025-26.json`
```
SiteKit.Roster[] → sections, each section → players[]
Player shape: { player_id, first_name, last_name, birthdate, shoots, position,
                jersey_number, height, weight, birthtown, birthprov, birthcountry,
                ... plus season stats columns }
```
Includes jersey number, position (F/D/G), hometown fields, and season stats inline.
This is the richest single-player-per-team source — prefer this over the stats endpoints
for building a players table.

---

#### `view=player&category=profile&player_id=N` → `player-profile-32-poulin.json`
```
SiteKit.Player → { info: { player_id, first_name, last_name, birthdate, position,
                            jersey_number, shoots, height, weight, birthtown,
                            birthprov, birthcountry, image_url, ... } }
```
Individual player profile. Same biographical fields as roster but isolated per player.
Use for lookup by player_id when roster isn't loaded.

---

#### `view=player&category=seasonstats&player_id=N` → `player-seasonstats-32-poulin.json`
```
SiteKit.Player → { seasonstats: [ { season_id, season_name, team_id, team_name,
                                     regular_season: { gp, g, a, pts, ... },
                                     playoffs: { ... } } ] }
```
Career history across all seasons + teams — useful for "past teams" data.

---

#### `view=player&category=mostrecentseasonstats&player_id=N` → `player-mostrecentstats-32-poulin.json`
```
SiteKit.Player → { mostrecentseasonstats: { season_id, team_id, ... stats } }
```
Convenience endpoint: just the most recent season row.

---

#### `view=searchplayers&search_term=X` → `search-players-poulin.json`
```
SiteKit.Search → [ { player_id, first_name, last_name, team_id, team_name,
                      position, season_id } ]
```
Name search. Returns lightweight results (no stats). Good for autocomplete UI.

---

#### `view=statviewtype&type=standings&season_id=N` → `standings-s8-2025-26.json`
```
SiteKit.Statviewtype → conference standings with W/L/OTL/pts per team
```

---

#### `view=statviewtype&type=topscorers&season_id=N` → `topscorers-s8-2025-26.json`
Large (393K). Includes every skater who appeared, sorted by points. Each entry has
player_id, first/last name, team, GP, G, A, PTS, +/-, PIM, etc.

---

#### `view=statviewtype&type=topgoalies&season_id=N` → `topgoalies-s5-2024-25.json`
Goalie stats: GAA, SV%, SO, W/L/OTL per goalie.

---

#### `view=statviewtype&type=transactions&season_id=N` → `transactions-s5-2024-25.json`
```
SiteKit.Statviewtype → [ { date, type, player_id, player_name, from_team, to_team } ]
```
Trades, signings, waivers. Source for "past teams" history alongside `seasonstats`.

---

#### `view=statviewtype&type=streaks&season_id=N` → `streaks-s5-2024-25.json`
Current point/goal/assist streaks per player.

---

#### `view=brackets&season_id=N` → `brackets-s3-2024-playoffs.json`
Playoff bracket tree. Only meaningful for playoff season_ids (3, 6, 9).

---

#### `view=schedule&season_id=N` → `schedule-s5-2024-25.json`
Full season schedule (304K). Every game with date, home/away team IDs, arena, status.
Top-level key: `SiteKit.Schedule[]`.

---

#### `view=scorebar&numberofdaysback=N&numberofdaysahead=N` → `scorebar-full.json`
570K. Returns all games in window with live scores. The official site polls this.
Keys per game: `game_id`, `home_team`, `visiting_team`, `game_status`, `home_goal_count`,
`visiting_goal_count`, `period`, `time_remaining`. Use `game_status` to detect live games.

---

### `feed=statviewfeed` endpoints

#### `view=players&season=N&position=skaters` → `skaters-all-s8-2025-26.json`
**JSONP warning:** raw response is wrapped in `(...)` — strip before parsing.
443K. All skaters for the season in a nested `sections[].rows[]` structure.
Each row has player_id, name, team, position, and full stat columns. Column keys are
in `sections[].headers{}`.

---

#### `view=players&season=N&position=goalies` → `goalies-all-s8-2025-26.json`
**JSONP warning:** same `(...)` wrapper as skaters.
50K. Same structure as skaters but with goalie stat columns (GAA, SV%, SO, etc.).

---

#### `view=bootstrap&pageName=scorebar` → `bootstrap-scorebar.json`
Config/init payload the Angular app loads on startup. Contains Firebase URL + API key,
current season_id, league config. Useful for discovering the "current" season_id
without hardcoding it — read `SiteKit.Bootstrap.currentSeason`.

---

### `feed=gc` (Game Center) endpoints

All game-center endpoints use `game_id=N`. Samples use game 137 (a completed game).

#### `tab=preview` → `game-preview-137.json`
80K. Pre-game roster lineups, head-to-head stats, team records. Has both teams'
full dressed rosters with jersey numbers for that game.

---

#### `tab=gamesummary` → `game-gamesummary-137.json`
93K. Final score, goals, penalties, shots by period. Same `game_goal_id` / `game_penalty_id`
stable dedup keys as the `statviewfeed` play-by-play. Top-level keys:
`GC.Gamesummary.{ details, homeTeam, visitingTeam, periods[], penaltySummary, referees }`.

`details` fields to gate the poller:
- `started`: "1"/"0"
- `final`: "1"/"0"  
- `status`: "Unofficial Final", "Final", etc.

---

#### `tab=pxp` → `game-pxp-short-137.json`
6.8K. Short play-by-play — one line per event, text description only. Not useful for
structured event processing; use `pxpverbose` instead.

---

#### `tab=pxpverbose` → `game-pxpverbose-137.json`
252K. Full structured play-by-play. Same event types as `gameCenterPlayByPlay` in the
`statviewfeed`:
- `goal` → has `game_goal_id` (stable dedup key), `scoredBy`, `assists`, `properties`
- `penalty` → has `game_penalty_id` (stable dedup key), `takenBy`, `servedBy`, `minutes`
- `shot` → no stable ID; dedup by (period.id, time, shooter.id)
- `hit`, `blocked_shot`, `faceoff`, `goalie_change`

`properties.*` are string "0"/"1", not booleans.

---

#### `tab=clock` → `game-clock-137.json`
3.8K. Just the current game clock state: period, time remaining, running/stopped flag.
Lightweight poll target for knowing if a game is live without fetching the full summary.

---

## Notes on old `.js` sample files

`sample-gameCentrePlayByPlay-response.js` and `sample-gameSummary-response.js` are the
original captures from 2026-05-10 using the `statviewfeed` variant of those endpoints
(JSONP-wrapped). The new `.json` files in this directory use the `feed=gc` variant, which
returns plain JSON. Both cover the same events but the `gc` feed has a slightly different
key structure (nested under `GC.` instead of at the top level).
