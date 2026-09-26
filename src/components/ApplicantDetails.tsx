import { ArrowRight, ExternalLink, Mail } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getApplicantDetails } from '../api/applicantsApi';
import { ApiClientError } from '../api/apiClient';
import { AuthConsumer, type UserRole } from '../auth/AuthProvider';
import {
  ProjectDecisionPanel,
  type ProjectDecisionDraft,
  type ProjectDecisionNotice,
} from './ProjectDecisionPanel';
import {
  TeamDecisionPanel,
  type TeamDecisionDraft,
  type TeamDecisionNotice,
} from './TeamDecisionPanel';
import {
  DeputySuggestionPanel,
  type DeputySuggestionDraft,
  type DeputySuggestionNotice,
} from './DeputySuggestionPanel';
import {
  ViewerActionRequestPanel,
  type ViewerActionRequestDraft,
  type ViewerActionRequestNotice,
} from './ViewerActionRequestPanel';
import { ApplicantNotesPanel } from './ApplicantNotesPanel';
import { ObjectionPanel } from './ObjectionPanel';
import type {
  ApplicantDetail,
  ProjectDecisionStatus,
  TeamDecisionStatus,
} from '../types/applicants';
import '../styles/applicant-details.css';

function getName(name: string | null): string {
  return name ?? 'بدون اسم';
}

function getProjectLabel(status: ProjectDecisionStatus): string {
  if (status === 'UNREVIEWED') return 'بدون قرار';
  if (status === 'PRELIMINARY') return 'ترشيح مبدئي';
  if (status === 'FINAL_NOMINATION') return 'ترشيح نهائي';
  return 'مرفوض';
}

function getTeamLabel(status: TeamDecisionStatus): string {
  if (status === 'PENDING') return 'بانتظار قرار الفريق';
  if (status === 'PRELIMINARY_ACCEPTED') return 'قبول مبدئي';
  if (status === 'FINAL_ACCEPTED') return 'قبول نهائي';
  return 'مرفوض';
}

function getStatusClass(status: ProjectDecisionStatus | TeamDecisionStatus): string {
  if (status === 'UNREVIEWED' || status === 'PENDING') return 'unreviewed';
  if (status === 'PRELIMINARY' || status === 'PRELIMINARY_ACCEPTED') {
    return 'preliminary';
  }
  if (status === 'FINAL_NOMINATION' || status === 'FINAL_ACCEPTED') {
    return 'final-nomination';
  }
  return 'rejected';
}

function responseAnswerToText(answer: unknown): string {
  if (typeof answer === 'string' || typeof answer === 'number') {
    return String(answer);
  }

  if (typeof answer === 'boolean') {
    return answer ? 'نعم' : 'لا';
  }

  if (answer === null) {
    return 'لا توجد إجابة';
  }

  return 'إجابة غير قابلة للعرض';
}

export function ApplicantDetails() {
  const { id } = useParams();

  return (
    <AuthConsumer>
      {({ user }) => {
        if (!user) {
          return null;
        }

        if (!id) {
          return <UnavailableApplicantDetails />;
        }

        return (
          <ApplicantDetailsContent
            key={`${user.role}-${id}`}
            applicantId={id}
            role={user.role}
            currentUserId={user.id}
          />
        );
      }}
    </AuthConsumer>
  );
}

type ApplicantDetailsContentProps = {
  applicantId: string;
  role: UserRole;
  currentUserId: string;
};

function ApplicantDetailsContent({
  applicantId,
  role,
  currentUserId,
}: ApplicantDetailsContentProps) {
  const location = useLocation();
  const [detail, setDetail] = useState<ApplicantDetail | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [decisionDraft, setDecisionDraft] = useState<ProjectDecisionDraft | null>(null);
  const [decisionNotice, setDecisionNotice] = useState<ProjectDecisionNotice | null>(null);
  const [teamDecisionDraft, setTeamDecisionDraft] = useState<TeamDecisionDraft | null>(null);
  const [teamDecisionNotice, setTeamDecisionNotice] = useState<TeamDecisionNotice | null>(null);
  const [deputySuggestionDraft, setDeputySuggestionDraft] = useState<DeputySuggestionDraft | null>(null);
  const [deputySuggestionNotice, setDeputySuggestionNotice] = useState<DeputySuggestionNotice | null>(null);
  const [actionRequestDraft, setActionRequestDraft] = useState<ViewerActionRequestDraft | null>(null);
  const [actionRequestNotice, setActionRequestNotice] = useState<ViewerActionRequestNotice | null>(null);

  const refreshDetails = useCallback(() => {
    setRetryKey((currentKey) => currentKey + 1);
  }, []);

  const handleDecisionSaved = useCallback(() => {
    setDecisionDraft(null);
    setDecisionNotice({
      tone: 'success',
      text: 'تم حفظ القرار. جارٍ تحديث التفاصيل من النظام.',
    });
    refreshDetails();
  }, [refreshDetails]);

  const handleStaleDecision = useCallback(
    (draft: ProjectDecisionDraft) => {
      setDecisionDraft(draft);
      setDecisionNotice({
        tone: 'warning',
        text: 'تم تغيير قرار هذا المتقدم بواسطة مستخدم آخر منذ فتح الصفحة. راجع القرار الجديد قبل حفظ مسودتك مرة أخرى.',
      });
      refreshDetails();
    },
    [refreshDetails],
  );

  const handleTeamDecisionSaved = useCallback(() => {
    setTeamDecisionDraft(null);
    setTeamDecisionNotice({
      tone: 'success',
      text: 'تم حفظ قرار الفريق. جارٍ تحديث التفاصيل من النظام.',
    });
    refreshDetails();
  }, [refreshDetails]);

  const handleStaleTeamDecision = useCallback(
    (draft: TeamDecisionDraft) => {
      setTeamDecisionDraft(draft);
      setTeamDecisionNotice({
        tone: 'warning',
        text: 'تم تغيير قرار هذا المتقدم بواسطة مستخدم آخر منذ فتح الصفحة. راجع القرار الجديد قبل حفظ مسودتك مرة أخرى.',
      });
      refreshDetails();
    },
    [refreshDetails],
  );

  const handleDeputySuggestionSuccess = useCallback(() => {
    setDeputySuggestionDraft(null);
    setDeputySuggestionNotice({
      tone: 'success',
      text: 'تم حفظ اقتراح النائب. جارٍ تحديث التفاصيل من النظام.',
    });
    refreshDetails();
  }, [refreshDetails]);

  const handleDeputySuggestionConflict = useCallback(
    (draft: DeputySuggestionDraft) => {
      setDeputySuggestionDraft(draft);
      setDeputySuggestionNotice({
        tone: 'warning',
        text: 'تعذر حفظ الاقتراح لأن حالته تغيرت منذ فتح الصفحة. راجع التفاصيل الحديثة قبل الحفظ مرة أخرى.',
      });
      refreshDetails();
    },
    [refreshDetails],
  );

  const handleDeputyReviewSuccess = useCallback(() => {
    setDeputySuggestionNotice({
      tone: 'success',
      text: 'تمت مراجعة اقتراح النائب. جارٍ تحديث التفاصيل من النظام.',
    });
    refreshDetails();
  }, [refreshDetails]);

  const handleDeputyReviewConflict = useCallback(() => {
    setDeputySuggestionNotice({
      tone: 'warning',
      text: 'تعذر تنفيذ المراجعة لأن الاقتراح أو قرار الفريق تغير منذ فتح الصفحة. راجع التفاصيل الحديثة قبل المحاولة مرة أخرى.',
    });
    refreshDetails();
  }, [refreshDetails]);

  const handleDeputyResourceUnavailable = useCallback(() => {
    setDeputySuggestionNotice({
      tone: 'warning',
      text: 'المتقدم لم يعد متاحًا لهذه العملية. جارٍ تحديث التفاصيل من النظام.',
    });
    refreshDetails();
  }, [refreshDetails]);

  const handleActionRequestSaved = useCallback(() => {
    setActionRequestDraft(null);
    setActionRequestNotice({
      tone: 'success',
      text: 'تم إرسال طلب الإجراء. جارٍ تحديث التفاصيل من النظام.',
    });
    refreshDetails();
  }, [refreshDetails]);

  const handleActionRequestConflict = useCallback(
    (draft: ViewerActionRequestDraft) => {
      setActionRequestDraft(draft);
      setActionRequestNotice({
        tone: 'warning',
        text: 'تعذر حفظ الطلب لأن حالته تغيرت منذ فتح الصفحة. راجع التفاصيل الحديثة قبل الحفظ مرة أخرى.',
      });
      refreshDetails();
    },
    [refreshDetails],
  );

  const handleActionRequestResourceUnavailable = useCallback(() => {
    setActionRequestNotice({
      tone: 'warning',
      text: 'المتقدم لم يعد متاحًا لهذه العملية. جارٍ تحديث التفاصيل من النظام.',
    });
    refreshDetails();
  }, [refreshDetails]);

  const applicantsPath = {
    pathname: '/applicants',
    search: location.search,
  };

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;

    const loadDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getApplicantDetails(
          role,
          applicantId,
          controller.signal,
        );

        if (isCurrentRequest) {
          setDetail(response);
        }
      } catch (requestError) {
        if (!isCurrentRequest || controller.signal.aborted) {
          return;
        }

        setDetail(null);
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

    void loadDetails();

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [applicantId, retryKey, role]);

  if (isLoading) {
    return (
      <section className="applicant-details-page" aria-labelledby="details-loading-title">
        <Link className="applicant-back-link" to={applicantsPath}>
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
          العودة إلى المتقدمين
        </Link>
        <div className="applicant-not-found" role="status">
          <h1 id="details-loading-title">جارٍ تحميل التفاصيل</h1>
          <p>يرجى الانتظار أثناء جلب بيانات المتقدم.</p>
        </div>
      </section>
    );
  }

  if (error?.status === 400 || error?.status === 404) {
    return (
      <section className="applicant-details-page" aria-labelledby="not-found-title">
        <Link className="applicant-back-link" to={applicantsPath}>
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
          العودة إلى المتقدمين
        </Link>
        <div className="applicant-not-found">
          <h1 id="not-found-title">المتقدم غير متاح</h1>
          <p>لم نتمكن من العثور على متقدم متاح لهذا الرابط.</p>
          <Link className="applicant-not-found-action" to={applicantsPath}>
            العودة إلى قائمة المتقدمين
          </Link>
        </div>
      </section>
    );
  }

  if (error?.status === 403) {
    return (
      <section className="applicant-details-page" aria-labelledby="forbidden-title">
        <Link className="applicant-back-link" to={applicantsPath}>
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
          العودة إلى المتقدمين
        </Link>
        <div className="applicant-not-found">
          <h1 id="forbidden-title">غير مصرح لك بالوصول</h1>
          <p>لا تملك صلاحية عرض تفاصيل هذا المتقدم.</p>
          <Link className="applicant-not-found-action" to={applicantsPath}>
            العودة إلى قائمة المتقدمين
          </Link>
        </div>
      </section>
    );
  }

  if (error || !detail) {
    return (
      <section className="applicant-details-page" aria-labelledby="details-error-title">
        <Link className="applicant-back-link" to={applicantsPath}>
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
          العودة إلى المتقدمين
        </Link>
        <div className="applicant-not-found" role="alert">
          <h1 id="details-error-title">تعذر تحميل التفاصيل</h1>
          <p>حدث خطأ أثناء جلب بيانات المتقدم. حاول مرة أخرى.</p>
          <button
            className="applicant-not-found-action"
            type="button"
            onClick={() => setRetryKey((currentKey) => currentKey + 1)}
          >
            إعادة المحاولة
          </button>
        </div>
      </section>
    );
  }

  const isProject = detail.projection === 'project';
  const isTeam = detail.projection === 'team';
  const canManageProjectDecision =
    role === 'PROJECT_LEAD' || role === 'PROJECT_MEMBER';
  const canManageTeamDecision = role === 'TEAM_LEADER';
  const titleStatus = isProject
    ? getProjectLabel(detail.projectDecision.status)
    : isTeam
      ? getTeamLabel(detail.teamDecision.status)
      : null;
  const titleStatusValue = isProject
    ? detail.projectDecision.status
    : isTeam
      ? detail.teamDecision.status
      : null;

  return (
    <section className="applicant-details-page" aria-labelledby="applicant-title">
      <Link className="applicant-back-link" to={applicantsPath}>
        <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
        العودة إلى المتقدمين
      </Link>

      <header className="applicant-details-header">
        <div>
          <p className="applicant-details-eyebrow">تفاصيل المتقدم</p>
          <h1 id="applicant-title">{getName(detail.arabicName)}</h1>
          <p className="applicant-details-subtitle">
            {detail.academic.major ?? 'التخصص غير متوفر'}
            {detail.academic.academicYear
              ? ` · ${detail.academic.academicYear}`
              : ''}
          </p>
        </div>

        {titleStatus && titleStatusValue ? (
          <span
            className={`applicant-status applicant-status--${getStatusClass(
              titleStatusValue,
            )}`}
          >
            {titleStatus}
          </span>
        ) : null}
      </header>

      <div className="applicant-details-layout">
        <div className="applicant-details-main">
          <section className="applicant-details-section">
            <h2>المعلومات الأساسية</h2>
            <dl className="applicant-information-list applicant-information-list--grid">
              {detail.projection !== 'viewer' ? (
                <InformationItem label="الرقم الجامعي" value={detail.studentId} />
              ) : null}
              {detail.projection !== 'viewer' ? (
                <InformationItem label="الجنس" value={detail.academic.gender} />
              ) : null}
              <InformationItem label="التخصص" value={detail.academic.major} />
              <InformationItem
                label="السنة الدراسية"
                value={detail.academic.academicYear}
              />
            </dl>
          </section>

          {detail.projection !== 'viewer' ? (
            <section className="applicant-details-section">
              <h2>التواصل والروابط</h2>
              <dl className="applicant-information-list applicant-information-list--grid">
                <InformationItem
                  label="البريد الإلكتروني"
                  value={
                    detail.contact.email ? (
                      <a
                        className="applicant-contact-link"
                        dir="ltr"
                        href={`mailto:${detail.contact.email}`}
                      >
                        <Mail aria-hidden="true" size={17} strokeWidth={2} />
                        {detail.contact.email}
                      </a>
                    ) : (
                      null
                    )
                  }
                />
              </dl>

              {detail.links.linkedinUrl || detail.links.portfolioUrl ? (
                <div className="applicant-external-links">
                  {detail.links.linkedinUrl ? (
                    <ExternalLinkItem
                      label="لينكدإن"
                      url={detail.links.linkedinUrl}
                    />
                  ) : null}
                  {detail.links.portfolioUrl ? (
                    <ExternalLinkItem
                      label="ملف الأعمال"
                      url={detail.links.portfolioUrl}
                    />
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="applicant-details-section">
            <h2>رغبات الفرق</h2>
            <ol className="applicant-preferences-list">
              {[...detail.preferences]
                .sort(
                  (firstPreference, secondPreference) =>
                    firstPreference.priority - secondPreference.priority,
                )
                .map((preference) => (
                  <li
                    key={`${preference.teamId}-${preference.priority}`}
                    className="applicant-preference-item"
                  >
                    <span className="applicant-preference-order" aria-hidden="true">
                      {String(preference.priority).padStart(2, '0')}
                    </span>
                    <div>
                      <h3>{preference.teamName}</h3>
                      {preference.reason ? (
                        <p className="applicant-preference-reason">
                          {preference.reason}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
            </ol>
          </section>

          {detail.responses.length > 0 ? (
            <section className="applicant-details-section">
              <h2>إجابات التقديم</h2>
              <dl className="applicant-form-responses">
                {detail.responses.map((response) => (
                  <div key={response.key}>
                    <dt>{response.label}</dt>
                    <dd>{responseAnswerToText(response.answer)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>

        <aside className="applicant-details-side">
          {detail.projection === 'project' ? (
            <>
              {canManageProjectDecision ? (
                <>
                  <ProjectDecisionPanel
                    key={`${detail.id}-${detail.projectDecision.version ?? 'unreviewed'}-${decisionDraft ? 'draft' : 'current'}`}
                    activeNominations={detail.activeNominations}
                    applicantId={detail.id}
                    decision={detail.projectDecision}
                    initialDraft={decisionDraft}
                    notice={decisionNotice}
                    onDecisionSaved={handleDecisionSaved}
                    onStaleDecision={handleStaleDecision}
                  />
                  <ObjectionPanel decision={detail.projectDecision} />
                </>
              ) : (
                <>
                  <section className="applicant-side-section">
                    <h2>حالة إدارة المشروع</h2>
                    <DecisionStatus
                      label={getProjectLabel(detail.projectDecision.status)}
                      status={detail.projectDecision.status}
                    />
                    {detail.projectDecision.note ? (
                      <p className="applicant-decision-note">
                        {detail.projectDecision.note}
                      </p>
                    ) : null}
                  </section>

                  {detail.activeNominations.length > 0 ? (
                    <section className="applicant-side-section">
                      <h2>الترشيحات النشطة</h2>
                      <div className="applicant-nominations-list">
                        {detail.activeNominations.map((nomination) => (
                          <div key={nomination.id} className="applicant-nomination-item">
                            <h3>{nomination.teamName}</h3>
                            {nomination.priority ? (
                              <p>ترتيب الرغبة: {nomination.priority}</p>
                            ) : null}
                            <DecisionStatus
                              label={getTeamLabel(nomination.teamDecision.status)}
                              status={nomination.teamDecision.status}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              )}
            </>
          ) : null}

          {detail.projection === 'team' ? (
            <>
              {canManageTeamDecision ? (
                <TeamDecisionPanel
                  key={`${detail.id}-${detail.teamDecision.version ?? 'pending'}-${teamDecisionDraft ? 'draft' : 'current'}`}
                  applicantId={detail.id}
                  decision={detail.teamDecision}
                  initialDraft={teamDecisionDraft}
                  notice={teamDecisionNotice}
                  onDecisionSaved={handleTeamDecisionSaved}
                  onStaleDecision={handleStaleTeamDecision}
                />
              ) : (
                <section className="applicant-side-section">
                  <h2>حالة الفريق</h2>
                  <DecisionStatus
                    label={getTeamLabel(detail.teamDecision.status)}
                    status={detail.teamDecision.status}
                  />
                  {detail.teamDecision.note ? (
                    <p className="applicant-decision-note">
                      {detail.teamDecision.note}
                    </p>
                  ) : null}
                </section>
              )}

              {role === 'TEAM_DEPUTY' || role === 'TEAM_LEADER' ? (
                <DeputySuggestionPanel
                  key={`${detail.id}-${detail.pendingDeputySuggestion?.version ?? 'none'}-${deputySuggestionDraft ? 'draft' : 'current'}`}
                  applicantId={detail.id}
                  initialDraft={deputySuggestionDraft}
                  notice={deputySuggestionNotice}
                  pendingSuggestion={detail.pendingDeputySuggestion}
                  role={role}
                  teamDecision={detail.teamDecision}
                  onDeputyConflict={handleDeputySuggestionConflict}
                  onDeputySuccess={handleDeputySuggestionSuccess}
                  onResourceUnavailable={handleDeputyResourceUnavailable}
                  onReviewConflict={handleDeputyReviewConflict}
                  onReviewSuccess={handleDeputyReviewSuccess}
                />
              ) : null}
            </>
          ) : null}

          {detail.projection !== 'viewer' ? (
            <ApplicantNotesPanel applicantId={detail.id} currentUserId={currentUserId} />
          ) : null}

          {detail.projection === 'viewer' ? (
            <ViewerActionRequestPanel
              key={`${detail.id}-${detail.pendingActionRequest?.version ?? 'none'}-${actionRequestDraft ? 'draft' : 'current'}`}
              applicantId={detail.id}
              initialDraft={actionRequestDraft}
              notice={actionRequestNotice}
              pendingRequest={detail.pendingActionRequest}
              onRequestConflict={handleActionRequestConflict}
              onRequestSaved={handleActionRequestSaved}
              onResourceUnavailable={handleActionRequestResourceUnavailable}
            />
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function UnavailableApplicantDetails() {
  const location = useLocation();
  const applicantsPath = {
    pathname: '/applicants',
    search: location.search,
  };

  return (
    <section className="applicant-details-page" aria-labelledby="not-found-title">
      <Link className="applicant-back-link" to={applicantsPath}>
        <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
        العودة إلى المتقدمين
      </Link>
      <div className="applicant-not-found">
        <h1 id="not-found-title">المتقدم غير متاح</h1>
        <p>لم نتمكن من العثور على متقدم متاح لهذا الرابط.</p>
        <Link className="applicant-not-found-action" to={applicantsPath}>
          العودة إلى قائمة المتقدمين
        </Link>
      </div>
    </section>
  );
}

type InformationItemProps = {
  label: string;
  value: string | null | ReactNode;
};

function InformationItem({ label, value }: InformationItemProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? 'غير متوفر'}</dd>
    </div>
  );
}

type ExternalLinkItemProps = {
  label: string;
  url: string;
};

function ExternalLinkItem({ label, url }: ExternalLinkItemProps) {
  return (
    <a
      className="applicant-external-link"
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      {label}
      <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
    </a>
  );
}

type DecisionStatusProps = {
  label: string;
  status: ProjectDecisionStatus | TeamDecisionStatus;
};

function DecisionStatus({ label, status }: DecisionStatusProps) {
  return (
    <span
      className={`applicant-status applicant-status--${getStatusClass(status)}`}
    >
      {label}
    </span>
  );
}

