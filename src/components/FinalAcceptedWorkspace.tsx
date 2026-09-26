import { ChevronLeft, ChevronRight, Mail, Phone, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getFinalAccepted,
  type FinalAcceptedItem,
  type FinalAcceptedPreferencePriority,
  type FinalAcceptedResponse,
} from '../api/finalAcceptedApi';
import { ApiClientError } from '../api/apiClient';
import '../styles/final-accepted.css';

const pageSize = 25;

function getApplicantName(name: string | null): string {
  return name ?? 'بدون اسم';
}

function getPreferenceLabel(
  priority: FinalAcceptedPreferencePriority | null,
): string {
  if (priority === 1) return 'الرغبة الأولى';
  if (priority === 2) return 'الرغبة الثانية';
  if (priority === 3) return 'الرغبة الثالثة';
  return 'خارج الرغبات';
}

function formatAcceptedAt(value: number): string {
  if (!Number.isFinite(value)) {
    return 'غير متوفر';
  }

  const date = new Date(value * 1000);

  if (Number.isNaN(date.getTime())) {
    return 'غير متوفر';
  }

  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function ContactCell({ item }: { item: FinalAcceptedItem }) {
  const { email, phoneNumber } = item.contact;

  if (!email && !phoneNumber) {
    return <span>لا توجد بيانات تواصل</span>;
  }

  return (
    <div className="final-accepted-contact-list">
      {email ? (
        <a dir="ltr" href={`mailto:${email}`}>
          <Mail aria-hidden="true" size={15} strokeWidth={2} />
          {email}
        </a>
      ) : null}
      {phoneNumber ? (
        <a dir="ltr" href={`tel:${phoneNumber}`}>
          <Phone aria-hidden="true" size={15} strokeWidth={2} />
          {phoneNumber}
        </a>
      ) : null}
    </div>
  );
}

export function FinalAcceptedWorkspace() {
  const [searchParams] = useSearchParams();
  const searchKey = searchParams.get('search') ?? '';

  return <FinalAcceptedWorkspaceContent key={searchKey} />;
}

function FinalAcceptedWorkspaceContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') ?? '',
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [data, setData] = useState<FinalAcceptedResponse | null>(null);

  const search = searchParams.get('search') ?? '';
  const pageParam = Number(searchParams.get('page') ?? '1');
  const page =
    Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  useEffect(() => {
    if (searchParams.get('page') === String(page)) {
      return;
    }

    const normalizedParams = new URLSearchParams(searchParams);
    normalizedParams.set('page', String(page));
    setSearchParams(normalizedParams, { replace: true });
  }, [page, searchParams, setSearchParams]);

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

    const loadFinalAccepted = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getFinalAccepted(
          {
            search,
            page,
            pageSize,
          },
          controller.signal,
        );

        if (isCurrentRequest) {
          setData(response);
        }
      } catch (requestError) {
        if (!isCurrentRequest || controller.signal.aborted) {
          return;
        }

        setData(null);
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

    void loadFinalAccepted();

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [page, reloadKey, search]);

  const hasSearch = search.trim().length > 0;

  const clearSearch = () => {
    setSearchParams(new URLSearchParams({ page: '1' }));
  };

  const changePage = (nextPage: number) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('page', String(nextPage));
      return nextParams;
    });
  };

  return (
    <section className="final-accepted-page" aria-labelledby="final-accepted-title">
      <header className="final-accepted-page__header">
        <div>
          <p className="final-accepted-page__eyebrow">إدارة الأعضاء</p>
          <h1 id="final-accepted-title">المقبولون النهائيون</h1>
          <p className="final-accepted-page__description">
            قائمة القبول النهائي حسب نطاق الوصول الممنوح لحسابك.
          </p>
        </div>

        <p className="final-accepted-page__count" aria-live="polite">
          {data ? `إجمالي النتائج: ${data.pagination.total}` : 'جارٍ تحميل النتائج'}
        </p>
      </header>

      <div className="final-accepted-search" aria-label="البحث في المقبولين النهائيين">
        <label htmlFor="final-accepted-search">البحث بالاسم</label>
        <div className="final-accepted-search__input-wrap">
          <Search aria-hidden="true" size={19} strokeWidth={2} />
          <input
            id="final-accepted-search"
            type="search"
            value={searchInput}
            placeholder="ابحث باسم المتقدم"
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <button
          className="final-accepted-search__clear"
          disabled={!hasSearch}
          type="button"
          onClick={clearSearch}
        >
          <X aria-hidden="true" size={18} strokeWidth={2} />
          مسح البحث
        </button>
      </div>

      {isLoading && !data ? (
        <div className="final-accepted-state" role="status">
          <h2>جارٍ تحميل المقبولين النهائيين</h2>
          <p>يرجى الانتظار أثناء جلب القائمة.</p>
        </div>
      ) : null}

      {error ? (
        <div className="final-accepted-state" role="alert">
          <h2>تعذر تحميل المقبولين النهائيين</h2>
          <p>
            {error.status === 403
              ? 'لا تملك صلاحية الوصول إلى قائمة المقبولين النهائيين.'
              : 'حدث خطأ أثناء جلب القائمة. حاول مرة أخرى.'}
          </p>
          <button
            className="final-accepted-state__action"
            type="button"
            onClick={() => setReloadKey((currentKey) => currentKey + 1)}
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {!isLoading && !error && data && data.items.length === 0 ? (
        <div className="final-accepted-state">
          <h2>
            {hasSearch
              ? 'لا توجد نتائج تطابق البحث الحالي'
              : 'لا يوجد مقبولون نهائيًا حتى الآن'}
          </h2>
          <p>
            {hasSearch
              ? 'جرّب تعديل عبارة البحث أو امسحها لعرض كل النتائج.'
              : 'ستظهر القبولات النهائية هنا عند توفرها.'}
          </p>
          {hasSearch ? (
            <button
              className="final-accepted-state__action"
              type="button"
              onClick={clearSearch}
            >
              مسح البحث
            </button>
          ) : null}
        </div>
      ) : null}

      {!error && data && data.items.length > 0 ? (
        <>
          <div className="final-accepted-table-region" aria-busy={isLoading}>
            <table className="final-accepted-table">
              <caption className="visually-hidden">
                قائمة المقبولين النهائيين المتاحة للحساب الحالي
              </caption>
              <thead>
                <tr>
                  <th scope="col">المتقدم</th>
                  <th scope="col">الرقم الجامعي</th>
                  <th scope="col">الفريق</th>
                  <th scope="col">ترتيب الرغبة</th>
                  <th scope="col">التواصل</th>
                  <th scope="col">تاريخ القبول</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.acceptanceId}>
                    <td data-label="المتقدم" className="final-accepted-table__name">
                      {getApplicantName(item.arabicName)}
                    </td>
                    <td data-label="الرقم الجامعي">
                      <span dir="ltr">{item.studentId}</span>
                    </td>
                    <td data-label="الفريق">{item.team.name}</td>
                    <td data-label="ترتيب الرغبة">
                      {getPreferenceLabel(item.preferencePriority)}
                    </td>
                    <td data-label="التواصل">
                      <ContactCell item={item} />
                    </td>
                    <td data-label="تاريخ القبول">
                      {formatAcceptedAt(item.acceptedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination.totalPages > 1 ? (
            <nav
              className="final-accepted-pagination"
              aria-label="التنقل بين صفحات المقبولين النهائيين"
            >
              <p>
                الصفحة {data.pagination.page} من {data.pagination.totalPages}
              </p>
              <div>
                <button
                  type="button"
                  disabled={data.pagination.page <= 1}
                  onClick={() => changePage(data.pagination.page - 1)}
                >
                  <ChevronRight aria-hidden="true" size={18} strokeWidth={2} />
                  السابق
                </button>
                <button
                  type="button"
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  onClick={() => changePage(data.pagination.page + 1)}
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
