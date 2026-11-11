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

  function getNowInKolkataMs() {
    return Date.now();
  }

  function getTodayDateInKolkata() {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch (_e) {
      const d = new Date();
      const istMs = d.getTime() + (5.5 * 60 * 60 * 1000);
      return new Date(istMs).toISOString().slice(0, 10);
    }
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
    const stripped = String(rawLine).replace(/^\uFEFF/, '').trim();
    if (!stripped) return null;

    const columns = stripped.split(/[,;\t]/).map(col => col.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
    const firstNonEmpty = columns.find(Boolean);
    if (!firstNonEmpty) return null;

    // skip header rows like "ROLL_NO" or "Student ID"
    if (
      /^(ROLL|REG|SNO|SRNO|SLNO|STUDENT|ID|NAME|NUMBER|REGISTERED|EMAIL|BRANCH|YEAR|STATUS)/.test(firstNonEmpty) &&
      !/^Y\d{2}[A-Z]{2,6}\d{2,4}$/.test(firstNonEmpty)
    ) {
      return null;
    }

    let matchedRoll = null;
    for (let i = 0; i < columns.length; i++) {
      const m = columns[i].match(/^(Y\d{2})([A-Z]{2,6})(\d{2,4})$/);
      if (m) {
        matchedRoll = m;
        break;
      }
    }

    if (!matchedRoll) return null;

    const prefix = matchedRoll[1];
    const branch = matchedRoll[2];
    const num = matchedRoll[3];

    const yearEntry = Object.entries(yearPrefixes || {}).find(([, p]) => p === prefix);
    const year = yearEntry ? parseInt(yearEntry[0], 10) : 1;

    return {
      rollNo: matchedRoll[0],
      year,
      yearLabel: YEAR_LABELS[year] || '1st',
      branch,
      num
    };
  }

  function parseTimeString(rawTime) {
    if (!rawTime) return null;
    const str = String(rawTime).trim().toUpperCase();
    if (!str) return null;

    const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = parseInt(ampmMatch[2], 10);
      const period = ampmMatch[4];
      if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
      const hours12 = hours;
      if (period === 'AM') {
        if (hours === 12) hours = 0;
      } else {
        if (hours !== 12) hours += 12;
      }
      const time24 = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      const time12 = `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
      return {
        hours24: hours,
        hours12,
        minutes,
        period,
        totalMinutes: hours * 60 + minutes,
        time24,
        time12
      };
    }

    const h24Match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (h24Match) {
      const hours = parseInt(h24Match[1], 10);
      const minutes = parseInt(h24Match[2], 10);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 === 0 ? 12 : hours % 12;
      const time24 = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      const time12 = `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
      return {
        hours24: hours,
        hours12,
        minutes,
        period,
        totalMinutes: hours * 60 + minutes,
        time24,
        time12
      };
    }

    return null;
  }

  function formatTime12h(rawTime) {
    const parsed = parseTimeString(rawTime);
    return parsed ? parsed.time12 : (rawTime ? String(rawTime) : '-');
  }

  function formatTime(iso) {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (_e) {
      return '-';
    }
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(`${dateStr}T00:00:00+05:30`);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium'
      });
    } catch (_e) {
      return String(dateStr);
    }
  }

  function formatEventDateTime(dateStr, startTimeStr, endTimeStr, endDateStr = null, isSingleDay = true) {
    if (!dateStr) return '-';
    try {
      const startParsed = parseTimeString(startTimeStr);
      const endParsed = parseTimeString(endTimeStr);
      const startDateFormatted = formatShortDate(dateStr);
      const resolvedEndDate = (!isSingleDay && endDateStr) ? endDateStr : dateStr;
      const endDateFormatted = formatShortDate(resolvedEndDate);

      if (resolvedEndDate && resolvedEndDate !== dateStr) {
        if (startParsed && endParsed) {
          return `${startDateFormatted}, ${startParsed.time12} – ${endDateFormatted}, ${endParsed.time12}`;
        }
        return `${startDateFormatted} – ${endDateFormatted}`;
      }

      if (startParsed && endParsed) {
        return `${startDateFormatted} · ${startParsed.time12} – ${endParsed.time12}`;
      }
      if (startParsed) {
        return `${startDateFormatted} · ${startParsed.time12}`;
      }
      return startDateFormatted;
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
    getNowInKolkataMs,
    getTodayDateInKolkata,
    computeAcademicYears,
    YEAR_LABELS,
    parseRollSuffix,
    parseFullRollRow,
    parseTimeString,
    formatTime12h,
    formatTime,
    formatShortDate,
    formatEventDateTime,
    sanitizeFilename,
    sanitizeSheetName
  };
})(window);
