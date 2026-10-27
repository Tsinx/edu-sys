import {PORT_QUEUE_FILMS} from './port-queue-model.js';
import {PORT_TRADE_FILMS} from './port-trade-data.js';
import {PORT_TRANSITION_FILMS} from './port-transition-data.js';
import {PORT_INVESTMENT_FILMS} from './port-investment-model.js';
export const PORT_EXPANSION_FILMS={...PORT_TRADE_FILMS,...PORT_TRANSITION_FILMS,...PORT_QUEUE_FILMS,...PORT_INVESTMENT_FILMS} as const;
export type PortExpansionFilmId=keyof typeof PORT_EXPANSION_FILMS;
