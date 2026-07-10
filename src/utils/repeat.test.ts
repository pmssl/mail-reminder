import { describe, expect, it } from "vitest";
import { calculateInitialNextRun, calculateNextRunAfter, calculateNextRunFromSchedule, describeRepeat } from "./repeat";

describe("repeat rules", () => {
  it("advances day intervals until the next future run", () => {
    expect(
      calculateNextRunAfter(
        {
          repeat_type: "days",
          repeat_value: 90,
          start_date: "2026-01-01",
          next_run: "2026-01-01",
        },
        "2026-07-10",
      ),
    ).toBe("2026-09-28");
  });

  it("keeps monthly schedules on the last valid day", () => {
    expect(
      calculateNextRunAfter(
        {
          repeat_type: "monthly",
          repeat_value: 1,
          start_date: "2026-01-31",
          next_run: "2026-01-31",
        },
        "2026-01-31",
      ),
    ).toBe("2026-02-28");
  });

  it("disables once-only reminders after sending", () => {
    expect(
      calculateNextRunAfter(
        {
          repeat_type: "once",
          repeat_value: 1,
          start_date: "2026-07-10",
          next_run: "2026-07-10",
        },
        "2026-07-10",
      ),
    ).toBeNull();
  });

  it("describes repeat intervals for display", () => {
    expect(describeRepeat("weekly", 1)).toBe("Weekly");
    expect(describeRepeat("weekly", 3)).toBe("Every 3 weeks");
  });

  it("uses the first interval as the initial next run for recurring reminders", () => {
    expect(calculateInitialNextRun("2026-07-10", "days", 10)).toBe("2026-07-20");
    expect(calculateInitialNextRun("2026-07-10", "weekly", 1)).toBe("2026-07-17");
    expect(calculateInitialNextRun("2026-07-10", "once", 1)).toBe("2026-07-10");
  });

  it("recalculates the next scheduled run from the start date and repeat rule", () => {
    expect(calculateNextRunFromSchedule("2026-07-10", "days", 10, "2026-07-10")).toBe("2026-07-20");
    expect(calculateNextRunFromSchedule("2026-07-10", "days", 10, "2026-07-30")).toBe("2026-07-30");
    expect(calculateNextRunFromSchedule("2026-07-10", "days", 10, "2026-08-01")).toBe("2026-08-09");
    expect(calculateNextRunFromSchedule("2026-07-10", "once", 1, "2026-08-01")).toBe("2026-07-10");
  });
});
