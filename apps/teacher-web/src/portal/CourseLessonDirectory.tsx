import { Link } from "react-router-dom";
import type { CourseDeckDescriptor } from "@edu/course-content/deck-registry";

export function CourseLessonDirectory({
  deck,
  activityCounts,
  onPrepare,
}: {
  deck: CourseDeckDescriptor;
  activityCounts: readonly { lesson: number; count: number }[];
  onPrepare: (lesson: number) => void;
}) {
  const t = (zh: string, en: string) => deck.locale === "en" ? en : zh;
  const detailedCounts = deck.lessons.every(lesson =>
    lesson.coreSlideTotal !== undefined && lesson.optionalSlideTotal !== undefined);
  const core = deck.lessons.reduce((total, lesson) => total + (lesson.coreSlideTotal ?? 0), 0);
  const optional = deck.lessons.reduce((total, lesson) => total + (lesson.optionalSlideTotal ?? 0), 0);
  return (
    <section lang={deck.locale ?? "zh-CN"} aria-label={t("课程课件目录", "Course slide directory")}>
      <div className="workspace-course-summary">
        <span>{deck.lessons.length} {t("讲", "lectures")}</span>
        {deck.totalHours !== null && <span>{deck.totalHours} {t("学时", "teaching hours")}</span>}
        <span>{deck.slideTotal.toLocaleString("en-US")} {t("页课件", "slides")}</span>
        {detailedCounts && <span>{core.toLocaleString("en-US")} {t("页核心", "core")} · {optional} {t("页选学", "optional")}</span>}
      </div>
      <div className="workspace-lesson-list">
        {deck.lessons.map(lesson => (
          <article className="workspace-lesson-row" key={lesson.number}>
            <div>
              <span>{lesson.displayLabel ?? t(`第 ${lesson.number} 讲`, `Lecture ${lesson.number}`)} · {lesson.slideTotal} {t("页", "slides")}</span>
              <h2>{lesson.title}</h2>
              <small>{activityCounts.find(value => value.lesson === lesson.number)?.count ?? 0} {t("项已编排活动", "planned activities")}</small>
              {lesson.status === "ready" ? (
                <Link to={`/preview/${deck.courseId}?lesson=${lesson.number}`}>{t("查看课件 →", "Preview slides →")}</Link>
              ) : <span>{t("尚未发布", "Not published yet")}</span>}
              <Link to={`/courses/${deck.courseId}/activities?lesson=${lesson.number}`}>{t("教学活动 →", "Teaching activities →")}</Link>
              <button onClick={() => onPrepare(lesson.number)}>{t("备课笔记", "Preparation notes")}</button>
            </div>
            {lesson.hourRanges?.length && lesson.status === "ready" ? (
              <nav className="workspace-hour-links" aria-label={t(`第 ${lesson.number} 讲分学时课件`, `Lecture ${lesson.number} teaching hours`)}>
                {lesson.hourRanges.map(hour => (
                  <Link key={hour.number} to={`/preview/${deck.courseId}?lesson=${lesson.number}&hour=${hour.number}`}>
                    <strong>{t(`第 ${hour.number} 学时`, `Hour ${hour.number}`)} · {hour.durationMinutes} min</strong>
                    <span>{hour.title}</span>
                    <small>{t("页", "Pages")} {hour.localStart}–{hour.localEnd} · {hour.coreSlides} {t("页核心", "core slides")}</small>
                  </Link>
                ))}
                {lesson.optionalSlideTotal !== undefined && <small>{lesson.optionalSlideTotal} {t("页 Optional Challenge，不计入授课时间", "Optional Challenge slides outside the scheduled teaching hours")}</small>}
              </nav>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
