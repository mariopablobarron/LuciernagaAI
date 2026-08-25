type OrgClassroomActor = {
  role: string;
  classroomId: string | null;
};

/** Individual student data is restricted to the teacher assigned to the classroom. */
export function canReadClassroomClinicalData(
  actor: OrgClassroomActor,
  classroomId: string
): boolean {
  return actor.role === "teacher" && actor.classroomId === classroomId;
}

/** Enrollment codes can be managed by the assigned teacher or an organization admin. */
export function canManageClassroomCodes(actor: OrgClassroomActor, classroomId: string): boolean {
  if (actor.role === "admin") return true;
  return actor.role === "teacher" && actor.classroomId === classroomId;
}
