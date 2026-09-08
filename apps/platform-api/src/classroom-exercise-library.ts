import type { DatabaseSync } from "node:sqlite";
import { classroomExerciseInputSchema, type ClassroomExercise, type ClassroomExerciseInput } from "@edu/contracts";
import { lessonOneExercises } from "./lesson-one-exercises.js";

const fail = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode });
export class ClassroomExerciseLibrary {
  constructor(private readonly db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS classroom_exercises(id TEXT NOT NULL, course_id TEXT NOT NULL, version INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(course_id,id));
      CREATE TABLE IF NOT EXISTS classroom_exercise_publications(activity_id TEXT PRIMARY KEY, course_id TEXT NOT NULL, exercise_id TEXT NOT NULL, exercise_version INTEGER NOT NULL);`);
  }
  private seed(courseId: string) {
    if (courseId !== "course-port-management-intro") return;
    const insert = this.db.prepare("INSERT OR IGNORE INTO classroom_exercises VALUES(?,?,1,?)");
    for (const { id, ...exercise } of lessonOneExercises) insert.run(id, courseId, JSON.stringify(classroomExerciseInputSchema.parse(exercise)));
  }
  list(courseId: string, sessionId: string): ClassroomExercise[] {
    this.seed(courseId);
    const rows = this.db.prepare(`SELECT e.*, (SELECT COUNT(*) FROM classroom_exercise_publications p JOIN participation_activities a ON a.id=p.activity_id WHERE p.course_id=e.course_id AND p.exercise_id=e.id AND a.session_id=?) published_count FROM classroom_exercises e WHERE e.course_id=?`).all(sessionId, courseId) as Array<{ id: string; version: number; body: string; published_count: number }>;
    return rows.map(row => ({ ...JSON.parse(row.body) as ClassroomExerciseInput, id: row.id, version: row.version, publishedCount: row.published_count })).sort((a, b) => a.lesson - b.lesson || a.order - b.order || a.id.localeCompare(b.id));
  }
  get(courseId: string, id: string) {
    const row = this.db.prepare("SELECT version,body FROM classroom_exercises WHERE course_id=? AND id=?").get(courseId, id) as { version: number; body: string } | undefined;
    if (!row) throw fail(404, "未找到这门课的习题");
    return { ...JSON.parse(row.body) as ClassroomExerciseInput, id, version: row.version };
  }
  save(courseId: string, id: string, expectedVersion: number, exercise: ClassroomExerciseInput) {
    const body = JSON.stringify(exercise);
    if (expectedVersion === 0) {
      const result = this.db.prepare("INSERT OR IGNORE INTO classroom_exercises VALUES(?,?,1,?)").run(id, courseId, body);
      if (!result.changes) throw fail(409, "这道题已经存在，请刷新后编辑");
    } else {
      const result = this.db.prepare("UPDATE classroom_exercises SET version=version+1,body=? WHERE course_id=? AND id=? AND version=?").run(body, courseId, id, expectedVersion);
      if (!result.changes) throw fail(409, "题目已被其他页面修改，请刷新题库后重新编辑");
    }
  }
  recordPublication(courseId: string, id: string, version: number, activityId: string) {
    this.db.prepare("INSERT OR IGNORE INTO classroom_exercise_publications VALUES(?,?,?,?)").run(activityId, courseId, id, version);
  }
}
