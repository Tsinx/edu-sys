# 消失的增量：微积分之争与数学的自我重建

第三讲第一课时短片，扩充版180秒，中文旁白，1920×1200、60fps。原生动画使用1600×1000逻辑画布。观看与动画预览共用画面设计，成片含固定中文字幕；另交付SRT和VTT。原150秒版与源文件资料包保留在`output/economic-mathematics/calculus-history-v1/`，修改前快照另存于其`history/`子目录。

## 课堂放置

放在第三讲平方差商化简之后、误差挑战和极限的严格定义之前，承接已设计的第13–17页历史段。影片替代其中3分钟连续讲述，观影前约30秒提出问题，观影后约2分30秒讨论并阅读原文，历史段仍使用原定6分钟预算。第三、第四讲各90分钟路线不因此扩时。

观影前问题：

> 当h≠0时，Q(h)=[(1+h)²−1]/h=2+h。有人说“化简后让h等于零就得到2”。这与“让h趋向零”究竟是不是同一件事？

观影后问题：

> 不允许直接计算Q(0)。若要求|Q(h)−2|<0.001，你能否先给出一个输入范围，并保证其中所有非零h都合格？

答案与下一步：取δ=0.001。对于所有满足0<|h|<δ的h，由Q(h)=2+h得到|Q(h)−2|=|h|<0.001。随后将0.001替换为任意ε>0，明确本例可取δ=ε；再进入“任意误差、存在范围、所有非中心输入”的正式定义。差商在零处无定义，不妨碍其极限存在。

## 分镜与旁白

| 时间 | 画面与运动 | 教学作用 |
| --- | --- | --- |
| 00:00–00:14 | 两点沿抛物线靠近，割线旋转，增量标尺收缩；导数公式出现，非零条件保留。 | 从高中熟悉的导数记号提出尚未解决的分母问题。 |
| 00:14–00:36 | 生成书房插画、牛顿与莱布尼茨公共领域肖像；运动轨迹和1684年论文原件构成编辑拼贴。 | 区分优先权争论与推理根据，不把两者混作同一场争论。 |
| 00:36–00:57 | 正方形分解为原面积、两个长条与角落小方块；h变小，公式累积展开。 | 现代例子说明除法如何使用h≠0。面积图只演示h>0。 |
| 00:57–01:19 | 印刷作坊插画、贝克莱肖像、1734年份与两种不相容假设的冲突；粒子短暂散开。 | 回到《分析学家》的论证质疑，而非虚构人物对话。 |
| 01:19–01:37 | 画面明确回到较早的牛顿文本；两个增量条收缩，差商两侧动点趋向空心中心。 | 比值的极限与两个零量的比值有别；注明1726版／1729英译早于1734。 |
| 01:37–01:54 | 正方形对角线超出整数比的表示；对角线转成数轴上的√2标记，逐步显示不可公度的解释与后续推进。 | 第一次：说明整数比表示的局限，以及不可公度量理论和数的认识的长期扩展。 |
| 01:54–02:10 | 越来越小的立体块体转向“接近→条件→证明”，此前的微积分计算问题继续保留。 | 第二次：计算用途与推理依据之间的张力；19世纪实数与极限理论逐步严密化。 |
| 02:10–02:26 | 集合环显示“包含自己⇒不包含自己”与相反方向；再显示公理的含义与在已有集合内筛选的限制。 | 第三次：具体呈现矛盾怎样产生，并说明基本规则怎样限制集合构造。 |
| 02:26–02:30 | 三种几何物体并置为数的认识、推理依据和集合构造的推进。 | 三次危机共享对推理根据的审查；编号是常见教学概括。 |
| 02:30–02:51 | 输出误差带和输入范围收紧；左右两侧非零动点保留，原差商中心为空心。 | 以\|Q(h)−2\|=\|h\|说明任意精度的保证，δ=ε限定于本例。 |
| 02:51–03:00 | 几何线束归拢成空心点，课程追问与简短署名出现。 | 回到课堂，准备学生自己给出范围并证明。 |

完整中文台词、字幕窗口和章节时间保存在[storyboard.json](../../apps/teacher-web/public/course-assets/economic-mathematics/calculus-history/storyboard.json)。旁白按句合成并按窗口定位，实际发声区间与速度记录于`output/economic-mathematics/calculus-history-v2/narration-timing.json`。危机段从23秒扩为53秒，20条旁白沿用同一音色。字幕与旁白语义一致，数学表达使用画面原生记号。

## 史料与素材依据

- 贝克莱：[《分析学家》1734年，第十三至十六节](https://www.maths.tcd.ie/pub/HistMath/People/Berkeley/Analyst/Analyst.html)。片中中文是归纳，平方函数和h是现代教学复述；没有添加伪造引文。
- 牛顿：[《原理》第一编第一节末尾附注](https://www.maths.tcd.ie/pub/HistMath/People/Newton/Principia/Bk1Sect1/PrBk1St1.pdf)。所用1726版／1729英译早于贝克莱批评，不呈现为牛顿对贝克莱的直接答复。
- 莱布尼茨：[1684年Nova Methodus论文原件](https://commons.wikimedia.org/wiki/File:Leibniz-Acta-1684-NovaMethodus.jpg)。只用于出版史实和原件画面，不据此裁断发现权争议。
- 优先权之争：[Newton Project收录的Brewster1855年传记第十五章](https://www.newtonproject.ox.ac.uk/view/texts/normalized/OTHE00076)。使用争论发生的事实，排除作者带立场的剽窃裁断。
- 不可公度问题：[欧几里得《几何原本》第十卷](https://www.euclids-elements.org/elements/books/bookX/)与[第五卷](https://www.euclids-elements.org/elements/books/bookV/)。影片用现代√2例子，不把古希腊的量直接当作现代实数，不讲遇害传说。
- 分析严密化：[柯西1821《分析教程》序言与预备知识](https://fr.wikisource.org/wiki/Cours_d%E2%80%99analyse_de_l%E2%80%99%C3%A9cole_royale_polytechnique/Texte_entier)，以及[戴德金1872《连续性与无理数》的1901年英译，第1–2页](https://www.gutenberg.org/files/21016/21016-pdf.pdf)。强调逐步推进，不将现代定义归于某一个人的一次完成。
- 集合悖论年代：[罗素致弗雷格1902年6月16日信的档案目录](https://bracers.mcmaster.ca/node/53946)。未复制受版权限制的信件扫描或现代翻译。
- 集合论公理化：[策梅洛1908年论文的出版社书目信息](https://link.springer.com/article/10.1007/BF01449999)。矛盾与筛选例子为现代教学图示；未复制受限全文，也不声称一个规则解决了全部基础问题。
- 现代极限：[OpenStax Calculus 1, 2.5](https://openstax.org/books/calculus-volume-1/pages/2-5-the-precise-definition-of-a-limit)。图形、公式排版与算例自行制作。

肖像与论文原件采用标为公共领域的文件，记录作者、年代、原件页面、实际下载地址及用途。ImageGen内置工具生成两张历史场景插画，均标为插画；不用于数学证据。全部几何、剪辑、字幕和配乐为本项目原创。教学用途不作为复制来源不明成片的许可依据。逐项清单在[sources.json](../../apps/teacher-web/public/course-assets/economic-mathematics/calculus-history/sources.json)，完整生成提示词在[prompts.json](../../apps/teacher-web/public/course-assets/economic-mathematics/calculus-history/prompts.json)。

## 源文件和导出

动画源为animation.js，剪辑与旁白为storyboard.json。data.js是仅包含公开字幕与章节信息的派生文件，不包含课堂答案和备课备注。字幕保存在captions.srt与captions.vtt，旁白和原创配乐分别为narration.flac、score.flac，合成为soundtrack.m4a。成片为calculus-history.mp4。

```powershell
node scripts/calculus-history-speech.mjs
python scripts/calculus-history-assets.py
node scripts/calculus-history-film.mjs prepare
node scripts/calculus-history-film.mjs serve
# 在浏览器打开 http://127.0.0.1:5198/?export=1 并点击“导出全部动画帧”
node scripts/calculus-history-film.mjs mux
node scripts/calculus-history-film.mjs verify
node scripts/calculus-history-film.mjs contact
node scripts/calculus-history-film.mjs package
```

语音工具只在内存读取项目的现有服务凭据。缓存按文本、音色及模型指纹复用；输出不保留服务密钥或临时音频下载地址。字体为本地Noto OFL字体子集，代码与字体均可在离线资料包中检查。成片和已混合音轨的播放不需要语音服务。

## 验收范围

已完成全部帧的时间顺序与文字边界、数学模型及条件、公式解析、音频时长与峰值、完整视频解码、字幕窗口、桌面及窄屏浏览、连续播放与暂停／进度定位／重播／静音／全屏、课程资源接入、类型检查、生产构建和差异检查。逐项实测结果与离线浏览的验收边界见[本地交付检查](economic-mathematics-calculus-history-validation.md)。

真实教室的投影可读性、音响响度与观影后讨论效果仍需试讲。此项交付只完成优先制作的历史短片，第三、第四讲的全量新slides另按已批准的逐页设计实施。
