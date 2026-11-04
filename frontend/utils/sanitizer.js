(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Utils = AttendX.Utils || {};

  const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"'/]/g, ch => HTML_ESCAPE_MAP[ch]);
  }

  // academic year starts in july (month index 6)
  function computeAcademicYears() {
    const now = new Date();
    let startYear = now.getFullYear();
    if (now.getMonth() < 6) {
      startYear -= 1;
    }
    return {
      1: 'Y' + startYear.toString().slice(-2),
      2: 'Y' + (startYear - 1).toString().slice(-2),
      3: 'Y' + (startYear - 2).toString().slice(-2),
      4: 'Y' + (startYear - 3).toString().slice(-2)
    };
  }

  const YEAR_LABELS = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };

  function parseRollSuffix(rawSuffix) {
    const clean = String(rawSuffix || '').trim().toUpperCase();
    if (!clean) {
      return { valid: false, error: 'Enter roll number suffix' };
    }
    const match = clean.match(/^([A-Z]{2,6})(\d{2,4})$/);
    if (!match) {
      return {
        valid: false,
        error: 'Format: BRANCH + 3 digits (e.g. CSE042, ECE007)'
      };
    }
    return {
      valid: true,
      branch: match[1],
      num: match[2],
      suffix: clean
    };
  }

  function parseFullRollRow(rawLine, yearPrefixes) {
    if (!rawLine) return null;
    const firstCol = String(rawLine).split(/[,;\t]/)[0].trim().toUpperCase();
    const cleaned = firstCol.replace(/[^A-Z0-9]/g, '');

    if (!cleaned) return null;

    // skip header rows like "ROLL_NO" or "Student ID"
    if (
      /^(ROLL|REG|SNO|SRNO|STUDENT|ID|NAME|NUMBER|REGISTERED)/.test(cleaned) &&
      !/^Y\d{2}[A-Z]{2,6}\d{2,4}$/.test(cleaned)
    ) {
      return null;
    }

    const match = cleaned.match(/^(Y\d{2})([A-Z]{2,6})(\d{2,4})$/);
    if (!match) return null;

    const prefix = match[1];
    const branch = match[2];
    const num = match[3];

    const yearEntry = Object.entries(yearPrefixes || {}).find(([, p]) => p === prefix);
    const year = yearEntry ? parseInt(yearEntry[0], 10) : 1;

    return {
      rollNo: cleaned,
      year,
      yearLabel: YEAR_LABELS[year] || '1st',
      branch,
      num
    };
  }

  function formatTime(iso) {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch (_e) {
      return '-';
    }
  }

  function formatEventDateTime(dateStr, timeStr) {
    if (!dateStr) return '-';
    try {
      const normalizedTime = timeStr ? String(timeStr).slice(0, 5) : '00:00';
      const d = new Date(`${dateStr}T${normalizedTime}`);
      if (isNaN(d.getTime())) return `${dateStr}${timeStr ? ' ' + timeStr : ''}`;
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        ...(timeStr ? { timeStyle: 'short' } : {})
      });
    } catch (_e) {
      return String(dateStr);
    }
  }

  function sanitizeFilename(name) {
    return String(name || 'Event')
      .trim()
      .replace(/[\\/:*?"<>|\s]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50) || 'Event';
  }

  // sheetjs throws if sheet names are over 31 chars or have special chars
  function sanitizeSheetName(name) {
    return String(name || 'Branch')
      .replace(/[\\/?*:[\]]+/g, '')
      .trim()
      .slice(0, 31) || 'Sheet1';
  }

  AttendX.Utils.Sanitizer = {
    escapeHtml,
    computeAcademicYears,
    YEAR_LABELS,
    parseRollSuffix,
    parseFullRollRow,
    formatTime,
    formatEventDateTime,
    sanitizeFilename,
    sanitizeSheetName
  };
})(window);
