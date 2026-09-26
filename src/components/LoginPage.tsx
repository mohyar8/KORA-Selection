import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ApiClientError } from '../api/apiClient';
import { AuthConsumer } from '../auth/AuthProvider';
import koraMainLogo from '../design/assets/brand/kora-main-tight.svg';
import '../styles/auth.css';

function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return 'تعذر تسجيل الدخول حاليًا. حاول مرة أخرى.';
  }

  if (error.kind === 'network') {
    return 'تعذر الاتصال بالنظام. تحقق من الاتصال ثم حاول مرة أخرى.';
  }

  if (error.status === 401 && error.code === 'invalid_credentials') {
    return 'اسم المستخدم أو كلمة المرور غير صحيحة.';
  }

  if (error.status === 400) {
    return 'تعذر إرسال بيانات تسجيل الدخول. تحقق من الحقول ثم حاول مرة أخرى.';
  }

  if (error.status === 500 || error.code === 'internal_error') {
    return 'حدث خطأ في النظام. حاول مرة أخرى لاحقًا.';
  }

  return 'تعذر تسجيل الدخول حاليًا. حاول مرة أخرى.';
}

export function LoginPage() {
  return (
    <AuthConsumer>
      {({ login }) => <LoginForm login={login} />}
    </AuthConsumer>
  );
}

type LoginFormProps = {
  login: (username: string, password: string) => Promise<void>;
};

function LoginForm({ login }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (username.trim().length === 0 || password.length === 0) {
      setFormError('أدخل اسم المستخدم وكلمة المرور للمتابعة.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch (error) {
      setFormError(getLoginErrorMessage(error));
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand-region" aria-label="كـورة">
        <img className="login-brand-logo" src={koraMainLogo} alt="كـورة" />
        <div>
          <p className="login-brand-kicker">KORA MEMBERS SELECTION</p>
          <h1>نظام إدارة الأعضاء</h1>
          <p>
            مساحة داخلية لمراجعة طلبات الانضمام وتنظيم قرارات فرق كـورة.
          </p>
        </div>
      </section>

      <section className="login-form-region" aria-labelledby="login-title">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-heading">
            <p>مرحبًا بك</p>
            <h2 id="login-title">تسجيل الدخول</h2>
            <span>استخدم بيانات حسابك للوصول إلى النظام.</span>
          </div>

          <div className="login-field">
            <label htmlFor="login-username">اسم المستخدم</label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              disabled={isSubmitting}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">كلمة المرور</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                disabled={isSubmitting}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="login-password-visibility"
                type="button"
                disabled={isSubmitting}
                aria-label={
                  isPasswordVisible
                    ? 'إخفاء كلمة المرور'
                    : 'إظهار كلمة المرور'
                }
                onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
              >
                {isPasswordVisible ? (
                  <EyeOff aria-hidden="true" size={20} strokeWidth={2} />
                ) : (
                  <Eye aria-hidden="true" size={20} strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {formError ? (
            <p className="login-form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <button
            className="login-submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
          </button>
        </form>
      </section>
    </main>
  );
}
