export const ACTIVITY_EVENTS = Object.freeze({
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_ASSIGNED: 'conversation.assigned',
  CONVERSATION_STAGE_CHANGED: 'conversation.stage_changed',
  CONVERSATION_TAG_ADDED: 'conversation.tag_added',
  CONVERSATION_TAG_REMOVED: 'conversation.tag_removed',
  MESSAGE_CREATED: 'message.created',
  MESSAGE_STATUS_CHANGED: 'message.status_changed',
  NOTE_CREATED: 'note.created',
  FOLLOWUP_CREATED: 'followup.created',
  FOLLOWUP_COMPLETED: 'followup.completed',
  FOLLOWUP_CANCELLED: 'followup.cancelled',
});

export const ACTIVITY_EVENT_VALUES = Object.freeze(Object.values(ACTIVITY_EVENTS));
