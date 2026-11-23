// =====================================================================================================
// PMI container proof (TEST) - Apps Script web app for the TEST sheet 'PMI container proof (test)' ONLY.
// test-door-1 (proof 0.25.0, Prompts no. 159, round C7b). Before: proof-test-2 (rounds 2 / 3, Tweaks only).
// NOT the live PMI script; never paste this into the Smart PMI sheet (it refuses any other spreadsheet).
//
// What it can do, and nothing else:
//   - Tweaks saver: replace (or clear) the rows of ONE Device name + ONE Profile on the tab 'Tweaks'; read them back.
//   - Visits saver (op saveVisit): write ONE row of the tab 'Visits' (one call + one system + one tech), found by Visit Id.
//   - ping: the version.
// It never writes any other tab. The sheet holds fake data only, so the web app is open ("Anyone"); the token below is in
// the public proof page too, so it only keeps out random callers. Writes are capped (size and count).
// The file is in 4 blocks: SETTINGS, SHARED HELPERS, TWEAKS SAVER, VISITS SAVER; doGet / doPost at the end only send to them.
// =====================================================================================================

// ===================================== SETTINGS =====================================================
var TEST_SHEET_ID = '1VUKpTWuBC5iZw8kTxFuuRcqJphrt4mW6FGZJo1b2hB8';   // the only spreadsheet this door works on
var TOKEN = 'd8a44855c9e7e7f923a3bfcf4d753fd66e3040b1';
var TAB = 'Tweaks';
var HEAD = ['Device name', 'Profile', 'Cell id', 'Property', 'Value', 'Saved at'];
var PROFILES = { phone: 1, wide: 1, android: 1, iphone: 1 };
var PROPS = { weight: 1, fontSize: 1, label: 1, align: 1, wrap: 1, padX: 1, padY: 1, vAlign: 1, nudgeX: 1, nudgeY: 1, accent: 1, subLabel: 1, subLabelSize: 1, subLabelPlace: 1 };
var PLACES = { 'top-left': 1, 'top-center': 1, 'top-right': 1, 'middle-left': 1, 'middle': 1, 'middle-right': 1, 'bottom-left': 1, 'bottom-center': 1, 'bottom-right': 1 };
var ACCENTS = { '': 1, cyan: 1, emerald: 1, amber: 1, purple: 1, rose: 1 };
var MAX_BODY = 20000;          // characters in one save
var MAX_ROWS_PER_SAVE = 100;   // tweak rows in one save
var MAX_TOTAL_ROWS = 2000;     // tweak rows on the whole tab
var SCRIPT_VERSION = 'test-door-1';
var VISITS_TAB = 'Visits';
var VISITS_FIXED = ['Visit Id', 'Call token', 'Date', 'Time', 'Tech', 'Call type', 'Template', 'Place Id', 'System Id', 'System label', 'Status', 'Team tag', 'Merged into', 'Revision of', 'Follow-up', 'Area temp', 'Lat', 'Lng', 'Created', 'Last saved'];
var MAX_VISIT_BODY = 80000;    // characters in one Visits save
var MAX_VISIT_VALUES = 400;    // Field + rating values in one Visits save
var CLIENT_ID_HOURS = 6;       // a repeated save (same client id) within this time = the same row, nothing new

// ===================================== SHARED HELPERS ===============================================

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function now_() { return Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd HH:mm:ss'); }
function okDevice_(d) { return typeof d === 'string' && /^[A-Za-z0-9 ._-]{3,40}$/.test(d); }
function book_() {   // the TEST sheet, or an error (this door never works on another spreadsheet)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== TEST_SHEET_ID) throw new Error('this door only works on the test sheet');
  return ss;
}
function noFormula_(v) { var t = String(v == null ? '' : v); return /^[=+@]/.test(t) ? "'" + t : t; }   // a typed '=' never becomes a formula

// ===================================== TWEAKS SAVER =================================================

function tab_() {
  var sh = book_().getSheetByName(TAB);
  if (!sh) throw new Error('the tab Tweaks is missing');
  var h = sh.getRange(1, 1, 1, HEAD.length).getDisplayValues()[0];
  for (var i = 0; i < HEAD.length; i++) if (String(h[i]).trim() !== HEAD[i]) throw new Error('the Tweaks headings changed (column ' + (i + 1) + ' should be ' + HEAD[i] + ')');
  return sh;
}
function readRows_(sh) {
  var n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  return sh.getRange(2, 1, n, HEAD.length).getDisplayValues().filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
}

function checkRow_(r) {   // returns an error text, or '' when the row is fine
  if (!r || typeof r !== 'object') return 'a row is not an object';
  var cell = String(r.cell || ''), prop = String(r.prop || ''), v = String(r.value == null ? '' : r.value);
  if (!/^[A-Za-z0-9 ._\/-]{1,80}$/.test(cell)) return 'bad Cell id "' + cell.slice(0, 40) + '"';
  if (!PROPS[prop]) return 'unknown Property "' + prop.slice(0, 20) + '"';
  if (v.length > 120) return 'Value too long for ' + cell;
  if (/^[=+@]/.test(v)) return 'Value may not start with = + or @ (' + cell + ')';
  if (prop === 'weight' && !(Number(v) > 0 && Number(v) <= 100)) return 'weight must be more than 0 and at most 100 (' + cell + ')';
  if (prop === 'fontSize' && !(Number(v) >= 6 && Number(v) <= 48)) return 'font size must be 6 to 48 (' + cell + ')';
  if (prop === 'align' && !/^(left|center|right)$/.test(v)) return 'align must be left, center or right (' + cell + ')';
  var inRange = function (lo, hi) { var n = Number(v); return v.trim() !== '' && isFinite(n) && n >= lo && n <= hi; };
  if (prop === 'wrap' && !/^(yes|no)$/.test(v)) return 'wrap must be yes or no (' + cell + ')';
  if ((prop === 'padX' || prop === 'padY') && !inRange(0, 40)) return prop + ' must be 0 to 40 (' + cell + ')';
  if ((prop === 'nudgeX' || prop === 'nudgeY') && !inRange(-60, 60)) return prop + ' must be -60 to 60 (' + cell + ')';
  if (prop === 'vAlign' && !/^(top|middle|bottom)$/.test(v)) return 'vAlign must be top, middle or bottom (' + cell + ')';
  if (prop === 'accent' && !ACCENTS[v]) return 'accent must be cyan, emerald, amber, purple, rose or empty (' + cell + ')';
  if (prop === 'subLabel' && v.length > 40) return 'sub label longer than 40 letters (' + cell + ')';
  if (prop === 'subLabelSize' && !inRange(6, 24)) return 'sub label size must be 6 to 24 (' + cell + ')';
  if (prop === 'subLabelPlace' && !PLACES[v]) return 'unknown sub label place (' + cell + ')';
  return '';
}

function tweaksGet_(p) {
  try {
    var dev = String(p.device || '');
    if (!okDevice_(dev)) return out_({ ok: false, error: 'bad device name' });
    var rows = readRows_(tab_()).filter(function (r) { return r[0] === dev; })
      .map(function (r) { return { device: r[0], profile: r[1], cell: r[2], prop: r[3], value: r[4], savedAt: r[5] }; });
    return out_({ ok: true, version: SCRIPT_VERSION, device: dev, rows: rows, at: now_() });
  } catch (err) { return out_({ ok: false, error: String(err && err.message || err) }); }
}

function tweaksPost_(b, body) {
  var lock = LockService.getScriptLock();
  try {
    if (body.length > MAX_BODY) return out_({ ok: false, error: 'too big' });
    if (b.op !== 'replace' && b.op !== 'clear') return out_({ ok: false, error: 'unknown op' });
    var dev = String(b.device || ''), prof = String(b.profile || '');
    if (!okDevice_(dev)) return out_({ ok: false, error: 'bad device name' });
    if (!PROFILES[prof]) return out_({ ok: false, error: 'unknown profile' });
    var add = b.op === 'clear' ? [] : (Array.isArray(b.rows) ? b.rows : null);
    if (!add) return out_({ ok: false, error: 'rows missing' });
    if (add.length > MAX_ROWS_PER_SAVE) return out_({ ok: false, error: 'too many rows (' + add.length + ')' });
    for (var i = 0; i < add.length; i++) { var why = checkRow_(add[i]); if (why) return out_({ ok: false, error: why }); }
    lock.waitLock(10000);
    var sh = tab_(), at = now_();
    var old = readRows_(sh);
    var keep = old.filter(function (r) { return !(r[0] === dev && r[1] === prof); });   // other devices and other profiles stay
    var fresh = add.map(function (r) { return [dev, prof, String(r.cell), String(r.prop), String(r.value), at]; });
    var all = keep.concat(fresh);
    if (all.length > MAX_TOTAL_ROWS) return out_({ ok: false, error: 'the Tweaks tab is full' });
    var last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, HEAD.length).clearContent();   // only columns A to F; the Save address in H2 stays
    if (all.length) { var rg = sh.getRange(2, 1, all.length, HEAD.length); rg.setNumberFormat('@'); rg.setValues(all); }
    SpreadsheetApp.flush();
    return out_({ ok: true, version: SCRIPT_VERSION, device: dev, profile: prof, saved: fresh.length, removed: old.length - keep.length, at: at });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// ===================================== VISITS SAVER =================================================
// One row per call + system + tech, found by Visit Id (made on the phone). Under the script lock:
//  1. the same client id within CLIENT_ID_HOURS = the same save repeated (a lost reply): answer the row, write nothing;
//  2. the row with this Visit Id, else a new row at the bottom;
//  3. columns: the fixed ones by heading; a Field by the header NOTE 'PMI field <Field Id>' (written the first time its heading
//     = the Fields tab's 'Visits column' is found, so a renamed heading keeps working); a rating by the note 'PMI rating <name>';
//     a value with no column is answered back as missing (never a new column);
//  4. text cells get Plain text format (serials, '0405', 'APR 2019', phones stay as typed); numbers stay numbers; never a formula;
//  5. Status Done stays Done (a later edit only moves Last saved); Created is kept.
function visitsSave_(b, body) {
  if (body.length > MAX_VISIT_BODY) return out_({ ok: false, error: 'the call is too big to save' });
  var vid = String(b.visitId || ''), cid = String(b.clientId || '');
  if (!/^V-[A-Za-z0-9-]{4,60}$/.test(vid)) return out_({ ok: false, error: 'bad Visit Id' });
  if (!/^[A-Za-z0-9-]{6,80}$/.test(cid)) return out_({ ok: false, error: 'bad client id' });
  var fixed = b.fixed && typeof b.fixed === 'object' ? b.fixed : {}, vals = Array.isArray(b.values) ? b.values : [];
  if (vals.length > MAX_VISIT_VALUES) return out_({ ok: false, error: 'too many values (' + vals.length + ')' });
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var cache = CacheService.getScriptCache(), seen = cache.get('cid:' + cid);
    if (seen) return out_({ ok: true, version: SCRIPT_VERSION, row: Number(seen), repeat: true, at: now_() });
    var sh = book_().getSheetByName(VISITS_TAB);
    if (!sh) return out_({ ok: false, error: 'the tab Visits is missing' });
    var lastCol = sh.getLastColumn(), head = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0], notes = sh.getRange(1, 1, 1, lastCol).getNotes()[0];
    var byHead = {}, byNote = {}; head.forEach(function (h, i) { h = String(h).trim(); if (h && byHead[h] == null) byHead[h] = i; var n = String(notes[i] || '').trim(); if (n) byNote[n] = i; });
    var vcol = byHead['Visit Id']; if (vcol == null) return out_({ ok: false, error: 'the Visits tab has no Visit Id column' });
    var lastRow = sh.getLastRow(), row = 0;
    if (lastRow > 1) { var ids = sh.getRange(2, vcol + 1, lastRow - 1, 1).getDisplayValues(); for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === vid) { row = i + 2; break; } }
    var isNew = !row; if (isNew) row = Math.max(lastRow, 1) + 1;
    var cur = isNew ? head.map(function () { return ''; }) : sh.getRange(row, 1, 1, lastCol).getValues()[0];
    var fmt = isNew ? head.map(function () { return '@'; }) : sh.getRange(row, 1, 1, lastCol).getNumberFormats()[0];
    var put = function (i, v, num) { if (num && v !== '' && isFinite(Number(v))) { cur[i] = Number(v); fmt[i] = '0.####'; } else { cur[i] = noFormula_(v); fmt[i] = '@'; } };
    var at = now_(), missing = [], newNotes = [];
    VISITS_FIXED.forEach(function (c) { var i = byHead[c]; if (i == null) return;
      if (c === 'Visit Id') return put(i, vid);
      if (c === 'Last saved') return put(i, at);
      if (c === 'Created') return put(i, String(cur[i] || '') || String(fixed[c] || at));
      if (c === 'Status') { var was = String(cur[i] || ''); return put(i, was === 'Done' ? 'Done' : String(fixed[c] || 'In progress')); }
      if (fixed[c] != null) put(i, fixed[c], c === 'Lat' || c === 'Lng' || c === 'Area temp'); });
    vals.forEach(function (x) { if (!x || typeof x !== 'object') return;
      var key = (x.kind === 'rating' ? 'PMI rating ' : 'PMI field ') + String(x.id || ''), i = byNote[key];
      if (i == null && x.col != null && byHead[String(x.col).trim()] != null && VISITS_FIXED.indexOf(String(x.col).trim()) < 0) { i = byHead[String(x.col).trim()]; byNote[key] = i; newNotes.push([i, key]); }
      if (i == null) { if (String(x.v == null ? '' : x.v) !== '') missing.push(String(x.col || x.id)); return; }
      put(i, x.v == null ? '' : x.v, !!x.num); });
    var rg = sh.getRange(row, 1, 1, lastCol); rg.setNumberFormats([fmt]); rg.setValues([cur]);
    newNotes.forEach(function (n) { sh.getRange(1, n[0] + 1).setNote(n[1]); });
    SpreadsheetApp.flush();
    cache.put('cid:' + cid, String(row), CLIENT_ID_HOURS * 3600);
    return out_({ ok: true, version: SCRIPT_VERSION, row: row, created: isNew, at: at, missing: missing });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// ===================================== DOORS (send each request to its block) =======================
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.token !== TOKEN) return out_({ ok: false, error: 'bad token' });
    book_();
    if (p.op === 'ping') return out_({ ok: true, version: SCRIPT_VERSION, at: now_() });
    return tweaksGet_(p);
  } catch (err) { return out_({ ok: false, error: String(err && err.message || err) }); }
}
function doPost(e) {
  try {
    var body = (e && e.postData && e.postData.contents) || '';
    if (body.length > MAX_VISIT_BODY) return out_({ ok: false, error: 'too big' });
    var b = JSON.parse(body || '{}');
    if (b.token !== TOKEN) return out_({ ok: false, error: 'bad token' });
    book_();
    if (b.op === 'saveVisit') return visitsSave_(b, body);
    return tweaksPost_(b, body);
  } catch (err) { return out_({ ok: false, error: String(err && err.message || err) }); }
}
