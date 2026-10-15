import {PORT_ELEVEN_FILM,PORT_ELEVEN_ILLUSTRATIONS} from './port-lesson-eleven-media.js';
import {PORT_TWELVE_FILM,PORT_TWELVE_ILLUSTRATIONS} from './port-lesson-twelve-media.js';
export const PORT_ADVANCED_ILLUSTRATIONS={...PORT_ELEVEN_ILLUSTRATIONS,...PORT_TWELVE_ILLUSTRATIONS};
export function portOpeningFilm(slideKey:string){return slideKey==='l11-singapore-question'?PORT_ELEVEN_FILM:slideKey==='l12-investigation-question'?PORT_TWELVE_FILM:undefined;}
