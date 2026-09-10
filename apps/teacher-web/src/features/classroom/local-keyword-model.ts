export const localKeywordModels = {
  original: { label: "原始模型", description: "通用中文关键词检测模型。" },
  "personal-20260909": { label: "个人微调模型（试用）", description: "唤醒与长结束词使用你的微调模型；短“谢谢”使用通用模型。" },
  "xiaomai-20260909-epoch10": { label: "小麦老师微调模型（第10轮）", description: "使用新录音微调，包含“小麦老师”“谢谢”“你好助手”“非常感谢”。" }
} as const;

export type LocalKeywordModel = keyof typeof localKeywordModels;

const storageKey = "edu.classroom.keyword-model";

export function readKeywordModel(): LocalKeywordModel {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved && Object.hasOwn(localKeywordModels, saved) ? saved as LocalKeywordModel : "original";
  } catch { return "original"; }
}

export function saveKeywordModel(model: LocalKeywordModel): void {
  try { localStorage.setItem(storageKey, model); } catch { /* Selection still works for this mounted panel. */ }
}
