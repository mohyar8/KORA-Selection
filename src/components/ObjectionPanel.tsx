import { useState, type FormEvent } from 'react';
import { createObjection } from '../api/objectionsApi';
import { ApiClientError } from '../api/apiClient';
import type { ProjectDecisionDetail } from '../types/applicants';
import '../styles/objections.css';

type ObjectionPanelProps = {
  decision: ProjectDecisionDetail;
};

function errorText(error: ApiClientError): string {
  if (error.status === 403) {
    return 'لا يمكن إنشاء اعتراض على هذا القرار. قد يكون القرار صادرًا منك أو لم تعد تملك الصلاحية.';
  }

  if (error.status === 409) {
    return 'تعذر إنشاء الاعتراض لأن القرار تغير منذ فتح الصفحة. راجع الحالة ثم حاول مرة أخرى.';
  }

  if (error.status === 400) {
    return 'تعذر إنشاء الاعتراض. راجع السبب ثم حاول مرة أخرى.';
  }

  if (error.kind === 'network') {
    return 'تعذر الاتصال بالنظام. تحقق من الشبكة ثم حاول مرة أخرى.';
  }

  return 'تعذر إنشاء الاعتراض. حاول مرة أخرى.';
}

export function ObjectionPanel({ decision }: ObjectionPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const decisionId = decision.id;
  const decisionVersion = decision.version;

  if (
    decisionId === null ||
    decisionVersion === null ||
    decision.status === 'UNREVIEWED'
  ) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setError('اكتب سبب الاعتراض قبل الإرسال.');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createObjection(
        decisionId,
        trimmedReason,
        decisionVersion,
      );

      setNotice('تم تسجيل الاعتراض وإرساله للمراجعة.');
      setReason('');
      setIsEditing(false);
    } catch (requestError) {
      const apiError =
        requestError instanceof ApiClientError
          ? requestError
          : new ApiClientError({ kind: 'invalid-response' });

      setError(errorText(apiError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditing = () => {
    setError(null);
    setNotice(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setReason('');
    setError(null);
  };

  return (
    <section
      className="objection-panel"
      aria-labelledby="objection-title"
    >
      <p>مراجعة القرار</p>

      <h2 id="objection-title">
        الاعتراض على قرار إدارة المشروع
      </h2>

      <span>نسخة القرار الحالية: {decisionVersion}</span>

      {notice ? (
        <p className="objection-notice" role="status">
          {notice}
        </p>
      ) : null}

      {!isEditing ? (
        <button type="button" onClick={handleStartEditing}>
          إنشاء اعتراض
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="objection-reason">سبب الاعتراض</label>

          <textarea
            id="objection-reason"
            value={reason}
            disabled={isSubmitting}
            onChange={(event) => setReason(event.target.value)}
          />

          {error ? (
            <p className="objection-error" role="alert">
              {error}
            </p>
          ) : null}

          <div>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جارٍ الإرسال…' : 'إرسال الاعتراض'}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCancel}
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
    </section>
  );
}