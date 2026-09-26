import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  getActiveTeams,
  updateProjectDecision,
} from '../api/applicantsApi';
import { ApiClientError } from '../api/apiClient';
import type {
  ActiveNomination,
  ActiveTeam,
  ProjectDecisionDetail,
  ProjectDecisionStatus,
  ProjectDecisionUpdateRequest,
} from '../types/applicants';
import '../styles/project-decision.css';

type EditableProjectDecisionStatus = Exclude<
  ProjectDecisionStatus,
  'UNREVIEWED'
>;

export type ProjectDecisionDraft = {
  status: EditableProjectDecisionStatus;
  note: string;
  teamIds: readonly string[];
};

export type ProjectDecisionNotice = {
  tone: 'success' | 'warning';
  text: string;
};

type ProjectDecisionPanelProps = {
  applicantId: string;
  decision: ProjectDecisionDetail;
  activeNominations: readonly ActiveNomination[];
  initialDraft: ProjectDecisionDraft | null;
  notice: ProjectDecisionNotice | null;
  onDecisionSaved: () => void;
  onStaleDecision: (draft: ProjectDecisionDraft) => void;
};

function getDecisionLabel(status: ProjectDecisionStatus): string {
  if (status === 'UNREVIEWED') return 'بدون قرار';
  if (status === 'PRELIMINARY') return 'ترشيح مبدئي';
  if (status === 'FINAL_NOMINATION') return 'ترشيح نهائي';
  return 'مرفوض';
}

function getInitialStatus(
  decision: ProjectDecisionDetail,
  draft: ProjectDecisionDraft | null,
): EditableProjectDecisionStatus {
  if (draft) return draft.status;
  return decision.status === 'UNREVIEWED' ? 'PRELIMINARY' : decision.status;
}

function getInitialTeamIds(
  nominations: readonly ActiveNomination[],
  draft: ProjectDecisionDraft | null,
): string[] {
  return draft ? [...draft.teamIds] : nominations.map((item) => item.teamId);
}

function getMutationErrorMessage(error: ApiClientError): string {
  if (error.status === 403) {
    return 'لا تملك صلاحية حفظ قرار إدارة المشروع لهذا المتقدم.';
  }

  if (error.status === 409) {
    return 'تعذر حفظ القرار بسبب تعارض مع حالة النظام الحالية. راجع التفاصيل ثم حاول مرة أخرى.';
  }

  if (error.status === 400) {
    return 'تعذر حفظ القرار. راجع المدخلات ثم حاول مرة أخرى.';
  }

  if (error.kind === 'network') {
    return 'تعذر الاتصال بالنظام. تحقق من الشبكة ثم حاول مرة أخرى.';
  }

  return 'تعذر حفظ قرار إدارة المشروع. حاول مرة أخرى.';
}

export function ProjectDecisionPanel({
  applicantId,
  decision,
  activeNominations,
  initialDraft,
  notice,
  onDecisionSaved,
  onStaleDecision,
}: ProjectDecisionPanelProps) {
  const [isEditing, setIsEditing] = useState(initialDraft !== null);
  const [status, setStatus] = useState<EditableProjectDecisionStatus>(() =>
    getInitialStatus(decision, initialDraft),
  );
  const [note, setNote] = useState(() => initialDraft?.note ?? decision.note ?? '');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() =>
    getInitialTeamIds(activeNominations, initialDraft),
  );
  const [teams, setTeams] = useState<readonly ActiveTeam[]>([]);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<ApiClientError | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditing || status !== 'FINAL_NOMINATION') return undefined;

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
        if (!isCurrentRequest || controller.signal.aborted) return;

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
  }, [isEditing, status]);

  const missingSelectedNominations = useMemo(() => {
    if (status !== 'FINAL_NOMINATION' || isTeamsLoading || teamsError) {
      return [];
    }

    return activeNominations.filter(
      (nomination) =>
        selectedTeamIds.includes(nomination.teamId) &&
        !teams.some((team) => team.id === nomination.teamId),
    );
  }, [activeNominations, isTeamsLoading, selectedTeamIds, status, teams, teamsError]);

  const canSubmitFinalNomination =
    selectedTeamIds.length >= 1 &&
    selectedTeamIds.length <= 3 &&
    !isTeamsLoading &&
    teamsError === null &&
    missingSelectedNominations.length === 0;

  const resetForm = () => {
    setStatus(getInitialStatus(decision, null));
    setNote(decision.note ?? '');
    setSelectedTeamIds(getInitialTeamIds(activeNominations, null));
    setSubmitError(null);
    setIsEditing(false);
  };

  const toggleTeam = (teamId: string, isSelected: boolean) => {
    if (isSubmitting) return;

    if (isSelected) {
      if (selectedTeamIds.length >= 3) return;
      setSelectedTeamIds((current) => [...current, teamId]);
      return;
    }

    setSelectedTeamIds((current) => current.filter((id) => id !== teamId));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const trimmedNote = note.trim();

    if (trimmedNote.length > 2000) {
      setSubmitError('يجب ألا تتجاوز الملاحظة 2000 حرف.');
      return;
    }

    if (status === 'FINAL_NOMINATION' && !canSubmitFinalNomination) {
      setSubmitError('اختر من فريق واحد إلى ثلاثة فرق نشطة قبل حفظ الترشيح النهائي.');
      return;
    }

    const request: ProjectDecisionUpdateRequest =
      status === 'FINAL_NOMINATION'
        ? {
            status,
            teamIds: selectedTeamIds,
            note: null,
            expectedVersion: decision.version,
          }
        : {
            status,
            note: trimmedNote.length > 0 ? trimmedNote : null,
            expectedVersion: decision.version,
          };

    setIsSubmitting(true);

    try {
      await updateProjectDecision(applicantId, request);
      onDecisionSaved();
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError({ kind: 'invalid-response' });

      if (apiError.status === 409 && apiError.code === 'stale_decision') {
        onStaleDecision({
          status,
          note: status === 'FINAL_NOMINATION' ? '' : note,
          teamIds: status === 'FINAL_NOMINATION' ? selectedTeamIds : [],
        });
        return;
      }

      setSubmitError(getMutationErrorMessage(apiError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="project-decision-panel" aria-labelledby="project-decision-title">
      <div className="project-decision-panel__header">
        <div>
          <p className="project-decision-panel__eyebrow">قرار إدارة المشروع</p>
          <h2 id="project-decision-title">{getDecisionLabel(decision.status)}</h2>
        </div>
        <span className="project-decision-panel__version">
          {decision.version === null ? 'لم يُحفظ قرار بعد' : `نسخة القرار ${decision.version}`}
        </span>
      </div>

      {decision.note ? (
        <p className="project-decision-panel__current-note">{decision.note}</p>
      ) : null}

      {decision.status === 'FINAL_NOMINATION' && activeNominations.length > 0 ? (
        <div className="project-decision-panel__nominations">
          <h3>الفرق المرشح إليها حاليًا</h3>
          <ul>
            {activeNominations.map((nomination) => (
              <li key={nomination.id}>{nomination.teamName}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {notice ? (
        <p
          className={`project-decision-panel__notice project-decision-panel__notice--${notice.tone}`}
          role={notice.tone === 'warning' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      ) : null}

      {!isEditing ? (
        <button
          className="project-decision-panel__edit-button"
          type="button"
          onClick={() => setIsEditing(true)}
        >
          {decision.status === 'UNREVIEWED' ? 'اتخاذ قرار' : 'تعديل القرار الحالي'}
        </button>
      ) : (
        <form className="project-decision-panel__form" onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting}>
            <legend>القرار الجديد</legend>
            <div className="project-decision-panel__options">
              <label>
                <input
                  checked={status === 'PRELIMINARY'}
                  name="project-decision-status"
                  type="radio"
                  value="PRELIMINARY"
                  onChange={() => setStatus('PRELIMINARY')}
                />
                <span>ترشيح مبدئي</span>
              </label>
              <label>
                <input
                  checked={status === 'FINAL_NOMINATION'}
                  name="project-decision-status"
                  type="radio"
                  value="FINAL_NOMINATION"
                  onChange={() => setStatus('FINAL_NOMINATION')}
                />
                <span>ترشيح نهائي</span>
              </label>
              <label>
                <input
                  checked={status === 'REJECTED'}
                  name="project-decision-status"
                  type="radio"
                  value="REJECTED"
                  onChange={() => setStatus('REJECTED')}
                />
                <span>رفض</span>
              </label>
            </div>
          </fieldset>

          {decision.status !== 'UNREVIEWED' ? (
            <p className="project-decision-panel__change-summary">
              سيُغيّر هذا الإجراء القرار الرسمي من «{getDecisionLabel(decision.status)}» إلى «{getDecisionLabel(status)}».
            </p>
          ) : null}

          {status === 'FINAL_NOMINATION' ? (
            <div className="project-decision-panel__teams" aria-describedby="project-teams-help">
              <div className="project-decision-panel__teams-heading">
                <label>فرق الترشيح النهائي</label>
                <span>تم اختيار {selectedTeamIds.length} من 3</span>
              </div>
              <p id="project-teams-help">اختر من فريق واحد إلى ثلاثة فرق نشطة.</p>

              {isTeamsLoading ? <p role="status">جارٍ تحميل الفرق المتاحة.</p> : null}
              {teamsError ? (
                <p className="project-decision-panel__field-error" role="alert">
                  تعذر تحميل الفرق المتاحة. لا يمكن حفظ ترشيح نهائي قبل تحميلها.
                </p>
              ) : null}
              {missingSelectedNominations.length > 0 ? (
                <p className="project-decision-panel__field-error" role="alert">
                  بعض الفرق المرشح إليها حاليًا لم تعد ضمن الفرق النشطة المتاحة: {missingSelectedNominations.map((item) => item.teamName).join('، ')}. راجع الحالة قبل حفظ التعديل.
                </p>
              ) : null}

              {!isTeamsLoading && !teamsError ? (
                <div className="project-decision-panel__team-list">
                  {teams.map((team) => {
                    const isSelected = selectedTeamIds.includes(team.id);
                    const reachedMaximum = selectedTeamIds.length >= 3 && !isSelected;

                    return (
                      <label key={team.id} className="project-decision-panel__team-option">
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
          ) : (
            <div className="project-decision-panel__note-field">
              <label htmlFor="project-decision-note">ملاحظة القرار (اختيارية)</label>
              <textarea
                id="project-decision-note"
                maxLength={2000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <p>{note.length} / 2000</p>
            </div>
          )}

          {submitError ? (
            <p className="project-decision-panel__field-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="project-decision-panel__actions">
            <button
              className="project-decision-panel__submit-button"
              disabled={isSubmitting || (status === 'FINAL_NOMINATION' && !canSubmitFinalNomination)}
              type="submit"
            >
              {isSubmitting ? 'جارٍ حفظ القرار…' : 'حفظ القرار الرسمي'}
            </button>
            <button
              className="project-decision-panel__cancel-button"
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
