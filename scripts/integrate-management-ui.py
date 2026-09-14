from pathlib import Path
def edit(file, transform):
    p=Path(file); s=p.read_text(encoding='utf-8'); p.write_text(transform(s),encoding='utf-8')
def classrooms(s):
    s=s.replace('[ECONOMIC_MATHEMATICS_COURSE_ID, "statistical-analysis"]','[ECONOMIC_MATHEMATICS_COURSE_ID, "statistical-analysis", "management-principles"]')
    return s
edit('apps/teacher-web/src/features/classroom/StudentClassroom.tsx',classrooms)
def teacher(s):
    s=classrooms(s)
    s=s.replace('const isRegisteredCourse = isEconomicMathematics || isStatisticalAnalysis;', 'const isManagement = snapshot.courseId === "management-principles";\n  const isRegisteredCourse = isEconomicMathematics || isStatisticalAnalysis || isManagement;')
    s='import { ManagementSourceLocator } from "../management-principles/ManagementTeacherTools";\n'+s
    marker='{isStatisticalAnalysis && !isFullscreen &&'
    assert marker in s
    s=s.replace(marker,'{isManagement && !isFullscreen && <ManagementSourceLocator index={snapshot.slide.index} onJump={index => void sendEvent({type:"set_slide",index})}/>}\n      '+marker,1)
    s=s.replace('{!isStatisticalAnalysis && <TeacherParticipation','{!isStatisticalAnalysis && !isManagement && <TeacherParticipation')
    s=s.replace('onParticipation={isStatisticalAnalysis ? undefined', 'onParticipation={isStatisticalAnalysis || isManagement ? undefined')
    return s
edit('apps/teacher-web/src/features/classroom/ClassroomSubsystem.tsx',teacher)
def app(s):
    s='import { getCourseDeckByCourseId, getCoursePresentation } from "@edu/course-content/deck-registry";\nimport { ManagementCourseOverview } from "./features/management-principles/ManagementTeacherTools";\n'+s
    a=s.index('function CourseArtwork(');b=s.index('\nfunction StudyRoute()',a)
    s=s[:a]+'''function CourseArtwork({ courseId }: { courseId: string }) {
  const profile=getCoursePresentation(courseId);
  return profile ? <div className="portal-course-art"><img src={profile.heroImage} alt={`${profile.shortTitle} · 教学情境艺术图`} decoding="async"/></div> : <div className="portal-course-art"><BookOpen size={70}/></div>;
}
'''+s[b:]
    a=s.index('function StudyRoute()');b=s.index('\n}',a)+2
    s=s[:a]+'''function StudyRoute() {
  const { courseId = "" } = useParams();
  const profile=getCoursePresentation(courseId);
  if (!profile?.supportsStudy) return <main className="study-unavailable"><BookOpen size={32}/><h1>{profile?.shortTitle ?? "本课程"}课下学习暂未开放</h1><span>请通过教师课堂与学生同步画面学习。</span><Link to={`/courses/${courseId}`}>返回课程工作区</Link></main>;
  return <Suspense fallback={<LoadingState label="正在打开课下学习空间"/>}><StudentStudyPage/></Suspense>;
}'''+s[b:]
    s=s.replace('if (course.id === STATISTICAL_ANALYSIS_COURSE_ID && lesson === 2) await api.sendClassroomEvent(session.id, {type:"set_slide",index:49});','const startIndex = getCourseDeckByCourseId(course.id)?.getGlobalIndex(lesson);\n      if (startIndex && startIndex !== 1) await api.sendClassroomEvent(session.id, {type:"set_slide",index:startIndex});')
    s=s.replace('const isStatisticalAnalysis = course.id === STATISTICAL_ANALYSIS_COURSE_ID;','const isStatisticalAnalysis = course.id === STATISTICAL_ANALYSIS_COURSE_ID;\n  const isManagement = course.id === "management-principles";')
    s=s.replace('const lessonPreparationSteps = isStatisticalAnalysis ?', '''const lessonPreparationSteps = isManagement ? [
    {label:"讲次范围",status:"前四讲 · 原299页"},{label:"课堂 Slides",status:"367个连续网页页面"},
    {label:"课堂演示",status:"8处教师推进 · 同步观看"},{label:"课程署名",status:"管理学课程组 · 韦笑"}
  ] : isStatisticalAnalysis ?''')
    s=s.replace('(isEconomicMathematics || isStatisticalAnalysis)', '(isEconomicMathematics || isStatisticalAnalysis || isManagement)')
    s=s.replace('const completed = isEconomicMathematics || isStatisticalAnalysis || index < 2;', 'const completed = isEconomicMathematics || isStatisticalAnalysis || isManagement || index < 2;')
    s=s.replace('isStatisticalAnalysis ? "把商业判断', 'isManagement ? "理解管理与组织，沿理论演变、决策过程和环境分析形成有证据的管理判断。" : isStatisticalAnalysis ? "把商业判断')
    marker='{isStatisticalAnalysis && <Suspense fallback={<p>正在装载讲次目录…</p>}>'
    assert marker in s
    s=s.replace(marker,'{isManagement && <ManagementCourseOverview onStart={lesson => void startClass(lesson)} busy={starting}/>}\n          '+marker)
    s=s.replace('{!isStatisticalAnalysis && <Link className="button button--secondary button--wide" to={`/courses/${course.id}/exercises`}', '{!isStatisticalAnalysis && !isManagement && <Link className="button button--secondary button--wide" to={`/courses/${course.id}/exercises`}')
    s=s.replace('{!isStatisticalAnalysis && course.id !== ECONOMIC_MATHEMATICS_COURSE_ID && (', '{getCoursePresentation(course.id)?.supportsStudy && (')
    s=s.replace('{course.totalHours} 学时', '{course.totalHours === null ? "总学时待完善" : `${course.totalHours} 学时`}')
    s=s.replace('{course.code} ·', '{course.code ?? "课程代码待完善"} ·')
    s=s.replace('{isStatisticalAnalysis ? "第1、2讲完整课件已关联"', '{isManagement ? "前四讲网页课件已关联" : isStatisticalAnalysis ? "第1、2讲完整课件已关联"')
    s=s.replace('{isStatisticalAnalysis ? "教师播放、讲解备注与学生同步"', '{isManagement ? "原页定位、分步演示与学生同步" : isStatisticalAnalysis ? "教师播放、讲解备注与学生同步"')
    return s
edit('apps/teacher-web/src/App.tsx',app)
edit('apps/platform-api/src/app.ts',lambda s:s.replace('["course-economic-mathematics", "statistical-analysis"]','["course-economic-mathematics", "statistical-analysis", "management-principles"]'))
