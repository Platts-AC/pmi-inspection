// =====================================================================================================
// PMI container proof (TEST) - Apps Script web app for the TEST sheet 'PMI container proof (test)' ONLY.
// test-door-3 (proof 0.30.0, Prompts no. 168: fix round after C7c, Review 0.28.0 R1-R5 / R10). test-door-2 = proof 0.28.0 (C7c-2: FILE CHANGES). test-door-1 = proof 0.25.0 (C7b, Visits). proof-test-2 = rounds 2 / 3 (Tweaks only).
// NOT the live PMI script; never paste this into the Smart PMI sheet (it refuses any other spreadsheet).
//
// What it can do, and nothing else:
//   - Tweaks saver: replace (or clear) the rows of ONE Device name + ONE Profile on the tab 'Tweaks'; read them back.
//   - Visits saver (op saveVisit): write ONE row of the tab 'Visits' (one call + one system + one tech), found by Visit Id.
//   - File changes (inside saveVisit, test-door-2): the choices made on the different-from-file card change Places / Equipment, only where
//     the cell still holds the value the phone saw (else 'changed meanwhile'); a phone customer gets a real Places row; every change is
//     written to the tab 'Changes'.
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
var SCRIPT_VERSION = 'test-door-3';
var VISITS_TAB = 'Visits';
var VISITS_FIXED = ['Visit Id', 'Call token', 'Date', 'Time', 'Tech', 'Call type', 'Template', 'Place Id', 'System Id', 'System label', 'Status', 'Team tag', 'Merged into', 'Revision of', 'Follow-up', 'Area temp', 'Lat', 'Lng', 'Created', 'Last saved'];
var MAX_VISIT_BODY = 80000;    // characters in one Visits save
var MAX_VISIT_VALUES = 400;    // Field + rating values in one Visits save
var CLIENT_ID_HOURS = 6;       // a repeated save (same client id) within this time = the same row, nothing new
var CHANGE_TABS = { 'Places': 'Place Id', 'Equipment': 'Piece Id' };   // the tabs a file change may touch, and their id column
var CHANGES_TAB = 'Changes';
var MAX_CHANGES = 60;          // file changes in one save
var PIECE_COPY = ['Place Id', 'System Id', 'System label', 'Service area', 'Slot', 'Type'];   // a new piece keeps these from the one it replaces; ratings start BLANK (CT-19)
var FOLLOW_COLOR = '#fde68a';  // the Visits 'Follow-up' column's color when it holds a question
// test-door-3 (R5): the ONLY columns of Places / Equipment that hold numbers; every other column is Plain text, whatever its old cell held
// (so '0405', '0012345', '1/12' keep their form). A number column gets a number only when the value is a plain number.
var NUM_COLS = { 'Places': ['Lat', 'Lng'], 'Equipment': ['Tons', 'RLA', 'LRA', 'ODF FLA', 'IDF FLA', 'Herm cap', 'ODF cap', 'IDF cap', 'Target SC', 'Rated static', 'Factory charge', 'MCA', 'Max breaker', 'Max fuse'] };
var STREET_WORDS = { st: 1, street: 1, dr: 1, drive: 1, ave: 1, avenue: 1, rd: 1, road: 1, blvd: 1, ln: 1, lane: 1, ct: 1, court: 1, way: 1, pl: 1, place: 1, cir: 1, circle: 1, ter: 1, pkwy: 1, hwy: 1, trl: 1 };

// ===================================== SHARED HELPERS ===============================================

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function now_() { return Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd HH:mm:ss'); }
function okDevice_(d) { return typeof d === 'string' && /^[A-Za-z0-9 ._-]{3,40}$/.test(d); }
function book_() {   // the TEST sheet, or an error (this door never works on another spreadsheet)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== TEST_SHEET_ID) throw new Error('this door only works on the test sheet');
  return ss;
}
function noFormula_(v, num) {   // a typed '=' never becomes a formula; test-door-3 (R5): nor a leading '-' unless it is a plain negative number in a number column
  var t = String(v == null ? '' : v);
  return /^[=+@]/.test(t) || (/^-/.test(t) && !(num && /^-\d+(\.\d+)?$/.test(t.trim()))) ? "'" + t : t;
}
function addrKey_(a) {   // test-door-3 (R4): '123 Test St' -> '123 test', '400 Sample Ave #12' -> '400 sample #12' (the sheet's Address key)
  var s = String(a == null ? '' : a).toLowerCase().split(',')[0], unit = '';
  var m = s.match(/(?:#|\b(?:apt|unit|ste|suite)\.?\s*#?)\s*([a-z0-9-]+)/); if (m) { unit = m[1]; s = s.slice(0, m.index); }
  var w = s.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function (x) { return x; });
  while (w.length > 2 && STREET_WORDS[w[w.length - 1]]) w.pop();
  return (w.join(' ') + (unit ? ' #' + unit : '')).trim();
}
var digits_ = function (v) { var d = String(v == null ? '' : v).replace(/\D/g, ''); return d.length === 11 && d[0] === '1' ? d.slice(1) : d; };   // R10

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
    if (seen) { var o = /^\{/.test(seen) ? JSON.parse(seen) : { ok: true, row: Number(seen) }; o.repeat = true; o.version = SCRIPT_VERSION; return out_(o); }   // test-door-2: the whole first answer
    var ss = book_(), sh = ss.getSheetByName(VISITS_TAB);
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
    var fc = fileChanges_(ss, b, fixed, at);   // test-door-2: Places / Equipment / Changes first (a new Place Id goes on this row)
    if (fc.placeId) fixed['Place Id'] = fc.placeId;
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
    if (String(fixed['Follow-up'] || '')) followColor_(sh, head);
    var reply = { ok: true, version: SCRIPT_VERSION, row: row, created: isNew, at: at, missing: missing, changes: fc.results, placeId: fc.placeId || '' };
    cache.put('cid:' + cid, JSON.stringify(reply), CLIENT_ID_HOURS * 3600);
    return out_(reply);
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// ===================================== FILE CHANGES (test-door-2; test-door-3 fixes R1-R5, R10) ======
// b.changes: [{ key, tab, record, col, old, new, reason, choice (typo / newCust / newEquip / add), replace, newId, piece }]
// Rules: the record must exist; the cell must still hold 'old' (the value the phone saw) or already hold 'new' ('already'); else 'changed'
// (the phone shows it on the card). typo / newCust = the cell gets the new value (a New customer keeps the SAME Places row: the old name goes
// to Changes). newEquip = the old piece becomes Replaced (Until, Replaced by) and ONE new Active piece (same Place / System / Slot / Type,
// BLANK ratings) gets the new values. add = a blank cell is filled; a Phone N that is taken goes to the next empty Phone column; Access codes /
// Site notes get ' · ' + the new text (test-door-3: only while the cell still holds 'old'; phones / emails by digits / next empty slot); replace = the cell (still 'old') gets the longer value (S-9, S-12, S-18).
// b.newPlace: a phone customer (PH-...) or a call with no place: one Places row 'P-<visit>' (Customer and Address needed, CT-3).
function tabOf_(ss, name) {
  var sh = ss.getSheetByName(name); if (!sh) return null;
  var lc = sh.getLastColumn(), head = sh.getRange(1, 1, 1, lc).getDisplayValues()[0].map(function (h) { return String(h).trim(); });
  var t = { sh: sh, head: head, col: function (n) { return head.indexOf(n); } };
  t.rowOf = function (idCol, id) { var c = head.indexOf(idCol), lr = sh.getLastRow(); if (c < 0 || lr < 2) return 0; var v = sh.getRange(2, c + 1, lr - 1, 1).getDisplayValues();
    for (var i = 0; i < v.length; i++) if (String(v[i][0]).trim() === String(id)) return i + 2; return 0; };
  t.get = function (r, n) { var c = head.indexOf(n); return c < 0 ? '' : String(sh.getRange(r, c + 1).getDisplayValues()[0][0]); };
  var nums = NUM_COLS[name] || [], isNum = function (h) { return nums.indexOf(h) >= 0; };   // test-door-3 (R5): by column, never by the old cell
  var cellOf = function (h, v) { var t2 = String(v == null ? '' : v); return isNum(h) && /^-?\d+(\.\d+)?$/.test(t2.trim()) ? { v: Number(t2), f: '0.####' } : { v: noFormula_(t2, isNum(h)), f: isNum(h) && t2 === '' ? '0.####' : '@' }; };
  t.set = function (r, n, v) { var c = head.indexOf(n); if (c < 0) return false; var rg = sh.getRange(r, c + 1), x = cellOf(n, v); rg.setNumberFormat(x.f); rg.setValues([[x.v]]); return true; };
  t.append = function (o) { var r = Math.max(sh.getLastRow(), 1) + 1, xs = head.map(function (h) { return cellOf(h, o[h] == null ? '' : o[h]); });
    var rg = sh.getRange(r, 1, 1, head.length); rg.setNumberFormats([xs.map(function (x) { return x.f; })]); rg.setValues([xs.map(function (x) { return x.v; })]); return r; };
  t.all = function () { var lr = sh.getLastRow(); return lr < 2 ? [] : sh.getRange(2, 1, lr - 1, head.length).getDisplayValues(); };
  return t;
}
var normC_ = function (v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase(); };
function fileChanges_(ss, b, fixed, at) {
  var out = { results: [], placeId: '' }, tabs = {}, who = String(fixed['Tech'] || ''), vid = String(b.visitId || ''), done = {};
  var T = function (n) { if (!(n in tabs)) tabs[n] = tabOf_(ss, n); return tabs[n]; };
  var log = function (tab, rec, field, oldV, newV, reason) { var C = T(CHANGES_TAB); if (C) C.append({ 'When': at, 'Who': who, 'Visit Id': vid, 'Tab': tab, 'Record Id': rec, 'Field': field, 'Old': oldV, 'New': newV, 'Reason': reason }); };
  var np = b.newPlace;
  if (np && np.cols && String(np.cols['Customer'] || '').trim() && String(np.cols['Address'] || '').trim()) {
    var P = T('Places'), pid = 'P-' + vid.replace(/^V-/, ''), key = addrKey_(np.cols['Address']);
    if (P && !P.rowOf('Place Id', pid)) {   // test-door-3 (R4): ONE row per house: a Places row with the same Address key is that customer's row
      var ic = P.col('Place Id'), kc = P.col('Address key'), ac = P.col('Address'), lc2 = P.col('Level'), hit = '';
      P.all().forEach(function (x) { if (hit || !key) return; var lv = lc2 < 0 ? '' : String(x[lc2]).trim(); if (lv === 'site' || lv === 'building') return;
        var k = kc >= 0 && String(x[kc]).trim() ? String(x[kc]).trim().toLowerCase() : addrKey_(ac >= 0 ? x[ac] : ''); if (k === key) hit = String(x[ic]).trim(); });
      if (hit) pid = hit;
      else { var o = { 'Place Id': pid, 'Level': 'house', 'Active': 'yes', 'Created by': who, 'Created at': at, 'Name': String(np.cols['Customer']), 'Address key': key };
        Object.keys(np.cols).forEach(function (k) { if (P.col(k) >= 0 && k !== 'Place Id') o[k] = np.cols[k]; }); P.append(o); log('Places', pid, 'Place', String(np.from || ''), pid, 'New customer'); } }
    if (P) out.placeId = pid;
  }
  var list = Array.isArray(b.changes) ? b.changes.slice(0, MAX_CHANGES) : [];
  list.forEach(function (c) {
    var res = { key: String(c.key || ''), new: String(c['new'] == null ? '' : c['new']) }; out.results.push(res);
    var idCol = CHANGE_TABS[c.tab], t = idCol ? T(c.tab) : null;
    if (!t || t.col(String(c.col)) < 0) { res.status = 'missing'; return; }
    var r = t.rowOf(idCol, c.record); if (!r) { res.status = 'missing'; return; }
    var cur = t.get(r, c.col), oldV = String(c.old == null ? '' : c.old), newV = res['new'], reason = String(c.reason || 'Correction');
    if (c.choice === 'newEquip' && c.tab === 'Equipment') {
      var nid = String(c.newId || ''); if (!/^EQ-[A-Za-z0-9-]{4,80}$/.test(nid)) { res.status = 'missing'; return; }
      if (String(c.record) === nid) {   // test-door-3 (R1): the piece THIS visit made: updated in place (never replaced by itself, never a 2nd row)
        if (normC_(cur) === normC_(newV)) { res.status = 'already'; res.newId = nid; return; }
        if (normC_(cur) !== normC_(oldV)) { res.status = 'changed'; res.now = cur; return; }
        t.set(r, c.col, newV); log('Equipment', nid, c.col, cur, newV, 'New equipment'); res.status = 'applied'; res.newId = nid; return; }
      if (done[c.record] === nid) { log('Equipment', nid, c.col, oldV, newV, 'New equipment'); res.status = 'applied'; res.newId = nid; return; }   // a 2nd field of the same new piece in this save
      if (t.get(r, 'Replaced by') === nid) { res.status = 'already'; res.newId = nid; return; }
      var st = t.get(r, 'Status');   // test-door-3 (R2): only an Active piece is replaced (never two Active pieces in one slot)
      if (t.col('Status') >= 0 && normC_(st) !== 'active') { var rb = t.get(r, 'Replaced by'); res.status = 'changed'; res.now = cur; res.note = 'This piece is ' + st + (rb ? ' (replaced by ' + rb + ')' : ''); return; }
      if (normC_(cur) !== normC_(oldV)) { res.status = 'changed'; res.now = cur; return; }
      if (!done[c.record]) { var o2 = { 'Piece Id': nid, 'Status': 'Active', 'Since': String(fixed['Date'] || at.slice(0, 10)), 'Created at': at };
        PIECE_COPY.forEach(function (k) { o2[k] = t.get(r, k); }); Object.keys(c.piece || {}).forEach(function (k) { if (t.col(k) >= 0 && PIECE_COPY.indexOf(k) < 0 && k !== 'Piece Id') o2[k] = c.piece[k]; });
        t.set(r, 'Status', 'Replaced'); t.set(r, 'Until', String(fixed['Date'] || at.slice(0, 10))); t.set(r, 'Replaced by', nid); t.append(o2);
        log('Equipment', c.record, 'Status', 'Active', 'Replaced by ' + nid, 'New equipment'); done[c.record] = nid; }
      log('Equipment', nid, c.col, oldV, newV, 'New equipment'); res.status = 'applied'; res.newId = nid; return;
    }
    if (c.choice === 'add') {
      if (!normC_(newV)) { res.status = 'already'; return; }
      var slot = (String(c.col).match(/^(Phone|Email) \d+$/) || [])[1];
      if (slot) {   // a new phone / email goes into the next empty Phone N / Email N (test-door-3, R10: phones by digits, emails too)
        var same = slot === 'Phone' ? function (a) { return digits_(a) && digits_(a) === digits_(newV); } : function (a) { return normC_(a) === normC_(newV); }, free = '';
        for (var k = 1; k <= 20; k++) { var pc = slot + ' ' + k; if (t.col(pc) < 0) break; var pv = t.get(r, pc); if (same(pv)) { res.status = 'already'; return; } if (!free && !normC_(pv)) free = pc; }
        if (!free) { res.status = 'missing'; return; }
        t.set(r, free, newV); log(c.tab, c.record, free, '', newV, 'Added'); res.status = 'applied'; res.col = free; return; }
      if (normC_(cur) === normC_(newV) || (normC_(cur) && normC_(cur).indexOf(normC_(newV)) >= 0)) { res.status = 'already'; return; }
      if (normC_(cur) !== normC_(oldV)) { res.status = 'changed'; res.now = cur; return; }   // test-door-3 (R3): the old-value guard on adds too
      if (!normC_(cur)) { t.set(r, c.col, newV); log(c.tab, c.record, c.col, '', newV, 'Added'); res.status = 'applied'; return; }
      if (c.replace) { t.set(r, c.col, newV); log(c.tab, c.record, c.col, cur, newV, 'Added'); res.status = 'applied'; return; }
      t.set(r, c.col, cur + ' \u00b7 ' + newV); log(c.tab, c.record, c.col, cur, cur + ' \u00b7 ' + newV, 'Added'); res.status = 'applied'; return;
    }
    if (normC_(cur) === normC_(newV)) { res.status = 'already'; return; }
    if (normC_(cur) !== normC_(oldV)) { res.status = 'changed'; res.now = cur; return; }
    t.set(r, c.col, newV); log(c.tab, c.record, c.col, cur, newV, reason); res.status = 'applied';
  });
  return out;
}
function followColor_(sh, head) {   // the Follow-up column gets its color once (a rule, never a formula in a cell)
  var c = head.indexOf('Follow-up'); if (c < 0) return;
  var rules = sh.getConditionalFormatRules(), has = rules.some(function (r) { return r.getRanges().some(function (g) { return g.getColumn() === c + 1; }); });
  if (has) return;
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenCellNotEmpty().setBackground(FOLLOW_COLOR).setRanges([sh.getRange(2, c + 1, Math.max(sh.getMaxRows() - 1, 1), 1)]).build());
  sh.setConditionalFormatRules(rules);
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
