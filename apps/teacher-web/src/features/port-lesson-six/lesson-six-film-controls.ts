import {createContext} from 'react';
import type {LessonSixCamera} from '@edu/course-content';
export const LessonSixFilmControls=createContext<{readOnly:boolean;onExploreStart?:()=>void;onCameraChange?:(camera:LessonSixCamera)=>void}>({readOnly:true});
