import { useState, type FormEvent } from 'react';
import {
  reviewDeputySuggestion,
  updateDeputySuggestion,
} from '../api/applicantsApi';
import { ApiClientError } from '../api/apiClient';
import type {
  DeputySuggestionReviewRequest,
  PendingDeputySuggestion,
  TeamDecision,
  TeamDecisionStatus,
} from '../types/applicants';
import type { UserRole } from '../auth/AuthProvider';
import '../styles/deputy-suggestion.css';

type DeputyRole = Extract<UserRole, 'TEAM_DEPUTY' | 'TEAM_LEADER'>;
type EditableSuggestedStatus = Exclude<TeamDecisionStatus, 'PENDING'>;
type ReviewIntent = 'APPROVED' | 'REJECTED' | null;

export type DeputySuggestionDraft = {
  suggestedStatus: EditableSuggestedStatus;
  note: string;
};

export type DeputySuggestionNotice = {
  tone: 'success' | 'warning';
  text: string;
};

type DeputySuggestionPanelProps = {
  applicantId: string;
  role: DeputyRole;
  teamDecision: TeamDecision;
  pendingSuggestion: PendingDeputySuggestion | null;
  initialDraft: DeputySuggestionDraft | null;
  notice: DeputySuggestionNotice | null;
  onDeputySuccess: () => void;
  onDeputyConflict: (draft: DeputySuggestionDraft) => void;
  onReviewSuccess: () => void;
  onReviewConflict: () => void;
  onResourceUnavailable: () => void;
};

function getTeamDecisionLabel(status: TeamDecisionStatus): string {
  if (status === 'PENDING') return 'بانتظار القرار';
  if (status === 'PRELIMINARY_ACCEPTED') return 'قبول مبدئي';
  if (status === 'FINAL_ACCEPTED') return 'قبول نهائي';
  return 'مرفوض';
}

function getSuggestionLabel(status: EditableSuggestedStatus): string {
  if (status === 'PRELIMINARY_ACCEPTED') return 'قبول مبدئي';
  if (status === 'FINAL_ACCEPTED') return 'قبول نهائي';
  return 'رفض';
}

function formatCreatedAt(createdAt: number): string {
  const date = new Date(createdAt * 1000);

  if (Number.isNaN(date.getTime())) {
    return 'وقت الإنشاء غير متوفر';
  }

  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getMutationErrorMessage(error: ApiClientError, action: 'suggestion' | 'review'): string {
  if (error.status === 403) {
    return action === 'suggestion'
      ? 'لا تملك صلاحية حفظ اقتراح لهذا المتقدم.'
      : 'لا تملك صلاحية مراجعة هذا الاقتراح.';
  }

  if (error.status === 400) {
    return action === 'suggestion'
      ? 'تعذر حفظ الاقتراح. راجع المدخلات ثم حاول مرة أخرى.'
      : 'تعذر تنفيذ مراجعة الاقتراح. راجع الحالة ثم حاول مرة أخرى.';
  }

  if (error.status === 409) {
    return 'تعذر إكمال العملية بسبب تعارض مع الحالة الحالية. راجع التفاصيل ثم حاول مرة أخرى.';
  }

  if (error.kind === 'network') {
    return 'تعذر الاتصال بالنظام. تحقق من الشبكة ثم حاول مرة أخرى.';
  }

  return action === 'suggestion'
    ? 'تعذر حفظ اقتراح النائب. حاول مرة أخرى.'
    : 'تعذر مراجعة الاقتراح. حاول مرة أخرى.';
}

export function DeputySuggestionPanel({
  applicantId,
  role,
  teamDecision,
  pendingSuggestion,
  initialDraft,
  notice,
  onDeputySuccess,
  onDeputyConflict,
  onReviewSuccess,
  onReviewConflict,
  onResourceUnavailable,
}: DeputySuggestionPanelProps) {
  const [isEditing, setIsEditing] = useState(initialDraft !== null);
  const [suggestedStatus, setSuggestedStatus] = useState<EditableSuggestedStatus>(
    () => initialDraft?.suggestedStatus ?? pendingSuggestion?.suggestedStatus ?? 'PRELIMINARY_ACCEPTED',
  );
  const [note, setNote] = useState(
    () => initialDraft?.note ?? pendingSuggestion?.note ?? '',
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const leaderSuggestion =
    role === 'TEAM_LEADER' ? pendingSuggestion : null;

  const currentNormalizedNote = (pendingSuggestion?.note ?? '').trim();
  const hasSuggestionChanges =
    pendingSuggestion === null ||
    suggestedStatus !== pendingSuggestion.suggestedStatus ||
    note.trim() !== currentNormalizedNote;

  const resetForm = () => {
    setSuggestedStatus(pendingSuggestion?.suggestedStatus ?? 'PRELIMINARY_ACCEPTED');
    setNote(pendingSuggestion?.note ?? '');
    setSubmitError(null);
    setIsEditing(false);
  };

  const handleSuggestionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasSuggestionChanges || isSubmitting) return;

    setSubmitError(null);

    setIsSubmitting(true);

    try {
      await updateDeputySuggestion(applicantId, {
        suggestedStatus,
        note: note.trim().length > 0 ? note.trim() : null,
        expectedVersion: pendingSuggestion?.version ?? null,
      });
      onDeputySuccess();
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError({ kind: 'invalid-response' });

      if (apiError.status === 404) {
        onResourceUnavailable();
        return;
      }

      if (apiError.status === 409) {
        onDeputyConflict({
          suggestedStatus,
          note,
        });
        return;
      }

      setSubmitError(getMutationErrorMessage(apiError, 'suggestion'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!pendingSuggestion || reviewIntent === null || isReviewing) return;

    if (pendingSuggestion.version === null) {
      setReviewError('تعذر مراجعة الاقتراح لأن نسخة الاقتراح غير متاحة. أعد تحميل التفاصيل.');
      return;
    }

    const request: DeputySuggestionReviewRequest =
      reviewIntent === 'APPROVED'
        ? {
            reviewStatus: 'APPROVED',
            expectedVersion: pendingSuggestion.version,
            expectedTeamDecisionVersion: teamDecision.version,
          }
        : {
            reviewStatus: 'REJECTED',
            expectedVersion: pendingSuggestion.version,
          };

    setReviewError(null);
    setIsReviewing(true);

    try {
      await reviewDeputySuggestion(pendingSuggestion.id, request);
      onReviewSuccess();
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError({ kind: 'invalid-response' });

      if (apiError.status === 404) {
        onResourceUnavailable();
        return;
      }

      if (apiError.status === 409) {
        onReviewConflict();
        return;
      }

      setReviewError(getMutationErrorMessage(apiError, 'review'));
    } finally {
      setIsReviewing(false);
    }
  };

  if (role === 'TEAM_LEADER') {
    if (!leaderSuggestion) {
      return null;
    }

    return (
      <section className="deputy-suggestion-panel" aria-labelledby="deputy-suggestion-title">
        <div className="deputy-suggestion-panel__header">
          <div>
            <p className="deputy-suggestion-panel__eyebrow">اقتراح نائب القائد</p>
            <h2 id="deputy-suggestion-title">{getSuggestionLabel(leaderSuggestion.suggestedStatus)}</h2>
          </div>
          <span className="deputy-suggestion-panel__meta">
            أُنشئ {formatCreatedAt(leaderSuggestion.createdAt)}
          </span>
        </div>

        <div className="deputy-suggestion-panel__official-context">
          <span>قرار الفريق الرسمي الحالي</span>
          <strong>{getTeamDecisionLabel(teamDecision.status)}</strong>
        </div>

        {leaderSuggestion.note ? (
          <p className="deputy-suggestion-panel__note">{leaderSuggestion.note}</p>
        ) : null}

        {notice ? (
          <p
            className={`deputy-suggestion-panel__notice deputy-suggestion-panel__notice--${notice.tone}`}
            role={notice.tone === 'warning' ? 'alert' : 'status'}
          >
            {notice.text}
          </p>
        ) : null}

        {reviewIntent === null ? (
          <div className="deputy-suggestion-panel__actions">
            <button
              className="deputy-suggestion-panel__approve-button"
              disabled={isReviewing}
              type="button"
              onClick={() => setReviewIntent('APPROVED')}
            >
              اعتماد الاقتراح
            </button>
            <button
              className="deputy-suggestion-panel__reject-button"
              disabled={isReviewing}
              type="button"
              onClick={() => setReviewIntent('REJECTED')}
            >
              رفض الاقتراح
            </button>
          </div>
        ) : (
          <div className="deputy-suggestion-panel__confirmation" role="alert">
            <p>
              {reviewIntent === 'APPROVED'
                ? `سيحوّل اعتماد الاقتراح حالة الفريق الرسمية إلى «${getSuggestionLabel(leaderSuggestion.suggestedStatus)}».`
                : 'سيُرفض اقتراح النائب دون تغيير قرار الفريق الرسمي.'}
            </p>
            <div className="deputy-suggestion-panel__actions">
              <button
                className={
                  reviewIntent === 'APPROVED'
                    ? 'deputy-suggestion-panel__approve-button'
                    : 'deputy-suggestion-panel__reject-button'
                }
                disabled={isReviewing}
                type="button"
                onClick={handleReview}
              >
                {isReviewing
                  ? 'جارٍ تنفيذ المراجعة…'
                  : reviewIntent === 'APPROVED'
                    ? 'تأكيد الاعتماد'
                    : 'تأكيد الرفض'}
              </button>
              <button
                className="deputy-suggestion-panel__cancel-button"
                disabled={isReviewing}
                type="button"
                onClick={() => setReviewIntent(null)}
              >
                تراجع
              </button>
            </div>
          </div>
        )}

        {reviewError ? (
          <p className="deputy-suggestion-panel__error" role="alert">
            {reviewError}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="deputy-suggestion-panel" aria-labelledby="deputy-suggestion-title">
      <div className="deputy-suggestion-panel__header">
        <div>
          <p className="deputy-suggestion-panel__eyebrow">اقتراح قرار</p>
          <h2 id="deputy-suggestion-title">
            {pendingSuggestion
              ? `الاقتراح الحالي: ${getSuggestionLabel(pendingSuggestion.suggestedStatus)}`
              : 'اقتراح قرار للفريق'}
          </h2>
        </div>
        {pendingSuggestion ? (
          <span className="deputy-suggestion-panel__meta">
            أُنشئ {formatCreatedAt(pendingSuggestion.createdAt)}
          </span>
        ) : null}
      </div>

      <div className="deputy-suggestion-panel__official-context">
        <span>قرار الفريق الرسمي الحالي</span>
        <strong>{getTeamDecisionLabel(teamDecision.status)}</strong>
      </div>

      {pendingSuggestion?.note ? (
        <p className="deputy-suggestion-panel__note">{pendingSuggestion.note}</p>
      ) : null}

      {notice ? (
        <p
          className={`deputy-suggestion-panel__notice deputy-suggestion-panel__notice--${notice.tone}`}
          role={notice.tone === 'warning' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      ) : null}

      {!isEditing ? (
        <button
          className="deputy-suggestion-panel__suggest-button"
          type="button"
          onClick={() => setIsEditing(true)}
        >
          {pendingSuggestion ? 'تعديل الاقتراح' : 'إرسال اقتراح قرار'}
        </button>
      ) : (
        <form className="deputy-suggestion-panel__form" onSubmit={handleSuggestionSubmit}>
          <fieldset disabled={isSubmitting}>
            <legend>القرار المقترح</legend>
            <div className="deputy-suggestion-panel__options">
              <label>
                <input
                  checked={suggestedStatus === 'PRELIMINARY_ACCEPTED'}
                  name="deputy-suggested-status"
                  type="radio"
                  value="PRELIMINARY_ACCEPTED"
                  onChange={() => setSuggestedStatus('PRELIMINARY_ACCEPTED')}
                />
                <span>قبول مبدئي</span>
              </label>
              <label>
                <input
                  checked={suggestedStatus === 'FINAL_ACCEPTED'}
                  name="deputy-suggested-status"
                  type="radio"
                  value="FINAL_ACCEPTED"
                  onChange={() => setSuggestedStatus('FINAL_ACCEPTED')}
                />
                <span>قبول نهائي</span>
              </label>
              <label>
                <input
                  checked={suggestedStatus === 'REJECTED'}
                  name="deputy-suggested-status"
                  type="radio"
                  value="REJECTED"
                  onChange={() => setSuggestedStatus('REJECTED')}
                />
                <span>رفض</span>
              </label>
            </div>
          </fieldset>

          <div className="deputy-suggestion-panel__note-field">
            <label htmlFor="deputy-suggestion-note">ملاحظة الاقتراح (اختيارية)</label>
            <textarea
              id="deputy-suggestion-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {submitError ? (
            <p className="deputy-suggestion-panel__error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="deputy-suggestion-panel__actions">
            <button
              className="deputy-suggestion-panel__suggest-button"
              disabled={isSubmitting || !hasSuggestionChanges}
              type="submit"
            >
              {isSubmitting ? 'جارٍ إرسال الاقتراح…' : 'حفظ الاقتراح'}
            </button>
            <button
              className="deputy-suggestion-panel__cancel-button"
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
