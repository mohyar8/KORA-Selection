import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getActiveTeams } from '../api/applicantsApi';
import {
  updateViewerActionRequest,
  type ViewerActionRequestUpdate,
} from '../api/actionRequestsApi';
import { ApiClientError } from '../api/apiClient';
import type {
  ActionRequestActionType,
  ActiveTeam,
  PendingActionRequest,
} from '../types/applicants';
import '../styles/action-requests.css';

export type ViewerActionRequestDraft = {
  actionType: ActionRequestActionType;
  note: string;
  teamIds: readonly string[];
};

export type ViewerActionRequestNotice = {
  tone: 'success' | 'warning';
  text: string;
};

type ViewerActionRequestPanelProps = {
  applicantId: string;
  pendingRequest: PendingActionRequest | null;
  initialDraft: ViewerActionRequestDraft | null;
  notice: ViewerActionRequestNotice | null;
  onRequestSaved: () => void;
  onRequestConflict: (draft: ViewerActionRequestDraft) => void;
  onResourceUnavailable: () => void;
};

function getActionLabel(actionType: ActionRequestActionType): string {
  if (actionType === 'PRELIMINARY') return 'ترشيح مبدئي';
  if (actionType === 'FINAL_NOMINATION') return 'ترشيح نهائي';
  return 'رفض';
}

function getInitialActionType(
  pendingRequest: PendingActionRequest | null,
  initialDraft: ViewerActionRequestDraft | null,
): ActionRequestActionType {
  return initialDraft?.actionType ?? pendingRequest?.actionType ?? 'PRELIMINARY';
}

function sameTeamIds(first: readonly string[], second: readonly string[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((id) => second.includes(id));
}

function getMutationErrorMessage(error: ApiClientError): string {
  if (error.status === 403) {
    return 'لا تملك صلاحية إرسال طلب إجراء لهذا المتقدم.';
  }

  if (error.status === 400) {
    return 'تعذر إرسال الطلب. راجع البيانات ثم حاول مرة أخرى.';
  }

  if (error.kind === 'network') {
    return 'تعذر الاتصال بالنظام. تحقق من الشبكة ثم حاول مرة أخرى.';
  }

  return 'تعذر حفظ طلب الإجراء. حاول مرة أخرى.';
}

export function ViewerActionRequestPanel({
  applicantId,
  pendingRequest,
  initialDraft,
  notice,
  onRequestSaved,
  onRequestConflict,
  onResourceUnavailable,
}: ViewerActionRequestPanelProps) {
  const [isEditing, setIsEditing] = useState(initialDraft !== null);
  const [actionType, setActionType] = useState<ActionRequestActionType>(() =>
    getInitialActionType(pendingRequest, initialDraft),
  );
  const [note, setNote] = useState(() => initialDraft?.note ?? pendingRequest?.note ?? '');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => [
    ...(initialDraft?.teamIds ?? pendingRequest?.teamIds ?? []),
  ]);
  const [teams, setTeams] = useState<readonly ActiveTeam[]>([]);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<ApiClientError | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shouldLoadTeams =
    (isEditing && actionType === 'FINAL_NOMINATION') ||
    (!isEditing && pendingRequest?.actionType === 'FINAL_NOMINATION');

  useEffect(() => {
    if (!shouldLoadTeams) {
      return undefined;
    }

    const controller = new AbortController();
    let isCurrentRequest = true;

    const loadTeams = async () => {
      setIsTeamsLoading(true);
      setTeamsError(null);

      try {
        const response = await getActiveTeams(controller.signal);

        if (isCurrentRequest) {
          setTeams(response);
        }
      } catch (error) {
        if (!isCurrentRequest || controller.signal.aborted) {
          return;
        }

        setTeamsError(
          error instanceof ApiClientError
            ? error
            : new ApiClientError({ kind: 'invalid-response' }),
        );
      } finally {
        if (isCurrentRequest) {
          setIsTeamsLoading(false);
        }
      }
    };

    void loadTeams();

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [shouldLoadTeams]);

  const missingSelectedTeamIds = useMemo(() => {
    if (actionType !== 'FINAL_NOMINATION' || isTeamsLoading || teamsError) {
      return [];
    }

    return selectedTeamIds.filter(
      (teamId) => !teams.some((team) => team.id === teamId),
    );
  }, [actionType, isTeamsLoading, selectedTeamIds, teams, teamsError]);

  const canSubmitFinalNomination =
    selectedTeamIds.length >= 1 &&
    selectedTeamIds.length <= 3 &&
    !isTeamsLoading &&
    teamsError === null &&
    missingSelectedTeamIds.length === 0;

  const normalizedNote = note.trim();
  const hasChanges =
    pendingRequest === null ||
    actionType !== pendingRequest.actionType ||
    normalizedNote !== (pendingRequest.note ?? '') ||
    (actionType === 'FINAL_NOMINATION' &&
      !sameTeamIds(selectedTeamIds, pendingRequest.teamIds));

  const getTeamName = (teamId: string): string =>
    teams.find((team) => team.id === teamId)?.name ?? teamId;

  const resetForm = () => {
    setActionType(getInitialActionType(pendingRequest, null));
    setNote(pendingRequest?.note ?? '');
    setSelectedTeamIds([...(pendingRequest?.teamIds ?? [])]);
    setSubmitError(null);
    setIsEditing(false);
  };

  const toggleTeam = (teamId: string, isSelected: boolean) => {
    if (isSubmitting) {
      return;
    }

    if (isSelected) {
      if (selectedTeamIds.length >= 3) {
        return;
      }

      setSelectedTeamIds((current) => [...current, teamId]);
      return;
    }

    setSelectedTeamIds((current) => current.filter((id) => id !== teamId));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (actionType === 'FINAL_NOMINATION' && !canSubmitFinalNomination) {
      setSubmitError('اختر من فريق واحد إلى ثلاثة فرق نشطة قبل إرسال الطلب.');
      return;
    }

    if (!hasChanges || isSubmitting) {
      return;
    }

    const request: ViewerActionRequestUpdate =
      actionType === 'FINAL_NOMINATION'
        ? {
            actionType,
            teamIds: selectedTeamIds,
            note: normalizedNote.length > 0 ? normalizedNote : null,
            expectedVersion: pendingRequest?.version ?? null,
          }
        : {
            actionType,
            note: normalizedNote.length > 0 ? normalizedNote : null,
            expectedVersion: pendingRequest?.version ?? null,
          };

    setIsSubmitting(true);

    try {
      await updateViewerActionRequest(applicantId, request);
      onRequestSaved();
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError({ kind: 'invalid-response' });

      if (apiError.status === 409) {
        onRequestConflict({
          actionType,
          note,
          teamIds: actionType === 'FINAL_NOMINATION' ? selectedTeamIds : [],
        });
        return;
      }

      if (apiError.status === 404) {
        onResourceUnavailable();
        return;
      }

      setSubmitError(getMutationErrorMessage(apiError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="viewer-action-request-panel" aria-labelledby="viewer-action-request-title">
      <div className="viewer-action-request-panel__header">
        <div>
          <p className="viewer-action-request-panel__eyebrow">طلب إجراء</p>
          <h2 id="viewer-action-request-title">
            {pendingRequest ? 'طلبك المعلّق' : 'اقتراح إجراء للمراجعة'}
          </h2>
        </div>
        {pendingRequest ? (
          <span className="viewer-action-request-panel__status">بانتظار المراجعة</span>
        ) : null}
      </div>

      {pendingRequest ? (
        <div className="viewer-action-request-panel__current" aria-label="تفاصيل الطلب الحالي">
          <p>
            <span>الإجراء المقترح</span>
            <strong>{getActionLabel(pendingRequest.actionType)}</strong>
          </p>
          {pendingRequest.note ? <p className="viewer-action-request-panel__note">{pendingRequest.note}</p> : null}
          {pendingRequest.actionType === 'FINAL_NOMINATION' ? (
            <div className="viewer-action-request-panel__current-teams">
              <span>الفرق المقترحة</span>
              {isTeamsLoading ? (
                <p role="status">جارٍ تحميل أسماء الفرق.</p>
              ) : (
                <ul>
                  {pendingRequest.teamIds.map((teamId) => (
                    <li key={teamId} dir={teams.some((team) => team.id === teamId) ? undefined : 'ltr'}>
                      {getTeamName(teamId)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="viewer-action-request-panel__description">
          سيراجع فريق إدارة المشروع هذا الطلب قبل تطبيق أي قرار رسمي.
        </p>
      )}

      {notice ? (
        <p
          className={`viewer-action-request-panel__notice viewer-action-request-panel__notice--${notice.tone}`}
          role={notice.tone === 'warning' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      ) : null}

      {!isEditing ? (
        <button
          className="viewer-action-request-panel__edit-button"
          type="button"
          onClick={() => setIsEditing(true)}
        >
          {pendingRequest ? 'تعديل الطلب' : 'إنشاء طلب إجراء'}
        </button>
      ) : (
        <form className="viewer-action-request-panel__form" onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting}>
            <legend>الإجراء المقترح</legend>
            <div className="viewer-action-request-panel__options">
              <label>
                <input
                  checked={actionType === 'PRELIMINARY'}
                  name="viewer-action-type"
                  type="radio"
                  value="PRELIMINARY"
                  onChange={() => setActionType('PRELIMINARY')}
                />
                <span>ترشيح مبدئي</span>
              </label>
              <label>
                <input
                  checked={actionType === 'FINAL_NOMINATION'}
                  name="viewer-action-type"
                  type="radio"
                  value="FINAL_NOMINATION"
                  onChange={() => setActionType('FINAL_NOMINATION')}
                />
                <span>ترشيح نهائي</span>
              </label>
              <label>
                <input
                  checked={actionType === 'REJECTED'}
                  name="viewer-action-type"
                  type="radio"
                  value="REJECTED"
                  onChange={() => setActionType('REJECTED')}
                />
                <span>رفض</span>
              </label>
            </div>
          </fieldset>

          {actionType === 'FINAL_NOMINATION' ? (
            <div className="viewer-action-request-panel__teams" aria-describedby="viewer-action-teams-help">
              <div className="viewer-action-request-panel__teams-heading">
                <label>فرق الترشيح النهائي</label>
                <span>تم اختيار {selectedTeamIds.length} من 3</span>
              </div>
              <p id="viewer-action-teams-help">اختر من فريق واحد إلى ثلاثة فرق نشطة.</p>

              {isTeamsLoading ? <p role="status">جارٍ تحميل الفرق المتاحة.</p> : null}
              {teamsError ? (
                <p className="viewer-action-request-panel__field-error" role="alert">
                  تعذر تحميل الفرق المتاحة. لا يمكن إرسال الترشيح النهائي قبل تحميلها.
                </p>
              ) : null}
              {missingSelectedTeamIds.length > 0 ? (
                <p className="viewer-action-request-panel__field-error" role="alert">
                  بعض الفرق المحددة في الطلب السابق لم تعد ضمن الفرق النشطة المتاحة. راجع الاختيارات قبل الحفظ.
                </p>
              ) : null}

              {!isTeamsLoading && !teamsError ? (
                <div className="viewer-action-request-panel__team-list">
                  {teams.map((team) => {
                    const isSelected = selectedTeamIds.includes(team.id);
                    const reachedMaximum = selectedTeamIds.length >= 3 && !isSelected;

                    return (
                      <label key={team.id} className="viewer-action-request-panel__team-option">
                        <input
                          checked={isSelected}
                          disabled={isSubmitting || reachedMaximum}
                          type="checkbox"
                          onChange={(event) => toggleTeam(team.id, event.target.checked)}
                        />
                        <span>{team.name}</span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="viewer-action-request-panel__note-field">
            <label htmlFor="viewer-action-request-note">ملاحظة الطلب (اختيارية)</label>
            <textarea
              id="viewer-action-request-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {submitError ? (
            <p className="viewer-action-request-panel__field-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="viewer-action-request-panel__actions">
            <button
              className="viewer-action-request-panel__submit-button"
              disabled={
                isSubmitting ||
                !hasChanges ||
                (actionType === 'FINAL_NOMINATION' && !canSubmitFinalNomination)
              }
              type="submit"
            >
              {isSubmitting ? 'جارٍ إرسال الطلب…' : pendingRequest ? 'حفظ التعديل' : 'إرسال الطلب للمراجعة'}
            </button>
            <button
              className="viewer-action-request-panel__cancel-button"
              disabled={isSubmitting}
              type="button"
              onClick={resetForm}
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
