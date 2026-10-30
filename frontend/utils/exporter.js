/**
 * Frontend Utility — Excel Report Exporter
 * Groups attendance records by branch and triggers sorted Excel downloads via SheetJS.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Utils = AttendX.Utils || {};

  function groupByBranch(records) {
    return (records || []).reduce((acc, item) => {
      const b = item.branch || 'OTHER';
      (acc[b] = acc[b] || []).push(item);
      return acc;
    }, {});
  }

  function groupByYear(records) {
    return (records || []).reduce((acc, item) => {
      const label = (item.yearLabel || '1st') + ' Year';
      (acc[label] = acc[label] || []).push(item);
      return acc;
    }, {});
  }

  function exportBranchWiseExcel(attendanceList, currentEvent, toastFn) {
    if (typeof global.XLSX === 'undefined') {
      toastFn('Excel export library failed to load. Check your internet connection.', 'error');
      return;
    }

    if (!Array.isArray(attendanceList) || attendanceList.length === 0) {
      toastFn('No attendance data to export', 'error');
      return;
    }

    const { sanitizeFilename, sanitizeSheetName, formatTime } = AttendX.Utils.Sanitizer;
    const safeEventName = sanitizeFilename(currentEvent?.name || 'Event');
    const byBranch = groupByBranch(attendanceList);
    const branchEntries = Object.entries(byBranch);

    if (branchEntries.length === 0) {
      toastFn('No branch records available to export', 'error');
      return;
    }

    branchEntries.forEach(([branch, students], index) => {
      const sorted = [...students].sort((a, b) => {
        const yearPrefixA = a.rollNo.match(/^[A-Z]+\d+/)?.[0] || '';
        const yearPrefixB = b.rollNo.match(/^[A-Z]+\d+/)?.[0] || '';
        if (yearPrefixA !== yearPrefixB) {
          return yearPrefixB.localeCompare(yearPrefixA);
        }
        return a.rollNo.localeCompare(b.rollNo);
      });

      const wb = global.XLSX.utils.book_new();
      const rows = [
        ['Registered Number (Roll No)', 'Year', 'Branch', 'Status', 'Time', 'Recorded By'],
        ...sorted.map(s => [
          s.rollNo,
          (s.yearLabel || '1st') + ' Year',
          s.branch,
          s.status,
          formatTime(s.timestamp),
          s.recordedBy || '-'
        ])
      ];

      const ws = global.XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 28 },
        { wch: 10 },
        { wch: 10 },
        { wch: 14 },
        { wch: 12 },
        { wch: 22 }
      ];

      const sheetName = sanitizeSheetName(branch);
      global.XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const filename = `Attendance_${safeEventName}_${sanitizeFilename(branch)}.xlsx`;

      setTimeout(() => {
        try {
          global.XLSX.writeFile(wb, filename);
        } catch (err) {
          console.error('[AttendX] Export write error:', err);
        }
      }, index * 400);
    });

    AttendX.Backend.AuditService.logAction('ATTENDANCE_EXPORTED', {
      eventId: currentEvent?.id,
      branchesCount: branchEntries.length,
      recordsCount: attendanceList.length
    });

    toastFn(`Exporting ${branchEntries.length} Excel file(s)...`, 'success');
  }

  AttendX.Utils.Exporter = {
    groupByBranch,
    groupByYear,
    exportBranchWiseExcel
  };
})(window);
