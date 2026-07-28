import { useState } from 'react';

import { useAuth } from '../../auth/AuthContext.jsx';
import { hasPermission, PERMISSIONS } from '../../lib/permissions.js';
import ActivitySection from './ActivitySection.jsx';
import AssignmentControl from './AssignmentControl.jsx';
import FollowUpsSection from './FollowUpsSection.jsx';
import NotesSection from './NotesSection.jsx';
import RevealPhone from './RevealPhone.jsx';
import StageControl from './StageControl.jsx';
import TagsSection from './TagsSection.jsx';

const LeadPanel = ({ conversation, contactId, onStageChange }) => {
  const { permissions } = useAuth();
  const canAssign = hasPermission(permissions, PERMISSIONS.CONVERSATIONS_ASSIGN);

  // Bumping this key re-fetches the activity timeline after a mutating action.
  const [activityKey, setActivityKey] = useState(0);
  const bumpActivity = () => setActivityKey((value) => value + 1);

  const handleStageChange = (stage) => {
    onStageChange?.(stage);
    bumpActivity();
  };

  return (
    <aside
      aria-label="Lead details"
      className="flex h-full w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-slate-200 bg-white p-4"
    >
      <StageControl
        conversationId={conversation.id}
        stage={conversation.stage}
        onStageChange={handleStageChange}
      />

      {canAssign ? (
        <AssignmentControl
          conversationId={conversation.id}
          assignedTo={conversation.assignedTo}
          onAssignmentChange={bumpActivity}
        />
      ) : null}

      {contactId ? <RevealPhone contactId={contactId} /> : null}

      <TagsSection
        conversationId={conversation.id}
        tagIds={conversation.tags}
        onTagsChange={bumpActivity}
      />

      <NotesSection conversationId={conversation.id} />

      <FollowUpsSection conversationId={conversation.id} />

      <ActivitySection conversationId={conversation.id} refreshKey={activityKey} />
    </aside>
  );
};

export default LeadPanel;
