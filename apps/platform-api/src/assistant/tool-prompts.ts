import { getPortManagementLessonSlidePosition, getPortManagementReadyLessons, getPortManagementSlideByKey, PORT_MANAGEMENT_GLOBE_CUES } from "@edu/course-content";
import { ECONOMIC_MATHEMATICS_COURSE_ID } from "@edu/course-content/economic-mathematics";
import { getCourseDeckByCourseId } from "@edu/course-content/deck-registry";
const responseInstructions = [
  "顶层键必须按以下顺序输出：replyKind、dialogue、actions、schema、version。",
  'replyKind 必须为 "control" 或 "answer"，先判断教师是否需要教学回答。',
  '只要求翻页、跳转课次、切换活动、播放/暂停/继续地球仪等操作时，replyKind="control"，dialogue=""，只填写actions。禁止生成“好的”“已翻页”“我们翻到下一页”等确认语或过渡语。',
  '提问、讲解、分析等需要实质回答时，replyKind="answer"，dialogue仅填写教学回答；明确要求“翻页并讲解”时可以同时填写actions，但不添加操作确认语。无法执行或需要澄清时也用answer解释原因。'
];

export function buildClassroomToolPrompt(snapshot: { courseId: string; slide: { index: number; slideId: string; total: number } }): string {
  if (snapshot.courseId === ECONOMIC_MATHEMATICS_COURSE_ID) {
    const deck = getCourseDeckByCourseId(snapshot.courseId);
    const position = deck?.getLessonPosition(snapshot.slide.index);
    if (!deck || !position) {
      throw new Error("ECONOMIC_MATHEMATICS_ASSISTANT_CONTEXT_MISSING");
    }
    const lessonMap = deck.lessons
      .map(
        (lesson) =>
          `第${lesson.number}讲“${lesson.title}”：全局第${lesson.slideStart}—${lesson.slideEnd}页`
      )
      .join("；");
    return [
      "你必须只返回一个 JSON 对象，禁止 Markdown、代码围栏、前后缀或额外说明。",
      ...responseInstructions,
      'dialogue 是可直接朗读的简洁中文；actions 只能使用 slides.next、slides.previous、slides.go_to、lesson.go_to 或 activity.switch 到 slides。',
      `slides.go_to 的范围是1到${snapshot.slide.total}；lesson.go_to 的范围是1到32。`,
      "不得生成 globe、simulation、whiteboard、video 或学生作答动作。",
      `可跳转课次：${lessonMap}。`,
      `用户只说“第X页”时，默认指当前第${position.lessonNumber}讲的第X页；本讲内部全局页码 = ${position.lessonStart} + X - 1。`,
      'schema 固定为 "edu.classroom.assistant.response"，version 固定为 "1.0"。',
    ].join("\n");
  }

  const slidePosition = getPortManagementLessonSlidePosition(
    snapshot.slide.index
  )!;
  const readyLessonMap = getPortManagementReadyLessons()
    .map(
      (lesson) => {
        const localTotal =
          (lesson.slideEnd ?? 0) - (lesson.slideStart ?? 1) + 1;
        return `${lesson.label}“${lesson.title ?? "待建设"}”：学生可见第1—${localTotal}页，内部全局第${lesson.slideStart ?? "-"}—${lesson.slideEnd ?? "-"}页`;
      }
    )
    .join("；");
  const globeCueMap = PORT_MANAGEMENT_GLOBE_CUES.map(
    (cue) =>
      `${cue.id}（${cue.title}，仅可从${cue.startSlideKey}启动）`
  ).join("；");
  const openingCue = PORT_MANAGEMENT_GLOBE_CUES.find(
    (cue) => cue.id === "l1-opening-trade-influence"
  );
  const openingStartSlide = openingCue
    ? getPortManagementSlideByKey(openingCue.startSlideKey)
    : undefined;

  return [
    "你必须只返回一个 JSON 对象，禁止 Markdown、代码围栏、前后缀或额外说明。",
    ...responseInstructions,
    'dialogue 必须是可直接朗读给课堂听众的简洁中文字符串；不要在 dialogue 中朗读 JSON、动作名或控制参数。',
    "actions 必须是数组，只能使用以下动作：",
    '- {"type":"slides.next"}',
    '- {"type":"slides.previous"}',
    `- {"type":"slides.go_to","slide":1到${snapshot.slide.total}的整数}`,
    '- {"type":"lesson.go_to","lesson":1到16的整数}',
    '- {"type":"activity.switch","activity":"slides|globe|simulation|whiteboard|video|interaction"}',
    '- {"type":"globe.play_cue","cueId":"课程注册表中的固定cue ID"}',
    '- {"type":"globe.pause"}',
    '- {"type":"globe.resume"}',
    '- {"type":"globe.restart"}',
    `可用地球仪cue：${globeCueMap}。`,
    `教师在正式封面说“助教，开始第一讲”时，静默跳转到英法下注页${openingStartSlide ? `（内部全局第${openingStartSlide.index}页）` : ""}，不得直接播放地球仪。`,
    "只有当前页为 l1-1700-wager，且教师说“开始追踪证据”“沿丝绸航线寻找证据”或语义等价的明确口令时，才选择 globe.play_cue 的 l1-opening-trade-influence；不得生成经纬度、持续时间、字幕或任意相机轨迹。",
    "地球仪逐段讲解词由课程注册表预先编写，LLM不得复述整段动画讲稿，也不得声称动画已播放完成。",
    "slides.go_to 的 slide 只接受内部全局页码；学生和教师看到的是每讲独立页码，生成动作前必须完成换算。",
    `用户只说“第X页”时，默认指当前第${slidePosition.lessonNumber}讲的第X页；本讲内部全局页码 = ${slidePosition.lessonStart} + X - 1。`,
    "用户明确说“第N讲第X页”时，先按已建设课次映射换算；待建设讲次或越界页码不得生成跳转动作。",
    "不需要控制课堂时actions返回空数组。操作不需要语音确认；需要教学回答时直接回答，不声称动作已经执行。",
    `可跳转的已建设课次：${readyLessonMap}。第4到16讲尚未建设，不得为其虚构标题、页码或教学内容。`,
    'schema 固定为 "edu.classroom.assistant.response"，version 固定为 "1.0"。',
    '回答示例：{"replyKind":"answer","dialogue":"港口通常由水域、陆域和连接设施构成。","actions":[],"schema":"edu.classroom.assistant.response","version":"1.0"}',
    '操作示例：{"replyKind":"control","dialogue":"","actions":[{"type":"slides.next"}],"schema":"edu.classroom.assistant.response","version":"1.0"}',
  ].join("\n");
}
