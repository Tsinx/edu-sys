# Higher Mathematics: Calculus for Economics and Business

解压整个压缩包后，双击 **Start-Course.cmd**。浏览器会打开本地课程，无需登录、联网或 API。首次播放点 **Play introduction**，需要声音时点 **Enable sound**。不要在压缩包内部直接运行。

课程为16次讲授，每次90分钟（2个45分钟学时），共32学时。v2共1280页核心内容和32页 Optional Challenge；每学时36–45页核心内容，平均40页。左右方向键翻页；Lesson菜单切换讲次；Teaching hour菜单直达每个学时。视频可播放、暂停、拖动和重播；Reveal reasoning 显示当前问题的解释。练习用于形成性检查，正式成绩权重由学校决定。

## Files

- `slides/`: 16讲学生PDF及1312页合订本，含16讲与32学时书签，英文，无教师提示和默认隐藏答案。
- `documents/`: 大纲与教材页码映射、英文练习册、独立答案册、中文教师手册及英文课堂话术；Markdown版本可编辑，另有16份独立练习文件。
- `course-assets/international-mathematics/art/`: 36张原创图像，原始PNG。
- `course-assets/international-mathematics/film/`: 16条90秒开场MP4，英文旁白WAV、SRT/VTT及分段旁白。
- `source/`: 逐页课程源码、数学计算、渲染器、动画与导出脚本、配图提示词与使用记录、416页v1到v2锚点映射；包含教师备课内容。
- `manifest-sha256.json`: 文件长度与SHA256校验清单。

视频规格为1920×1200、30fps、H.264/AAC。页面逻辑画布为1600×1000；窄屏缩放保留整个画面，课堂投影使用大屏。课件中的商业数据均为标注的教学情境或数学模型，不是实测市场数据。教材未随包分发；使用 Jacques 第9版第1、2、4、6章，极限直观与微积分基本定理的补充明确标记。

The student interface, lessons, opening films, captions and exercises are in English. Each lesson develops a scene, observations, a question, mathematical tools and a decision. Optional challenges are not prerequisites for the core route.

本地服务器仅监听127.0.0.1，支持视频分段读取；连续3小时无访问后退出。`runtime/node.exe`用于本地静态文件服务，不连接模型服务。可用Windows PowerShell重新核对哈希：`Get-FileHash -Algorithm SHA256 文件路径`。

实际教室投影、学校设备和试讲效果需另行记录。验证情况与限制见交付目录的验收记录。
