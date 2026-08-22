import { canManageClassroomCodes, canReadClassroomClinicalData } from "./org-classroom-access";

describe("organization classroom access", () => {
  it.each([
    ["teacher", "classroom-a", true],
    ["teacher", "classroom-b", false],
    ["hr", null, false],
    ["therapist", null, false],
    ["admin", null, false],
    ["owner", null, false],
  ])("limits clinical data for role %s", (role, classroomId, expected) => {
    expect(canReadClassroomClinicalData({ role, classroomId }, "classroom-a")).toBe(expected);
  });

  it.each([
    ["teacher", "classroom-a", true],
    ["teacher", "classroom-b", false],
    ["admin", null, true],
    ["hr", null, false],
    ["therapist", null, false],
    ["owner", null, false],
  ])("limits code management for role %s", (role, classroomId, expected) => {
    expect(canManageClassroomCodes({ role, classroomId }, "classroom-a")).toBe(expected);
  });
});
