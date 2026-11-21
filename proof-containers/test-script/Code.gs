// =====================================================================================================
// PMI container proof (TEST) - Apps Script web app for the TEST sheet 'PMI container proof (test)' ONLY.
// Proof page round 2 (Prompts no. 96). NOT the live PMI script; never paste this into the Smart PMI sheet.
//
// What it can do, and nothing else:
//   - doPost: replace (or clear) the rows of ONE Device name + ONE Profile on the tab 'Tweaks'.
//   - doGet:  return the 'Tweaks' rows of ONE Device name.
// It never reads or writes any other tab. Rows of other devices are kept as they are.
// The sheet holds fake data only, so the web app is open ("Anyone"); the token below is in the public
// proof page too, so it only keeps out random callers. Writes are capped (size and count).
// =====================================================================================================
var TOKEN = 'd8a44855c9e7e7f923a3bfcf4d753fd66e3040b1';
var TAB = 'Tweaks';
var HEAD = ['Device name', 'Profile', 'Cell id', 'Property', 'Value', 'Saved at'];
var PROFILES = { phone: 1, wide: 1, android: 1, iphone: 1 };
var PROPS = { weight: 1, fontSize: 1, label: 1, align: 1 };
var MAX_BODY = 20000;          // characters in one save
var MAX_ROWS_PER_SAVE = 100;   // tweak rows in one save
var MAX_TOTAL_ROWS = 2000;     // tweak rows on the whole tab
var SCRIPT_VERSION = 'proof-test-1';

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function now_() { return Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd HH:mm:ss'); }
function okDevice_(d) { return typeof d === 'string' && /^[A-Za-z0-9 ._-]{3,40}$/.test(d); }

function tab_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB);
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
  return '';
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.token !== TOKEN) return out_({ ok: false, error: 'bad token' });
    if (p.op === 'ping') return out_({ ok: true, version: SCRIPT_VERSION, at: now_() });
    var dev = String(p.device || '');
    if (!okDevice_(dev)) return out_({ ok: false, error: 'bad device name' });
    var rows = readRows_(tab_()).filter(function (r) { return r[0] === dev; })
      .map(function (r) { return { device: r[0], profile: r[1], cell: r[2], prop: r[3], value: r[4], savedAt: r[5] }; });
    return out_({ ok: true, version: SCRIPT_VERSION, device: dev, rows: rows, at: now_() });
  } catch (err) { return out_({ ok: false, error: String(err && err.message || err) }); }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = (e && e.postData && e.postData.contents) || '';
    if (body.length > MAX_BODY) return out_({ ok: false, error: 'too big' });
    var b = JSON.parse(body || '{}');
    if (b.token !== TOKEN) return out_({ ok: false, error: 'bad token' });
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
