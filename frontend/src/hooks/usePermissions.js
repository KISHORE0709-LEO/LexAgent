import { useAuth } from '../context/AuthContext';

export const usePermissions = () => {
  const { role: authRole } = useAuth();
  
  // Default to public if no role is found (for safety)
  const role = authRole || 'public';

  return {
    canEditDraft: role === 'judge',
    canGenerateDraft: role === 'judge',
    canAdmitParticipants: role === 'judge',
    canViewCaseSummary: ['judge', 'lawyer', 'custody'].includes(role),
    canViewPrecedents: ['judge', 'lawyer'].includes(role),
    canEditHearingLedger: ['judge', 'lawyer'].includes(role),
    canViewHearingLedger: ['judge', 'lawyer', 'custody'].includes(role),
    canScheduleHearing: ['judge', 'custody'].includes(role),
    role, // expose the role for custom checks
  };
};
