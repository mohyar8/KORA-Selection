import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  ClipboardList,
  ClipboardCheck,
  MessageSquareWarning,
  Inbox,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { AuthConsumer, type CurrentUser } from '../auth/AuthProvider';
import koraNavigationLogo from '../design/assets/brand/kora-nav-lockup.png';


type NavigationItem = {
  label: string;
  to: string;
  icon: typeof ClipboardList;
  allowedRoles?: readonly CurrentUser['role'][];
};

const navigationItems: NavigationItem[] = [
  {
    label: 'المتقدمون',
    to: '/applicants',
    icon: ClipboardList,
  },
  {
    label: 'المقبولون',
    to: '/accepted',
    icon: BadgeCheck,
  },
  {
    label: 'الوارد',
    to: '/inbox',
    icon: Inbox,
  },
  {
    label: 'طلبات الإجراءات',
    to: '/action-requests',
    icon: ClipboardCheck,
    allowedRoles: ['PROJECT_LEAD', 'PROJECT_MEMBER'],
  },
  {
    label: 'الاعتراضات',
    to: '/objections',
    icon: MessageSquareWarning,
    allowedRoles: ['PROJECT_LEAD', 'PROJECT_MEMBER'],
  },
];

function getRoleLabel(role: CurrentUser['role']): string {
  if (role === 'PROJECT_LEAD') {
    return 'قائد إدارة المشروع';
  }

  if (role === 'PROJECT_MEMBER') {
    return 'عضو إدارة المشروع';
  }

  if (role === 'TEAM_LEADER') {
    return 'قائد فريق';
  }

  if (role === 'TEAM_DEPUTY') {
    return 'نائب قائد فريق';
  }

  return 'مشاهد';
}

export function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (isMobileMenuOpen) {
      closeButtonRef.current?.focus();
      return undefined;
    }

    menuButtonRef.current?.focus();
    return undefined;
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="app-shell">
      <aside className="sidebar sidebar--desktop" aria-label="التنقل الرئيسي">
        <SidebarContent />
      </aside>

      <div className="workspace">
        <header className="mobile-topbar">
          <button
            ref={menuButtonRef}
            className="icon-button mobile-menu-trigger"
            type="button"
            aria-label="فتح قائمة التنقل"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu aria-hidden="true" size={22} strokeWidth={2} />
          </button>

          <img
            className="mobile-brand"
            src={koraNavigationLogo}
            alt="كـورة"
          />
        </header>

        <main className="workspace-main" id="main-content">
          <Outlet />
        </main>
      </div>

      {isMobileMenuOpen ? (
        <div className="mobile-navigation-layer">
          <button
            className="mobile-navigation-backdrop"
            type="button"
            aria-label="إغلاق قائمة التنقل"
            onClick={closeMobileMenu}
          />

          <aside
            id="mobile-navigation-drawer"
            className="sidebar sidebar--mobile"
            aria-label="التنقل الرئيسي"
          >
            <button
              ref={closeButtonRef}
              className="icon-button drawer-close-button"
              type="button"
              aria-label="إغلاق قائمة التنقل"
              onClick={closeMobileMenu}
            >
              <X aria-hidden="true" size={22} strokeWidth={2} />
            </button>

            <SidebarContent onNavigate={closeMobileMenu} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

type SidebarContentProps = {
  onNavigate?: () => void;
};

function SidebarContent({ onNavigate }: SidebarContentProps) {
  return (
    <AuthConsumer>
      {({ logout, user }) => (
        <SidebarContentBody
          onNavigate={onNavigate}
          logout={logout}
          user={user}
        />
      )}
    </AuthConsumer>
  );
}

type SidebarContentBodyProps = {
  onNavigate?: () => void;
  logout: () => Promise<void>;
  user: CurrentUser | null;
};

function SidebarContentBody({
  onNavigate,
  logout,
  user,
}: SidebarContentBodyProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setLogoutError(null);
    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      setLogoutError('تعذر تسجيل الخروج حاليًا. حاول مرة أخرى.');
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="sidebar-content">
      <div className="sidebar-brand">
        <img
          className="sidebar-brand-image"
          src={koraNavigationLogo}
          alt="كـورة"
        />
        <p>نظام إدارة الأعضاء</p>
      </div>

      <nav className="sidebar-navigation" aria-label="أقسام النظام">
        <NavLink
          className={({ isActive }) =>
            `sidebar-navigation-link${isActive ? ' is-active' : ''}`
          }
          end
          to="/"
          onClick={onNavigate}
        >
          <ShieldCheck aria-hidden="true" size={20} strokeWidth={1.9} />
          <span>مساحة العمل</span>
        </NavLink>

        {navigationItems
          .filter(
            (item) =>
              item.allowedRoles === undefined ||
              (user !== null && item.allowedRoles.includes(user.role)),
          )
          .map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                `sidebar-navigation-link${isActive ? ' is-active' : ''}`
              }
              to={item.to}
              onClick={onNavigate}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={1.9} />
              <span>{item.label}</span>
            </NavLink>
          );
          })}
      </nav>

      {user ? (
        <>
          <div className="sidebar-footer">
            <UserRound aria-hidden="true" size={18} strokeWidth={1.9} />
            <div>
              <strong>{user.name}</strong>
              <span>{getRoleLabel(user.role)}</span>
            </div>
          </div>

          <button
            className="sidebar-navigation-link sidebar-logout-button"
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
          >
            <LogOut aria-hidden="true" size={20} strokeWidth={1.9} />
            <span>{isLoggingOut ? 'جارٍ تسجيل الخروج…' : 'تسجيل الخروج'}</span>
          </button>

          {logoutError ? (
            <p className="sidebar-logout-error" role="alert">
              {logoutError}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
