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

  const JNTU_BRANCH_CODE_MAP = {
    '01': 'CE',
    '02': 'EEE',
    '03': 'ME',
    '04': 'ECE',
    '05': 'CSE',
    '12': 'IT',
    '42': 'CSM',
    '43': 'CAI',
    '44': 'CSD',
    '45': 'CSC'
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

  function resolveYearFromTwoDigits(twoDigitStr, yearPrefixes) {
    const candidatePrefix = 'Y' + String(twoDigitStr).padStart(2, '0');
    const yearEntry = Object.entries(yearPrefixes || {}).find(([, p]) => p === candidatePrefix);
    if (yearEntry) {
      return parseInt(yearEntry[0], 10);
    }
    const now = new Date();
    let currentAdmissionYear = now.getFullYear() % 100;
    if (now.getMonth() < 6) currentAdmissionYear -= 1;
    const diff = currentAdmissionYear - parseInt(twoDigitStr, 10) + 1;
    if (diff >= 1 && diff <= 4) return diff;
    return 1;
  }

  function parseRollSuffix(rawSuffix) {
    const clean = String(rawSuffix || '').trim().toUpperCase();
    if (!clean) {
      return { valid: false, error: 'Enter roll number suffix' };
    }

    // Standard suffix: BRANCH + digits (e.g. CSE042, ECE007)
    const match = clean.match(/^([A-Z]{2,6})(\d{2,4})$/);
    if (match) {
      return {
        valid: true,
        branch: match[1],
        num: match[2],
        suffix: clean
      };
    }

    // Numeric branch code + alphanumeric roll shorthand (e.g. 05A2, 0501, 04B1)
    const shortMatch = clean.match(/^(\d{2})([A-Z0-9]{2,4})$/);
    if (shortMatch) {
      const branchCode = shortMatch[1];
      const branchName = JNTU_BRANCH_CODE_MAP[branchCode] || ('B' + branchCode);
      return {
        valid: true,
        branch: branchName,
        num: shortMatch[2],
        suffix: clean
      };
    }

    return {
      valid: false,
      error: 'Format: BRANCH + digits (e.g. CSE042 or 05A2)'
    };
  }

  function parseFullRollRow(rawLine, yearPrefixes) {
    if (!rawLine) return null;
    const stripped = String(rawLine).replace(/^\uFEFF/, '').trim();
    if (!stripped) return null;

    const columns = stripped
      .split(/[,;\t]/)
      .map(col => col.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
    const firstNonEmpty = columns.find(Boolean);
    if (!firstNonEmpty) return null;

    // skip header rows like "roll_no", "ROLL_NO", "Student ID"
    if (
      /^(ROLL|REG|SNO|SRNO|SLNO|STUDENT|ID|NAME|NUMBER|REGISTERED|EMAIL|BRANCH|YEAR|STATUS)/.test(firstNonEmpty) &&
      !/^Y\d{2}[A-Z]{2,6}\d{2,4}$/.test(firstNonEmpty) &&
      !/^\d{2}[A-Z0-9]{4}\d{2}[A-Z0-9]{2}$/.test(firstNonEmpty)
    ) {
      return null;
    }

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];

      // Format 1: Y25CSE001
      const mY = col.match(/^(Y(\d{2}))([A-Z]{2,6})(\d{2,4})$/);
      if (mY) {
        const year = resolveYearFromTwoDigits(mY[2], yearPrefixes);
        return {
          rollNo: mY[0],
          year,
          yearLabel: YEAR_LABELS[year] || '1st',
          branch: mY[3],
          num: mY[4]
        };
      }

      // Format 2: 10-character college roll number (e.g. 23A91A0501, 24A91A04A2)
      const m10 = col.match(/^(\d{2})([A-Z0-9]{4})(\d{2})([A-Z0-9]{2})$/);
      if (m10) {
        const yearDigits = m10[1];
        const branchCode = m10[3];
        const rollSeq = m10[4];
        const year = resolveYearFromTwoDigits(yearDigits, yearPrefixes);
        const branch = JNTU_BRANCH_CODE_MAP[branchCode] || ('B' + branchCode);
        return {
          rollNo: m10[0],
          year,
          yearLabel: YEAR_LABELS[year] || '1st',
          branch,
          num: rollSeq
        };
      }
    }

    return null;
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
    return parsed ? parsed.time12 : '-';
  }

  function formatTime(isoTimestamp) {
    if (!isoTimestamp) return '-';
    try {
      const date = new Date(isoTimestamp);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).toUpperCase();
    } catch (_e) {
      return '-';
    }
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const m = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return String(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(m[2], 10) - 1;
    const monthName = months[monthIdx] || m[2];
    return `${m[3]}-${monthName}-${m[1]}`;
  }

  function formatEventDateTime(dateStr, startTimeStr, endTimeStr, endDateStr = null, isSingleDay = null) {
    if (!dateStr) return '-';
    try {
      const startDateFormatted = formatShortDate(dateStr);
      const effectiveEndDate = endDateStr || dateStr;
      const endDateFormatted = formatShortDate(effectiveEndDate);
      const singleDay = isSingleDay !== null ? Boolean(isSingleDay) : (effectiveEndDate === dateStr);

      const startParsed = parseTimeString(startTimeStr);
      const endParsed = parseTimeString(endTimeStr);

      if (!singleDay && effectiveEndDate !== dateStr) {
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
