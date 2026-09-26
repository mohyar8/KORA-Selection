import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createApplicantNote, getApplicantNotes, updateApplicantNote, type ApplicantNote } from '../api/notesApi';
import { ApiClientError } from '../api/apiClient';
import '../styles/communication.css';

type ApplicantNotesPanelProps = { applicantId: string; currentUserId: string };

function formatDate(value: number): string {
  const date = new Date(value * 1000);
  if (!Number.isFinite(date.getTime())) return 'غير متوفر';
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function getErrorMessage(error: ApiClientError): string {
  if (error.status === 403) return 'لا تملك صلاحية تنفيذ هذه العملية على الملاحظات.';
  if (error.status === 404) return 'المتقدم لم يعد متاحًا للملاحظات ضمن نطاقك.';
  if (error.kind === 'network') return 'تعذر الاتصال بالنظام. تحقق من الشبكة ثم حاول مرة أخرى.';
  return 'تعذر حفظ الملاحظة. حاول مرة أخرى.';
}

export function ApplicantNotesPanel({ applicantId, currentUserId }: ApplicantNotesPanelProps) {
  const [notes, setNotes] = useState<readonly ApplicantNote[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;
    const load = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await getApplicantNotes(applicantId, controller.signal);
        if (isCurrent) setNotes(response);
      } catch (requestError) {
        if (!isCurrent || controller.signal.aborted) return;
        setNotes(null);
        setError(requestError instanceof ApiClientError ? requestError : new ApiClientError({ kind: 'invalid-response' }));
      } finally { if (isCurrent) setIsLoading(false); }
    };
    void load();
    return () => { isCurrent = false; controller.abort(); };
  }, [applicantId, reloadKey]);

  const validateContent = (content: string): string | null => {
    const trimmed = content.trim();
    if (trimmed.length === 0) return 'اكتب ملاحظة قبل الحفظ.';
    if (trimmed.length > 2000) return 'يجب ألا تتجاوز الملاحظة 2000 حرف.';
    return null;
  };

  const submitNew = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const validationError = validateContent(newContent);
    if (validationError) { setMutationError(validationError); return; }
    setMutationError(null); setIsSubmitting(true);
    try { await createApplicantNote(applicantId, newContent.trim()); setNewContent(''); refresh(); }
    catch (requestError) { setMutationError(getErrorMessage(requestError instanceof ApiClientError ? requestError : new ApiClientError({ kind: 'invalid-response' }))); }
    finally { setIsSubmitting(false); }
  };

  const submitEdit = async (event: FormEvent<HTMLFormElement>, note: ApplicantNote) => {
    event.preventDefault();
    if (isSubmitting) return;
    const validationError = validateContent(editContent);
    if (validationError) { setMutationError(validationError); return; }
    if (editContent.trim() === note.content) { setEditingId(null); return; }
    setMutationError(null); setIsSubmitting(true);
    try { await updateApplicantNote(note.id, editContent.trim()); setEditingId(null); refresh(); }
    catch (requestError) { setMutationError(getErrorMessage(requestError instanceof ApiClientError ? requestError : new ApiClientError({ kind: 'invalid-response' }))); }
    finally { setIsSubmitting(false); }
  };

  return (
    <section className="applicant-notes-panel" aria-labelledby="applicant-notes-title">
      <header><div><p>ملاحظات داخلية</p><h2 id="applicant-notes-title">ملاحظات المتقدم</h2></div></header>
      <form className="communication-composer" onSubmit={submitNew}>
        <label htmlFor="new-applicant-note">إضافة ملاحظة</label>
        <textarea id="new-applicant-note" value={newContent} disabled={isSubmitting} onChange={(event) => setNewContent(event.target.value)} />
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جارٍ الحفظ…' : 'إضافة ملاحظة'}</button>
      </form>
      {mutationError ? <p className="communication-error" role="alert">{mutationError}</p> : null}
      {isLoading ? <p className="communication-state" role="status">جارٍ تحميل الملاحظات.</p> : null}
      {!isLoading && error ? <div className="communication-state" role="alert"><p>تعذر تحميل الملاحظات.</p><button type="button" onClick={refresh}>إعادة المحاولة</button></div> : null}
      {!isLoading && !error && notes?.length === 0 ? <p className="communication-state">لا توجد ملاحظات حتى الآن</p> : null}
      {!isLoading && !error && notes && notes.length > 0 ? <div className="applicant-notes-list">
        {notes.map((note) => <article key={note.id} className="applicant-note">
          <header><div><strong>{note.author.name}</strong><span>{formatDate(note.createdAt)}{note.updatedAt !== note.createdAt ? ' · تم التعديل' : ''}</span></div>
            {note.author.id === currentUserId && editingId !== note.id ? <button type="button" onClick={() => { setMutationError(null); setEditingId(note.id); setEditContent(note.content); }}>تعديل</button> : null}
          </header>
          {editingId === note.id ? <form onSubmit={(event) => void submitEdit(event, note)}><label className="visually-hidden" htmlFor={`note-${note.id}`}>تعديل الملاحظة</label><textarea id={`note-${note.id}`} value={editContent} disabled={isSubmitting} onChange={(event) => setEditContent(event.target.value)} /><div><button type="submit" disabled={isSubmitting || editContent.trim() === note.content}>{isSubmitting ? 'جارٍ الحفظ…' : 'حفظ'}</button><button type="button" disabled={isSubmitting} onClick={() => setEditingId(null)}>إلغاء</button></div></form> : <p>{note.content}</p>}
        </article>)}
      </div> : null}
    </section>
  );
}
