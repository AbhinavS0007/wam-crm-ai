export const CONVERSATION_STAGES = Object.freeze({
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  PROPOSAL: 'proposal',
  WON: 'won',
  LOST: 'lost',
  CLOSED: 'closed',
});

export const CONVERSATION_STAGE_VALUES = Object.freeze(Object.values(CONVERSATION_STAGES));
