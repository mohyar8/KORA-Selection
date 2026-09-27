import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  confirmApplicantImport,
  previewApplicantImport,
  type ImportPreview,
  type ImportPreviewStatus,
} from '../api/importsApi';
import { ApiClientError } from '../api/apiClient';
import '../styles/admin.css';

const maximumFileSize = 262144;

const requiredHeaders = [
  'Id',
  'البريد الإلكتروني',
  'الاسم الثلاثي باللغة العربية',
  'الرقم الجامعي',
  'الجنس',
  'التخصص',
  'السنة الدراسية الحالية',
  'إيش علاقتك بالكورة؟ ⚽',
  'ايش اللي خلاك تقول: "أبغى أكون جزء من كـورة"؟',
  'سبق اشتغلت على شيء تفتخر فيه؟ تكلم لنا عنه.',
  'ايش المجال أو الفكرة اللي عندك شغف تجاهها؟ وليش؟',
  'ليش تبغى تنضم إلى فريق «كورة»؟ وإيش تتوقع تضيف؟',
  'ايش الشيء اللي تقول عنه: "هنا أنا أقدر أفيد كـورة"؟',
  'ملف اعمالك (ان وجد)',
  'حساب لنكدان',
  'الأولوية الأولى - ما الفريق الذي ترغب بالانضمام إليه؟',
  'ايش سبب اختيارك للأولوية الاولى؟',
  'الأولوية الثانية - ما الفريق الذي ترغب بالانضمام إليه؟',
  'ايش سبب اختيارك للأولوية الثانية؟',
  'الأولوية الثالثة - ما الفريق الذي ترغب بالانضمام إليه؟',
  'ايش سبب اختيارك للأولوية الثالثة؟',
  'تخيّل إن كـورة انتهت بعد شهور من الآن… إيش الشيء اللي تتمنى تقول إنك طلعت فيه من التجربة؟',
  'في شيء ما سألناك عنه وحاب نعرفه؟',
] as const;

function previewStatusLabel(status: ImportPreviewStatus): string {
  if (status === 'NEW') return 'جديد وجاهز للاستيراد';
  if (status === 'EXISTING') return 'موجود مسبقًا ولن يتم تحديثه';
  if (status === 'DUPLICATE_IN_FILE') return 'مكرر داخل الملف ولن يتم استيراده';
  return 'غير صالح';
}

function rowErrorLabel(code: string): string {
  const labels: Record<string, string> = {
    invalid_source_response_id: 'معرّف الاستجابة المصدر غير صالح.',
    invalid_student_id: 'الرقم الجامعي غير صالح.',
    missing_arabic_name: 'الاسم العربي مطلوب.',
    invalid_email: 'البريد الإلكتروني غير صالح.',
    invalid_portfolio_url: 'رابط ملف الأعمال غير صالح.',
    invalid_linkedin_url: 'رابط لينكدإن غير صالح.',
    missing_priority_1_team: 'فريق الرغبة الأولى مطلوب.',
    missing_priority_2_team: 'فريق الرغبة الثانية مطلوب.',
    missing_priority_3_team: 'فريق الرغبة الثالثة مطلوب.',
    unknown_priority_1_team: 'فريق الرغبة الأولى غير موجود أو غير نشط.',
    unknown_priority_2_team: 'فريق الرغبة الثانية غير موجود أو غير نشط.',
    unknown_priority_3_team: 'فريق الرغبة الثالثة غير موجود أو غير نشط.',
    duplicate_preference_team: 'لا يمكن تكرار الفريق نفسه ضمن الرغبات.',
    missing_priority_1_reason: 'سبب اختيار الرغبة الأولى مطلوب.',
    missing_priority_2_reason: 'سبب اختيار الرغبة الثانية مطلوب.',
    missing_priority_3_reason: 'سبب اختيار الرغبة الثالثة مطلوب.',
    duplicate_student_id_in_file: 'الرقم الجامعي مكرر داخل الملف.',
  };

  return labels[code] ?? `خطأ غير معروف: ${code}`;
}

function previewErrorText(error: unknown): string {
  if (!(error instanceof ApiClientError)) return 'تعذر إنشاء المعاينة. حاول مرة أخرى.';
  if (error.status === 403) return 'لا تملك صلاحية استيراد المتقدمين.';
  if (error.status === 415 || error.code === 'invalid_file_type') return 'نوع الملف غير مدعوم. اختر ملف CSV صالحًا.';
  if (error.status === 413 || error.code === 'file_too_large') return 'حجم الملف أكبر من الحد المسموح: 256 KiB.';
  if (error.code === 'missing_required_headers') return 'الملف لا يحتوي جميع الأعمدة المطلوبة. راجع قائمة الأعمدة أدناه.';
  if (error.code === 'invalid_csv') return 'تعذر قراءة CSV. تأكد من أن الملف UTF-8 وبنية CSV صحيحة.';
  if (error.code === 'too_many_rows') return 'الملف يحتوي أكثر من 250 صف بيانات.';
  if (error.status === 400) return 'تعذر قبول الملف. تأكد من اختيار ملف CSV صالح.';
  if (error.kind === 'network') return 'تعذر الاتصال بالنظام. تحقق من الشبكة ثم حاول مرة أخرى.';
  return 'تعذر إنشاء المعاينة. حاول مرة أخرى.';
}

function confirmationErrorText(error: unknown): string {
  if (!(error instanceof ApiClientError)) return 'تعذر تأكيد الاستيراد. حاول مرة أخرى.';
  if (error.status === 403) return 'لا تملك صلاحية تأكيد الاستيراد.';
  if (error.code === 'import_batch_expired') return 'انتهت صلاحية المعاينة. ارفع الملف وأنشئ معاينة جديدة.';
  if (error.code === 'staging_data_invalid') return 'تغيرت البيانات منذ المعاينة، مثل حالة أحد الفرق. أنشئ معاينة جديدة.';
  if (error.code === 'import_batch_not_confirmable') return 'هذه المعاينة لم تعد قابلة للتأكيد. أنشئ معاينة جديدة.';
  if (error.code === 'import_batch_not_found' || error.status === 404) return 'لم تعد المعاينة متاحة. أنشئ معاينة جديدة.';
  if (error.kind === 'network') return 'تعذر الاتصال بالنظام. تحقق من الشبكة ثم حاول مرة أخرى.';
  return 'تعذر تأكيد الاستيراد. حاول مرة أخرى.';
}

export function ImportWorkspace() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    importedRows: number;
    skippedRows: number;
    invalidRows: number;
  } | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPreview(null);
    setPreviewError(null);
    setConfirmError(null);
    setConfirmation(null);

    if (file && file.size > maximumFileSize) {
      setPreviewError('حجم الملف أكبر من الحد المسموح: 256 KiB.');
    }
  };

  const handlePreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setPreviewError('اختر ملف CSV أولًا.');
      return;
    }

    if (selectedFile.size > maximumFileSize) {
      setPreviewError('حجم الملف أكبر من الحد المسموح: 256 KiB.');
      return;
    }

    if (isPreviewing) return;

    setPreviewError(null);
    setConfirmError(null);
    setConfirmation(null);
    setIsPreviewing(true);

    try {
      const nextPreview = await previewApplicantImport(selectedFile);
      setPreview(nextPreview);
    } catch (error) {
      setPreview(null);
      setPreviewError(previewErrorText(error));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || isConfirming || confirmation) return;

    setConfirmError(null);
    setIsConfirming(true);

    try {
      const result = await confirmApplicantImport(preview.batchId);
      setConfirmation(result.summary);
    } catch (error) {
      setConfirmError(confirmationErrorText(error));
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <section className="admin-workspace import-workspace" aria-labelledby="import-title">
      <header className="admin-workspace__header">
        <div>
          <p className="admin-workspace__eyebrow">إعداد البيانات</p>
          <h1 id="import-title">استيراد المتقدمين</h1>
          <p>ارفع CSV للمعاينة أولًا، ثم أكّد الاستيراد بعد مراجعة النتيجة.</p>
        </div>
      </header>

      {confirmation ? (
        <section className="import-success" aria-labelledby="import-success-title">
          <h2 id="import-success-title">تم تأكيد الاستيراد</h2>
          <dl className="import-summary">
            <div><dt>تم استيراد</dt><dd>{confirmation.importedRows}</dd></div>
            <div><dt>تم تخطي</dt><dd>{confirmation.skippedRows}</dd></div>
            <div><dt>غير صالح</dt><dd>{confirmation.invalidRows}</dd></div>
          </dl>
          <Link className="admin-primary-button" to="/applicants">الذهاب إلى المتقدمين</Link>
        </section>
      ) : (
        <>
          <form className="import-upload" onSubmit={handlePreview}>
            <h2>1. اختيار الملف وإنشاء المعاينة</h2>
            <p>الحد الأقصى: 256 KiB و250 صف بيانات. يدعم النظام CSV بترميز UTF-8.</p>
            <p className="import-upload__notice">تأكد أن أسماء الفرق في ملف CSV مطابقة للفرق النشطة في النظام.</p>
            <label htmlFor="applicant-import-file">ملف CSV</label>
            <input id="applicant-import-file" type="file" accept=".csv,text/csv,text/plain,application/csv,application/vnd.ms-excel" disabled={isPreviewing || isConfirming} onChange={handleFileChange} />
            {selectedFile ? <p className="admin-field-help">الملف المختار: <span dir="ltr">{selectedFile.name}</span></p> : null}
            {previewError ? <p className="admin-form__error" role="alert">{previewError}</p> : null}
            <button className="admin-primary-button" type="submit" disabled={!selectedFile || isPreviewing || isConfirming}>
              {isPreviewing ? 'جارٍ إنشاء المعاينة…' : 'إنشاء معاينة'}
            </button>
          </form>

          <details className="import-required-headers">
            <summary>الأعمدة المطلوبة في CSV</summary>
            <ul>{requiredHeaders.map((header) => <li key={header}>{header}</li>)}</ul>
          </details>

          {preview ? (
            <section className="import-preview" aria-labelledby="preview-title">
              <div className="import-preview__header">
                <div><h2 id="preview-title">2. مراجعة المعاينة</h2><p>المعاينة مؤقتة ويجب تأكيدها خلال 24 ساعة. سيستورد النظام الصفوف الجديدة فقط.</p></div>
                <button type="button" className="admin-primary-button" disabled={isConfirming} onClick={() => void handleConfirm()}>
                  {isConfirming ? 'جارٍ تأكيد الاستيراد…' : 'تأكيد الاستيراد'}
                </button>
              </div>
              {confirmError ? <p className="admin-form__error" role="alert">{confirmError}</p> : null}
              <dl className="import-summary">
                <div><dt>إجمالي الصفوف</dt><dd>{preview.summary.totalRows}</dd></div>
                <div><dt>الجديدة</dt><dd>{preview.summary.newRows}</dd></div>
                <div><dt>الموجودة مسبقًا</dt><dd>{preview.summary.existingRows}</dd></div>
                <div><dt>المكررة داخل الملف</dt><dd>{preview.summary.duplicateRows}</dd></div>
                <div><dt>غير الصالحة</dt><dd>{preview.summary.invalidRows}</dd></div>
              </dl>
              {preview.rowsTruncated ? <p className="import-upload__notice">يتم عرض أول 50 صفًا فقط. الملخص يشمل جميع صفوف الملف.</p> : null}
              <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>رقم الصف</th><th>الرقم الجامعي</th><th>الحالة</th><th>الأخطاء</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={`${row.recordNumber}-${row.studentId ?? 'none'}`}><td data-label="رقم الصف">{row.recordNumber}</td><td data-label="الرقم الجامعي">{row.studentId ?? '—'}</td><td data-label="الحالة">{previewStatusLabel(row.status)}</td><td data-label="الأخطاء">{row.errors.length > 0 ? <ul className="import-errors">{row.errors.map((code) => <li key={code}>{rowErrorLabel(code)}</li>)}</ul> : '—'}</td></tr>)}</tbody></table></div>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
