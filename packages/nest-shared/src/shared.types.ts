import type { MessageAction, MessageEntity } from './shared.constants';

export type MessageEntityType = (typeof MessageEntity)[keyof typeof MessageEntity];
export type MessageActionType = (typeof MessageAction)[keyof typeof MessageAction];
export type PrismaCode = string;
export type ErrorCode = `ERROR_${MessageEntityType}_${MessageActionType}_${PrismaCode}`;
export type SuccessCode = `SUCCESS_${MessageEntityType}_${MessageActionType}`;
