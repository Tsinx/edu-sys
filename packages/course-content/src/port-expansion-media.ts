import {PORT_TRADE_FILMS} from './port-trade-data.js';
import {PORT_TRANSITION_FILMS} from './port-transition-data.js';
export const PORT_EXPANSION_FILMS={...PORT_TRADE_FILMS,...PORT_TRANSITION_FILMS} as const;
export type PortExpansionFilmId=keyof typeof PORT_EXPANSION_FILMS;
