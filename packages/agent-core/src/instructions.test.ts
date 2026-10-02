import { demoSnapshot } from "@lobbystack/shared";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import { buildLiveInstructions } from "./instructions";

const callStart = DateTime.fromISO("2026-10-01T18:30:00.000Z");

describe("buildLiveInstructions", () => {
  it("gives GPT-Live the snapshot's hours, services and call start time so it answers them without delegating", () => {
    const instructions = buildLiveInstructions({
      ...demoSnapshot,
      services: [{ id: "svc-checkup", name: "General Checkup", durationMinutes: 30, description: "A routine visit." }],
      closures: [
        { startsAt: "2026-09-01T13:00:00.000Z", endsAt: "2026-09-02T13:00:00.000Z", reason: "Past" },
        { startsAt: "2026-12-24T14:00:00.000Z", endsAt: "2026-12-27T14:00:00.000Z", reason: "Holidays" },
      ],
    }, callStart);

    expect(instructions).toContain("answer questions about them yourself without delegating");
    expect(instructions).toContain("The call started on Thursday, October 1, 2026, at 2:30 PM (America/Toronto).");
    expect(instructions).toContain("Opening hours (America/Toronto):\nSunday: closed\nMonday: 9:00 AM to 5:00 PM");
    expect(instructions).toContain("Friday: 9:00 AM to 4:00 PM\nSaturday: closed");
    expect(instructions).toContain("Upcoming closures: Dec 24, 9:00 AM to Dec 27, 9:00 AM (Holidays).");
    expect(instructions).not.toContain("Past");
    expect(instructions).toContain("Services:\n- General Checkup (30 min): A routine visit.");
  });

  it("leaves out hours and services the business hasn't set, so GPT-Live delegates them", () => {
    const instructions = buildLiveInstructions({ ...demoSnapshot, hours: [], services: [] }, callStart);
    expect(instructions).not.toContain("Opening hours");
    expect(instructions).not.toContain("Services:");
  });
});
