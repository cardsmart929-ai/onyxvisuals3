/**
 * Deploy as a Google Apps Script Web App. Configure once before deployment.
 * The script writes each valid lead to the target spreadsheet and sends two emails.
 */
const SPREADSHEET_ID = '1kkO7tQLFrTyc1dlGxbEaTJnxWVK6do25ZF4mMUEQNqk';
const SHEET_NAME = 'Leads';
const OWNER_EMAIL = 'sb.haghshenas81@gmail.com';

function doGet() { return json_({ ok: true, service: 'Onyx Visuals form endpoint' }); }

function doPost(e) {
  try {
    const lead = JSON.parse(e.postData.contents || '{}');
    validate_(lead);
    if (OWNER_EMAIL.indexOf('REPLACE_') === 0) throw new Error('Set OWNER_EMAIL first');
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try { enforceRateLimit_(lead); appendLead_(lead); } finally { lock.releaseLock(); }
    sendEmails_(lead);
    return json_({ ok: true });
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: 'Unable to save the request.' });
  }
}

function validate_(lead) {
  if (!lead.name || !lead.company || !lead.email) throw new Error('Missing required fields');
  if (lead.website) throw new Error('Spam detected');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) throw new Error('Invalid email');
  lead.name = String(lead.name).slice(0, 150); lead.company = String(lead.company).slice(0, 150);
  lead.phone = String(lead.phone || '').slice(0, 80); lead.notes = String(lead.notes || '').slice(0, 5000);
  lead.services = Array.isArray(lead.services) ? lead.services.join('، ') : '';
}

function enforceRateLimit_(lead) {
  const cache = CacheService.getScriptCache();
  const emailKey = 'lead:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, lead.email.toLowerCase()));
  if (cache.get(emailKey)) throw new Error('Duplicate submission');
  const minuteKey = 'lead-minute:' + Utilities.formatDate(new Date(), 'Etc/UTC', 'yyyyMMddHHmm');
  const requests = Number(cache.get(minuteKey) || 0);
  if (requests >= 20) throw new Error('Rate limit exceeded');
  cache.put(emailKey, '1', 300); // one email address every five minutes
  cache.put(minuteKey, String(requests + 1), 65); // protect Sheets and Gmail quotas
}

function appendLead_(lead) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(['زمان ثبت', 'نام و سمت', 'شرکت', 'ایمیل', 'تلفن', 'خدمات', 'بودجه', 'شرح پروژه', 'آدرس صفحه']);
  sheet.appendRow([new Date(), safeCell_(lead.name), safeCell_(lead.company), safeCell_(lead.email), safeCell_(lead.phone), safeCell_(lead.services), safeCell_(lead.budget || ''), safeCell_(lead.notes), safeCell_(lead.source || '')]);
}

function sendEmails_(lead) {
  const subject = 'درخواست شما ثبت شد | Onyx Visuals';
  const customerText = `سلام ${lead.name}،\n\nدرخواست شما ثبت شد. تیم Onyx Visuals به‌زودی با شما تماس می‌گیرد.\n\nبا سپاس\nOnyx Visuals`;
  MailApp.sendEmail({ to: lead.email, subject, body: customerText, htmlBody: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.9;color:#202124"><p>سلام ${escapeHtml_(lead.name)}،</p><p>درخواست شما ثبت شد. تیم <b>Onyx Visuals</b> به‌زودی با شما تماس می‌گیرد.</p><p>با سپاس<br><b>Onyx Visuals</b></p></div>` });
  MailApp.sendEmail({ to: OWNER_EMAIL, subject: `لید جدید: ${subjectText_(lead.company)} — ${subjectText_(lead.name)}`, body: `لید جدید ثبت شد\n\nنام: ${lead.name}\nشرکت: ${lead.company}\nایمیل: ${lead.email}\nتلفن: ${lead.phone}\nخدمات: ${lead.services}\nبودجه: ${lead.budget}\n\nتب Leads را بررسی کنید.` });
}

function safeCell_(value) { const text = String(value); return /^[=+\-@]/.test(text) ? "'" + text : text; }
function subjectText_(value) { return String(value).replace(/[\r\n]/g, ' ').slice(0, 150); }
function escapeHtml_(value) { return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[c]); }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
