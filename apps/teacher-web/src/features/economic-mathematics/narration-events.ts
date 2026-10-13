import type { SpeechMeter } from '../avatar/SpeechMeter';
import type { NarrationStatus } from './NarrationSpeech';
export const NARRATION_PRESENTATION_EVENT = 'edu:authored-narration-presentation';
export interface NarrationPresentation { owner: object; meter: SpeechMeter; status: NarrationStatus; subtitle: string }
