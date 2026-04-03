import { Context } from 'telegraf';

export interface CreateFlowState {
  step: 'username' | 'days';
  username?: string;
}

export interface BotSession {
  createFlow?: CreateFlowState;
}

export interface BotContext extends Context {
  session: BotSession;
}
