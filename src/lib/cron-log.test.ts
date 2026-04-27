import { dailyUtcKey, isoWeekKey } from "./cron-log";

describe("dailyUtcKey", () => {
  it("returns YYYY-MM-DD in UTC", () => {
    expect(dailyUtcKey(new Date("2026-04-27T15:30:00Z"))).toBe("2026-04-27");
  });

  it("rolls over at UTC midnight, not local", () => {
    // 2026-04-27 23:30 UTC is still 2026-04-27 even if local TZ is +02:00 (which would be 01:30 next day)
    expect(dailyUtcKey(new Date("2026-04-27T23:30:00Z"))).toBe("2026-04-27");
    expect(dailyUtcKey(new Date("2026-04-28T00:00:01Z"))).toBe("2026-04-28");
  });
});

describe("isoWeekKey", () => {
  it("returns YYYY-Www", () => {
    const key = isoWeekKey(new Date("2026-04-27T12:00:00Z")); // Monday
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("a Monday and the following Sunday share the same ISO week", () => {
    // Monday 2026-04-27 — Sunday 2026-05-03
    const mon = isoWeekKey(new Date("2026-04-27T08:00:00Z"));
    const sun = isoWeekKey(new Date("2026-05-03T22:00:00Z"));
    expect(mon).toBe(sun);
  });

  it("a Sunday and the following Monday belong to different ISO weeks", () => {
    // Sunday 2026-05-03 — Monday 2026-05-04
    const sun = isoWeekKey(new Date("2026-05-03T22:00:00Z"));
    const mon = isoWeekKey(new Date("2026-05-04T08:00:00Z"));
    expect(sun).not.toBe(mon);
  });

  it("ISO week W01 belongs to the year that contains Thursday", () => {
    // 2027-01-01 is a Friday → ISO week 2026-W53
    expect(isoWeekKey(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
    // 2027-01-04 is a Monday → ISO week 2027-W01
    expect(isoWeekKey(new Date("2027-01-04T12:00:00Z"))).toBe("2027-W01");
  });
});
