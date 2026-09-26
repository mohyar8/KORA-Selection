import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getActiveTeams } from '../api/applicantsApi';
import {
  getActionRequests,
  reviewActionRequest,
  type ActionRequestListItem,
  type ActionRequestListResponse,
  type ActionRequestReviewStatus,
} from '../api/actionRequestsApi';
import { ApiClientError } from '../api/apiClient';
import type { ActiveTeam, ActionRequestActionType } from '../types/applicants';
import '../styles/action-requests.css';

const pageSize = 25;

type ReviewIntent = {
  request: ActionRequestListItem;
  reviewStatus: 'APPROVED' | 'REJECTED';
};

function isReviewStatus(value: string | null): value is ActionRequestReviewStatus {
  return value === 'PENDING' || value === 'APPROVED' || value === 'REJECTED';
}

function getPage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) {
    return 1;
  }

  const page = Number(value);

  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

function getActionLabel(actionType: ActionRequestActionType): string {
  if (actionType === 'PRELIMINARY') return 'ترشيح مبدئي';
  if (actionType === 'FINAL_NOMINATION') return 'ترشيح نهائي';
  return 'رفض';
}

function getStatusLabel(status: ActionRequestReviewStatus): string {
  if (status === 'PENDING') return 'بانتظار المراجعة';
  if (status === 'APPROVED') return 'معتمد';
  return 'مرفوض';
}

function getStatusClass(status: ActionRequestReviewStatus): string {
  if (status === 'PENDING') return 'pending';
  if (status === 'APPROVED') return 'approved';
  return 'rejected';
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);

  if (!Number.isFinite(date.getTime())) {
    return 'غير متوفر';
  }

  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function shortenIdentifier(identifier: string): string {
  return identifier.length > 10 ? `${identifier.slice(0, 8)}…` : identifier;
}

function getReviewErrorMessage(error: ApiClientError): string {
  if (error.status === 403) {
    return 'لا تملك صلاحية مراجعة هذا الطلب.';
  }

  if (error.status === 404) {
    return 'هذا الطلب لم يعد متاحًا للمراجعة. جارٍ تحديث القائمة.';
  }

  if (error.status === 400) {
    return 'تعذر تنفيذ المراجعة. حاول مرة أخرى بعد تحديث القائمة.';
  }

  if (error.kind === 'network') {
    return 'تعذر الاتصال بالنظام. تحقق من الشبكة ثم حاول مرة أخرى.';
  }

  return 'تعذر تنفيذ مراجعة الطلب. حاول مرة أخرى.';
}

function TeamNames({ teamIds, teams }: { teamIds: readonly string[]; teams: readonly ActiveTeam[] }) {
  if (teamIds.length === 0) {
    return <span className="action-request-teams__empty">لا توجد فرق محددة</span>;
  }

  return (
    <ul className="action-request-teams">
      {teamIds.map((teamId) => {
        const team = teams.find((item) => item.id === teamId);

        return (
          <li key={teamId} dir={team ? undefined : 'ltr'}>
            {team ? team.name : `فريق غير نشط (${shortenIdentifier(teamId)})`}
          </li>
        );
      })}
    </ul>
  );
}

type RequestReviewActionsProps = {
  request: ActionRequestListItem;
  isReviewing: boolean;
  onStartReview: (reviewStatus: 'APPROVED' | 'REJECTED') => void;
};

function RequestReviewActions({
  request,
  isReviewing,
  onStartReview,
}: RequestReviewActionsProps) {
  if (request.status !== 'PENDING') {
    return <span className="action-request-read-only">تمت المراجعة</span>;
  }

  return (
    <div className="action-request-actions">
      <button
        className="action-request-actions__approve"
        disabled={isReviewing}
        type="button"
        onClick={() => onStartReview('APPROVED')}
      >
        <Check aria-hidden="true" size={17} strokeWidth={2} />
        اعتماد
      </button>
      <button
        className="action-request-actions__reject"
        disabled={isReviewing}
        type="button"
        onClick={() => onStartReview('REJECTED')}
      >
        <X aria-hidden="true" size={17} strokeWidth={2} />
        رفض الطلب
      </button>
    </div>
  );
}

export function ActionRequestsWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const status = isReviewStatus(statusParam) ? statusParam : null;
  const page = getPage(searchParams.get('page'));
  const [response, setResponse] = useState<ActionRequestListResponse | null>(null);
  const [teams, setTeams] = useState<readonly ActiveTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [teamsError, setTeamsError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const updateUrl = useCallback(
    (nextStatus: ActionRequestReviewStatus | null, nextPage: number) => {
      const nextParams = new URLSearchParams();

      if (nextStatus !== null) {
        nextParams.set('status', nextStatus);
      }

      if (nextPage > 1) {
        nextParams.set('page', String(nextPage));
      }

      setSearchParams(nextParams);
    },
    [setSearchParams],
  );

  const refresh = useCallback(() => {
    setRetryKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;

    const loadRequests = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const nextResponse = await getActionRequests(
          { status, page, pageSize },
          controller.signal,
        );

        if (isCurrentRequest) {
          setResponse(nextResponse);
        }
      } catch (requestError) {
        if (!isCurrentRequest || controller.signal.aborted) {
          return;
        }

        setResponse(null);
        setError(
          requestError instanceof ApiClientError
            ? requestError
            : new ApiClientError({ kind: 'invalid-response' }),
        );
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      }
    };

    const loadTeams = async () => {
      try {
        const nextTeams = await getActiveTeams(controller.signal);

        if (isCurrentRequest) {
          setTeams(nextTeams);
          setTeamsError(false);
        }
      } catch {
        if (!isCurrentRequest || controller.signal.aborted) {
          return;
        }

        setTeams([]);
        setTeamsError(true);
      }
    };

    void loadRequests();
    void loadTeams();

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [page, retryKey, status]);

  const pagination = response?.pagination ?? null;
  const hasFilteredEmptyState = response?.items.length === 0 && status !== null;
  const hasUnfilteredEmptyState = response?.items.length === 0 && status === null;
  const confirmationDescription = useMemo(() => {
    if (!reviewIntent) {
      return null;
    }

    if (reviewIntent.reviewStatus === 'APPROVED') {
      return 'سيطبّق اعتماد هذا الطلب الإجراء المقترح كقرار رسمي لإدارة المشروع.';
    }

    return 'سيُرفض الطلب فقط، ولن يتغير قرار إدارة المشروع للمتقدم.';
  }, [reviewIntent]);

  const handleReview = async () => {
    if (!reviewIntent || isReviewing) {
      return;
    }

    setReviewError(null);
    setIsReviewing(true);

    try {
      await reviewActionRequest(reviewIntent.request.id, {
        reviewStatus: reviewIntent.reviewStatus,
        expectedVersion: reviewIntent.request.version,
      });
      setReviewIntent(null);
      setNotice(
        reviewIntent.reviewStatus === 'APPROVED'
          ? 'تم اعتماد الطلب وتحديث القائمة من النظام.'
          : 'تم رفض الطلب وتحديث القائمة من النظام.',
      );
      refresh();
    } catch (reviewRequestError) {
      const apiError =
        reviewRequestError instanceof ApiClientError
          ? reviewRequestError
          : new ApiClientError({ kind: 'invalid-response' });

      if (apiError.status === 409) {
        setReviewIntent(null);
        setNotice(
          apiError.code === 'action_request_not_pending'
            ? 'تمت مراجعة هذا الطلب بالفعل. جارٍ عرض الحالة الحالية.'
            : 'تغيرت حالة هذا الطلب أو القرار المرتبط به منذ تحميل الصفحة. راجع الحالة الحالية قبل المحاولة مرة أخرى.',
        );
        refresh();
        return;
      }

      if (apiError.status === 404) {
        setReviewIntent(null);
        setNotice('هذا الطلب لم يعد متاحًا للمراجعة. جارٍ تحديث القائمة.');
        refresh();
        return;
      }

      setReviewError(getReviewErrorMessage(apiError));
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <section className="action-requests-page" aria-labelledby="action-requests-title">
      <header className="action-requests-page__header">
        <div>
          <p className="action-requests-page__eyebrow">مراجعة إدارة المشروع</p>
          <h1 id="action-requests-title">طلبات الإجراءات</h1>
          <p>راجع الطلبات الواردة قبل تطبيق أي إجراء رسمي على المتقدم.</p>
        </div>
        <button className="action-requests-refresh" type="button" onClick={refresh}>
          <RefreshCw aria-hidden="true" size={18} strokeWidth={2} />
          تحديث
        </button>
      </header>

      <div className="action-requests-controls">
        <label htmlFor="action-request-status">حالة المراجعة</label>
        <select
          id="action-request-status"
          value={status ?? ''}
          onChange={(event) => {
            const nextStatus = isReviewStatus(event.target.value)
              ? event.target.value
              : null;
            setNotice(null);
            setReviewError(null);
            updateUrl(nextStatus, 1);
          }}
        >
          <option value="">الكل</option>
          <option value="PENDING">بانتظار المراجعة</option>
          <option value="APPROVED">معتمد</option>
          <option value="REJECTED">مرفوض</option>
        </select>
      </div>

      {notice ? <p className="action-requests-notice" role="status">{notice}</p> : null}
      {teamsError ? (
        <p className="action-requests-team-warning" role="status">
          تعذر تحميل أسماء الفرق الحالية؛ ستظهر معرفات الفرق غير المتاحة بالاسم.
        </p>
      ) : null}

      {isLoading ? (
        <div className="action-requests-state" role="status">
          <h2>جارٍ تحميل الطلبات</h2>
          <p>يرجى الانتظار أثناء جلب طلبات الإجراءات.</p>
        </div>
      ) : null}

      {!isLoading && error?.status === 403 ? (
        <div className="action-requests-state" role="alert">
          <h2>غير مصرح لك بالوصول</h2>
          <p>لا تملك صلاحية عرض طلبات الإجراءات.</p>
        </div>
      ) : null}

      {!isLoading && error && error.status !== 403 ? (
        <div className="action-requests-state" role="alert">
          <h2>تعذر تحميل الطلبات</h2>
          <p>حدث خطأ أثناء جلب طلبات الإجراءات. حاول مرة أخرى.</p>
          <button type="button" onClick={refresh}>إعادة المحاولة</button>
        </div>
      ) : null}

      {!isLoading && !error && hasUnfilteredEmptyState ? (
        <div className="action-requests-state">
          <h2>لا توجد طلبات إجراءات حاليًا</h2>
          <p>ستظهر الطلبات هنا عند إرسالها للمراجعة.</p>
        </div>
      ) : null}

      {!isLoading && !error && hasFilteredEmptyState ? (
        <div className="action-requests-state">
          <h2>لا توجد طلبات بهذه الحالة</h2>
          <p>جرّب عرض جميع الطلبات أو اختر حالة مراجعة أخرى.</p>
          <button type="button" onClick={() => updateUrl(null, 1)}>عرض الكل</button>
        </div>
      ) : null}

      {!isLoading && !error && response && response.items.length > 0 ? (
        <>
          <div className="action-requests-table-wrap">
            <table className="action-requests-table">
              <thead>
                <tr>
                  <th scope="col">المتقدم</th>
                  <th scope="col">مقدم الطلب</th>
                  <th scope="col">الإجراء المقترح</th>
                  <th scope="col">الفرق</th>
                  <th scope="col">الملاحظة</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">آخر تحديث</th>
                  <th scope="col">المراجعة</th>
                </tr>
              </thead>
              <tbody>
                {response.items.map((request) => (
                  <tr key={request.id}>
                    <td><span className="action-request-id" dir="ltr">{shortenIdentifier(request.applicantId)}</span></td>
                    <td>{request.requester.name}</td>
                    <td>{getActionLabel(request.actionType)}</td>
                    <td><TeamNames teamIds={request.teamIds} teams={teams} /></td>
                    <td>{request.note ?? '—'}</td>
                    <td><span className={`action-request-status action-request-status--${getStatusClass(request.status)}`}>{getStatusLabel(request.status)}</span></td>
                    <td>{formatDate(request.updatedAt)}</td>
                    <td>
                      <RequestReviewActions
                        request={request}
                        isReviewing={isReviewing}
                        onStartReview={(reviewStatus) => {
                          setReviewError(null);
                          setReviewIntent({ request, reviewStatus });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="action-requests-mobile-list">
            {response.items.map((request) => (
              <article key={request.id} className="action-request-mobile-item">
                <div className="action-request-mobile-item__header">
                  <div>
                    <p>المتقدم</p>
                    <strong className="action-request-id" dir="ltr">{shortenIdentifier(request.applicantId)}</strong>
                  </div>
                  <span className={`action-request-status action-request-status--${getStatusClass(request.status)}`}>{getStatusLabel(request.status)}</span>
                </div>
                <dl>
                  <div><dt>مقدم الطلب</dt><dd>{request.requester.name}</dd></div>
                  <div><dt>الإجراء المقترح</dt><dd>{getActionLabel(request.actionType)}</dd></div>
                  <div><dt>الفرق</dt><dd><TeamNames teamIds={request.teamIds} teams={teams} /></dd></div>
                  <div><dt>الملاحظة</dt><dd>{request.note ?? '—'}</dd></div>
                  <div><dt>آخر تحديث</dt><dd>{formatDate(request.updatedAt)}</dd></div>
                </dl>
                <RequestReviewActions
                  request={request}
                  isReviewing={isReviewing}
                  onStartReview={(reviewStatus) => {
                    setReviewError(null);
                    setReviewIntent({ request, reviewStatus });
                  }}
                />
              </article>
            ))}
          </div>
        </>
      ) : null}

      {pagination && pagination.totalPages > 1 ? (
        <nav className="action-requests-pagination" aria-label="صفحات طلبات الإجراءات">
          <button
            disabled={pagination.page <= 1}
            type="button"
            onClick={() => updateUrl(status, pagination.page - 1)}
          >
            <ChevronRight aria-hidden="true" size={18} strokeWidth={2} />
            السابق
          </button>
          <p>الصفحة {pagination.page} من {pagination.totalPages} · {pagination.total} طلبًا</p>
          <button
            disabled={pagination.page >= pagination.totalPages}
            type="button"
            onClick={() => updateUrl(status, pagination.page + 1)}
          >
            التالي
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={2} />
          </button>
        </nav>
      ) : null}

      {reviewIntent ? (
        <section className="action-request-confirmation" aria-labelledby="action-request-confirmation-title">
          <h2 id="action-request-confirmation-title">
            {reviewIntent.reviewStatus === 'APPROVED' ? 'تأكيد اعتماد الطلب' : 'تأكيد رفض الطلب'}
          </h2>
          <p>المتقدم: <span dir="ltr">{shortenIdentifier(reviewIntent.request.applicantId)}</span></p>
          <p>الإجراء المقترح: {getActionLabel(reviewIntent.request.actionType)}</p>
          {reviewIntent.request.actionType === 'FINAL_NOMINATION' ? (
            <div><p>الفرق المقترحة:</p><TeamNames teamIds={reviewIntent.request.teamIds} teams={teams} /></div>
          ) : null}
          <p className="action-request-confirmation__description">{confirmationDescription}</p>
          {reviewError ? <p className="action-request-confirmation__error" role="alert">{reviewError}</p> : null}
          <div className="action-request-confirmation__actions">
            <button
              className={reviewIntent.reviewStatus === 'APPROVED' ? 'action-request-actions__approve' : 'action-request-actions__reject'}
              disabled={isReviewing}
              type="button"
              onClick={() => void handleReview()}
            >
              {isReviewing ? 'جارٍ الحفظ…' : reviewIntent.reviewStatus === 'APPROVED' ? 'تأكيد الاعتماد' : 'تأكيد رفض الطلب'}
            </button>
            <button disabled={isReviewing} type="button" onClick={() => setReviewIntent(null)}>إلغاء</button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
