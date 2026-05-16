import { describe, it, expect } from "vitest";
import { filterPlayers } from "../lib/filterPlayers";

const players = [
  { id: 32, first_name: "Marie-Philip", last_name: "Poulin", position: "F", jersey_number: "29", teams: null },
  { id: 1,  first_name: "Sarah",        last_name: "Nurse",  position: "F", jersey_number: "20", teams: null },
  { id: 2,  first_name: "Ann-Renée",    last_name: "Desbiens", position: "G", jersey_number: "35", teams: null },
];

describe("filterPlayers", () => {
  it("returns all when query is empty", () => {
    expect(filterPlayers(players, "")).toHaveLength(3);
  });

  it("returns all when query is whitespace", () => {
    expect(filterPlayers(players, "   ")).toHaveLength(3);
  });

  it("matches by last name", () => {
    expect(filterPlayers(players, "poulin")).toHaveLength(1);
    expect(filterPlayers(players, "poulin")[0].id).toBe(32);
  });

  it("matches by first name", () => {
    expect(filterPlayers(players, "sarah")).toHaveLength(1);
  });

  it("matches partial name across first+last", () => {
    expect(filterPlayers(players, "philip poulin")).toHaveLength(1);
  });

  it("returns empty when no match", () => {
    expect(filterPlayers(players, "zzzzzz")).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    expect(filterPlayers(players, "NURSE")).toHaveLength(1);
  });
});
