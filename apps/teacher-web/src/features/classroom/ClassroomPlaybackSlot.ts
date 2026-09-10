import { createContext } from "react";

// Move the controls, not the slide, so fullscreen keeps the current animation.
export const ClassroomPlaybackSlot = createContext<HTMLDivElement | null>(null);
