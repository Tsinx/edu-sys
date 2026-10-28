import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {researchPapers} from '../packages/course-content/src/statistical-analysis/research-literature.js';
import {researchLessons} from '../packages/course-content/src/statistical-analysis/research-lessons.js';
const root=new URL('../apps/teacher-web/public/course-assets/statistical-analysis/research-14-15/',import.meta.url);
await mkdir(root,{recursive:true});
const paragraphs=[
 '摘要提出领导行为、心理与创意过程的连接。沿Methods记录670、498、367的样本形成与报告者；把L、P、M、E、C接入Figure 2路径及课堂结构方程。再读Table 2与六条主路径的报告系数，最后用两项日常管理动作解释授权与创意过程支持。',
 '摘要把可持续战略连接到组织流程与长期表现。读Sample Selection，画出90家高可持续企业、269家候选与90对配对；用得分及最近邻公式理解比较对象。接着读Table 7四因子模型与月度α，把治理、激励、沟通和信息管理连接到战略实施。',
 '摘要提出平台竞争、酒店定位与定价反应。读Data和Empirical Strategy，把酒店—月份连接到城市供给；逐项读原文式(1)，认清β、酒店效应、年月效应与城市历月季节项。读Table 3后，用供给弹性进行经营量级换算，再按客群和旺季解释经营含义。',
 '摘要报告管理支持、生产率与实践采纳。读III.C–D梳理17家公司、28家工厂与20家实验工厂；按脚注18认清TFP。逐项读原文式(1)的TREAT与DURING，再读Table II列(4)的0.154、精度与1831条工厂—周记录。用Appendix Table A.II的两阶段表达连接累积实施周数、38项实践采纳比例与TFP，形成实施建议。',
 '摘要把混合办公、留任与工作表现连起来。读The experiment和Randomization，记录1612名员工、两批纳入与生日日期奇偶分配。用Fig.2的7.2%和4.8%计算−2.4个百分点及−33.3%；随后一起读满意度、绩效与晋升。用Discussion约2万美元/次招聘培训成本，完成1000名同类岗位员工的六个月预算换算。'
];
const access=[
 '公开论文镜像已核对刊名、题名和正文；优先从DOI或图书馆访问。',
 '作者公开稿：https://www.hbs.edu/ris/Publication%20Files/SSRN-id1964011_6791edac-7daa-4603-a220-4a0c6c7a3f7a.pdf',
 '作者公开稿（Last revised November 18, 2016）：https://people.bu.edu/zg/publications/airbnb.pdf',
 '作者研究目录：https://nbloom.people.stanford.edu/research 。按题名选择已发表版本，核对QJE 128(1):1–51。',
 '开放正文：https://www.nature.com/articles/s41586-024-07500-2'
];
const guide=['# 第14讲五篇论文阅读引导','','每篇沿“题目与摘要→问题与资料→主要模型→估计结果→管理解释”连续阅读。摘要为中文提要；公式按原文位置标注原式或课堂转写。','',
 ...researchPapers.flatMap((p,i)=>['## '+(i+1)+'. '+p.topic,'',p.authors+' ('+p.year+'). '+p.title+'. '+p.journal+', '+p.volume+'('+p.issue+'): '+p.pages+'.','DOI: https://doi.org/'+p.doi,'',access[i]!,'',paragraphs[i]!,'',
 ...researchLessons[0]!.filter(page=>page.source===p.id&&page.abstract).flatMap(page=>['### 摘要（中文提要）',...page.abstract!.paragraphs,'位置：'+page.abstract!.locator,'']),
 ...researchLessons[0]!.filter(page=>page.source===p.id&&page.model&&page.kind!=='feedback').flatMap(page=>['### '+page.title,'公式位置：'+page.model!.provenance,...page.model!.equations.map(e=>'$$'+e+'$$'),...page.model!.symbols.map(([symbol,meaning])=>symbol+'：'+meaning),'']),
 '阅读卡：研究问题____；资料与记录单位____；模型中的结果量____；关注的参数____；量级与精度____；管理解释____；可借鉴的项目做法____。','']),
 '## 阅读以后','从自己的问题出发选择一篇作参照，写出资料、模型、目标参数与一项具体管理用途。',''].join('\n');
const worksheet=['# 第15讲综合复习工作纸','','用自己的酒店订单项目或自选论文作答；保留第一版和修订理由。本工作纸不含后页参考反馈。','',
 '## 一页研究计划','问题____；对象与时间____；一行与业务键____；结果定义____；关键解释量____；资料来源与版本____；比较____；方法条件____；能支持的结论____。','',
 '## 个人判断','',...researchLessons.flatMap((pages,li)=>pages.flatMap((p,i)=>p.kind==='question'?['### 第'+(li+14)+'讲 / '+(i+1)+'页 / '+p.title,p.lead,...p.text.map(x=>'- '+x),'我的判断与理由：____','还需要的资料：____','']:[])),
 '## 项目核查输出','为酒店作业保存数据字典、样本变化表、探索图、模型表与解释。为自选论文补充构念/处理定义、设计图、诊断、竞争解释与管理范围。作业要求与期限以学习通为准。','',
 '## 给编码助手的有界任务','先读取我提供的数据字典，只列出变量和时间含义，不猜测缺失代码。提出清理方案并说明每项规则影响的样本；保留原始文件。运行后先报告人数、单位和警告，再解释系数与区间。若无法运行，明确标记，不能编造输出。不要把事后状态用于事前预测，不把观察性关系自动称为因果。',''].join('\n');
const checklist=['# 数据分析与论文交稿检查表','','逐项给出文件名、表号或页码作为依据，不能只打勾。','',
 '1. 问题：对象、管理意义、结果、比较与范围是否明确？',
 '2. 来源：题录、数据地址、版本、访问日期、权限与字典是否留存？',
 '3. 样本：一行、键、连接、重复、缺失、筛选与保留人数是否说明？',
 '4. 时间：变量生成、处理开始、结果窗口、提前反应与泄漏是否核查？',
 '5. 探索：分布、分组、分母、单位、时间和异常是否真实计算并标注？',
 '6. 测量：事实与构念是否区分；成熟工具适配、新工具内容与结构证据是否充分？',
 '7. 方法：估计对象、比较来源、设定、关键假设与推断是否对应？',
 '8. 结果：系数/OR、参照、变换、区间、n、聚类数、权重是否清楚？',
 '9. 诊断：模型、平衡/重叠、弱工具或其他所需检查是否完成并保留不利结果？',
 '10. 结论：描述、关联和因果是否区分；成本、适用对象和外推是否有依据？',
 '11. 论文：理论—变量—模型—表图—结论是否回答同一问题；引用是否能查到？',
 '12. 复现：原始资料、脚本/Notebook、环境、结果、核查与论文是否互相对应？',
 '13. PDF：文字可读、公式完整、图表无裁切；文件按学习通对应作业提交。','',
 '辅助工具：AI输出的代码、数值与引用逐项核对；未运行结果不得写成已完成。',''].join('\n');
const readme=['# 统计分析方法第14—15讲阅读与复习包','','第14讲：五篇期刊论文，联系组织行为、战略、营销、运营与人力资源。第15讲：围绕酒店订单和自选论文综合复习。','',
 '文件：paper-reading-guide.txt/md（题录与阅读卡）；review-worksheet.txt/md（个人工作纸，无答案）；report-checklist.txt/md（报告核查）；bibliography.json；references.bib；verify-numbers.py（公开数值换算）；manifest.json（SHA256）。','',
 '本包不含教师逐字稿、练习参考反馈、有版权论文全文或虚构的原始个体资料。本文献课程以阅读研究设计为主；访问全文请用DOI、作者公开链接或学校图书馆。','',
 '酒店订单使用学习通资料中的数据集，本包不替换它；第12—13讲真实数据项目仍在原项目包中独立保留。','',
 '运行数值核对：python verify-numbers.py（仅Python标准库）。这些是已发表汇总数值/课堂假设的换算，不冒充论文完整复现。',''].join('\n');
const numeric=String.raw`# Numerical transformations only; no invented individual data or empirical model fit.
import json, math
or_value, baseline = 2.0, .20
odds = baseline / (1 - baseline)
new_probability = or_value * odds / (1 + or_value * odds)
ess = lambda w: sum(w) ** 2 / sum(x*x for x in w)
out = {
 "Bloom_2013_TFP_percent": 100 * math.expm1(.154),
 "Bloom_2024_quit_difference_pp": 4.8 - 7.2,
 "Bloom_2024_quit_relative_percent": 100 * (4.8 / 7.2 - 1),
 "Zervas_approx_revenue_percent_for_10pct_supply": -.039 * 10,
 "classroom_OR_demo_probability": new_probability,
 "classroom_OR_demo_risk_ratio": new_probability / baseline,
 "classroom_ESS_equal": ess([1, 1, 1, 1]),
 "classroom_ESS_concentrated": ess([1, 1, 1, 7])
}
assert abs(out["Bloom_2013_TFP_percent"] - 16.649088677844) < 1e-8
assert abs(out["Bloom_2024_quit_difference_pp"] + 2.4) < 1e-12
assert abs(new_probability - 1/3) < 1e-12
assert abs(ess([1, 1, 1, 7]) - 100/52) < 1e-12
print(json.dumps(out, ensure_ascii=False, indent=2))
`;
const files:Record<string,string>={'README.md':readme,'paper-reading-guide.md':guide,'review-worksheet.md':worksheet,'report-checklist.md':checklist,
 'bibliography.json':JSON.stringify(researchPapers,null,2)+'\n','verify-numbers.py':numeric};
for(const [name,body] of Object.entries({...files}))if(name.endsWith('.md'))files[name.replace('.md','.txt')]=body;
files['references.bib']=researchPapers.map(p=>'@article{'+p.id+',\n  author = {'+p.authors.replaceAll(';',' and')+'},\n  title = {'+p.title+'},\n  journal = {'+p.journal+'},\n  year = {'+p.year+'},\n  volume = {'+p.volume+'},\n  number = {'+p.issue+'},\n  pages = {'+p.pages.replaceAll('–','--')+'},\n  doi = {'+p.doi+'}\n}').join('\n\n')+'\n';
const manifest:Record<string,string>={};
for(const [name,body] of Object.entries(files)){await writeFile(new URL(name,root),body);manifest[name]=createHash('sha256').update(body).digest('hex');}
await writeFile(new URL('manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
execFileSync('python',['-c',String.raw`import pathlib,zipfile,json,sys
root=pathlib.Path(sys.argv[1])
names=sorted(json.loads((root/'manifest.json').read_text(encoding='utf-8')))+['manifest.json']
with zipfile.ZipFile(root/'research-review-14-15.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name in names:
  info=zipfile.ZipInfo(name,(2026,10,28,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
  z.writestr(info,(root/name).read_bytes())
`,fileURLToPath(root)],{windowsHide:true});
console.log({files:Object.keys(files).length,zipBytes:(await readFile(new URL('research-review-14-15.zip',root))).length});
