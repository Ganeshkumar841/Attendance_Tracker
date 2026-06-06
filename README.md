# AttendX — Event Attendance System

AttendX is a streamlined, real-time college event attendance management web application built for event coordinators. It features a modern "Luminous Void" dark user interface, instant database synchronization, dynamic academic year handling, and multi-file branch-wise Excel exporting capabilities.

---

## Features

* **Real-time Synchronization:** Powered by Supabase Postgres Changes, allowing multiple coordinators to log attendance concurrently on different devices without conflicts.
* **Intelligent Academic Year Mapping:** Dynamically calculates current student batches (`Y26`, `Y25`, etc.) based on an academic cycle starting every July.
* **Dual-State Registration Processing:** * **Manual Entry:** Quick suffix matching (e.g., typing `CSE042` after choosing a year).
    * **Pre-registration:** Upload a standalone list via CSV to allow rapid verification during manual check-in.
* **Automated Multi-File Export:** Automatically chunks, matches, and triggers separate Excel file downloads parsed by branch, pre-sorted down by seniority and registration sequence.
* **Session Security Modals:** Secure entry overrides requiring event-specific authorization passwords before data updates or event deletions can occur.

---

## Tech Stack & Dependencies

* **Frontend Architecture:** Vanilla JavaScript (ES6+), HTML5, CSS3 Variables & Custom Gradients.
* **Database & Auth Provider:** [Supabase](https://supabase.com/) (Auth, Database, and Realtime Engine).
* **External CDN Libraries:**
    * `Supabase JS Client` (`@supabase/supabase-js@2`)
    * `SheetJS` (`xlsx.full.min.js` v0.18.5)
* **Typography:** Google Fonts (`Inter`).

---
