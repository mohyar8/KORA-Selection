import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  adminUserRoles,
  createAdminTeam,
  createAdminUser,
  getAdminTeams,
  getAdminUsers,
  updateAdminTeam,
  updateAdminUser,
  type AdminTeam,
  type AdminUser,
  type AdminUserRole,
  type UpdateTeamRequest,
  type UpdateUserRequest,
} from '../api/adminApi';
import { ApiClientError } from '../api/apiClient';
import '../styles/admin.css';

type AdminSection = 'teams' | 'users';
type TeamForm = {
  mode: 'create' | 'edit';
  teamId: string | null;
  name: string;
  isActive: boolean;
};
type UserForm = {
  mode: 'create' | 'edit';
  userId: string | null;
  name: string;
  username: string;
  password: string;
  role: AdminUserRole;
  teamId: string | null;
  isActive: boolean;
};

function getRoleLabel(role: AdminUserRole): string {
  if (role === 'PROJECT_LEAD') return 'قائد إدارة المشروع';
  if (role === 'PROJECT_MEMBER') return 'عضو إدارة المشروع';
  if (role === 'TEAM_LEADER') return 'قائد فريق';
  if (role === 'TEAM_DEPUTY') return 'نائب قائد فريق';
  return 'مشاهد';
}

function isTeamRole(role: AdminUserRole): boolean {
  return role === 'TEAM_LEADER' || role === 'TEAM_DEPUTY';
}

function getAdminUserRole(value: string): AdminUserRole {
  return adminUserRoles.find((role) => role === value) ?? 'PROJECT_MEMBER';
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);

  if (!Number.isFinite(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
  }).format(date);
}

function getErrorText(error: unknown, entity: 'team' | 'user'): string {
  if (!(error instanceof ApiClientError)) {
    return 'تعذر إتمام العملية. حاول مرة أخرى.';
  }

  if (error.status === 403) {
    return 'لا تملك صلاحية تنفيذ هذه العملية.';
  }

  if (error.code === 'team_name_conflict') {
    return 'اسم الفريق مستخدم بالفعل.';
  }

  if (error.code === 'team_has_active_members') {
    return 'لا يمكن تعطيل الفريق بينما يوجد قائد أو نائب قائد نشط مرتبط به.';
  }

  if (error.code === 'username_conflict') {
    return 'اسم المستخدم مستخدم بالفعل.';
  }

  if (error.code === 'last_project_lead') {
    return 'لا يمكن تعطيل آخر قائد إدارة مشروع نشط أو تخفيض صلاحياته.';
  }

  if (error.status === 400) {
    return entity === 'team'
      ? 'تعذر حفظ الفريق. تحقق من الاسم ثم حاول مرة أخرى.'
      : 'تعذر حفظ المستخدم. تحقق من البيانات ثم حاول مرة أخرى.';
  }

  if (error.kind === 'network') {
    return 'تعذر الاتصال بالنظام. تحقق من الشبكة ثم حاول مرة أخرى.';
  }

  return 'تعذر إتمام العملية. حاول مرة أخرى.';
}

function emptyUserForm(): UserForm {
  return {
    mode: 'create',
    userId: null,
    name: '',
    username: '',
    password: '',
    role: 'PROJECT_MEMBER',
    teamId: null,
    isActive: true,
  };
}

export function AdminWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSection: AdminSection =
    searchParams.get('section') === 'users' ? 'users' : 'teams';
  const [teams, setTeams] = useState<readonly AdminTeam[]>([]);
  const [users, setUsers] = useState<readonly AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [teamForm, setTeamForm] = useState<TeamForm | null>(null);
  const [userForm, setUserForm] = useState<UserForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeactivation, setPendingDeactivation] = useState<
    'team' | 'user' | null
  >(null);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    const loadAdminData = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [nextTeams, nextUsers] = await Promise.all([
          getAdminTeams(controller.signal),
          getAdminUsers(controller.signal),
        ]);

        if (isCurrent) {
          setTeams(nextTeams);
          setUsers(nextUsers);
        }
      } catch (error) {
        if (!isCurrent || controller.signal.aborted) {
          return;
        }

        setLoadError(getErrorText(error, 'team'));
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    void loadAdminData();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [reloadKey]);

  const teamNames = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  );

  const activeTeams = useMemo(
    () => teams.filter((team) => team.isActive),
    [teams],
  );

  const setSection = (section: AdminSection) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('section', section);
      return nextParams;
    });
  };

  const resetForms = () => {
    setTeamForm(null);
    setUserForm(null);
    setFormError(null);
    setPendingDeactivation(null);
  };

  const openCreateTeam = () => {
    resetForms();
    setTeamForm({ mode: 'create', teamId: null, name: '', isActive: true });
  };

  const openEditTeam = (team: AdminTeam) => {
    resetForms();
    setTeamForm({
      mode: 'edit',
      teamId: team.id,
      name: team.name,
      isActive: team.isActive,
    });
  };

  const openCreateUser = () => {
    resetForms();
    setUserForm(emptyUserForm());
  };

  const openEditUser = (user: AdminUser) => {
    resetForms();
    setUserForm({
      mode: 'edit',
      userId: user.id,
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
      teamId: user.teamId,
      isActive: user.isActive,
    });
  };

  const saveTeam = async () => {
    if (!teamForm || isSaving) return;

    const name = teamForm.name.trim();

    if (name.length === 0 || name.length > 200) {
      setFormError('اسم الفريق مطلوب ويجب ألا يتجاوز 200 حرف.');
      return;
    }

    const existingTeam = teamForm.teamId
      ? teams.find((team) => team.id === teamForm.teamId) ?? null
      : null;

    if (
      teamForm.mode === 'edit' &&
      existingTeam?.isActive &&
      !teamForm.isActive &&
      pendingDeactivation !== 'team'
    ) {
      setPendingDeactivation('team');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      if (teamForm.mode === 'create') {
        await createAdminTeam({ name });
      } else if (existingTeam && teamForm.teamId) {
        const request: UpdateTeamRequest = {};

        if (name !== existingTeam.name) request.name = name;
        if (teamForm.isActive !== existingTeam.isActive) {
          request.isActive = teamForm.isActive;
        }

        if (Object.keys(request).length === 0) {
          setFormError('لم يتم إجراء أي تغيير للحفظ.');
          return;
        }

        await updateAdminTeam(teamForm.teamId, request);
      }

      resetForms();
      setReloadKey((current) => current + 1);
    } catch (error) {
      setFormError(getErrorText(error, 'team'));
    } finally {
      setIsSaving(false);
      setPendingDeactivation(null);
    }
  };

  const saveUser = async () => {
    if (!userForm || isSaving) return;

    const name = userForm.name.trim();
    const username = userForm.username.trim();
    const needsTeam = isTeamRole(userForm.role);
    const selectedTeam = userForm.teamId
      ? teams.find((team) => team.id === userForm.teamId) ?? null
      : null;
    const existingUser = userForm.userId
      ? users.find((user) => user.id === userForm.userId) ?? null
      : null;
    const preservesCurrentTeam =
      existingUser !== null &&
      existingUser.role === userForm.role &&
      existingUser.teamId === userForm.teamId;

    if (name.length === 0 || name.length > 200) {
      setFormError('الاسم مطلوب ويجب ألا يتجاوز 200 حرف.');
      return;
    }

    if (username.length === 0 || username.length > 128) {
      setFormError('اسم المستخدم مطلوب ويجب ألا يتجاوز 128 حرف.');
      return;
    }

    if (userForm.mode === 'create' && (userForm.password.length < 16 || userForm.password.length > 1024)) {
      setFormError('كلمة المرور يجب أن تكون بين 16 و1024 حرفًا.');
      return;
    }

    if (
      needsTeam &&
      (!selectedTeam || (!selectedTeam.isActive && !preservesCurrentTeam))
    ) {
      setFormError('اختر فريقًا نشطًا للقائد أو نائب القائد.');
      return;
    }

    if (
      userForm.mode === 'edit' &&
      existingUser?.isActive &&
      !userForm.isActive &&
      pendingDeactivation !== 'user'
    ) {
      setPendingDeactivation('user');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      if (userForm.mode === 'create') {
        await createAdminUser({
          name,
          username,
          password: userForm.password,
          role: userForm.role,
          teamId: needsTeam ? userForm.teamId : null,
        });
      } else if (existingUser && userForm.userId) {
        const request: UpdateUserRequest = {};
        const nextTeamId = needsTeam ? userForm.teamId : null;

        if (name !== existingUser.name) request.name = name;
        if (username !== existingUser.username) request.username = username;
        if (userForm.role !== existingUser.role) request.role = userForm.role;
        if (nextTeamId !== existingUser.teamId) request.teamId = nextTeamId;
        if (userForm.isActive !== existingUser.isActive) {
          request.isActive = userForm.isActive;
        }

        if (Object.keys(request).length === 0) {
          setFormError('لم يتم إجراء أي تغيير للحفظ.');
          return;
        }

        await updateAdminUser(userForm.userId, request);
      }

      resetForms();
      setReloadKey((current) => current + 1);
    } catch (error) {
      setFormError(getErrorText(error, 'user'));
    } finally {
      setIsSaving(false);
      setPendingDeactivation(null);
    }
  };

  const handleTeamSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveTeam();
  };

  const handleUserSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveUser();
  };

  const currentInactiveTeam =
    userForm?.teamId && !activeTeams.some((team) => team.id === userForm.teamId)
      ? teams.find((team) => team.id === userForm.teamId) ?? null
      : null;

  return (
    <section className="admin-workspace" aria-labelledby="admin-title">
      <header className="admin-workspace__header">
        <div>
          <p className="admin-workspace__eyebrow">إعداد النظام</p>
          <h1 id="admin-title">الإدارة</h1>
          <p>إدارة الفرق وحسابات المستخدمين الداخلية.</p>
        </div>
      </header>

      <div className="admin-tabs" role="tablist" aria-label="أقسام الإدارة">
        <button
          type="button"
          role="tab"
          aria-selected={currentSection === 'teams'}
          className={currentSection === 'teams' ? 'is-active' : ''}
          onClick={() => setSection('teams')}
        >
          الفرق
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={currentSection === 'users'}
          className={currentSection === 'users' ? 'is-active' : ''}
          onClick={() => setSection('users')}
        >
          المستخدمون
        </button>
      </div>

      {loadError ? (
        <div className="admin-state admin-state--error" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={() => setReloadKey((current) => current + 1)}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="admin-state" role="status">
          جارٍ تحميل بيانات الإدارة…
        </div>
      ) : null}

      {!isLoading && !loadError && currentSection === 'teams' ? (
        <section className="admin-section" role="tabpanel" aria-label="إدارة الفرق">
          <div className="admin-section__header">
            <div>
              <h2>الفرق</h2>
              <p>تظهر الفرق النشطة وغير النشطة.</p>
            </div>
            <button type="button" className="admin-primary-button" onClick={openCreateTeam}>
              إضافة فريق
            </button>
          </div>

          {teamForm ? (
            <form className="admin-form" onSubmit={handleTeamSubmit}>
              <h3>{teamForm.mode === 'create' ? 'إضافة فريق' : 'تعديل فريق'}</h3>
              <label htmlFor="admin-team-name">اسم الفريق</label>
              <input
                id="admin-team-name"
                value={teamForm.name}
                maxLength={200}
                disabled={isSaving}
                onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })}
              />
              {teamForm.mode === 'edit' ? (
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={teamForm.isActive}
                    disabled={isSaving}
                    onChange={(event) => setTeamForm({ ...teamForm, isActive: event.target.checked })}
                  />
                  الفريق نشط
                </label>
              ) : null}
              {formError ? <p className="admin-form__error" role="alert">{formError}</p> : null}
              {pendingDeactivation === 'team' ? (
                <div className="admin-confirmation" role="alert">
                  <p>تعطيل الفريق قد يمنع الوصول المرتبط به. هل تريد المتابعة؟</p>
                  <button type="button" disabled={isSaving} onClick={() => void saveTeam()}>تأكيد التعطيل</button>
                  <button type="button" disabled={isSaving} onClick={() => setPendingDeactivation(null)}>إلغاء</button>
                </div>
              ) : null}
              <div className="admin-form__actions">
                <button className="admin-primary-button" type="submit" disabled={isSaving}>
                  {isSaving ? 'جارٍ الحفظ…' : 'حفظ'}
                </button>
                <button type="button" disabled={isSaving} onClick={resetForms}>إلغاء</button>
              </div>
            </form>
          ) : null}

          {teams.length === 0 ? (
            <div className="admin-state">لا توجد فرق حتى الآن.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>الفريق</th><th>الحالة</th><th>آخر تحديث</th><th>إجراء</th></tr></thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.id}>
                      <td data-label="الفريق">{team.name}</td>
                      <td data-label="الحالة"><span className={`admin-status${team.isActive ? ' admin-status--active' : ''}`}>{team.isActive ? 'نشط' : 'غير نشط'}</span></td>
                      <td data-label="آخر تحديث">{formatDate(team.updatedAt)}</td>
                      <td data-label="إجراء"><button type="button" onClick={() => openEditTeam(team)}>تعديل</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {!isLoading && !loadError && currentSection === 'users' ? (
        <section className="admin-section" role="tabpanel" aria-label="إدارة المستخدمين">
          <div className="admin-section__header">
            <div>
              <h2>المستخدمون</h2>
              <p>كلمات المرور تُحدد عند إنشاء الحساب فقط.</p>
            </div>
            <button type="button" className="admin-primary-button" onClick={openCreateUser}>
              إضافة مستخدم
            </button>
          </div>

          {userForm ? (
            <form className="admin-form" onSubmit={handleUserSubmit}>
              <h3>{userForm.mode === 'create' ? 'إضافة مستخدم' : 'تعديل مستخدم'}</h3>
              <div className="admin-form__grid">
                <div><label htmlFor="admin-user-name">الاسم</label><input id="admin-user-name" value={userForm.name} maxLength={200} disabled={isSaving} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} /></div>
                <div><label htmlFor="admin-user-username">اسم المستخدم</label><input id="admin-user-username" dir="ltr" value={userForm.username} maxLength={128} disabled={isSaving} onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} /></div>
                {userForm.mode === 'create' ? <div><label htmlFor="admin-user-password">كلمة المرور</label><input id="admin-user-password" type="password" autoComplete="new-password" value={userForm.password} minLength={16} maxLength={1024} disabled={isSaving} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} /><p className="admin-field-help">16 حرفًا على الأقل.</p></div> : null}
                <div><label htmlFor="admin-user-role">الدور</label><select id="admin-user-role" value={userForm.role} disabled={isSaving} onChange={(event) => { const role = getAdminUserRole(event.target.value); setUserForm({ ...userForm, role, teamId: isTeamRole(role) ? userForm.teamId : null }); }}>{adminUserRoles.map((role) => <option key={role} value={role}>{getRoleLabel(role)}</option>)}</select></div>
                {isTeamRole(userForm.role) ? <div><label htmlFor="admin-user-team">الفريق</label><select id="admin-user-team" value={userForm.teamId ?? ''} disabled={isSaving} onChange={(event) => setUserForm({ ...userForm, teamId: event.target.value || null })}><option value="">اختر فريقًا نشطًا</option>{activeTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}{currentInactiveTeam ? <option value={currentInactiveTeam.id} disabled>{currentInactiveTeam.name} — غير نشط</option> : null}</select>{currentInactiveTeam ? <p className="admin-field-help">الفريق المرتبط بالحساب غير نشط. لا يُرسل تغييره ما لم تعدل الدور أو الفريق.</p> : null}</div> : null}
              </div>
              {userForm.mode === 'edit' ? <label className="admin-checkbox"><input type="checkbox" checked={userForm.isActive} disabled={isSaving} onChange={(event) => setUserForm({ ...userForm, isActive: event.target.checked })} />الحساب نشط</label> : null}
              {formError ? <p className="admin-form__error" role="alert">{formError}</p> : null}
              {pendingDeactivation === 'user' ? <div className="admin-confirmation" role="alert"><p>تعطيل الحساب سيمنع صاحبه من الوصول. هل تريد المتابعة؟</p><button type="button" disabled={isSaving} onClick={() => void saveUser()}>تأكيد التعطيل</button><button type="button" disabled={isSaving} onClick={() => setPendingDeactivation(null)}>إلغاء</button></div> : null}
              <div className="admin-form__actions"><button className="admin-primary-button" type="submit" disabled={isSaving}>{isSaving ? 'جارٍ الحفظ…' : 'حفظ'}</button><button type="button" disabled={isSaving} onClick={resetForms}>إلغاء</button></div>
            </form>
          ) : null}

          {users.length === 0 ? <div className="admin-state">لا يوجد مستخدمون.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الفريق</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td data-label="الاسم">{user.name}</td><td data-label="اسم المستخدم"><span dir="ltr">{user.username}</span></td><td data-label="الدور">{getRoleLabel(user.role)}</td><td data-label="الفريق">{user.teamId ? teamNames.get(user.teamId) ?? 'فريق غير متاح' : '—'}</td><td data-label="الحالة"><span className={`admin-status${user.isActive ? ' admin-status--active' : ''}`}>{user.isActive ? 'نشط' : 'غير نشط'}</span></td><td data-label="إجراء"><button type="button" onClick={() => openEditUser(user)}>تعديل</button></td></tr>)}</tbody></table></div>}
        </section>
      ) : null}

      <Link className="admin-back-link" to="/applicants">العودة إلى المتقدمين</Link>
    </section>
  );
}
