import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthConsumer } from './auth/AuthProvider';
import { ApplicantDetails } from './components/ApplicantDetails';
import { ApplicantsWorkspace } from './components/ApplicantsWorkspace';
import { ActionRequestsWorkspace } from './components/ActionRequestsWorkspace';
import { AppShell } from './components/AppShell';
import { FinalAcceptedWorkspace } from './components/FinalAcceptedWorkspace';
import { InboxWorkspace } from './components/InboxWorkspace';
import { ObjectionsWorkspace } from './components/ObjectionsWorkspace';
import { AdminWorkspace } from './components/AdminWorkspace';
import { ImportWorkspace } from './components/ImportWorkspace';
import { LoginPage } from './components/LoginPage';
import { WorkspacePlaceholder } from './components/WorkspacePlaceholder';

function App() {
  return (
    <AuthConsumer>
      {({ status, retrySession, user }) => {
        if (status === 'initializing') {
          return <ApplicationStartup />;
        }

        if (status === 'verification-error') {
          return <SessionVerificationError onRetry={retrySession} />;
        }

        if (status === 'unauthenticated') {
          return <LoginPage />;
        }

        return (
          <Routes>
            <Route element={<AppShell />}>
              <Route
                index
                element={
                  <WorkspacePlaceholder
                    title="نظام فرز المتقدمين"
                    description="مساحة عمل داخلية لتنظيم مراجعة طلبات الانضمام إلى كـورة وإدارة قراراتها."
                    isHome
                  />
                }
              />
              <Route path="applicants" element={<ApplicantsWorkspace />} />
              <Route path="applicants/:id" element={<ApplicantDetails />} />
              <Route
                path="accepted"
                element={
                  user?.role === 'VIEWER' ? (
                    <Navigate to="/" replace />
                  ) : (
                    <FinalAcceptedWorkspace />
                  )
                }
              />
              <Route
                path="action-requests"
                element={
                  user?.role === 'PROJECT_LEAD' || user?.role === 'PROJECT_MEMBER' ? (
                    <ActionRequestsWorkspace />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="objections"
                element={
                  user?.role === 'PROJECT_LEAD' || user?.role === 'PROJECT_MEMBER' ? (
                    <ObjectionsWorkspace />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="inbox"
                element={<InboxWorkspace />}
              />
              <Route
                path="admin"
                element={
                  user?.role === 'PROJECT_LEAD' ? (
                    <AdminWorkspace />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="import"
                element={
                  user?.role === 'PROJECT_LEAD' || user?.role === 'PROJECT_MEMBER' ? (
                    <ImportWorkspace />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        );
      }}
    </AuthConsumer>
  );
}

function ApplicationStartup() {
  return (
    <main className="auth-startup" aria-labelledby="auth-startup-title">
      <div className="auth-startup-content" role="status">
        <span className="auth-startup-mark" aria-hidden="true" />
        <h1 id="auth-startup-title">كـورة</h1>
        <p>جارٍ التحقق من الجلسة…</p>
      </div>
    </main>
  );
}

type SessionVerificationErrorProps = {
  onRetry: () => void;
};

function SessionVerificationError({ onRetry }: SessionVerificationErrorProps) {
  return (
    <main className="auth-startup" aria-labelledby="session-error-title">
      <div className="auth-startup-content auth-startup-content--error">
        <h1 id="session-error-title">تعذر الاتصال بالنظام</h1>
        <p>
          لم نتمكن من التحقق من الجلسة الحالية. تأكد من الاتصال ثم حاول مرة أخرى.
        </p>
        <button className="auth-retry-button" type="button" onClick={onRetry}>
          إعادة المحاولة
        </button>
      </div>
    </main>
  );
}

export default App;
