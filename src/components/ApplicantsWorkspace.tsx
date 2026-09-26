import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getApplicants } from '../api/applicantsApi';
import { ApiClientError } from '../api/apiClient';
import { AuthConsumer, type UserRole } from '../auth/AuthProvider';
import type {
  ApplicantListItem,
  ApplicantPriority,
  ProjectDecisionStatus,
  TeamDecisionStatus,
} from '../types/applicants';
import '../styles/applicants.css';

const pageSize = 25;

function canFilterByPriority(role: UserRole): boolean {
  return role !== 'VIEWER';
}

function parsePriority(value: string | null): ApplicantPriority | null {
  if (value === '1') {
    return 1;
  }

  if (value === '2') {
    return 2;
  }

  if (value === '3') {
    return 3;
  }

  return null;
}

function getApplicantName(name: string | null): string {
  return name ?? 'بدون اسم';
}

function getProjectDecisionLabel(status: ProjectDecisionStatus): string {
  if (status === 'UNREVIEWED') {
    return 'بدون قرار';
  }

  if (status === 'PRELIMINARY') {
    return 'ترشيح مبدئي';
  }

  if (status === 'FINAL_NOMINATION') {
    return 'ترشيح نهائي';
  }

  return 'مرفوض';
}

function getTeamDecisionLabel(status: TeamDecisionStatus): string {
  if (status === 'PENDING') {
    return 'بانتظار قرار الفريق';
  }

  if (status === 'PRELIMINARY_ACCEPTED') {
    return 'قبول مبدئي';
  }

  if (status === 'FINAL_ACCEPTED') {
    return 'قبول نهائي';
  }

  return 'مرفوض';
}

function getDecisionClass(status: ProjectDecisionStatus | TeamDecisionStatus): string {
  if (status === 'UNREVIEWED' || status === 'PENDING') {
    return 'undecided';
  }

  if (status === 'PRELIMINARY' || status === 'PRELIMINARY_ACCEPTED') {
    return 'preliminary-nomination';
  }

  if (status === 'FINAL_NOMINATION' || status === 'FINAL_ACCEPTED') {
    return 'final-nomination';
  }

  return 'rejected';
}


function getPreferenceName(item: ApplicantListItem, priority: ApplicantPriority): string {
  return (
    item.preferences.find((preference) => preference.priority === priority)
      ?.teamName ?? '—'
  );
}

export function ApplicantsWorkspace() {
  const [searchParams] = useSearchParams();
  const searchKey = searchParams.get('search') ?? '';

  return (
    <AuthConsumer>
      {({ user }) =>
        user ? (
          <ApplicantsWorkspaceContent key={searchKey} role={user.role} />
        ) : null
      }
    </AuthConsumer>
  );
}

type ApplicantsWorkspaceContentProps = {
  role: UserRole;
};

function ApplicantsWorkspaceContent({
  role,
}: ApplicantsWorkspaceContentProps) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') ?? '',
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [data, setData] = useState<{
    items: readonly ApplicantListItem[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const search = searchParams.get('search') ?? '';
  const priority = canFilterByPriority(role)
    ? parsePriority(searchParams.get('priority'))
    : null;
  const pageParam = Number(searchParams.get('page') ?? '1');
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  useEffect(() => {
    const normalizedParams = new URLSearchParams(searchParams);
    let hasChanges = false;

    ['q', 'decision', 'team'].forEach((name) => {
      if (normalizedParams.has(name)) {
        normalizedParams.delete(name);
        hasChanges = true;
      }
    });

    if (!canFilterByPriority(role) && normalizedParams.has('priority')) {
      normalizedParams.delete('priority');
      hasChanges = true;
    }

    if (searchParams.get('page') !== String(page)) {
      normalizedParams.set('page', String(page));
      hasChanges = true;
    }

    if (hasChanges) {
      setSearchParams(normalizedParams, { replace: true });
    }
  }, [page, role, searchParams, setSearchParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (searchInput === search) {
        return;
      }

      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);

        if (searchInput.trim().length > 0) {
          nextParams.set('search', searchInput);
        } else {
          nextParams.delete('search');
        }

        nextParams.set('page', '1');
        return nextParams;
      });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search, searchInput, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;

    const loadApplicants = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getApplicants(
          role,
          {
            search,
            priority,
            page,
            pageSize,
          },
          controller.signal,
        );

        if (!isCurrentRequest) {
          return;
        }

        setData({
          items: response.items,
          page: response.pagination.page,
          pageSize: response.pagination.pageSize,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
        });
      } catch (requestError) {
        if (!isCurrentRequest || controller.signal.aborted) {
          return;
        }

        if (requestError instanceof ApiClientError) {
          setError(requestError);
        } else {
          setError(
            new ApiClientError({
              kind: 'invalid-response',
            }),
          );
        }

        setData(null);
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      }
    };

    void loadApplicants();

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [page, priority, reloadKey, role, search]);

  const hasActiveFilters = search.trim().length > 0 || priority !== null;
  const hasServerFilters = search.trim().length > 0 || priority !== null;

  const updatePriority = (nextPriority: string) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);

      if (nextPriority.length > 0) {
        nextParams.set('priority', nextPriority);
      } else {
        nextParams.delete('priority');
      }

      nextParams.set('page', '1');
      return nextParams;
    });
  };

  const changePage = (nextPage: number) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('page', String(nextPage));
      return nextParams;
    });
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams({ page: '1' }));
  };

  return (
    <section className="applicants-page" aria-labelledby="applicants-title">
      <header className="applicants-page-header">
        <div>
          <p className="applicants-page-eyebrow">إدارة المتقدمين</p>
          <h1 id="applicants-title">المتقدمون</h1>
          <p className="applicants-page-description">
            راجع المتقدمين حسب نطاق الوصول الممنوح لحسابك.
          </p>
        </div>

        <p className="applicants-results-count" aria-live="polite">
          {data ? `إجمالي النتائج: ${data.total}` : 'جارٍ تحميل النتائج'}
        </p>
      </header>

      <div className="applicants-controls" aria-label="البحث والفلاتر">
        <div className="applicants-control applicants-search-control">
          <label htmlFor="applicant-search">البحث بالاسم</label>
          <div className="applicants-search-input-wrap">
            <Search aria-hidden="true" size={19} strokeWidth={2} />
            <input
              id="applicant-search"
              type="search"
              value={searchInput}
              placeholder="ابحث باسم المتقدم"
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </div>

        {canFilterByPriority(role) ? (
          <div className="applicants-control">
            <label htmlFor="preference-priority-filter">ترتيب الرغبة</label>
            <select
              id="preference-priority-filter"
              value={priority === null ? '' : String(priority)}
              onChange={(event) => updatePriority(event.target.value)}
            >
              <option value="">كل الرغبات</option>
              <option value="1">الرغبة الأولى</option>
              <option value="2">الرغبة الثانية</option>
              <option value="3">الرغبة الثالثة</option>
            </select>
          </div>
        ) : null}

        <button
          className="applicants-clear-filters"
          type="button"
          disabled={!hasActiveFilters}
          onClick={clearFilters}
        >
          <X aria-hidden="true" size={18} strokeWidth={2} />
          مسح الفلاتر
        </button>
      </div>

      {isLoading && !data ? (
        <div className="applicants-empty-state" role="status">
          <h2>جارٍ تحميل المتقدمين</h2>
          <p>يرجى الانتظار أثناء جلب القائمة.</p>
        </div>
      ) : null}

      {error ? (
        <div className="applicants-empty-state" role="alert">
          <h2>تعذر تحميل المتقدمين</h2>
          <p>
            {error.status === 403
              ? 'لا تملك صلاحية الوصول إلى قائمة المتقدمين.'
              : 'حدث خطأ أثناء جلب القائمة. حاول مرة أخرى.'}
          </p>
          <button
            className="applicants-empty-action"
            type="button"
            onClick={() => setReloadKey((currentKey) => currentKey + 1)}
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {!isLoading && !error && data && data.total === 0 ? (
        <div className="applicants-empty-state">
          <h2>
            {hasServerFilters
              ? 'لا توجد نتائج مطابقة'
              : 'لا يوجد متقدمون حاليًا'}
          </h2>
          <p>
            {hasServerFilters
              ? 'لا توجد نتائج تطابق البحث أو الفلاتر الحالية.'
              : 'ستظهر قائمة المتقدمين هنا عند توفر بيانات للتطبيق.'}
          </p>
          {hasServerFilters ? (
            <button
              className="applicants-empty-action"
              type="button"
              onClick={clearFilters}
            >
              مسح الفلاتر
            </button>
          ) : null}
        </div>
      ) : null}

      {!error && data && data.items.length > 0 ? (
        <>
          <div className="applicants-table-region" aria-busy={isLoading}>
            <table className="applicants-table">
              <caption className="visually-hidden">
                قائمة المتقدمين المتاحة للحساب الحالي
              </caption>
              <thead>
                <tr>
                  <th scope="col">المتقدم</th>
                  <th scope="col">الرغبة الأولى</th>
                  <th scope="col">الرغبة الثانية</th>
                  <th scope="col">الرغبة الثالثة</th>
                  {role !== 'VIEWER' ? (
                    <th scope="col">القرار المتاح</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {data.items.map((applicant) => {

                  return (
                    <tr key={applicant.id}>
                      <td data-label="المتقدم" className="applicant-name">
                        <Link
                          className="applicant-details-link"
                          to={{
                            pathname: `/applicants/${applicant.id}`,
                            search: location.search,
                          }}
                        >
                          {getApplicantName(applicant.arabicName)}
                        </Link>
                      </td>
                      <td data-label="الرغبة الأولى">
                        <PreferenceCell
                          priority={1}
                          team={getPreferenceName(applicant, 1)}
                        />
                      </td>
                      <td data-label="الرغبة الثانية">
                        <PreferenceCell
                          priority={2}
                          team={getPreferenceName(applicant, 2)}
                        />
                      </td>
                      <td data-label="الرغبة الثالثة">
                        <PreferenceCell
                          priority={3}
                          team={getPreferenceName(applicant, 3)}
                        />
                      </td>
                      {applicant.projection === 'project' ? (
                        <td data-label="قرار إدارة المشروع">
                          <DecisionChip
                            label={getProjectDecisionLabel(
                              applicant.projectDecision.status,
                            )}
                            status={applicant.projectDecision.status}
                          />
                        </td>
                      ) : null}
                      {applicant.projection === 'team' ? (
                        <td data-label="قرار الفريق">
                          <DecisionChip
                            label={getTeamDecisionLabel(
                              applicant.teamDecision.status,
                            )}
                            status={applicant.teamDecision.status}
                          />
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 ? (
            <nav
              className="applicants-empty-state"
              aria-label="التنقل بين صفحات المتقدمين"
            >
              <p>
                الصفحة {data.page} من {data.totalPages}
              </p>
              <div>
                <button
                  className="applicants-empty-action"
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => changePage(data.page - 1)}
                >
                  <ChevronRight aria-hidden="true" size={18} strokeWidth={2} />
                  السابق
                </button>
                <button
                  className="applicants-empty-action"
                  type="button"
                  disabled={data.page >= data.totalPages}
                  onClick={() => changePage(data.page + 1)}
                >
                  التالي
                  <ChevronLeft aria-hidden="true" size={18} strokeWidth={2} />
                </button>
              </div>
            </nav>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

type PreferenceCellProps = {
  priority: ApplicantPriority;
  team: string;
};

function PreferenceCell({ priority, team }: PreferenceCellProps) {
  return (
    <span className="applicant-preference">
      <span className="applicant-preference-number" aria-hidden="true">
        {priority}
      </span>
      <span>{team}</span>
    </span>
  );
}

type DecisionChipProps = {
  label: string;
  status: ProjectDecisionStatus | TeamDecisionStatus;
};

function DecisionChip({ label, status }: DecisionChipProps) {
  return (
    <span
      className={`project-decision-chip project-decision-chip--${getDecisionClass(
        status,
      )}`}
    >
      {label}
    </span>
  );
}
