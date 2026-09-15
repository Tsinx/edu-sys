export const live2dModels = {
  xiaomai: { label: "小麦老师", url: "/avatar/live2d/xiaomai/Xiaomai_A_Trial.model3.json", top: 0.01, bust: 0.99, portrait: 0.67, bustWidth: 0.68, portraitWidth: 0.48, voice: "default", sampleArtwork: false },
  haru: { label: "Haru", url: "/avatar/live2d/haru/Haru.model3.json", top: 0.045, bust: 0.30, portrait: 0.19, bustWidth: 0.50, portraitWidth: 0.33, voice: "default", sampleArtwork: true },
  natori: { label: "名取仁", url: "/avatar/live2d/natori/Natori.model3.json", top: 0.025, bust: 0.36, portrait: 0.22, bustWidth: 0.50, portraitWidth: 0.33, voice: "natori", sampleArtwork: true },
  hiyori: { label: "日和", url: "/avatar/live2d/hiyori/Hiyori.model3.json", top: 0.025, bust: 0.30, portrait: 0.19, bustWidth: 0.50, portraitWidth: 0.33, voice: "hiyori", sampleArtwork: true }
} as const;
export type Live2DCharacter = keyof typeof live2dModels;
