import { useState, type FormEvent } from 'react';
import { updateTeamDecision } from '../api/applicantsApi';
import { ApiClientError } from '../api/apiClient';
import type {
  TeamDecision,
  TeamDecisionStatus,
  TeamDecisionUpdateRequest,
} from '../types/applicants';
import '../styles/team-decision.css';

type EditableTeamDecisionStatus = Exclude<TeamDecisionStatus, 'PENDING'>;

export type TeamDecisionDraft = {
  status: EditableTeamDecisionStatus;
  note: string;
};

export type TeamDecisionNotice = {
  tone: 'success' | 'warning';
  text: string;
};

type TeamDecisionPanelProps = {
  applicantId: string;
  decision: TeamDecision;
  initialDraft: TeamDecisionDraft | null;
  notice: TeamDecisionNotice | null;
  onDecisionSaved: () => void;
  onStaleDecision: (draft: TeamDecisionDraft) => void;
};

function getDecisionLabel(status: TeamDecisionStatus): string {
  if (status === 'PENDING') return 'بانتظار القرار';
  if (status === 'PRELIMINARY_ACCEPTED') return 'قبول مبدئي';
  if (status === 'FINAL_ACCEPTED') return 'قبول نهائي';
  return 'مرفوض';
}

function getInitialStatus(
  decision: TeamDecision,
  draft: TeamDecisionDraft | null,
): EditableTeamDecisionStatus {
  if (draft) return draft.status;

  return decision.status === 'PENDING'
    ? 'PRELIMINARY_ACCEPTED'
    : decision.status;
}

function getMutationErrorMessage(error: ApiClientError): string {
  if (error.status === 403) {
    return 'لا تملك صلاحية حفظ قرار فريقك لهذا المتقدم.';
  }

  if (error.status === 409) {
    return 'تعذر حفظ القرار بسبب تعارض مع حالة النظام الحالية. راجع التفاصيل ثم حاول مرة أخرى.';
  }

  if (error.status === 400) {
    return 'تعذر حفظ القرار. راجع المدخلات ثم حاول مرة أخرى.';
  }

  if (error.status === 404) {
    return 'المتقدم لم يعد متاحًا ضمن نطاق فريقك.';
  }

  if (error.kind === 'network') {
    return 'تعذر الاتصال بالنظام. تحقق من الشبكة ثم حاول مرة أخرى.';
  }

  return 'تعذر حفظ قرار الفريق. حاول مرة أخرى.';
}

export function TeamDecisionPanel({
  applicantId,
  decision,
  initialDraft,
  notice,
  onDecisionSaved,
  onStaleDecision,
}: TeamDecisionPanelProps) {
  const [isEditing, setIsEditing] = useState(initialDraft !== null);
  const [status, setStatus] = useState<EditableTeamDecisionStatus>(() =>
    getInitialStatus(decision, initialDraft),
  );
  const [note, setNote] = useState(() => initialDraft?.note ?? decision.note ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentNormalizedNote = (decision.note ?? '').trim();
  const hasChanges =
    decision.status === 'PENDING' ||
    status !== decision.status ||
    note.trim() !== currentNormalizedNote;

  const resetForm = () => {
    setStatus(getInitialStatus(decision, null));
    setNote(decision.note ?? '');
    setSubmitError(null);
    setIsEditing(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasChanges || isSubmitting) return;

    setSubmitError(null);

    const request: TeamDecisionUpdateRequest = {
      status,
      note: note.trim().length > 0 ? note.trim() : null,
      expectedVersion: decision.version,
    };

    setIsSubmitting(true);

    try {
      await updateTeamDecision(applicantId, request);
      onDecisionSaved();
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError({ kind: 'invalid-response' });

      if (apiError.status === 409 && apiError.code === 'stale_team_decision') {
        onStaleDecision({
          status,
          note,
        });
        return;
      }

      setSubmitError(getMutationErrorMessage(apiError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="team-decision-panel" aria-labelledby="team-decision-title">
      <div className="team-decision-panel__header">
        <div>
          <p className="team-decision-panel__eyebrow">قرار الفريق</p>
          <h2 id="team-decision-title">{getDecisionLabel(decision.status)}</h2>
        </div>
        <span className="team-decision-panel__version">
          {decision.version === null ? 'لم يُحفظ قرار بعد' : `نسخة القرار ${decision.version}`}
        </span>
      </div>

      {decision.note ? (
        <p className="team-decision-panel__current-note">{decision.note}</p>
      ) : null}

      {notice ? (
        <p
          className={`team-decision-panel__notice team-decision-panel__notice--${notice.tone}`}
          role={notice.tone === 'warning' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      ) : null}

      {!isEditing ? (
        <button
          className="team-decision-panel__edit-button"
          type="button"
          onClick={() => setIsEditing(true)}
        >
          {decision.status === 'PENDING' ? 'اتخاذ قرار' : 'تعديل قرار الفريق'}
        </button>
      ) : (
        <form className="team-decision-panel__form" onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting}>
            <legend>القرار الجديد</legend>
            <div className="team-decision-panel__options">
              <label>
                <input
                  checked={status === 'PRELIMINARY_ACCEPTED'}
                  name="team-decision-status"
                  type="radio"
                  value="PRELIMINARY_ACCEPTED"
                  onChange={() => setStatus('PRELIMINARY_ACCEPTED')}
                />
                <span>قبول مبدئي</span>
              </label>
              <label>
                <input
                  checked={status === 'FINAL_ACCEPTED'}
                  name="team-decision-status"
                  type="radio"
                  value="FINAL_ACCEPTED"
                  onChange={() => setStatus('FINAL_ACCEPTED')}
                />
                <span>قبول نهائي</span>
              </label>
              <label>
                <input
                  checked={status === 'REJECTED'}
                  name="team-decision-status"
                  type="radio"
                  value="REJECTED"
                  onChange={() => setStatus('REJECTED')}
                />
                <span>رفض</span>
              </label>
            </div>
          </fieldset>

          {decision.status !== 'PENDING' ? (
            <p className="team-decision-panel__change-summary">
              سيُغيّر هذا الإجراء القرار الرسمي من «{getDecisionLabel(decision.status)}» إلى «{getDecisionLabel(status)}».
            </p>
          ) : null}

          <div className="team-decision-panel__note-field">
            <label htmlFor="team-decision-note">ملاحظة القرار (اختيارية)</label>
            <textarea
              id="team-decision-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {submitError ? (
            <p className="team-decision-panel__field-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="team-decision-panel__actions">
            <button
              className="team-decision-panel__submit-button"
              disabled={isSubmitting || !hasChanges}
              type="submit"
            >
              {isSubmitting ? 'جارٍ حفظ القرار…' : 'حفظ القرار الرسمي'}
            </button>
            <button
              className="team-decision-panel__cancel-button"
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
