# EHR UI Browser Test Scenarios (5000 Tests)

## Test Organization
- **Section 1**: Authentication & Login (1-100)
- **Section 2**: Dashboard (101-200)
- **Section 3**: Patient Management (201-600)
- **Section 4**: Appointments & Calendar (601-1000)
- **Section 5**: Encounters (1001-1500)
- **Section 6**: Patient Chart Tabs (1501-2200)
- **Section 7**: Settings Pages (2201-2800)
- **Section 8**: Labs & Orders (2801-3000)
- **Section 9**: Inventory Management (3001-3300)
- **Section 10**: Reports (3301-3500)
- **Section 11**: Messaging & Recall (3501-3650)
- **Section 12**: Claims & Billing (3651-3850)
- **Section 13**: Ciyex Hub / Marketplace (3851-4050)
- **Section 14**: Developer Portal (4051-4200)
- **Section 15**: Dynamic Form Fields (4201-4500)
- **Section 16**: Navigation & Layout (4501-4650)
- **Section 17**: Encounter Form Specialties (4651-4800)
- **Section 18**: Edge Cases & Error Handling (4801-5000)

---

## Section 1: Authentication & Login (1-100)

### Sign In Flow
1. Navigate to /signin — page loads with Keycloak login form
2. Enter valid username (michael.chen) — field accepts input
3. Enter valid password (<TEST_USER_PASSWORD>) — password field masks input
4. Click Sign In — redirects to /select-practice or /dashboard
5. Sign in with invalid username — shows error message
6. Sign in with invalid password — shows error message
7. Sign in with empty username — shows validation error
8. Sign in with empty password — shows validation error
9. Sign in with both fields empty — shows validation errors
10. Press Enter key to submit login form — submits correctly
11. Password field has show/hide toggle — toggle works
12. Remember me checkbox is present and functional
13. Forgot password link is present and navigable
14. After successful auth, JWT token is stored
15. After auth, X-Org-Alias header is set for API calls
16. Session persists on page refresh after login
17. Unauthorized API call returns 401 and redirects to /signin
18. Token expiry triggers re-authentication flow
19. Multiple failed login attempts show lockout warning
20. OAuth callback URL (/callback) processes correctly

### Practice Selection
21. /select-practice shows list of available practices
22. Each practice shows name and org alias
23. Clicking a practice sets TenantContext
24. After practice selection, redirects to /dashboard
25. Practice selection persists across page refresh
26. User with single practice auto-redirects to dashboard
27. Practice switcher in header shows current practice name
28. Clicking practice switcher opens dropdown
29. Switching practice reloads sidebar menu
30. Switching practice reloads dashboard data
31. Practice logo displays correctly in header
32. Practice alias shows in URL or header context

### Sign Up Flow
33. Navigate to /signup — registration form loads
34. All required fields are marked with asterisk
35. Email validation rejects invalid format
36. Password strength indicator shows
37. Password confirmation must match
38. Successful registration redirects appropriately
39. Duplicate email shows error
40. Phone number field formats correctly

### Session & Security
41. Idle timeout warns user before session expiry
42. Clicking "Stay Logged In" extends session
43. Session timeout redirects to /signin
44. Back button after logout doesn't show protected content
45. Multiple tabs share same session
46. Logout from one tab logs out all tabs
47. CSRF token is included in form submissions
48. XSS attempt in login fields is sanitized
49. SQL injection in login fields is rejected
50. API calls include Bearer token in Authorization header

### Navigation Guards
51. Unauthenticated user accessing /dashboard redirects to /signin
52. Unauthenticated user accessing /patients redirects to /signin
53. Unauthenticated user accessing /appointments redirects to /signin
54. Unauthenticated user accessing /settings redirects to /signin
55. Authenticated user accessing /signin redirects to /dashboard
56. Deep link to /patients/123 works after authentication
57. Deep link preserves query parameters after auth redirect
58. 404 page shows for invalid routes
59. Error boundary catches and displays JS errors gracefully
60. Network offline shows appropriate warning

### Theme & Display
61. Dark mode toggle in header works
62. Dark mode persists across page refresh
63. Dark mode applies to all components
64. Light mode is default for new users
65. Theme toggle doesn't cause layout shift
66. Font size preferences apply correctly
67. Language preference loads correct locale
68. Date format preference applies (MM/DD/YYYY vs DD/MM/YYYY)
69. Time format preference applies (12h vs 24h)
70. Sidebar collapse state persists across refresh

### User Menu
71. User dropdown shows username
72. User dropdown shows email
73. User dropdown shows avatar/initials
74. Profile link navigates to profile page
75. Settings link navigates to /settings
76. Logout link triggers logout confirmation
77. Confirming logout clears session and redirects
78. Notification bell shows unread count badge
79. Clicking notification bell opens dropdown
80. Notifications show timestamp and message
81. Clicking a notification navigates to relevant page
82. Mark all as read clears badge count

### Responsive Layout
83. Sidebar collapses on mobile viewport
84. Hamburger menu appears on mobile
85. Clicking hamburger opens sidebar overlay
86. Backdrop click closes mobile sidebar
87. Header remains fixed on scroll
88. Content area scrolls independently of sidebar
89. Tables become horizontally scrollable on mobile
90. Modals are centered and fit mobile viewport
91. Form fields stack vertically on mobile
92. Buttons are touch-friendly size on mobile

### Breadcrumb & Page Title
93. Breadcrumb shows current page path
94. Breadcrumb links are clickable for navigation
95. Page title updates on route change
96. Browser tab title reflects current page
97. Back button navigates to previous page correctly
98. Forward button works after going back
99. Page title matches sidebar active item
100. Admin layout wrapper renders header + sidebar + content

---

## Section 2: Dashboard (101-200)

### Dashboard Loading (Positive)
101. Navigate to /dashboard — page loads without errors
102. Summary cards display: Total Patients, Appointments Today, Encounters, Revenue
103. Summary cards show numeric values (not NaN or undefined)
104. Monthly consultations chart renders with data points
105. Statistics chart renders area chart correctly
106. Recent patients/appointments list shows latest entries
107. Patients by country/region map renders
108. Dashboard data refreshes on practice switch
109. Dashboard loads within 3 seconds
110. All chart tooltips show on hover

### Summary Cards (Positive)
111. Total Patients card shows correct count matching /api/patients/count
112. Appointments Today card shows today's appointment count
113. Card click navigates to relevant page (patients list, calendar)
114. Cards show trend indicator (up/down arrow)
115. Cards have consistent styling and alignment
116. Cards are responsive — stack on mobile, row on desktop

### Summary Cards (Negative)
117. Cards show 0 when no data exists (not blank)
118. Cards handle API failure gracefully — show fallback
119. Cards don't show stale data after practice switch
120. Cards handle very large numbers without overflow

### Charts (Positive)
121. Monthly chart shows last 12 months data
122. Chart axes have proper labels
123. Chart legend shows series names
124. Chart data points are clickable
125. Chart supports hover tooltip with exact values
126. Bar chart renders properly with multiple series
127. Line chart renders smooth curves
128. Charts resize on window resize
129. Charts have proper color coding
130. Charts load data from API endpoints

### Charts (Negative)
131. Charts handle empty dataset — show "No data" message
132. Charts handle API timeout — show error state
133. Charts don't crash with null values in data
134. Charts handle negative values appropriately
135. Charts handle date gaps in data gracefully

### Recent Activity Lists (Positive)
136. Recent patients list shows 5-10 latest patients
137. Each patient row shows name, DOB, last visit
138. Clicking patient name navigates to patient detail
139. Recent appointments show time, patient, provider, status
140. Clicking appointment navigates to calendar
141. Status badges show correct colors
142. List is sorted by most recent first

### Recent Activity Lists (Negative)
143. Empty list shows "No recent activity" message
144. List handles missing patient name gracefully
145. List doesn't break with long patient names (truncation)
146. List handles null dates without crashing

### Dashboard Layout
147. Dashboard uses 2-column grid on desktop
148. Cards span full width on mobile
149. No vertical scrollbar on default viewport
150. Content fits within AdminLayout content area
151. Dashboard maintains layout after sidebar toggle
152. Dark mode applies to all dashboard elements
153. Print-friendly layout available via Ctrl+P
154. Dashboard tab title shows "Dashboard - Ciyex EHR"
155. Breadcrumb shows "Dashboard"
156. Sidebar "Dashboard" menu item is highlighted/active

### Dashboard Filters
157. Date range filter changes chart data period
158. Provider filter limits data to selected provider
159. Location filter limits data to selected facility
160. Clearing filters resets to default view
161. Multiple filters work together correctly
162. Filter state persists during session
163. Filter dropdown options load from API

### Dashboard Performance
164. Initial load completes under 3 seconds
165. Chart animations are smooth (60fps)
166. No layout shift during data loading
167. Skeleton loaders show while data loads
168. API calls are parallelized (not sequential)
169. Dashboard data is cached for quick revisit
170. Page transition from sidebar is smooth

### Dashboard Edge Cases
171. Dashboard with zero patients shows empty state
172. Dashboard with 10000+ patients handles gracefully
173. Network disconnect shows offline indicator
174. Slow API response shows loading state
175. Dashboard refresh (F5) reloads all data
176. Multiple rapid practice switches don't cause race conditions
177. Dashboard handles concurrent API errors gracefully
178. Dashboard accessible via keyboard navigation
179. Screen reader announces summary card values
180. High contrast mode maintains readability

### Dashboard Data Accuracy
181. Patient count matches patients list total
182. Today's appointment count matches calendar filtered view
183. Encounter count matches all-encounters filtered for today
184. Revenue figures match payment report totals
185. Chart data consistent with report page data
186. Recent patients match latest created/modified
187. Data updates when new patient is created
188. Data updates when new appointment is booked
189. Data updates when encounter is completed
190. Data reflects current org only (multi-tenant)

### Dashboard Widgets
191. Each widget has a title header
192. Widgets can be individually refreshed
193. Widget error doesn't affect other widgets
194. Widget loading states are independent
195. Consultation target gauge shows % completion
196. Demographic breakdown shows gender split
197. Age distribution chart renders correctly
198. Provider performance comparison shows
199. Upcoming appointment summary is accurate
200. Quick action buttons (New Patient, New Appointment) work

---

## Section 3: Patient Management (201-600)

### Patient List Page (Positive)
201. Navigate to /patients — patient list loads
202. Table shows columns: Name, MRN, DOB, Gender, Phone, Email, Status
203. Default sort is by name alphabetically
204. Pagination shows 20 items per page
205. Total patient count shown above table
206. Search box is visible and functional
207. "New Patient" button is visible
208. Each row has action buttons (View, Edit, Delete)
209. Table rows are clickable — navigate to patient detail
210. Status badges show Active (green) / Inactive (gray)

### Patient Search (Positive)
211. Typing in search filters patients by name
212. Search by first name returns matching patients
213. Search by last name returns matching patients
214. Search by full name returns exact match
215. Search by MRN returns matching patient
216. Search by phone number returns matching patient
217. Search by email returns matching patient
218. Search is case-insensitive
219. Search results update as user types (debounced)
220. Clearing search shows all patients again

### Patient Search (Negative)
221. Search with no results shows "No patients found"
222. Search with special characters doesn't crash
223. Search with very long string doesn't crash
224. Search with only spaces returns all (or shows nothing)
225. Search with SQL injection attempt is safe
226. Search with HTML tags is sanitized
227. Rapid typing doesn't cause multiple API calls (debounce)

### Patient Filters (Positive)
228. Gender filter dropdown shows Male/Female/Other/All
229. Selecting Male shows only male patients
230. Selecting Female shows only female patients
231. Selecting Other shows other gender patients
232. Status toggle switches between Active and Inactive
233. Active shows only active patients
234. Inactive shows only inactive patients
235. Combined search + gender filter works
236. Combined search + status filter works
237. All three filters combined work correctly

### Patient Filters (Negative)
238. Filters show "No results" when combination has no matches
239. Filter dropdown handles empty option list gracefully
240. Filter state resets on page navigation and return

### Patient Pagination (Positive)
241. Next page button loads page 2
242. Previous page button goes back to page 1
243. Page number indicator shows "Page 1 of N"
244. Last page button jumps to final page
245. First page button returns to page 1
246. Page size selector (10, 20, 50, 100) works
247. Changing page size resets to page 1
248. Pagination preserves current search/filter

### Patient Pagination (Negative)
249. Single page of results hides pagination controls
250. Empty result set hides pagination
251. Clicking Next on last page does nothing
252. Clicking Previous on first page does nothing

### Create Patient (Positive)
253. Click "New Patient" — modal/form opens
254. Form shows all demographic fields
255. First Name field accepts text input
256. Last Name field accepts text input
257. Date of Birth date picker opens and selects date
258. Gender dropdown shows Male/Female/Other/Unknown
259. Email field accepts valid email
260. Phone field formats as (xxx) xxx-xxxx
261. Address fields accept input
262. Status defaults to Active
263. MRN is auto-generated if left blank
264. Save with all required fields — patient created successfully
265. Success toast notification appears
266. New patient appears in patient list
267. Form clears after successful save
268. Patient count increments by 1

### Create Patient (Negative)
269. Save with empty First Name — shows "Required" error
270. Save with empty Last Name — shows "Required" error
271. Save with empty DOB — shows "Required" error
272. Save with future DOB — shows validation error
273. Save with invalid email format — shows error
274. Save with duplicate MRN — shows error or auto-generates new
275. Save with empty form — shows all required field errors
276. Save with DOB before 1900 — shows validation error
277. Cancel button closes form without saving
278. Closing modal with unsaved changes — warns user
279. Network error during save shows error message
280. Very long first name (500+ chars) — handled gracefully
281. Special characters in name (O'Brien, García) — accepted
282. HTML in name field is sanitized
283. Phone with invalid format shows error
284. SSN field masks input

### Edit Patient (Positive)
285. Click Edit on patient row — edit form opens with pre-filled data
286. First Name shows current value
287. Last Name shows current value
288. DOB shows current date
289. Gender shows current selection
290. All fields are editable
291. Changing First Name and saving — updates correctly
292. Changing Last Name and saving — updates correctly
293. Changing DOB and saving — updates correctly
294. Changing status to Inactive — patient becomes inactive
295. Changing email and saving — updates correctly
296. Changing phone and saving — updates correctly
297. Save shows success notification
298. Updated data reflects in patient list immediately
299. Edit preserves fields not changed
300. Multiple rapid edits save correctly

### Edit Patient (Negative)
301. Clearing required field and saving — shows error
302. Setting invalid email and saving — shows error
303. Concurrent edit by another user — handles conflict
304. Edit form handles API error gracefully
305. Edit form handles network timeout
306. Cancel edit reverts to original values

### Delete Patient (Positive)
307. Click Delete on patient row — confirmation dialog appears
308. Confirmation dialog shows patient name
309. Clicking Confirm deletes patient (soft delete)
310. Deleted patient removed from active list
311. Success notification shows after delete
312. Patient count decrements by 1
313. Deleted patient appears in Inactive filter

### Delete Patient (Negative)
314. Cancel delete — patient remains in list
315. Delete patient with encounters — handles appropriately
316. Delete patient with appointments — handles appropriately
317. Delete patient with insurance — handles appropriately
318. Delete API failure shows error message
319. Double-clicking delete doesn't delete twice

### Patient Detail Page (Positive)
320. Navigate to /patients/{id} — detail page loads
321. Patient name shows in header
322. Patient photo/avatar shows (or initials)
323. MRN displays correctly
324. DOB and age display
325. Gender displays
326. Contact info displays (phone, email)
327. Status badge shows (Active/Inactive)
328. Clinical sidebar shows on left
329. Tab navigation shows all configured tabs
330. Default tab loads (Dashboard or first tab)
331. Clicking each tab loads corresponding content
332. Tab content scrolls independently
333. Back button returns to patient list
334. Breadcrumb shows Patients > Patient Name

### Patient Detail (Negative)
335. Navigate to /patients/invalid-id — shows 404 or error
336. Navigate to /patients/999999 — shows "Patient not found"
337. Patient detail with no encounters shows empty state
338. Patient detail with no allergies shows "No known allergies"
339. Patient detail with no insurance shows empty state
340. Slow API response shows loading skeleton

### Clinical Sidebar (Positive)
341. Allergies summary shows active allergies
342. Allergy severity color coding (mild=yellow, moderate=orange, severe=red)
343. Problems summary shows active conditions
344. Insurance summary shows primary insurance
345. Sidebar collapses on mobile
346. Sidebar data refreshes when patient data changes
347. Clicking allergy navigates to allergies tab
348. Clicking problem navigates to problems tab

### Clinical Sidebar (Negative)
349. No allergies shows "No Known Allergies" (NKA)
350. No problems shows "No Active Problems"
351. No insurance shows "No Insurance on File"
352. Sidebar handles API error for each section independently
353. Very long allergy names truncate with ellipsis

### Patient Demographics Tab
354. Demographics tab shows all patient information
355. Personal info section: name, DOB, gender, MRN, SSN
356. Contact section: phone, email, address
357. Emergency contact section shows name, relationship, phone
358. Guardian section shows guardian info
359. Guarantor section shows billing responsible party
360. Pharmacy section shows preferred pharmacy
361. Advance directives section shows status
362. Provider section shows assigned provider, referring, PCP
363. Employer section shows occupation and employer
364. Additional identifiers show (DL, Medicaid, Medicare)
365. Communication consent toggles are visible
366. Edit button enables inline editing
367. Save updates demographics
368. Cancel reverts changes

### Patient Demographics (Negative)
369. Empty optional fields show as blank (not "null" or "undefined")
370. Missing address shows "No address on file"
371. Missing emergency contact shows "Not specified"
372. Missing pharmacy shows "No pharmacy selected"
373. Invalid data in demographics handled gracefully

### Patient Demographics — All Fields
374. prefix field (select: Mr, Mrs, Ms, Dr, etc.)
375. firstName (text, required) — validates
376. middleName (text) — optional
377. lastName (text, required) — validates
378. suffix (select: Jr, Sr, III, etc.)
379. preferredName (text) — displays if set
380. previousLastName (text) — maiden name
381. dateOfBirth (date) — date picker works
382. gender (select: male/female/other/unknown)
383. genderIdentity (select) — USCDI field
384. pronouns (select: he/him, she/her, they/them, etc.)
385. sexualOrientation (select) — USCDI field
386. maritalStatus (select: single/married/divorced/widowed)
387. race (select) — USCDI field
388. ethnicity (select) — USCDI field
389. language (select) — preferred language
390. interpreterNeeded (toggle) — boolean
391. tribalAffiliation (text) — if applicable
392. religion (combobox) — allows custom entry
393. veteranStatus (select: yes/no)
394. disabilityStatus (select)
395. multipleBirth (toggle) — twin/triplet indicator
396. deceasedDate (date) — shows if patient deceased
397. phoneNumber (phone) — mobile/primary
398. homePhone (phone)
399. workPhone (phone)
400. email (email) — validates format
401. preferredContactMethod (select: phone/email/text/mail)
402. address street, city, state, zip, country — all fields
403. allowSms (toggle) — SMS consent
404. allowEmail (toggle) — email consent
405. allowVoicemail (toggle)
406. allowMail (toggle) — postal mail consent
407. allowPatientPortal (toggle) — portal access
408. hipaaNPPReceived (toggle)
409. allowHIE (toggle) — Health Information Exchange
410. allowImmunizationRegistry (toggle)
411. medicationHistoryConsent (toggle)
412. emergencyName (text)
413. emergencyRelationship (select: spouse/parent/child/sibling/friend)
414. emergencyPhone (phone)
415. guardianName (text)
416. guardianRelationship (select)
417. guardianPhone (phone)
418. guardianEmail (email)
419. guardianAddress (text)
420. mothersName (text) — for minors
421. guarantorFirstName (text)
422. guarantorLastName (text)
423. guarantorRelationship (select: self/spouse/parent/other)
424. guarantorDOB (date)
425. guarantorSSN (text) — masked
426. guarantorPhone (phone)
427. guarantorEmail (email)
428. guarantorAddress (text)
429. guarantorEmployer (text)
430. pharmacyName (text)
431. pharmacyPhone (phone)
432. pharmacyFax (phone)
433. pharmacyAddress (text)
434. mailOrderPharmacy (text)
435. advanceDirectiveOnFile (select: yes/no/unknown)
436. advanceDirectiveType (select: living will/DNR/healthcare proxy/POLST)
437. advanceDirectiveReviewDate (date)
438. healthcareProxyName (text)
439. healthcareProxyPhone (phone)
440. organDonor (select: yes/no/unknown)
441. assignedProvider (lookup) — searches providers
442. referringProvider (lookup)
443. primaryCarePhysician (lookup)
444. status (select: active/inactive) — required
445. referralSource (combobox) — how patient found practice
446. providerSinceDate (date)
447. occupation (text)
448. industry (text)
449. employerName (text)
450. employerPhone (phone)
451. employerAddress (text)
452. driversLicense (text)
453. driversLicenseState (text)
454. medicaidId (text)
455. medicareMBI (text)
456. registrationDate (date)

### Batch Patient Operations
457. Select multiple patients with checkboxes — count shows
458. Bulk status change (Active → Inactive) — all update
459. Bulk delete — confirmation shows count, executes
460. Select All checkbox selects current page
461. Deselect All clears selection
462. Selection persists across pagination — or resets with warning

### Patient List Sorting
463. Click Name column header — sorts A-Z
464. Click Name again — sorts Z-A
465. Click DOB column — sorts newest first
466. Click DOB again — sorts oldest first
467. Click MRN column — sorts ascending
468. Click Status column — groups Active/Inactive
469. Sort indicator arrow shows on active column
470. Sort preserves current search filter

### Patient Quick Actions
471. Quick view patient from list (eye icon) — slide-over opens
472. Quick edit patient from list (pencil icon) — edit form opens
473. Create encounter from patient row — navigates to new encounter
474. View patient appointments from row
475. Print patient summary from row

### Patient Export
476. Export button generates CSV of current filtered list
477. CSV includes all visible columns
478. CSV filename includes date and filter info
479. Export with 0 results shows warning
480. Export with 10000+ patients completes without timeout
481. Print patient list formats for paper

### Patient Import (if available)
482. Import CSV button opens file selector
483. CSV template download link available
484. Valid CSV imports patients successfully
485. Invalid CSV shows row-level errors
486. Duplicate detection on import
487. Import preview shows before commit

### Patient Photos
488. Upload patient photo — file selector opens
489. Accepted formats: JPG, PNG, GIF
490. Photo preview shows before save
491. Saved photo displays on patient card
492. Photo shows on patient detail page
493. Photo shows in appointment calendar tooltip
494. Remove photo option available
495. Large file (>5MB) shows size warning

### Patient Merge (if available)
496. Search for duplicate patients
497. Select two patients to merge
498. Merge preview shows field-by-field comparison
499. Select preferred values for each field
500. Merge combines encounters, appointments, etc.

### Patient Portal Connection
501. Patient has portal access indicator
502. Portal login email matches patient email
503. Portal request approval notification shows
504. Approve portal access — patient gains login
505. Deny portal access — rejection reason sent

### Patient Search Advanced
506. Advanced search toggle opens expanded filters
507. Filter by age range (min-max)
508. Filter by insurance provider
509. Filter by assigned provider
510. Filter by registration date range
511. Filter by last visit date
512. Filter by zip code / city
513. Filter by diagnosis / condition
514. Combine multiple advanced filters
515. Save search as preset / favorite

### Patient Data Validation
516. SSN format: XXX-XX-XXXX — validates pattern
517. Phone format: (XXX) XXX-XXXX — auto-formats
518. Email format: user@domain.com — validates
519. Zip code: 5 digits or ZIP+4 — validates
520. State: 2-letter code or full name — select
521. DOB: cannot be future date
522. DOB: cannot be > 150 years ago
523. MRN: unique per practice
524. Names: allow Unicode (García, O'Brien, 김)
525. Names: strip leading/trailing whitespace

### Patient API Edge Cases
526. Create patient with minimal fields (only required) — works
527. Create patient with all fields populated — works
528. Update single field — only that field changes
529. Rapid successive updates — last write wins
530. Delete then access patient detail — shows appropriate error
531. Patient with 100+ encounters — list paginates correctly
532. Patient with 50+ insurance records — list handles
533. Patient with special chars in all fields — stored correctly
534. Concurrent edit by two users — no data corruption
535. API returns 500 — UI shows user-friendly error

### Patient Chart Tab Navigation
536. Clicking "Encounters" tab loads encounters list
537. Clicking "Problems" tab loads active problems
538. Clicking "Allergies" tab loads allergy list
539. Clicking "Medications" tab loads medication list
540. Clicking "Vitals" tab loads vitals flowsheet
541. Clicking "Labs" tab loads lab orders/results
542. Clicking "Immunizations" tab loads immunization history
543. Clicking "History" tab loads medical/family/social history
544. Clicking "Documents" tab loads document list
545. Clicking "Insurance" tab loads insurance coverage
546. Clicking "Appointments" tab loads patient appointments
547. Clicking "Messaging" tab loads messages
548. Clicking "Relationships" tab loads related persons
549. Clicking "Services" tab loads healthcare services
550. Clicking "Billing" tab loads billing claims
551. Clicking "Transactions" tab loads payment history
552. Clicking "Payment" tab loads payment methods
553. Tab count badge shows number of records
554. Active tab is highlighted
555. Tab content area scrolls independently
556. Switching tabs preserves scroll position of other tabs
557. URL updates with ?tab= parameter
558. Direct URL with ?tab=medications loads correct tab
559. Tabs respect visibility settings from layout-settings
560. Hidden tabs don't appear in navigation

### Patient Form Auto-save
561. Typing in patient edit form triggers auto-save indicator
562. "Saving..." text appears during save
563. "Saved" text appears after successful save
564. "Error saving" appears on failure
565. Auto-save debounces at 2 seconds
566. Navigating away with unsaved changes warns user
567. Auto-save doesn't trigger on form load (only on change)

### Patient Context
568. Patient name persists in header across all chart tabs
569. Patient ID is available in all sub-page API calls
570. Switching between patients clears previous patient data
571. Patient context is lost on browser refresh — reloads from URL
572. Patient breadcrumb: Patients > John Doe > Encounters

### Multi-tenant Patient Isolation
573. Patients from Org A not visible when logged into Org B
574. Switching practice clears patient list
575. Patient search only returns current org's patients
576. Patient detail page rejects cross-org patient ID
577. API calls include X-Org-Alias header
578. Patient count is org-scoped

### Patient Accessibility
579. Patient list navigable via keyboard (Tab, Enter)
580. Screen reader announces patient name and status
581. ARIA labels on action buttons
582. Focus trap in patient create/edit modal
583. Escape key closes modal
584. High contrast mode readable
585. Form fields have associated labels
586. Error messages linked to fields via aria-describedby

### Patient Performance
587. Patient list with 100 patients loads under 2 seconds
588. Patient search returns results under 1 second
589. Patient detail page loads under 2 seconds
590. Patient form submission completes under 3 seconds
591. Pagination transition is instant (under 500ms)
592. No memory leak when navigating between patients
593. Scrolling patient list is smooth (60fps)
594. Filter application is instant
595. Table sorting is instant
596. Patient photo loads without blocking page

### Patient List Empty States
597. New org with 0 patients — shows "No patients yet" + CTA
598. Search with no results — shows "No patients match"
599. Filter with no results — shows "No patients match filters"
600. Error loading patients — shows retry button

---

## Section 4: Appointments & Calendar (601-1000)

### Calendar Page Loading (Positive)
601. Navigate to /appointments — calendar loads
602. Default view is week view
603. Current date is highlighted
604. Calendar header shows month/year
605. Provider filter dropdown populates from API
606. Location filter dropdown populates from API
607. Existing appointments display as colored blocks
608. Appointment blocks show patient name and time
609. Calendar navigation arrows (prev/next week) work
610. Today button jumps to current date

### Calendar Views (Positive)
611. Day view shows hourly time slots
612. Week view shows 7 days with time slots
613. Month view shows day cells with appointment counts
614. Switching views preserves selected date
615. View selection buttons (Day/Week/Month) are visible
616. Day view scrolls to 8am by default
617. Week view shows provider columns (if enabled)
618. Month view click on day navigates to day view
619. Calendar respects business hours setting
620. Weekend days show in calendar (configurable)

### Calendar Views (Negative)
621. Calendar with 0 appointments shows empty slots
622. Calendar with 100+ appointments per day renders without lag
623. Calendar handles timezone correctly
624. Calendar handles DST transition dates
625. Calendar on January 1 shows correct year

### Appointment Creation (Positive — Modal)
626. Click empty time slot — appointment modal opens
627. Date pre-fills from clicked slot
628. Time pre-fills from clicked slot
629. Patient field is a searchable lookup
630. Typing patient name searches and shows dropdown
631. Selecting patient populates patient field
632. Provider dropdown shows all active providers
633. Location dropdown shows all facilities
634. Visit Type dropdown shows configured types (ROUTINE, FOLLOWUP, etc.)
635. Priority dropdown: Routine/Urgent/Callback/Low
636. Status defaults to "booked"
637. Reason textarea accepts free text
638. Room field accepts text input
639. Save creates appointment — appears on calendar
640. Success toast notification shows
641. Calendar refreshes to show new appointment
642. Appointment has correct color based on status

### Appointment Creation (Negative)
643. Save without patient — shows required error
644. Save without provider — shows required error
645. Save without location — shows required error
646. Save without date — shows required error
647. Save without time — shows required error
648. Save with end time before start time — shows error
649. Save with past date — shows warning or error
650. Save double-booking same provider/time — shows conflict warning
651. Save with overlapping appointment — handles or warns
652. Cancel button closes modal without saving
653. Network error during save shows error message
654. Very long reason text (5000+ chars) — handled
655. Special characters in reason — accepted
656. Rapid double-click save — doesn't create duplicate

### Appointment Edit (Positive)
657. Click existing appointment block — modal opens with data
658. All fields show current appointment values
659. Patient name is displayed (may be non-editable)
660. Change provider — saves correctly
661. Change location — saves correctly
662. Change visit type — saves correctly
663. Change date/time — reschedules correctly
664. Change status — updates and re-colors block
665. Change room — updates correctly
666. Change priority — saves correctly
667. Add/edit reason — saves correctly
668. Save shows success notification
669. Calendar updates immediately after save

### Appointment Edit (Negative)
670. Edit cancelled appointment — fields may be readonly
671. Edit completed appointment — may restrict changes
672. Clear required field and save — shows error
673. Edit deleted appointment — shows error

### Appointment Status Workflow (Positive)
674. Status "proposed" (#9ca3af gray) — appointment proposed
675. Status "pending" (#eab308 yellow) — awaiting confirmation
676. Status "booked" (#3b82f6 blue) — confirmed booking
677. Status "arrived" (#22c55e green) — patient arrived, triggers encounter
678. Status "checked-in" (#10b981 teal) — checked in, triggers encounter
679. Status "fulfilled" (#8b5cf6 purple) — completed, terminal
680. Status "cancelled" (#ef4444 red) — cancelled, terminal
681. Status "noshow" (#f97316 orange) — no-show, terminal
682. Changing to "arrived" auto-creates encounter
683. Changing to "checked-in" auto-creates encounter
684. Changing to "noshow" auto-creates encounter with note
685. Terminal statuses don't allow further changes
686. nextStatus hint: booked → arrived → checked-in → fulfilled
687. Status color matches calendar block color
688. Status badge text matches selection

### Appointment Status (Negative)
689. Cannot change from "fulfilled" to "booked" (terminal)
690. Cannot change from "cancelled" to "booked" (terminal)
691. Cannot change to invalid status
692. Status change API failure rolls back UI
693. Rapid status changes don't corrupt state

### Appointment Delete (Positive)
694. Delete button on appointment modal — confirmation dialog
695. Confirm delete — appointment removed from calendar
696. Success notification shows
697. Deleted appointment no longer in list

### Appointment Delete (Negative)
698. Cancel delete — appointment remains
699. Delete appointment with linked encounter — warns or handles
700. Delete API failure shows error

### Appointment ↔ Encounter Link
701. GET /api/appointments/{id}/encounter — returns linked encounter
702. Appointment with encounter shows "View Encounter" link
703. Clicking "View Encounter" navigates to encounter page
704. Creating encounter from appointment links them
705. Appointment without encounter shows "Create Encounter" button
706. Status change creating encounter sets link automatically
707. Encounter link persists after appointment edit

### Appointment Filters (Positive)
708. Provider multi-select filter — shows checkboxes
709. Selecting single provider filters calendar
710. Selecting multiple providers shows all selected
711. Location filter works same as provider
712. Status filter shows all status options
713. Combining provider + location + status filters
714. Clear all filters resets to default view
715. Filter badge shows count of active filters

### Appointment Filters (Negative)
716. Filters with no matching appointments show empty calendar
717. Rapidly toggling filters doesn't cause flicker
718. Filter dropdown with 50+ providers scrolls properly

### Calendar Color Coding
719. Appointments colored by status (from config)
720. Booked = blue block
721. Arrived = green block
722. Checked-in = teal block
723. Fulfilled = purple block
724. Cancelled = red block
725. No-show = orange block
726. Colors match /settings/calendar-colors configuration
727. Color legend shown somewhere on calendar
728. Custom colors from ui_color_config applied

### Appointment Details Slide-over
729. Click appointment — slide-over panel opens
730. Panel shows patient name, DOB, age
731. Panel shows appointment date/time
732. Panel shows provider name
733. Panel shows location
734. Panel shows visit type
735. Panel shows status with badge
736. Panel shows reason/notes
737. Panel has "View Patient Chart" button
738. PatientChartPanel shows allergies, problems summary
739. Panel has quick status change buttons
740. Panel has "Start Telehealth" button (if telehealth type)
741. Close button dismisses slide-over
742. Clicking outside slide-over closes it (or not)

### TV Display Mode
743. Navigate to /appointments/tv — TV mode loads
744. Shows today's appointments in large format
745. Patient names display clearly (large font)
746. Time slots show prominently
747. Status indicators visible from distance
748. Auto-refreshes every 30-60 seconds
749. Location-based filtering (shows one location)
750. Practice name derived from first location name
751. No sidebar or header in TV mode
752. Fullscreen mode available
753. Dark theme for TV display
754. Current time indicator shows

### TV Display (Negative)
755. No appointments today — shows "No appointments scheduled"
756. Network disconnect — shows last known data
757. Practice with no locations — handles gracefully

### Telehealth Integration
758. Telehealth appointment type shows video icon
759. "Start Telehealth" button visible for telehealth appointments
760. Clicking Start — opens Jitsi video modal
761. Video stream initializes
762. Audio controls (mute/unmute) work
763. Camera controls (on/off) work
764. Fullscreen button works
765. End Call button terminates session
766. After call, status can be changed to fulfilled
767. Patient join link is generated
768. Multiple participants supported

### Telehealth (Negative)
769. No camera permission — shows error
770. No microphone permission — shows error
771. Network disconnect during call — reconnects or shows error
772. Start telehealth for non-telehealth type — button hidden

### Appointment Visit Types
773. ROUTINE visit type selectable
774. FOLLOWUP visit type selectable
775. WALKIN visit type selectable
776. CHECKUP visit type selectable
777. EMERGENCY visit type selectable
778. NEW_PATIENT visit type selectable
779. TELEHEALTH visit type selectable
780. CONSULTATION visit type selectable
781. PROCEDURE visit type selectable
782. LAB_WORK visit type selectable
783. IMAGING visit type selectable
784. VACCINATION visit type selectable
785. ANNUAL_PHYSICAL visit type selectable
786. SICK_VISIT visit type selectable
787. WELLNESS visit type selectable
788. PRE_OP visit type selectable
789. POST_OP visit type selectable
790. Visit types loaded from tab_field_config (not hardcoded)
791. Custom visit type via combobox free text

### Appointment Room Assignment
792. Room field accepts free text
793. PUT /api/appointments/{id}/room updates room
794. Room options loaded from API
795. Room shows in appointment details
796. Room shows in TV display mode
797. Room cleared when appointment cancelled

### Appointment Reports
798. Date range picker works
799. Export appointments to CSV
800. Print appointment schedule
801. Appointment report matches calendar data
802. Report filters mirror calendar filters

### Appointment Recurrence (if available)
803. Create recurring appointment (weekly/monthly)
804. Recurring series shows linked
805. Edit single occurrence vs all in series
806. Delete single occurrence vs all in series
807. Recurrence end date or count

### Calendar Performance
808. Calendar with 200+ appointments per week renders under 2s
809. Switching weeks is under 500ms
810. Scrolling day view is smooth
811. Appointment drag-and-drop reschedule (if supported)
812. Calendar handles year boundary (Dec → Jan)
813. Calendar handles month boundary correctly
814. Calendar on Feb 29 (leap year) works

### Calendar Keyboard Navigation
815. Arrow keys navigate between days
816. Enter opens selected time slot modal
817. Escape closes appointment modal
818. Tab navigates between calendar elements
819. Shift+Tab reverse navigation

### Appointment Priority
820. Routine (5) — default priority
821. Urgent (1) — highlighted differently
822. Callback (2) — flagged for callback
823. Low (9) — deprioritized
824. Priority shows in appointment details
825. Priority filter available

### Appointment Auto-encounter Creation
826. Status → arrived creates encounter automatically
827. Created encounter links to appointment
828. Encounter has correct patient ID
829. Encounter has correct provider
830. Encounter has appointment reference
831. Status → noshow creates encounter with "No-show" note
832. Status → checked-in creates encounter if not exists
833. If encounter already exists, doesn't create duplicate
834. Encounter creation failure doesn't prevent status change

### Appointment Status Options API
835. GET /api/appointments/status-options returns all statuses
836. Each status has: value, label, color, triggersEncounter, terminal, order
837. Status order determines workflow sequence
838. Status metadata drives UI behavior
839. Status options loaded from config (not hardcoded)

### Appointment Count
840. GET /api/appointments/count returns total count
841. Count is org-scoped
842. Count matches list total
843. Dashboard uses this count

### Patient Appointments Tab
844. /patients/{id} Appointments tab shows patient's appointments
845. List shows date, time, provider, type, status
846. Sorted by most recent first
847. Create appointment from patient context
848. Patient pre-filled in new appointment form
849. Limited to 5-20 recent appointments
850. "View All" link navigates to full calendar filtered

### Appointment Form — Date/Time Fields
851. Date picker opens on click
852. Date picker shows month calendar
853. Navigate months in date picker
854. Select date from picker — field updates
855. Start time dropdown or input
856. End time dropdown or input
857. End time auto-calculates from duration
858. minutesDuration field — number input
859. Duration calculation: end - start
860. 15-minute increments in time picker

### Appointment Edge Cases
861. Create appointment at midnight (00:00) — works
862. Create appointment spanning midnight — handles
863. Create all-day appointment — if supported
864. Appointment with very long reason (textarea)
865. Appointment with unicode characters in notes
866. 100+ appointments on same day — calendar renders
867. Appointment for inactive patient — warning
868. Appointment for archived provider — warning
869. Past appointment creation — warning or block
870. Appointment on holiday — no restriction

### Calendar Drag-and-Drop (if supported)
871. Drag appointment to new time — reschedules
872. Drag to new day — reschedules
873. Drag to new provider column — reassigns
874. Drop on occupied slot — conflict warning
875. Drag cancelled — reverts position

### Calendar Accessibility
876. Calendar navigable via keyboard
877. Screen reader announces appointment details
878. ARIA roles on calendar grid
879. Focus management in appointment modal
880. Color blind friendly status indicators

### Calendar Integration
881. Calendar syncs with provider schedule/availability
882. Provider unavailable times shown as gray/blocked
883. Double-booking detection based on schedule
884. Lunch breaks shown as blocked time
885. Provider vacation days shown as unavailable

### Appointment Notification
886. New appointment creation sends notification (if configured)
887. Appointment reminder notification
888. Cancellation notification
889. Reschedule notification
890. Status change notification

### Calendar Multi-provider View
891. View multiple providers side by side (day view columns)
892. Each column labeled with provider name
893. Appointments appear in correct provider column
894. Switching to single provider removes columns
895. Provider color coding consistent across views

### Calendar Search
896. Search appointments by patient name
897. Search by appointment type
898. Search by status
899. Search results highlighted on calendar
900. Clear search returns to normal view

### Appointment Comments/Instructions
901. patientInstruction field — visible to patient
902. comment field — internal note
903. cancelationReason field — required on cancel
904. description field — additional details
905. All text fields accept rich text / special chars

### Appointment Bulk Operations
906. Select multiple appointments for bulk status change
907. Bulk cancel appointments
908. Bulk reschedule (move all by X days)
909. Bulk export selected appointments
910. Confirmation before bulk operations

### Calendar Timezone Handling
911. Appointments display in practice timezone
912. Created appointment stores UTC
913. Display converts UTC to local
914. Timezone shown somewhere on calendar
915. Multi-timezone practices handled

### Calendar Weeks
916. Week starts on Sunday (US default) or Monday (configurable)
917. Week number displayed (optional)
918. Click week number to select entire week
919. Navigate to specific date (date input)
920. Go to date dialog/picker

### Appointment Participant Details
921. Patient reference resolves to name
922. Provider reference resolves to name
923. Location reference resolves to name
924. Additional participants (if supported)
925. Participant availability check

### Appointment Cancellation Flow
926. Cancel button on appointment modal
927. Cancellation reason required
928. Cancellation updates status to "cancelled"
929. Calendar block turns red
930. Cancelled appointment still visible (togglable)
931. Cancelled appointments excluded from reports by default

### Appointment Waitlist (if available)
932. Add patient to waitlist
933. Waitlist shows available slots
934. Auto-notify when slot opens
935. Move from waitlist to confirmed
936. Remove from waitlist

### Calendar Print
937. Print current day view
938. Print current week view
939. Print current month view
940. Print includes all visible appointments
941. Print format optimized for paper
942. Print header shows practice name and date

### Appointment Form Validation Summary
943. Required: patient, provider, location, start, end, status
944. Optional: visitType, reason, priority, room, description
945. Date/time must be valid
946. End after start
947. Patient must exist in system
948. Provider must be active
949. Location must be active

### Calendar Data Loading
950. Initial load fetches current view's date range
951. Navigating to new week fetches that week's data
952. Data cached for previously viewed weeks
953. Loading indicator during data fetch
954. Concurrent fetches handled (race condition prevention)
955. Calendar refresh button reloads current view

### Appointment DTO Transformation
956. Frontend DTO → FHIR format on save
957. FHIR format → Frontend DTO on load
958. start/end dates converted to ISO format
959. Patient reference built as "Patient/{id}"
960. Provider reference built as "Practitioner/{id}"
961. Location reference built as "Location/{id}"
962. Status mapped correctly both ways
963. Visit type mapped to appointmentType
964. Priority value mapped (5=routine, 1=urgent)

### Calendar Month View
965. Month view shows day grid
966. Each day cell shows appointment count
967. Days with appointments have indicator dots
968. Click day navigates to day view
969. Today highlighted in month view
970. Weekends styled differently
971. Month navigation arrows work
972. Current month/year shown in header

### Calendar Week View
973. Week view shows 7 columns × time rows
974. Time rows 15 or 30 minute increments
975. Business hours highlighted (8am-5pm default)
976. After-hours time slots accessible
977. Compact mode fits more appointments
978. Expanded mode shows full details
979. Scrollbar for long days
980. Current time line indicator

### Appointment From Patient Context
981. Create appointment from patient detail page
982. Patient auto-populated in form
983. Provider defaults to assigned provider
984. Location defaults to patient's usual location
985. Return to patient page after save
986. Appointment appears in patient's appointment tab

### Calendar Quick Actions
987. Right-click appointment for context menu
988. Quick status change from context menu
989. Quick view patient from context menu
990. Quick create encounter from context menu
991. Quick cancel appointment from context menu

### Calendar Empty States
992. New practice — no appointments — shows guide
993. No appointments for selected filters — shows message
994. No appointments for selected date range — shows message
995. Provider with no appointments — column empty

### Calendar Loading States
996. Skeleton loader for calendar grid
997. Appointment blocks animate in
998. Loading spinner during fetch
999. Optimistic UI update on create (show immediately)
1000. Error state with retry button

---

## Section 5: Encounters (1001-1500)

### All Encounters List (Positive)
1001. Navigate to /all-encounters — encounters list loads
1002. Table shows: Date, Patient, Provider, Location, Status, Visit Type
1003. Default sort by date (newest first)
1004. Pagination works (20 per page)
1005. Total count shown
1006. Each row clickable — navigates to encounter
1007. Status badges with colors (UNSIGNED, SIGNED, INCOMPLETE)
1008. Search by patient name works
1009. Filter by status works
1010. Filter by provider works

### All Encounters (Negative)
1011. Empty encounters list shows "No encounters found"
1012. Search with no results shows empty state
1013. Invalid filter combination shows empty state
1014. API error shows error message with retry

### Encounter List Filters
1015. Date range filter (from/to)
1016. Patient name search
1017. Provider dropdown filter
1018. Location dropdown filter
1019. Status filter (In Progress, Finished, Triaged)
1020. Visit type filter
1021. Clear all filters button
1022. Filters persist during pagination
1023. Filter count badge on filter bar
1024. Recent-only toggle (show last 10/20/50)

### Create Encounter (Positive)
1025. Navigate to /patients/{id}/encounters/new — form loads
1026. Patient name shown in header
1027. Encounter type defaults to "AMB" (ambulatory)
1028. Start date defaults to now
1029. Provider dropdown populated
1030. Status defaults to "in-progress"
1031. Save creates encounter — redirects to encounter form
1032. Success notification shows
1033. New encounter appears in encounters tab
1034. Encounter ID generated

### Create Encounter (Negative)
1035. Create without provider — shows error
1036. Create without type — shows error
1037. Create for inactive patient — warns or blocks
1038. API error during create — shows error message
1039. Duplicate encounter prevention

### Create Encounter from Appointment
1040. Appointment status → "arrived" auto-creates encounter
1041. POST /api/appointments/{id}/encounter — creates linked encounter
1042. Encounter has appointment reference
1043. Encounter has correct patient ID
1044. Encounter has correct provider from appointment
1045. If encounter already exists, returns existing one
1046. Encounter appears in patient's encounters tab

### Encounter Detail Page (Positive)
1047. Navigate to /patients/{id}/encounters/{encounterId} — loads
1048. Encounter header shows date, provider, status
1049. Dynamic form sections render based on config
1050. Chief Complaint section visible
1051. HPI section visible
1052. ROS section visible
1053. Vitals section visible
1054. Physical Exam section visible
1055. Assessment section visible
1056. Plan section visible
1057. Procedures section visible
1058. Provider Notes section visible
1059. Each section is collapsible (expand/collapse)
1060. Auto-save indicator visible

### Encounter Form — Chief Complaint
1061. cc_text textarea accepts input
1062. Text persists after auto-save
1063. Character count shown (if configured)
1064. Rich text formatting (bold/italic) if supported
1065. Copy-paste works in textarea
1066. Undo/Redo works (Ctrl+Z/Y)

### Encounter Form — HPI (History of Present Illness)
1067. hpi_onset field — when symptoms started
1068. hpi_location field — body part/area
1069. hpi_duration field — how long
1070. hpi_character field — description of symptom
1071. hpi_severity field — scale or text
1072. hpi_timing field — constant/intermittent
1073. hpi_context field — what triggers
1074. hpi_modifying field — what helps/worsens
1075. hpi_associated field — associated symptoms
1076. hpi_narrative field — free text summary
1077. All HPI fields auto-save
1078. HPI data preserved on page reload

### Encounter Form — Review of Systems (ROS Grid)
1079. ROS grid renders 14 systems
1080. Constitutional system checkboxes (fever, chills, etc.)
1081. Eyes system checkboxes
1082. ENT system checkboxes
1083. Cardiovascular system checkboxes
1084. Respiratory system checkboxes
1085. Gastrointestinal system checkboxes
1086. Genitourinary system checkboxes
1087. Musculoskeletal system checkboxes
1088. Integumentary (Skin) system checkboxes
1089. Neurological system checkboxes
1090. Psychiatric system checkboxes
1091. Endocrine system checkboxes
1092. Hematologic system checkboxes
1093. Allergic/Immunologic system checkboxes
1094. Each system has "Normal" default
1095. Checking a finding marks system as reviewed
1096. "All Normal" button marks all systems normal
1097. Individual findings checkable/uncheckable
1098. ROS data auto-saves
1099. ROS data loads on page reload
1100. ROS config from tab_field_config rosConfig

### Encounter Form — Vitals
1101. BP Systolic number input — LOINC 8480-6
1102. BP Diastolic number input — LOINC 8462-4
1103. Heart Rate number input — LOINC 8867-4
1104. Temperature number input — LOINC 8310-5
1105. O2 Saturation number input — LOINC 2708-6
1106. Respiratory Rate number input — LOINC 9279-1
1107. Weight number input — LOINC 29463-7
1108. Height number input — LOINC 8302-2
1109. BMI computed automatically from weight/height
1110. Notes textarea for vitals
1111. Recorded time defaults to now
1112. Vitals auto-save on change
1113. Previous vitals shown for comparison
1114. Abnormal values highlighted (red)
1115. Units displayed (mmHg, bpm, °F, %, lbs, in)

### Encounter Form — Vitals (Negative)
1116. BP Systolic > 300 — shows warning
1117. BP Systolic < 50 — shows warning
1118. Heart Rate > 250 — shows warning
1119. Heart Rate < 20 — shows warning
1120. Temperature > 110°F — shows warning
1121. Temperature < 85°F — shows warning
1122. O2 Sat > 100 — shows error
1123. O2 Sat < 0 — shows error
1124. Weight negative — shows error
1125. Height negative — shows error
1126. Non-numeric input rejected
1127. BMI handles zero height (no divide by zero)
1128. BMI handles missing weight or height

### Encounter Form — Physical Exam (Exam Grid)
1129. Exam grid renders 10+ systems
1130. General system exam (default: Normal)
1131. HEENT exam
1132. Neck exam
1133. Lungs exam
1134. Cardiovascular exam
1135. Abdomen exam
1136. Extremities exam
1137. Neurological exam
1138. Skin exam
1139. Psychiatric exam
1140. Each system defaults to "Normal"
1141. Clicking system allows custom findings text
1142. "All Normal" button sets all to Normal
1143. Custom findings override Normal
1144. Exam data auto-saves
1145. Exam config from tab_field_config examConfig

### Encounter Form — Assessment & Diagnosis
1146. Diagnosis list field renders
1147. Search for ICD-10 code — autocomplete works
1148. Type diagnosis name — shows matching codes
1149. Select code — adds to diagnosis list
1150. Multiple diagnoses can be added
1151. Remove diagnosis with X button
1152. Primary diagnosis marked/reorderable
1153. Assessment notes textarea
1154. ICD-10 code displayed next to description
1155. Code search calls /api/global_codes?codeType=ICD10
1156. Search is debounced for performance
1157. Diagnosis list auto-saves

### Encounter Form — Assessment (Negative)
1158. Empty diagnosis search returns nothing
1159. Invalid ICD code — not selectable
1160. Duplicate diagnosis — warns or prevents
1161. 20+ diagnoses — list scrolls properly
1162. Removing all diagnoses — allowed
1163. Special characters in search — safe

### Encounter Form — Plan
1164. Plan items section renders
1165. Add plan item for each diagnosis
1166. Plan item links to diagnosis
1167. Follow-up scheduling from plan
1168. Plan notes textarea
1169. Plan auto-saves
1170. Plan data preserved on reload

### Encounter Form — Procedures
1171. Add Procedure button opens procedure form
1172. CPT code lookup — searches CPT codes
1173. Type procedure name — autocomplete shows codes
1174. Select CPT code — populates description and rate
1175. Units field (number, default 1)
1176. Rate field (currency)
1177. Modifier1 field (text)
1178. Related ICD codes multiselect
1179. Hospital billing start/end dates (if applicable)
1180. Provider name select (defaults to encounter provider)
1181. Save procedure — adds to procedure list
1182. Multiple procedures addable
1183. Edit existing procedure — opens with data
1184. Delete procedure — confirmation then remove
1185. Procedure total calculated (units × rate)
1186. Procedure list shows in encounter summary
1187. Code search calls /api/global_codes?codeType=CPT4

### Encounter Form — Procedures (Negative)
1188. Add procedure without CPT code — shows error
1189. Units = 0 — shows error
1190. Negative rate — shows error
1191. Duplicate CPT code — warns
1192. Very long description — truncates in list

### Encounter Form — Provider Notes
1193. Provider notes section renders
1194. Add note button opens form
1195. Note textarea accepts text
1196. Note type select: Assessment, Addendum, Correction
1197. Save note — appears in notes list
1198. Edit existing note — opens with text
1199. Delete note — confirmation then remove
1200. Notes auto-save
1201. Notes show author and timestamp
1202. Multiple notes supported

### Encounter Form — Past Medical/Surgical History
1203. PMH conditions textarea — pre-existing conditions
1204. PMH surgeries textarea — surgical history
1205. Data loads from previous encounters or QuestionnaireResponse
1206. Editable and auto-saves

### Encounter Form — Family History
1207. Father history text field
1208. Mother history text field
1209. Siblings history text field
1210. Additional notes field
1211. Family history auto-saves
1212. Data loads from patient's history tab

### Encounter Form — Social History
1213. Smoking status select (current/former/never)
1214. Alcohol use select (none/social/moderate/heavy)
1215. Exercise frequency select (none/occasional/regular/daily)
1216. Occupation text field
1217. Drug use field
1218. Additional notes
1219. Social history auto-saves

### Encounter Auto-save
1220. Typing triggers auto-save after 2 second debounce
1221. Save indicator shows "Saving..."
1222. Save indicator shows "Saved" with timestamp
1223. Failed save shows "Error saving" with retry
1224. Auto-save preserves cursor position
1225. Auto-save doesn't interrupt user typing
1226. Navigating away with unsaved changes — warns
1227. Auto-save creates FHIR Composition resource
1228. Auto-save stores form data in extension
1229. Reload page — all data restored from server

### Encounter Sign/Lock
1230. Sign button (e-sign) visible on encounter form
1231. Click Sign — status changes to FINISHED (signed)
1232. Signed encounter becomes read-only
1233. Edit fields disabled after signing
1234. Unsign button available (if permitted)
1235. Click Unsign — status reverts to INPROGRESS
1236. Form becomes editable again after unsign
1237. Signed encounter shows "Signed by Dr. X at timestamp"
1238. PUT /api/{patientId}/encounters/{id}/sign — status update
1239. PUT /api/{patientId}/encounters/{id}/unsign — status revert
1240. PUT on signed encounter returns 423 Locked

### Encounter Sign (Negative)
1241. Sign without required fields — warns
1242. Sign with incomplete sections — warns
1243. Modifying signed encounter — blocked (423 error)
1244. Deleting signed encounter — blocked (423 error)
1245. Unsign by non-signing provider — permission check

### Encounter Clone
1246. Clone button opens CloneEncounterModal
1247. Select target date for clone
1248. Select provider for clone
1249. Clone copies all sections from original
1250. Clone creates new encounter (new ID)
1251. Clone preserves original encounter
1252. Cloned encounter is UNSIGNED (editable)
1253. Clone from signed encounter — works
1254. Clone to different patient — if supported

### Encounter Print/Summary
1255. Print button generates printable view
1256. Print includes all encounter sections
1257. Print format appropriate for paper
1258. Encounter summary shows all data in read-only format
1259. Summary includes vitals, diagnoses, plan
1260. Summary accessible from appointment slide-over
1261. PDF generation available
1262. Summary header shows practice info

### Encounter Status Management
1263. Status: planned — new encounter
1264. Status: arrived — patient arrived
1265. Status: in-progress — actively being documented
1266. Status: finished — signed/completed
1267. Status: cancelled — encounter cancelled
1268. Status badge color matches config
1269. Status change updates encounter list
1270. Incomplete button sets status to TRIAGED

### Encounter Navigation
1271. Encounter section menu on side (scroll-to navigation)
1272. Click section name — scrolls to section
1273. Active section highlighted in menu
1274. Scroll position tracked in section menu
1275. Back button returns to patient encounters list
1276. Breadcrumb: Patients > John > Encounters > #123

### Encounter List in Patient Chart
1277. Encounters tab shows patient's encounters
1278. Table: Date, Provider, Type, Status, Actions
1279. Click row navigates to encounter form
1280. rowLink template: /patients/{patientId}/encounters/{id}
1281. Create New Encounter button
1282. Sort by date (newest first)
1283. Status badges with correct colors
1284. Encounter count shown

### Encounter Type
1285. AMB — Ambulatory (default)
1286. EMER — Emergency
1287. IMP — Inpatient
1288. OBSENC — Observation
1289. HH — Home Health
1290. VR — Virtual
1291. Type displayed in encounter header
1292. Type filterable in encounters list

### Encounter Report Endpoint
1293. GET /api/encounters/report/encounterAll — returns all
1294. Data matches all-encounters page
1295. Used for report generation
1296. Returns up to 1000 encounters

### Encounter Edge Cases
1297. Encounter with all sections empty — saveable
1298. Encounter with all sections filled — saves correctly
1299. Very long text in all textareas — handles
1300. Encounter spanning multiple days — if supported
1301. Encounter for deceased patient — allowed with warning
1302. Concurrent editing same encounter — last save wins or conflict
1303. Encounter auto-save during network outage — queues and retries
1304. Refresh during auto-save — no data loss
1305. Back button during auto-save — save completes first

### Encounter Form Section Visibility
1306. Sections configurable via /settings/encounter-settings
1307. Hidden sections don't render in form
1308. Section order matches configuration
1309. Adding section to config makes it appear
1310. Removing section from config hides it
1311. Section config loaded from tab_field_config (encounter-form)

### Encounter Data Integrity
1312. Saved encounter data matches what was entered
1313. Reload encounter — all fields populated correctly
1314. Switch tabs and return — data preserved
1315. Close browser and reopen encounter — data from server
1316. Diagnosis codes stored as ICD-10 with code and description
1317. CPT codes stored with code and description
1318. Reference fields resolve to display names
1319. Dates stored in ISO format
1320. All text properly encoded (UTF-8)

### Vitals Flowsheet (Patient Chart)
1321. Vitals tab shows flowsheet matrix view
1322. Rows = vital types (BP, HR, Temp, etc.)
1323. Columns = encounter dates (most recent first)
1324. Each cell shows value for that vital on that date
1325. Color coding for abnormal values
1326. Click cell navigates to encounter vitals
1327. Add Vitals button opens vitals form
1328. Flowsheet scrolls horizontally for many encounters
1329. Print flowsheet formatted for paper
1330. Most recent column highlighted

### Vitals Flowsheet (Negative)
1331. No vitals recorded — shows "No vitals recorded"
1332. Missing values show as dash (-)
1333. Vitals from different sources handled
1334. Very old vitals (years ago) still display
1335. Flowsheet with 100+ encounter columns — handles scroll

### Encounter Form — Medications Section
1336. Add Medication button opens form
1337. Drug lookup — searches drug database / NDC
1338. Dosage text field (e.g., "500mg")
1339. Frequency select (QID, TID, BID, Daily, etc.)
1340. Route select (PO, IV, IM, SubQ, etc.)
1341. Duration number field (days)
1342. Quantity number field
1343. Refills number field
1344. Indication textarea
1345. Save medication — adds to list
1346. Edit existing medication
1347. Delete medication — confirmation
1348. Medication status (active/on-hold/completed/stopped)

### Encounter Performance
1349. Encounter form loads under 3 seconds
1350. Auto-save completes under 1 second
1351. Section expand/collapse is instant
1352. Code search results appear under 500ms
1353. Large encounter (all sections filled) saves under 2s
1354. Scrolling form is smooth
1355. No memory leaks during extended editing session

### Encounter Accessibility
1356. All form fields have labels
1357. Tab order follows visual order
1358. Screen reader announces section names
1359. ARIA roles on expandable sections
1360. Keyboard can expand/collapse sections
1361. Focus management after auto-save
1362. Error messages announced to screen reader

### Encounter Multi-resource Support
1363. Encounter creates FHIR Encounter resource
1364. Encounter form creates FHIR Composition resource
1365. Vitals create FHIR Observation resources
1366. Procedures create FHIR Procedure resources
1367. Diagnoses stored in Composition
1368. Medications create MedicationRequest resources
1369. All resources linked via encounter reference

### Encounter Workflow
1370. Create appointment → Check in → Encounter created
1371. Open encounter form → Document visit
1372. Enter Chief Complaint → HPI → ROS
1373. Record Vitals → Physical Exam
1374. Assessment with ICD-10 codes
1375. Plan with follow-up
1376. Add Procedures with CPT codes
1377. Provider Notes
1378. Sign encounter → Locked
1379. Encounter shows in all-encounters list
1380. Encounter data feeds into billing/claims

### Encounter from All-encounters List
1381. Click encounter row — navigates to encounter form
1382. Encounter loads with patient context
1383. Patient header shows correct patient
1384. Back button returns to all-encounters list
1385. URL: /patients/{patientId}/encounters/{encounterId}

### Encounter Deletion
1386. Delete button on unsigned encounter
1387. Confirmation dialog shows encounter info
1388. Confirm — encounter deleted
1389. Encounter removed from list
1390. Cannot delete signed encounter (423)

### Encounter Form Dynamic Fields
1391. Fields loaded from tab_field_config encounter-form
1392. Universal form (practice_type_code: *) has 11+ sections
1393. Field types match configuration
1394. Field order matches configuration
1395. Required fields marked with asterisk
1396. Optional fields editable without error
1397. Custom sections from specialty configs load
1398. Field config changes reflect in form (after refresh)

### Encounter Summary Service
1399. EncounterSummaryService uses GenericFhirResourceService
1400. Summary includes all encounter components
1401. Summary used in appointment slide-over
1402. Summary used in encounter print
1403. Summary aggregates cross-resource data

### Encounter Error Handling
1404. Auto-save failure — shows error, queues retry
1405. Network disconnect during form edit — offline indicator
1406. API 500 error — user-friendly message
1407. API 404 (encounter deleted elsewhere) — redirect to list
1408. API 423 (signed encounter) — disable editing
1409. Form validation error — highlight fields
1410. Concurrent save conflict — last write wins or merge

### Encounter Data Export
1411. Export encounter as PDF
1412. Export encounter as CDA/C-CDA document
1413. Export encounter data as FHIR JSON (if supported)
1414. Export includes all sections
1415. Export formatted for print

### Encounter Batch Operations
1416. Bulk sign multiple encounters
1417. Bulk export encounters
1418. Select all encounters in list
1419. Bulk status change

### Encounter Search (All-encounters)
1420. Search by patient name
1421. Search by provider name
1422. Search by encounter ID
1423. Search by diagnosis code
1424. Search debounced

### Encounter Date Range Filter
1425. Filter by date range (from/to)
1426. Quick presets: Today, This Week, This Month, Last 30 Days
1427. Custom date range
1428. Date range persists during pagination
1429. Clear date filter shows all encounters

### Encounter Recent-only Mode
1430. recentOnly=true parameter
1431. recentCount limits results (default 10)
1432. Most recent encounters shown
1433. "View All" link removes limit

### Encounter Status Filters
1434. Filter by In Progress (INPROGRESS)
1435. Filter by Signed (FINISHED)
1436. Filter by Incomplete (TRIAGED)
1437. Filter by Planned (PLANNED)
1438. Filter by Cancelled (CANCELLED)
1439. Multiple statuses selectable

### Encounter Sort
1440. Sort by date (default: newest first)
1441. Sort by patient name
1442. Sort by provider name
1443. Sort by status
1444. Sort indicator on column header
1445. Reverse sort on second click

### Encounter Pagination
1446. Default 20 per page
1447. Page size selector (10, 20, 50, 100)
1448. Next/Previous page buttons
1449. Jump to specific page
1450. Total count shown
1451. Pagination preserves filters and sort

### Encounter Loading States
1452. Skeleton loader during form load
1453. Section loading indicators
1454. Code search loading spinner
1455. Save/Sign loading spinner
1456. Full page loading on initial navigate

### Encounter Form Auto-populate
1457. Previous encounter data can be imported
1458. Patient allergies shown as reference
1459. Patient medications shown as reference
1460. Patient problems auto-populate assessment
1461. Provider defaults to logged-in provider

### Encounter Specialty Forms
1462. Cardiology form has cardiac-specific sections
1463. Psychiatry form has mental health sections
1464. Dermatology form has skin-specific sections
1465. Specialty form determined by practice_type_code
1466. Universal form used when no specialty match
1467. Specialty sections in addition to base sections

### Encounter Quality Checks
1468. Incomplete encounter warnings
1469. Missing required sections highlighted
1470. Quality score/completeness indicator (if available)
1471. Required sections for signing
1472. Warning before signing incomplete encounter

### Encounter Audit Trail
1473. Created timestamp shown
1474. Last modified timestamp shown
1475. Created by user shown
1476. Modified by user shown
1477. Sign timestamp and signer shown
1478. Version history (if supported)

### Encounter Cross-references
1479. Encounter linked to appointment
1480. Encounter linked to patient
1481. Encounter procedures feed billing
1482. Encounter diagnoses feed claims
1483. Encounter medications feed prescription
1484. Encounter vitals feed vitals flowsheet
1485. Encounter labs feed lab results

### Encounter Template (if available)
1486. Save encounter as template
1487. Load encounter from template
1488. Template includes section defaults
1489. Template selectable on new encounter

### Encounter Keyboard Shortcuts
1490. Ctrl+S — force save
1491. Tab — move between fields
1492. Enter — submit within field
1493. Escape — close modal/dropdown
1494. Ctrl+Z — undo last change

### Encounter Mobile
1495. Encounter form renders on mobile
1496. Sections stack vertically
1497. Touch-friendly checkboxes (ROS, Exam)
1498. Form scrollable on mobile
1499. Save button accessible on mobile
1500. Keyboard doesn't obscure fields

---

## Section 6: Patient Chart Tabs — FHIR Resources (1501-2200)

### Allergies Tab (tab: allergies)
1501. Allergies tab loads allergy list for patient
1502. Table columns: Allergy Name, Status, Severity, Reaction
1503. Add Allergy button opens form
1504. allergyName (text, required) — accepts input
1505. status select (active/inactive/resolved) — required
1506. severity select (mild/moderate/severe) — optional
1507. reaction text field
1508. startDate date picker
1509. endDate date picker
1510. comments textarea
1511. Save allergy — appears in list
1512. Edit allergy — form pre-populated
1513. Delete allergy — confirmation then remove
1514. Allergy appears in clinical sidebar
1515. Severity badge color (mild=yellow, moderate=orange, severe=red)
1516. Status badge color
1517. FHIR resource: AllergyIntolerance
1518. GET /api/allergy-intolerances/{patientId} returns list
1519. Empty allergy list shows "No Known Allergies"
1520. Save without allergyName — required error (negative)
1521. Save without status — required error (negative)
1522. Special chars in allergy name — accepted
1523. Very long allergy name — handled

### Problems Tab (tab: medicalproblems)
1524. Problems tab loads conditions list
1525. Table columns: Condition, ICD Code, Status, Severity, Onset
1526. Add Problem button opens form
1527. conditionName (text, required)
1528. icdCode (coded) — ICD-10-CM code search
1529. clinicalStatus select (active/recurrence/relapse/inactive/remission/resolved) — required
1530. severity select (mild/moderate/severe)
1531. onsetDate date picker
1532. abatementDate date picker
1533. notes textarea
1534. Save problem — appears in list
1535. Edit problem — form pre-populated
1536. Delete problem — confirmation
1537. Problem appears in clinical sidebar
1538. ICD code search returns matching codes
1539. Code + description displayed together
1540. FHIR resource: Condition
1541. GET /api/medical-problems/{patientId} returns list
1542. Empty problems shows "No Active Problems"
1543. Save without conditionName — error (negative)
1544. Save without clinicalStatus — error (negative)

### Medications Tab (tab: medications)
1545. Medications tab loads medication list
1546. Table: Medication Name, Status, Dosage, Prescriber, Date
1547. Add Medication button
1548. medicationName (text, required)
1549. status select (active/on-hold/cancelled/completed/stopped/draft) — required
1550. dosage text
1551. instructions textarea
1552. prescribingDoctor lookup (provider search)
1553. dateIssued date
1554. Save medication — appears in list
1555. Edit medication
1556. Delete medication
1557. FHIR resource: MedicationRequest
1558. Active medications highlighted
1559. Stopped medications grayed out
1560. Medication count shown
1561. Save without medicationName — error (negative)
1562. Save without status — error (negative)

### Insurance Tab (tab: insurance / insurance-coverage)
1563. Insurance tab loads coverage records
1564. Table: Type, Payer, Plan, Policy#, Group#, Status
1565. Add Insurance button
1566. insuranceType select (primary/secondary/tertiary) — required
1567. payerName (text or lookup, required)
1568. planName text
1569. policyNumber (text, required)
1570. groupNumber text
1571. policyType select (HMO/PPO/EPO/POS/HDHP/Medicare/Medicaid/TRICARE)
1572. copayAmount text
1573. policyEffectiveDate date
1574. policyEndDate date
1575. status select (active/cancelled/draft/entered-in-error) — required
1576. Subscriber section: relationship, first/last name, DOB, gender, SSN, phone, address, employer
1577. subscriberRelationship select (self/spouse/child/parent/other)
1578. Save insurance — appears in list
1579. Insurance shows in clinical sidebar
1580. Coverage type badge colors
1581. Status badge colors
1582. Primary insurance shown first
1583. Multiple insurance records supported
1584. FHIR resource: Coverage
1585. Save without payerName — error (negative)
1586. Save without policyNumber — error (negative)
1587. Edit existing insurance — updates
1588. Delete insurance — confirmation

### Immunizations Tab (tab: immunizations)
1589. Immunizations tab loads vaccine history
1590. Table: Vaccine, CVX Code, Date, Manufacturer, Lot, Route
1591. Add Immunization button
1592. cvxCode (coded, required) — CVX system search
1593. dateTimeAdministered (datetime, required)
1594. manufacturer text
1595. lotNumber text
1596. expirationDate date
1597. route select (IM/SC/PO/IN/ID)
1598. administrationSite select (LA/RA/LT/RT/ORAL)
1599. amountAdministered number
1600. administratorName text
1601. notes textarea
1602. Save immunization — appears in list
1603. FHIR resource: Immunization
1604. CVX code search works
1605. Date required validation (negative)
1606. CVX code required validation (negative)

### Labs Tab (tab: labs)
1607. Labs tab loads diagnostic reports
1608. Table: Test, LOINC Code, Status, Date, Conclusion
1609. Add Lab button
1610. testCode (coded) — LOINC system
1611. testName (text, required)
1612. status select (registered/partial/preliminary/final/corrected) — required
1613. effectiveDate datetime
1614. issued datetime
1615. conclusion textarea
1616. Save lab result
1617. FHIR resources: DiagnosticReport, Observation
1618. LOINC code search works
1619. Status badge with colors
1620. Lab results linked to observations

### Procedures Tab (tab: procedures)
1621. Procedures tab loads procedure list
1622. Table: Procedure, CPT Code, Status, Date, Performer
1623. Add Procedure button
1624. procedureName (text, required)
1625. cptCode (coded) — CPT system
1626. status select (preparation/in-progress/completed/not-done) — required
1627. performedDate datetime
1628. performer lookup
1629. notes textarea
1630. Save procedure
1631. CPT code search works
1632. FHIR resource: Procedure
1633. Status badge colors

### History Tab (tab: history)
1634. History tab loads QuestionnaireResponse
1635. General History section
1636. smokingStatus select (current/former/never)
1637. alcoholUse select (none/social/moderate/heavy)
1638. exerciseFrequency select (none/occasional/regular/daily)
1639. additionalHistory textarea
1640. Family History section
1641. fatherHistory text
1642. motherHistory text
1643. siblingsHistory text
1644. offspringHistory text
1645. Save history updates
1646. History loads previous data

### Documents Tab (tab: documents)
1647. Documents tab loads document list
1648. Table: Title, Category, Status, Date, Author
1649. Add Document button
1650. title (text, required)
1651. category select (clinical-note/discharge-summary/lab-report/imaging/consent/referral/insurance/identification/prescription/other) — required
1652. status select (current/superseded/entered-in-error) — required
1653. date datetime
1654. author lookup
1655. file upload (drag-drop, preview)
1656. Allowed types: pdf, jpg, jpeg, png, gif, docx, xlsx, txt, csv, zip
1657. Max size: 10MB
1658. File preview shows after upload
1659. Download document works
1660. FHIR resource: DocumentReference
1661. Drag-drop zone highlights on hover
1662. Large file (>10MB) shows size error (negative)
1663. Invalid file type rejected (negative)
1664. Upload progress indicator shown
1665. Multiple document uploads supported

### Education Tab (tab: education)
1666. Education tab loads patient education records
1667. topic (text, required)
1668. dateProvided date
1669. status select (preparation/in-progress/completed)
1670. category select (handout/video/verbal/online)
1671. notes textarea
1672. Save education record
1673. FHIR resource: Communication

### Messaging Tab (tab: messaging)
1674. Messaging tab loads patient messages
1675. subject (text, required)
1676. message (textarea, required)
1677. priority select (routine/urgent)
1678. status select (preparation/in-progress/completed)
1679. sender reference
1680. recipient reference
1681. Send message — appears in list
1682. FHIR resource: Communication

### Relationships Tab (tab: relationships)
1683. Relationships tab loads related persons
1684. Table: Name, Relationship, Emergency Contact, Phone
1685. Add Relationship button
1686. relatedPatientName (text, required)
1687. relationshipType select (spouse/parent/child/sibling/guardian/friend/other) — required
1688. emergencyContact boolean toggle
1689. phoneNumber phone
1690. email email
1691. address text
1692. active boolean
1693. notes textarea
1694. Save relationship
1695. FHIR resource: RelatedPerson
1696. Emergency contacts flagged specially

### Healthcare Services Tab (tab: healthcareservices)
1697. Services tab loads healthcare services
1698. name (text, required)
1699. type (text, required)
1700. location (text, required)
1701. hoursOfOperation (text, required)
1702. description textarea
1703. FHIR resource: HealthcareService

### Visit Notes Tab (tab: visit-notes)
1704. Visit Notes loads DocumentReference list
1705. date (date, required)
1706. type select (progress/soap/procedure/discharge/consultation)
1707. status select (current/superseded/entered-in-error)
1708. content (textarea, required)
1709. author reference
1710. Save visit note

### Referrals Tab (tab: referrals)
1711. Referrals loads ServiceRequest list
1712. referTo (text, required)
1713. specialty text
1714. reason (textarea, required)
1715. priority select (routine/urgent/asap/stat)
1716. status select (draft/active/completed/cancelled)
1717. date date
1718. notes textarea
1719. FHIR resource: ServiceRequest

### Billing Tab (tab: billing)
1720. Billing tab loads Claim records
1721. serviceDate (date, required)
1722. cptCode (coded, required) — CPT system
1723. diagnosisCode (coded) — ICD-10
1724. provider lookup
1725. amount number
1726. status select (active/cancelled/draft/entered-in-error) — required
1727. Status badge colors
1728. FHIR resource: Claim

### Claims Tab (tab: claims)
1729. Claims tab loads Claim records (different view)
1730. claimType select (professional/institutional/oral/pharmacy/vision) — required
1731. status select (active/cancelled/draft/entered-in-error)
1732. totalAmount number
1733. serviceDate date
1734. use select (claim/preauthorization/predetermination)
1735. provider reference
1736. insurer reference
1737. facility reference

### Claim Submissions Tab (tab: claim-submissions)
1738. Submissions tab loads claim submissions
1739. submissionDate (date, required)
1740. status select (pending/accepted/rejected/paid) — required
1741. clearinghouse text
1742. trackingNumber text
1743. totalCharge number
1744. insurer reference

### Claim Denials Tab (tab: claim-denials)
1745. Denials tab loads ClaimResponse records
1746. denialDate (date, required)
1747. disposition text
1748. outcome select (queued/complete/error/partial) — required
1749. status select (pending/appealed/upheld/overturned)
1750. amountDenied number

### ERA/Remittance Tab (tab: era-remittance)
1751. ERA tab loads ExplanationOfBenefit records
1752. checkDate date
1753. checkNumber text
1754. payerName reference
1755. totalPaid number
1756. outcome select (queued/complete/error/partial)

### Transactions Tab (tab: transactions)
1757. Transactions loads Claim + PaymentReconciliation
1758. serviceDate (date, required)
1759. description text
1760. amount number
1761. status select (active/cancelled/draft) — badge colors

### Payment Tab (tab: payment)
1762. Payment tab loads PaymentNotice records
1763. cardType select (visa/mastercard/amex/discover) — required
1764. lastFourDigits (text, required)
1765. expirationDate (text, required)
1766. cardholderName (text, required)
1767. isDefault boolean
1768. status select (active/cancelled) — badge colors

### Payments Tab (tab: payments)
1769. Payments tab loads PaymentReconciliation
1770. paymentDate (date, required)
1771. amount (number, required)
1772. method select (cash/check/credit-card/eft/insurance)
1773. reference text
1774. status select (active/cancelled/entered-in-error)
1775. outcome select (queued/complete/error/partial)

### Statements Tab (tab: statements)
1776. Statements tab loads Invoice records
1777. statementDate (date, required)
1778. balance number
1779. status select (draft/issued/balanced/cancelled)
1780. totalNet number

### Issues Tab (tab: issues)
1781. Issues aggregates Conditions + Allergies + Medications
1782. Read-only view
1783. conditionName text
1784. status badge colors (active/inactive/resolved)
1785. onsetDate date

### Report Tab (tab: report)
1786. Report tab loads MeasureReport
1787. reportType select (clinical-summary/visit-summary/lab-summary/medication-list) — required
1788. status select (complete/pending/error) — badge colors
1789. date (date, required)

### Dashboard Tab (tab: dashboard)
1790. Patient dashboard overview
1791. Summary widgets
1792. Quick access to recent data
1793. Vitals trend chart
1794. Upcoming appointments

### Generic FHIR CRUD Pattern (All Tabs)
1795. GET /api/fhir-resource/{tabKey}/patient/{patientId} — list with pagination
1796. GET /api/fhir-resource/{tabKey}/patient/{patientId}/{id} — get single
1797. POST /api/fhir-resource/{tabKey}/patient/{patientId} — create
1798. PUT /api/fhir-resource/{tabKey}/patient/{patientId}/{id} — update
1799. DELETE /api/fhir-resource/{tabKey}/patient/{patientId}/{id} — delete
1800. Response shape: {content, page, size, totalElements, totalPages, hasNext}
1801. Pagination: page=0&size=20 defaults
1802. encounterRef query param filters by encounter
1803. Form data stored in FHIR extension
1804. FhirPathMapper maps fields to/from FHIR resource
1805. Reference fields resolve to display names
1806. Coded fields use FHIR CodeableConcept
1807. Date fields use FHIR dateTime format
1808. Boolean fields map to FHIR boolean
1809. Lookup fields resolve FHIR references

### Tab Visibility & Configuration
1810. Tab visibility controlled by /settings/layout-settings
1811. Hidden tabs not rendered in navigation
1812. Tab order matches configuration
1813. Tab icon matches config icon
1814. Tab label matches config label
1815. Tab count badge shows record count
1816. Disabled tabs (if configured) shown as grayed out

### Multi-resource Tabs
1817. Labs tab: DiagnosticReport + Observation
1818. Issues tab: Condition + AllergyIntolerance + MedicationRequest
1819. Transactions tab: Claim + PaymentReconciliation
1820. Multiple resources loaded and merged in list

### Tab Loading Performance
1821. Each tab loads under 2 seconds
1822. Switching tabs doesn't reload unchanged tabs
1823. Tab content cached during session
1824. Loading skeleton shown during fetch
1825. Error in one tab doesn't affect others

### Tab CRUD Negative Tests
1826. Create with missing required fields — all tabs show errors
1827. Update non-existent resource — 404 error
1828. Delete non-existent resource — 404 error
1829. Create with invalid field types — validation error
1830. Update with empty body — handled gracefully
1831. Concurrent create same resource — no duplicates
1832. API timeout during save — error + retry
1833. Network error during list — retry button
1834. Very large list (1000+ items) — pagination works
1835. Special characters in all text fields — stored correctly

### Tab Field Config Validation
1836. Required fields show asterisk
1837. Required fields validate on submit
1838. Optional fields accept empty values
1839. Select fields only accept configured options
1840. Date fields validate format
1841. Number fields reject non-numeric
1842. Email fields validate email pattern
1843. Phone fields format correctly
1844. Coded fields require valid code from system
1845. Lookup fields require valid reference

### Tab Badge Colors
1846. Status badges match badgeColors in field_config
1847. Active = green variant
1848. Inactive = gray variant
1849. Cancelled = red variant
1850. Pending = yellow variant
1851. Completed = purple variant
1852. Badge colors loaded from config (not hardcoded)

### showInTable Fields
1853. Fields with showInTable=true appear in list table
1854. Fields without showInTable hidden from table
1855. Table columns match showInTable fields
1856. Table sortable by showInTable fields
1857. Table searchable by showInTable fields

### File Upload (Documents Tab)
1858. Drag file to drop zone — upload starts
1859. Click drop zone — file selector opens
1860. Upload progress bar shows
1861. Successful upload shows file name
1862. PDF preview available
1863. Image preview available
1864. Download uploaded file
1865. Delete uploaded file
1866. Multiple files uploadable
1867. File stored via Vaultik plugin (if installed)

### File Upload (Negative)
1868. Upload file > 10MB — shows size error
1869. Upload .exe file — shows type error
1870. Upload empty file — shows error
1871. Upload during network error — shows failure
1872. Cancel upload mid-progress — file not saved

### Singleton Mode (Practice Settings)
1873. Practice tab is singleton (one record)
1874. No "Add" button — only edit
1875. Form loads with existing data
1876. Save updates the single record
1877. No list view — direct form view

### Tab Data Export
1878. Export tab data as CSV
1879. Export includes all visible columns
1880. Export respects current filters
1881. Print tab data

### Tab Data Import (if available)
1882. Import CSV to tab
1883. Preview before import
1884. Validation errors shown per row
1885. Successful import adds records

### Tab Keyboard Navigation
1886. Tab key moves between fields
1887. Enter submits form
1888. Escape closes modal
1889. Arrow keys in select dropdowns
1890. Spacebar toggles checkboxes

### Tab Mobile Responsiveness
1891. Tabs render as horizontal scroll on mobile
1892. Tab content stacks vertically
1893. Forms are single column on mobile
1894. Buttons are full width on mobile
1895. Modals fit mobile viewport

### Coded Field Search
1896. ICD-10 search returns matching codes (98K codes loaded)
1897. CPT search returns matching codes
1898. HCPCS search returns matching codes (8.3K loaded)
1899. LOINC search returns matching codes
1900. CVX search returns matching codes
1901. NDC search returns matching drug codes
1902. CDT dental codes searchable (683 loaded)
1903. Code search debounced (300ms)
1904. Minimum 2 characters to trigger search
1905. Code search case insensitive
1906. Search by code number
1907. Search by code description
1908. Search results show code + description
1909. Select code populates field
1910. Multiple codes selectable (diagnosis-list)

### Coded Field (Negative)
1911. Empty search returns nothing
1912. Invalid code not selectable
1913. Non-existent code search shows "No results"
1914. Code search API error shows error message
1915. Very long search term handled

### Lookup Fields
1916. Provider lookup searches active providers
1917. Patient lookup searches patients
1918. Location lookup searches facilities
1919. Lookup field shows dropdown with results
1920. Typing filters lookup results
1921. Selecting value populates field
1922. Clear button removes selection
1923. Lookup resolves FHIR reference to display name

### Lookup Fields (Negative)
1924. Search with no results shows "No matches"
1925. Lookup API error shows error
1926. Selecting deleted resource — handles gracefully

### Address Fields
1927. Street line 1 text input
1928. Street line 2 text input
1929. City text input
1930. State select (all US states)
1931. Zip code text (validates 5 or 9 digit)
1932. Country select (optional)
1933. Address fields group together visually

### Toggle/Boolean Fields
1934. Toggle switch click — changes state
1935. Toggle shows on/off state visually
1936. Toggle auto-saves on change
1937. Toggle default state from config
1938. Toggle disabled when form readonly

### Combobox Fields
1939. Combobox shows predefined options
1940. Combobox allows free text entry
1941. Free text value saved correctly
1942. Predefined option selectable
1943. Clear button resets field

### Group/Section Fields
1944. Group fields render as collapsible section
1945. Section header shows group label
1946. Expand/collapse toggle
1947. Nested fields render inside group
1948. Group collapsed by default or expanded (configurable)

### Conditional Visibility (showWhen)
1949. Field hidden when condition not met
1950. Field shown when condition met
1951. Changing trigger field shows/hides dependent field
1952. Hidden field value cleared on hide
1953. showWhen: {field, equals} — equality check
1954. showWhen: {field, notEquals} — inequality check

### Tab Field Config Reload
1955. Changing field config via settings reflects in forms
1956. New fields appear after config change
1957. Removed fields disappear after config change
1958. Field order changes reflected
1959. Required flag changes reflected
1960. Options changes reflected in selects

### Patient Chart Tab Count
1961. Each tab shows record count badge
1962. Badge updates after create/delete
1963. Badge shows 0 for empty tabs
1964. Badge handles large counts (999+)

### Tab Error States
1965. API error loading tab — shows retry button
1966. Network timeout — shows timeout message
1967. 403 Forbidden — shows access denied
1968. 404 tab config not found — shows error
1969. Malformed JSON in config — handles gracefully

### Tab Form Validation Messages
1970. Required field empty — "This field is required"
1971. Invalid email — "Please enter a valid email"
1972. Invalid phone — "Please enter a valid phone number"
1973. Invalid date — "Please enter a valid date"
1974. Number out of range — "Value must be between X and Y"
1975. Pattern mismatch — "Invalid format"
1976. Max length exceeded — "Maximum X characters"
1977. Validation message disappears when fixed

### Tab Empty States
1978. No allergies — "No Known Allergies" banner
1979. No medications — "No medications on file"
1980. No problems — "No active problems"
1981. No encounters — "No encounters recorded"
1982. No insurance — "No insurance on file"
1983. No documents — "No documents uploaded"
1984. No labs — "No lab results"
1985. No immunizations — "No immunizations recorded"
1986. Generic empty state for unconfigured tabs

### Tab List Sorting
1987. Click column header to sort
1988. Sort ascending on first click
1989. Sort descending on second click
1990. Sort indicator arrow shows
1991. Default sort by date (newest first)
1992. Sort preserves pagination page

### Tab List Actions Column
1993. View action — opens detail form
1994. Edit action — opens edit form
1995. Delete action — confirmation dialog
1996. Action icons (eye, pencil, trash) visible
1997. Actions disabled for readonly users
1998. Actions disabled for signed encounters

### Tab Data Refresh
1999. Creating record refreshes list
2000. Updating record refreshes list
2001. Deleting record refreshes list
2002. Manual refresh button available
2003. Auto-refresh on tab focus (optional)

### Tab Pagination
2004. Default 20 items per page
2005. Page selector (10, 20, 50)
2006. Next/Previous buttons
2007. Total count shown
2008. "Showing 1-20 of 45" text
2009. Last page shows remaining items
2010. Single page hides pagination

### Tab Multi-select Operations
2011. Checkbox on each row
2012. Select all checkbox
2013. Bulk delete selected
2014. Bulk export selected
2015. Selection count shown

### Tab Responsive Tables
2016. Table horizontally scrollable on mobile
2017. Important columns visible first
2018. Less important columns hidden on mobile
2019. Card view on mobile (optional)
2020. Touch-friendly row selection

### Tab Print
2021. Print tab data — formatted table
2022. Print includes patient header
2023. Print includes practice info
2024. Print date shown
2025. Print excludes action columns

### Tab Accessibility
2026. Table headers have scope="col"
2027. ARIA labels on action buttons
2028. Screen reader announces row data
2029. Keyboard navigation through table
2030. Focus trap in create/edit modals

### Generic Settings Page Tests
2031. GET /api/fhir-resource/{tabKey} — non-patient-scoped list
2032. POST /api/fhir-resource/{tabKey} — create
2033. PUT /api/fhir-resource/{tabKey}/{id} — update
2034. DELETE /api/fhir-resource/{tabKey}/{id} — delete
2035. Response: {content, page, size, totalElements, totalPages, hasNext}
2036. Settings uses fhirResources (not apiBasePath)
2037. Settings page renders with sidebar navigation
2038. Settings page lists all resources in table
2039. Settings page has search box
2040. Settings page has create button

### Tab Integration Tests
2041. Create allergy → appears in sidebar summary
2042. Create medication → appears in medications tab
2043. Create encounter → appears in encounters tab
2044. Delete allergy → removed from sidebar
2045. Update problem status → sidebar updates
2046. Create insurance → sidebar shows primary
2047. Tab data consistent across views

### Tab Data Persistence
2048. Created data persists across browser refresh
2049. Created data persists across logout/login
2050. Created data visible to other users (same org)
2051. Created data org-scoped (not visible to other orgs)

### FHIR Resource Type Coverage
2052. Patient — demographics tab
2053. Practitioner — providers settings
2054. Encounter — encounters tab
2055. Appointment — appointments tab
2056. MedicationRequest — medications tab
2057. AllergyIntolerance — allergies tab
2058. Condition — problems tab
2059. Procedure — procedures tab
2060. DiagnosticReport — labs tab
2061. Observation — vitals tab
2062. Immunization — immunizations tab
2063. DocumentReference — documents tab
2064. Coverage — insurance tab
2065. Claim — billing tab
2066. ClaimResponse — denials tab
2067. ExplanationOfBenefit — ERA tab
2068. PaymentReconciliation — payments tab
2069. PaymentNotice — payment tab
2070. Invoice — statements tab
2071. Communication — messaging tab
2072. ServiceRequest — referrals tab
2073. HealthcareService — services tab
2074. RelatedPerson — relationships tab
2075. Organization — practice/referral settings
2076. Location — facilities settings
2077. Questionnaire — forms settings
2078. QuestionnaireResponse — history tab
2079. Composition — encounter-form
2080. PractitionerRole — provider role
2081. Schedule — provider availability

### Tab Security
2082. API calls include auth token
2083. API calls include X-Org-Alias header
2084. Cross-org patient data not accessible
2085. Unauthorized user cannot create/edit/delete
2086. Token expiry during form edit — re-auth prompt

### Tab Performance Benchmarks
2087. Tab with 10 records loads < 1 second
2088. Tab with 100 records loads < 2 seconds
2089. Tab with 500 records loads < 3 seconds (with pagination)
2090. Create operation < 1 second
2091. Update operation < 1 second
2092. Delete operation < 1 second
2093. Code search < 500ms
2094. Lookup search < 500ms

### Tab Cross-browser
2095. Chrome — all tabs work
2096. Firefox — all tabs work
2097. Safari — all tabs work
2098. Edge — all tabs work

### Tab Dark Mode
2099. All tab forms render correctly in dark mode
2100. Table text readable in dark mode
2101. Badge colors visible in dark mode
2102. Input fields visible in dark mode
2103. Date picker visible in dark mode
2104. Dropdown menus visible in dark mode

### Tab Print Preview
2105. Print preview shows tab data
2106. Print layout optimized
2107. Colors appropriate for print
2108. Headers/footers included
2109. Page breaks appropriate

### Tab Data Consistency
2110. List total matches actual count
2111. Pagination math correct (totalPages = ceil(total/size))
2112. hasNext flag correct
2113. Empty last page not shown
2114. Filter count matches filtered results

### Tab Form Reset
2115. Cancel button resets form to initial state
2116. Clear button clears all fields
2117. Reset doesn't affect saved data
2118. Form dirty state tracked correctly

### Tab Audit
2119. Created records have createdDate
2120. Updated records have modifiedDate
2121. Creator user tracked
2122. Modifier user tracked

### Tab Unique Constraints
2123. Duplicate MRN prevention (demographics)
2124. Duplicate NPI warning (providers)
2125. Duplicate policy number handling (insurance)

### Tab Concurrency
2126. Two users editing same record — last write wins
2127. Delete while editing — error on save
2128. Update while deleted — error on save

### Tab Batch Operations
2129. Bulk create (CSV import)
2130. Bulk delete (selected rows)
2131. Bulk export (CSV/PDF)
2132. Bulk status change

### Tab URL Parameters
2133. ?tab=medications loads medications tab
2134. ?tab=allergies loads allergies tab
2135. ?tab=encounters loads encounters tab
2136. Invalid ?tab value loads default tab
2137. Tab parameter preserved on refresh

### Tab Scroll Behavior
2138. Long form scrolls within tab content area
2139. AdminLayout content div overflow-hidden
2140. Tab content manages own scroll
2141. No double scrollbar
2142. Scroll position reset on tab switch

### Tab Configuration Categories
2143. Overview category tabs: dashboard, demographics, vitals, allergies, problems, insurance
2144. Encounters category: encounters, appointments, visit-notes, referrals
2145. Clinical category: medications, labs, immunizations, procedures, history
2146. Claims category: billing, claims, submissions, denials, ERA, transactions
2147. General category: documents, education, messaging, relationships, services
2148. Financial category: payment, payments, statements
2149. Other category: issues, report
2150. Category grouping in tab navigation

### Tab Position Ordering
2151. Tab position 0 renders first in category
2152. Tabs ordered by position ascending
2153. Equal position maintains stable order
2154. Position -1 or hidden tabs not shown

### Generic FHIR Tab CRUD — Complete Flow
2155. Open patient chart → Click tab
2156. See empty list → Click "Add New"
2157. Fill required fields → Save
2158. Record appears in list → Verify data
2159. Click record → Edit form opens
2160. Modify fields → Save
2161. Changes reflected → Verify updates
2162. Click delete → Confirm
2163. Record removed → Verify empty or reduced list
2164. Refresh page → Data persists from server

### Tab Error Recovery
2165. Network error during load — retry button works
2166. Network error during save — retry saves data
2167. Session expired during edit — re-auth then save
2168. Server error (500) — user-friendly message
2169. Validation error — highlights fields, message

### Tab Help Text
2170. Fields with helpText show info icon
2171. Hover/click info icon shows help text
2172. Help text positioned correctly
2173. Help text doesn't overlap fields

### Tab Placeholder Text
2174. Input fields show placeholder text
2175. Placeholder disappears on focus/input
2176. Placeholder text matches field purpose
2177. Placeholder text not submitted as value

### Tab Label Display
2178. All fields have visible labels
2179. Labels positioned above fields
2180. Required labels have asterisk
2181. Labels match field_config label property
2182. Long labels wrap correctly

### Tab ColSpan Layout
2183. colSpan 12 — full width
2184. colSpan 6 — half width (2 columns)
2185. colSpan 4 — third width (3 columns)
2186. colSpan 3 — quarter width (4 columns)
2187. Mixed colSpan in same section
2188. ColSpan responsive on mobile (full width)

### Tab Field Types Complete Coverage
2189. text — renders input[type=text]
2190. phone — renders formatted phone input
2191. email — renders input[type=email]
2192. textarea — renders textarea element
2193. date — renders date picker
2194. datetime — renders date + time picker
2195. number — renders input[type=number]
2196. toggle/boolean — renders switch component
2197. select — renders dropdown
2198. combobox — renders dropdown with free text
2199. radio — renders radio button group
2200. file — renders file upload zone

---

## Section 7: Settings Pages (2201-2800)

### Practice Settings (tabKey: practice, Organization resource)
2201. Navigate to Settings → Practice — page loads
2202. Practice name field is populated
2203. Edit practice name — field updates
2204. Practice address fields display (street, city, state, zip)
2205. Practice phone number field accepts formatted input
2206. Practice fax number field accepts formatted input
2207. Practice email field validates format
2208. Practice NPI field validates 10-digit format
2209. Practice tax ID field present
2210. Practice website URL field present
2211. Save practice settings — success toast shown
2212. Practice settings persist after page reload
2213. Practice name shows in sidebar/header after save
2214. NEGATIVE: Save with empty required practice name — validation error
2215. NEGATIVE: Invalid NPI format — shows error
2216. NEGATIVE: Invalid email format — shows error
2217. Practice logo upload field present
2218. Practice timezone dropdown has timezone options
2219. Practice settings — singleton mode (no add/delete, only edit)
2220. Cancel button reverts unsaved changes

### Practice Session Settings
2221. Token lifespan field present in practice settings
2222. Update token lifespan — calls Keycloak admin API
2223. Token lifespan accepts numeric values only
2224. NEGATIVE: Non-numeric token lifespan — validation error
2225. NEGATIVE: Token lifespan = 0 — validation error
2226. Token lifespan change persists after save

### Facility Settings (tabKey: facilities, Location resource)
2227. Navigate to Settings → Facilities — page loads with list
2228. Facilities list shows all locations
2229. Click "Add Facility" — opens form
2230. Facility name field required
2231. Facility address fields (street, city, state, zip)
2232. Facility phone number field
2233. Facility fax number field
2234. Facility status toggle (active/inactive)
2235. Facility type dropdown present
2236. Save new facility — appears in list
2237. Edit existing facility — form pre-populated
2238. Update facility — changes saved
2239. Delete facility — removed from list
2240. NEGATIVE: Save facility with empty name — validation error
2241. NEGATIVE: Duplicate facility name — appropriate handling
2242. Facility list supports pagination
2243. Facility search/filter works
2244. Facility status badge shows active/inactive
2245. Multiple facilities can exist per practice

### Provider Settings (tabKey: providers, Practitioner resource)
2246. Navigate to Settings → Providers — page loads with list
2247. Provider list shows all practitioners
2248. Provider list columns: name, specialty, status, NPI
2249. Click "Add Provider" — opens form
2250. Provider identification section: first name, last name, suffix
2251. Provider NPI field validates 10-digit format
2252. Provider specialty dropdown from field_config options
2253. Provider status dropdown (Active, Inactive, On Leave)
2254. Provider license number field
2255. Provider DEA number field
2256. Provider email field with validation
2257. Provider phone number field
2258. Provider taxonomy code field
2259. Provider color picker for calendar display
2260. Save new provider — appears in list
2261. Edit existing provider — form pre-populated with nested DTO shape
2262. Update provider — changes persist
2263. Delete provider — removed from list
2264. NEGATIVE: Save provider with empty first name — validation error
2265. NEGATIVE: Save provider with empty last name — validation error
2266. NEGATIVE: Invalid NPI format — error
2267. NEGATIVE: Invalid email format — error
2268. NEGATIVE: Duplicate NPI — appropriate handling
2269. Provider search by name works
2270. Provider filter by status works
2271. Provider filter by specialty works
2272. Provider list pagination works
2273. New provider auto-creates default schedule (Mon-Fri 8am-5pm via lifecycle hook)
2274. Provider status badge color matches ui_color_config
2275. Provider card/row shows assigned color

### Provider Availability/Schedule
2276. Navigate to provider → Availability tab
2277. Weekly schedule grid shows days Mon-Sun
2278. Default schedule: Mon-Fri 8:00 AM - 5:00 PM
2279. Edit start time for Monday — time picker works
2280. Edit end time for Monday — time picker works
2281. Toggle day off (e.g., disable Saturday)
2282. Add break period within a day
2283. Save availability — persists
2284. NEGATIVE: End time before start time — validation error
2285. NEGATIVE: Overlapping time slots — validation error
2286. Availability reflects in appointment booking slots
2287. Blocked/unavailable slots shown on calendar

### Insurance Settings (tabKey: insurance, Coverage resource)
2288. Navigate to Settings → Insurance — page loads
2289. Insurance list shows all payer configurations
2290. Click "Add Insurance" — opens form
2291. Insurance company name field
2292. Insurance payer ID field
2293. Insurance address fields
2294. Insurance phone number field
2295. Insurance plan type dropdown
2296. Insurance electronic payer ID field
2297. Save new insurance — appears in list
2298. Edit insurance — form pre-populated
2299. Delete insurance — removed from list
2300. NEGATIVE: Empty insurance name — validation error
2301. Insurance search works
2302. Insurance list pagination works

### Services Settings (tabKey: services, HealthcareService resource)
2303. Navigate to Settings → Services — page loads
2304. Services list shows all healthcare services
2305. Click "Add Service" — opens form
2306. Service name field required
2307. Service category dropdown
2308. Service type dropdown
2309. Service duration field (minutes)
2310. Service default fee/price field
2311. Service CPT code association
2312. Service active/inactive toggle
2313. Save new service — appears in list
2314. Edit service — form pre-populated
2315. Delete service — removed from list
2316. NEGATIVE: Empty service name — validation error
2317. NEGATIVE: Negative duration — validation error
2318. NEGATIVE: Negative price — validation error
2319. Services appear in appointment type dropdown
2320. Service list pagination works

### Appointment Types (tabKey: appointmentTypes)
2321. Navigate to Settings → Appointment Types — page loads
2322. Appointment type list shows all types
2323. Click "Add Type" — opens form
2324. Appointment type name field
2325. Appointment type color picker
2326. Appointment type default duration (minutes)
2327. Appointment type description field
2328. Save new type — appears in list
2329. Edit type — form pre-populated
2330. Delete type — removed from list
2331. NEGATIVE: Empty type name — validation error
2332. Types appear in calendar appointment creation
2333. Type color displays on calendar events
2334. Type list pagination works

### Rooms Settings (tabKey: rooms)
2335. Navigate to Settings → Rooms — page loads
2336. Rooms list shows all exam rooms
2337. Click "Add Room" — opens form
2338. Room name field required
2339. Room number field
2340. Room location/facility dropdown
2341. Room status (available/unavailable/maintenance)
2342. Room equipment/notes field
2343. Save new room — appears in list
2344. Edit room — form pre-populated
2345. Delete room — removed from list
2346. NEGATIVE: Empty room name — validation error
2347. Rooms appear in encounter room assignment
2348. Room status badge shows correctly

### Fee Schedules Settings (tabKey: feeSchedules)
2349. Navigate to Settings → Fee Schedules — page loads
2350. Fee schedule list with payer associations
2351. Click "Add Fee Schedule" — opens form
2352. Fee schedule name field
2353. Associated payer/insurance dropdown
2354. CPT code column
2355. Fee amount column (currency input)
2356. Effective date field
2357. Save fee schedule — persists
2358. Edit fee schedule — pre-populated
2359. Delete fee schedule — removed
2360. NEGATIVE: Negative fee amount — validation error
2361. NEGATIVE: Missing CPT code — validation error
2362. Fee schedule pagination works
2363. Fee schedule search by CPT code
2364. Fee schedule export capability

### Referring Providers (tabKey: referringProviders, Practitioner resource)
2365. Navigate to Settings → Referring Providers — page loads
2366. Referring provider list shows all
2367. Click "Add Referring Provider" — opens form
2368. Referring provider first name field
2369. Referring provider last name field
2370. Referring provider NPI field
2371. Referring provider specialty
2372. Referring provider phone/fax
2373. Referring provider address
2374. Save referring provider — appears in list
2375. Edit referring provider — pre-populated
2376. Delete referring provider — removed
2377. NEGATIVE: Empty name fields — validation error
2378. NEGATIVE: Invalid NPI — validation error
2379. Referring providers appear in referral form dropdown

### Pharmacies Settings (tabKey: pharmacies)
2380. Navigate to Settings → Pharmacies — page loads
2381. Pharmacy list shows all pharmacies
2382. Click "Add Pharmacy" — opens form
2383. Pharmacy name field required
2384. Pharmacy NCPDP ID field
2385. Pharmacy address fields
2386. Pharmacy phone/fax fields
2387. Pharmacy type (retail, mail-order, specialty)
2388. Pharmacy 24-hour toggle
2389. Save pharmacy — appears in list
2390. Edit pharmacy — pre-populated
2391. Delete pharmacy — removed
2392. NEGATIVE: Empty pharmacy name — validation error
2393. Pharmacies appear in prescription routing dropdown

### Labs Settings (tabKey: labs)
2394. Navigate to Settings → Labs — page loads
2395. Lab list shows all external labs
2396. Click "Add Lab" — opens form
2397. Lab name field required
2398. Lab CLIA number field
2399. Lab director name field
2400. Lab address fields
2401. Lab phone/fax fields
2402. Lab interface type (HL7, FHIR, manual)
2403. Save lab — appears in list
2404. Edit lab — pre-populated
2405. Delete lab — removed
2406. NEGATIVE: Empty lab name — validation error
2407. Labs appear in lab order routing dropdown

### Letter Templates (tabKey: letterTemplates)
2408. Navigate to Settings → Letter Templates — page loads
2409. Template list shows all templates
2410. Click "Add Template" — opens form
2411. Template name field required
2412. Template category dropdown
2413. Template body rich text editor
2414. Template merge fields/variables support
2415. Template preview button
2416. Save template — appears in list
2417. Edit template — pre-populated with rich text
2418. Delete template — removed
2419. NEGATIVE: Empty template name — validation error
2420. Templates available in patient communication

### Print Settings (tabKey: printSettings)
2421. Navigate to Settings → Print Settings — page loads
2422. Print header configuration
2423. Print footer configuration
2424. Logo for print header
2425. Default paper size selection
2426. Margin settings
2427. Save print settings — persists
2428. Print preview shows configured header/footer
2429. NEGATIVE: Invalid margin values — validation error

### Recall Types (tabKey: recallTypes)
2430. Navigate to Settings → Recall Types — page loads
2431. Recall type list shows all types
2432. Click "Add Recall Type" — opens form
2433. Recall type name field
2434. Recall interval (days/weeks/months)
2435. Recall notification method (email, SMS, letter)
2436. Save recall type — appears in list
2437. Edit recall type — pre-populated
2438. Delete recall type — removed
2439. NEGATIVE: Empty recall type name — validation error
2440. Recall types appear in recall scheduling

### Document Categories (tabKey: documentCategories)
2441. Navigate to Settings → Document Categories — page loads
2442. Category list shows all categories
2443. Click "Add Category" — opens form
2444. Category name field required
2445. Category description field
2446. Category sort order field
2447. Save category — appears in list
2448. Edit category — pre-populated
2449. Delete category — removed
2450. NEGATIVE: Empty category name — validation error
2451. Categories appear in document upload form

### User Roles & Permissions Settings
2452. Navigate to Settings → Roles — page loads
2453. Role list shows configured roles
2454. Default roles present (Admin, Provider, Staff, Billing)
2455. Click role — shows permission checkboxes
2456. Toggle permission — updates
2457. Save role permissions — persists
2458. NEGATIVE: Cannot delete system roles
2459. New role creation if supported
2460. Role assignment reflected in user access

### Notification Preferences Settings
2461. Navigate to Settings → Notifications — page loads
2462. Email notification toggles
2463. SMS notification toggles
2464. In-app notification toggles
2465. Appointment reminder timing settings
2466. Save notification preferences — persists
2467. NEGATIVE: Invalid reminder timing — validation error

### Custom Fields Settings
2468. Navigate to Settings → Custom Fields — page loads if available
2469. Custom field list shows all custom fields
2470. Add custom field — form with name, type, options
2471. Custom field type dropdown (text, select, date, number)
2472. Custom field applies to resource type (Patient, Encounter, etc.)
2473. Save custom field — appears in corresponding forms
2474. Edit custom field — pre-populated
2475. Delete custom field — removed from forms
2476. NEGATIVE: Empty field name — validation error

### GenericSettingsPage Behavior
2477. All settings pages use GenericSettingsPage component
2478. GenericSettingsPage reads fhirResources from tab_field_config
2479. Settings page shows loading skeleton during data fetch
2480. Settings page shows "No data" state when empty
2481. Settings form fields generated from field_config JSON
2482. Settings form respects field order from config
2483. Settings form respects field visibility from config
2484. Settings form respects field required from config
2485. Settings save calls GenericFhirResourceService create/update
2486. Settings delete calls GenericFhirResourceService delete
2487. Settings list auto-refreshes after save
2488. Settings list auto-refreshes after delete
2489. Singleton settings pages (practice) show edit form directly, no list
2490. Non-singleton settings pages show list + add button

### Settings Navigation
2491. Settings sidebar shows all configured settings pages
2492. Settings pages ordered by tab_field_config sortOrder
2493. Active settings page highlighted in sidebar
2494. Settings breadcrumb navigation works
2495. Settings page URL matches /settings/{tabKey}
2496. Direct URL navigation to settings page works
2497. Settings sidebar collapses on mobile

### Settings Search & Filter
2498. Settings list search by name
2499. Settings list search is case-insensitive
2500. Settings list search debounced (no API call per keystroke)
2501. Settings list pagination — first page loads
2502. Settings list pagination — navigate to page 2
2503. Settings list pagination — page size selector
2504. NEGATIVE: Search with special characters doesn't crash
2505. NEGATIVE: Search with very long string doesn't crash
2506. Settings list sort by column header

### Settings Form Validation
2507. Required fields show asterisk
2508. Submit with empty required field — inline error
2509. Email fields validate email format
2510. Phone fields validate phone format
2511. NPI fields validate 10-digit numeric
2512. Date fields validate date format
2513. Number fields reject non-numeric input
2514. URL fields validate URL format
2515. NEGATIVE: Submit form with all fields empty — shows all errors
2516. Validation errors clear when field is corrected
2517. Form scrolls to first error on submit
2518. Tab key navigates between form fields

### Settings CRUD Confirmation
2519. Delete action shows confirmation dialog
2520. Confirm delete — item removed
2521. Cancel delete — item preserved
2522. Save shows success toast notification
2523. Delete shows success toast notification
2524. Error shows error toast notification
2525. Toast auto-dismisses after timeout

### Settings Responsive Layout
2526. Settings page full-width on desktop
2527. Settings form fields responsive grid
2528. Settings sidebar hidden on mobile (hamburger menu)
2529. Settings table scrolls horizontally on mobile
2530. Settings form modal/drawer on mobile
2531. Settings action buttons accessible on mobile

### UI Color Configuration (ui_color_config)
2532. Provider colors sourced from ui_color_config table
2533. Status badge colors sourced from ui_color_config
2534. Appointment type colors sourced from config
2535. Colors not hardcoded in frontend
2536. Unconfigured items use deterministic hash-based random color
2537. Color picker in settings allows hex input
2538. Color picker shows color preview swatch
2539. Saved colors display correctly in all views

### Settings Import/Export
2540. Export settings data if supported
2541. Import settings data if supported
2542. NEGATIVE: Import invalid format — error message
2543. NEGATIVE: Import duplicate data — appropriate handling

### Settings Audit Trail
2544. Settings changes tracked with timestamp
2545. Settings changes tracked with user
2546. Settings change history viewable if supported

### Vaultik (File Storage) Settings
2547. Navigate to Settings → Vaultik — page loads (via plugin)
2548. Vaultik settings show storage configuration
2549. S3 bucket configuration fields
2550. S3 access key / secret key fields
2551. S3 endpoint URL field
2552. Test connection button
2553. Save Vaultik settings — persists
2554. NEGATIVE: Invalid S3 credentials — connection test fails
2555. Vaultik settings only visible when app installed

### Telehealth Settings
2556. Navigate to Settings → Telehealth — page loads if available
2557. Telehealth provider configuration (Jitsi)
2558. Telehealth domain setting
2559. Telehealth room naming convention
2560. Save telehealth settings — persists

### Settings Edge Cases
2561. Navigate to non-existent settings page — 404 or redirect
2562. Settings page with no tab_field_config — empty state
2563. Very long settings list (100+ items) — pagination handles
2564. Concurrent edit — last save wins
2565. Settings page refresh during edit — unsaved changes warning
2566. Browser back during settings edit — unsaved changes prompt
2567. Settings form with all optional fields — save succeeds
2568. NEGATIVE: API timeout during settings save — error toast
2569. NEGATIVE: Network offline during settings save — error handling
2570. NEGATIVE: Session expired during settings save — redirect to login

### Menu Item Configuration (Settings)
2571. All sidebar menu items loaded from menu_item table
2572. Menu items respect user role permissions
2573. Menu items ordered by sort_order
2574. Menu item icons display correctly (Lucide icons)
2575. Parent menu items expand to show children
2576. Active menu item highlighted
2577. Menu item links navigate to correct routes
2578. NEGATIVE: Menu item with broken route — graceful fallback
2579. Ciyex Hub menu item visible (V47 migration)
2580. Menu collapses to icons on sidebar toggle

### Settings — Diagnosis Codes
2581. Navigate to Settings → Diagnosis Codes — connects to ciyex-codes
2582. ICD-10 code search works (98K codes)
2583. ICD-10 search by code (e.g., E11.65)
2584. ICD-10 search by description
2585. HCPCS code search works (8.3K codes)
2586. CDT dental code search works (683 codes)
2587. Code search pagination
2588. Code search debounced input
2589. Favorite/frequent codes list
2590. NEGATIVE: Search with no results — "No results" message

### Settings — Superbills / Charge Capture
2591. Navigate to Settings → Superbills if available
2592. Superbill template list
2593. Create superbill template
2594. Add CPT codes to template
2595. Add diagnosis codes to template
2596. Save superbill template
2597. Edit superbill template
2598. Delete superbill template
2599. NEGATIVE: Empty template name — validation error
2600. Superbill template used in encounter checkout

### Settings — Payment Configuration
2601. Navigate to Settings → Payment if available
2602. Payment gateway configuration
2603. Accepted payment methods (cash, check, card)
2604. Payment posting defaults
2605. Copay amount default setting
2606. Save payment settings
2607. NEGATIVE: Invalid gateway credentials — error

### Settings — Claim Configuration
2608. Navigate to Settings → Claims if available
2609. Default billing provider setting
2610. Claim form type selection (CMS-1500, UB-04)
2611. Electronic claim submission settings
2612. Clearinghouse configuration
2613. ERA (Electronic Remittance Advice) settings
2614. Save claim settings
2615. NEGATIVE: Invalid clearinghouse credentials — error

### Settings — Scheduling Rules
2616. Navigate to Settings → Scheduling Rules if available
2617. Double-booking allowed toggle
2618. Appointment slot duration default
2619. Buffer time between appointments
2620. Maximum advance booking period
2621. Same-day appointment toggle
2622. Walk-in appointment toggle
2623. Save scheduling rules
2624. NEGATIVE: Negative buffer time — validation error
2625. Scheduling rules reflected in calendar

### Settings Page tab_field_config Integration
2626. practice — singleton, Organization resource
2627. facilities — Location resource list
2628. providers — Practitioner resource list
2629. insurance — Coverage resource (settings scope)
2630. services — HealthcareService resource list
2631. appointmentTypes — config-driven list
2632. rooms — config-driven list
2633. feeSchedules — config-driven list
2634. referringProviders — Practitioner resource list
2635. pharmacies — Organization resource list
2636. labs — Organization resource list
2637. letterTemplates — config-driven list
2638. printSettings — singleton config
2639. recallTypes — config-driven list
2640. documentCategories — config-driven list
2641. All settings pages category='Settings' in tab_field_config
2642. Settings page tabKey maps to URL path
2643. Settings field_config JSON drives form generation
2644. Settings fhirMapping drives FHIR resource creation
2645. Settings fhirResources specifies FHIR resource type

### Settings Negative — Permission Tests
2646. Non-admin user cannot access Settings
2647. Staff role sees limited settings options
2648. Provider role sees own provider settings
2649. Billing role sees billing-related settings only
2650. NEGATIVE: Direct URL to settings without permission — access denied
2651. NEGATIVE: API call to settings endpoint without admin role — 403

### Settings Negative — Data Integrity
2652. Delete provider with appointments — warning/prevent
2653. Delete facility with active providers — warning/prevent
2654. Delete insurance with active patients — warning/prevent
2655. Delete appointment type with future appointments — warning
2656. Delete room with active encounter — warning
2657. NEGATIVE: Circular reference in settings — handled
2658. NEGATIVE: Orphaned records after delete — none
2659. Delete and re-add with same name — succeeds

### Settings Performance
2660. Settings list loads within 2 seconds
2661. Settings form opens within 1 second
2662. Settings save completes within 2 seconds
2663. Settings search results within 500ms
2664. Settings pagination transition smooth
2665. Large settings list (1000 items) — virtual scroll or paginated

### Billing Code Settings Integration
2666. CPT code lookup from ciyex-codes service
2667. ICD-10 code lookup from ciyex-codes service
2668. HCPCS code lookup from ciyex-codes service
2669. Code search autocomplete in fee schedule
2670. Code descriptions display correctly
2671. NCCI PTP edits validated when adding codes
2672. MUE (Medically Unlikely Edits) values shown
2673. Fee schedule links CPT to dollar amount
2674. Multiple fee schedules per payer supported
2675. NEGATIVE: Invalid CPT code — not found message

### Settings — Encounter Templates
2676. Navigate to Settings → Encounter Templates if available
2677. Template list shows all templates
2678. Create new encounter template
2679. Template specialty assignment
2680. Template section configuration
2681. Template default values
2682. Save encounter template
2683. Edit encounter template
2684. Delete encounter template
2685. Templates appear in encounter creation
2686. NEGATIVE: Empty template name — validation error

### Settings — Macro/Quick Text
2687. Navigate to Settings → Macros/Quick Text if available
2688. Macro list shows all macros
2689. Create new macro — name + expansion text
2690. Macro category/grouping
2691. Macro shortcut key assignment
2692. Save macro — appears in list
2693. Edit macro — pre-populated
2694. Delete macro — removed
2695. Macros available in text fields via trigger
2696. NEGATIVE: Duplicate shortcut key — warning

### Settings — Consent Forms
2697. Navigate to Settings → Consent Forms if available
2698. Consent form template list
2699. Create consent form template
2700. Consent form rich text editor
2701. Consent form signature field placeholder
2702. Save consent form
2703. Edit consent form
2704. Delete consent form
2705. Consent forms available in patient intake
2706. NEGATIVE: Empty form name — validation error

### Settings — Automated Workflows
2707. Navigate to Settings → Workflows if available
2708. Workflow trigger configuration
2709. Workflow action steps
2710. Workflow condition/filter rules
2711. Enable/disable workflow toggle
2712. Save workflow configuration
2713. Workflow execution log viewable
2714. NEGATIVE: Invalid trigger condition — validation error

### Settings — API Keys / Integration
2715. Navigate to Settings → API Keys if available
2716. API key list shows existing keys
2717. Generate new API key
2718. API key shown once after creation (security)
2719. Revoke API key — deactivated
2720. API key scope/permissions
2721. NEGATIVE: Expired API key — shows expired status

### Settings — Batch Operations
2722. Bulk import providers from CSV
2723. Bulk import patients from CSV
2724. Bulk import insurance from CSV
2725. Bulk import fee schedules from CSV
2726. Import progress indicator
2727. Import validation errors shown per row
2728. Import summary (success/failed count)
2729. NEGATIVE: Invalid CSV format — error message
2730. NEGATIVE: Missing required columns — specific error

### Settings — White Label / Branding
2731. Practice logo upload in settings
2732. Logo displays in header after save
2733. Logo displays on print templates
2734. Favicon customization if supported
2735. Custom login page branding if supported
2736. NEGATIVE: Invalid image format — error
2737. NEGATIVE: Oversized image — compression or error

### Settings — Data Retention
2738. Data retention policy configuration
2739. Audit log retention period
2740. Document retention period
2741. Auto-archive settings
2742. NEGATIVE: Retention period below regulatory minimum — warning

### Settings Summary Verification
2743. All 48 tab_field_config categories represented in settings
2744. Each settings page CRUD works end-to-end
2745. Settings data flows to dependent features correctly
2746. Settings changes reflect immediately in UI
2747. Settings export covers all configured data
2748. All settings API calls go through FhirFacadeController
2749. No hardcoded options in settings forms
2750. Settings forms read all options from field_config JSON

### Settings — Multi-tenancy
2751. Settings scoped to current org_alias
2752. Switch practice — settings change to new org's data
2753. Settings data isolated between tenants
2754. NEGATIVE: Access other org's settings — forbidden
2755. Default settings populated for new org
2756. Settings not visible to other tenants via API

### Settings — Concurrent Access
2757. Two users edit same setting — last save wins
2758. Settings list reflects other user's changes on refresh
2759. NEGATIVE: Delete setting while another user edits — handled
2760. Optimistic locking if supported (version conflict message)

### Settings — Accessibility
2761. Settings forms keyboard navigable
2762. Settings forms screen reader compatible (ARIA labels)
2763. Settings color pickers have text input alternative
2764. Settings toggles have keyboard support (Space/Enter)
2765. Settings modals can be closed with Escape key
2766. Settings focus trapped in modals
2767. Settings form error announcements for screen readers
2768. Tab order is logical in settings forms

### Settings — Final Edge Cases
2769. Settings form with 50+ fields — scrollable
2770. Settings form with conditional fields — show/hide logic
2771. Settings form with dependent dropdowns — cascading update
2772. Settings form undo (Ctrl+Z in text fields)
2773. Settings form copy/paste works in all fields
2774. Settings form autosave (if implemented)
2775. Settings page deep link — direct URL to specific setting
2776. Settings form with file upload — size limit enforcement
2777. Settings form with rich text — formatting preserved
2778. Settings form with date range — start before end validation
2779. Settings page print layout
2780. NEGATIVE: XSS attempt in text field — sanitized
2781. NEGATIVE: SQL injection attempt — no effect
2782. NEGATIVE: Script tags in input — stripped/escaped
2783. NEGATIVE: HTML in select options — escaped
2784. NEGATIVE: Unicode/emoji in settings fields — handled correctly
2785. NEGATIVE: Very long text (10000 chars) in text field — truncated or accepted
2786. NEGATIVE: Special characters (&, <, >, ", ') — escaped in display
2787. NEGATIVE: Null byte in input — stripped
2788. NEGATIVE: Concurrent rapid save clicks — only one request sent
2789. Settings changes logged in audit trail
2790. Settings restore to defaults if available
2791. All settings pages have consistent styling
2792. Settings loading states shown during API calls
2793. Settings error boundary catches component crashes
2794. Settings 500 error from API — user-friendly error message
2795. Settings 403 error — "Access Denied" message
2796. Settings 404 error — "Not Found" message
2797. Settings network timeout — retry option shown
2798. Settings cache invalidation after save
2799. Settings page title updates in browser tab
2800. Settings breadcrumb shows correct hierarchy

---

## Section 8: Labs & Orders (2801-3000)

### Lab Orders (tabKey: labOrders, ServiceRequest resource)
2801. Navigate to patient chart → Lab Orders tab — loads
2802. Lab orders list shows all orders for patient
2803. Lab order columns: date, test, status, ordering provider
2804. Click "New Lab Order" — opens form
2805. Lab order form — ordering provider dropdown
2806. Lab order form — lab test search (LOINC codes)
2807. Lab order form — priority dropdown (Routine, Stat, ASAP)
2808. Lab order form — specimen type field
2809. Lab order form — collection date/time
2810. Lab order form — clinical notes/reason field
2811. Lab order form — diagnosis code (ICD-10) association
2812. Lab order form — sending lab dropdown (from labs settings)
2813. Lab order form — fasting required toggle
2814. Save lab order — appears in list
2815. Edit lab order — pre-populated
2816. Cancel/void lab order — status updated
2817. NEGATIVE: Save with no test selected — validation error
2818. NEGATIVE: Save with no ordering provider — validation error
2819. Lab order status badge: Ordered, In Progress, Completed, Cancelled

### Lab Results (tabKey: labResults, DiagnosticReport resource)
2820. Navigate to patient chart → Lab Results tab — loads
2821. Lab results list shows all results for patient
2822. Lab result columns: date, test name, result, status, flag
2823. Click result row — opens detail view
2824. Result detail shows individual components (e.g., CBC components)
2825. Result values show units
2826. Abnormal results flagged (H/L/Critical)
2827. Critical results highlighted in red
2828. Result reference ranges displayed
2829. Historical trend view for repeated tests
2830. Result graph/chart for numeric values over time
2831. Click "Add Manual Result" — opens form
2832. Manual result form — test selection
2833. Manual result form — value input
2834. Manual result form — units selection
2835. Manual result form — reference range
2836. Manual result form — interpretation (Normal, Abnormal, Critical)
2837. Manual result form — resulted date
2838. Save manual result — appears in list
2839. NEGATIVE: Non-numeric value for numeric test — validation error
2840. NEGATIVE: Missing required result value — validation error

### Lab Order Workflow
2841. Create order → status: Ordered
2842. Receive specimen → status: In Progress
2843. Results received → status: Completed
2844. Results linked to original order
2845. Provider review/sign-off on results
2846. Result acknowledged toggle
2847. Patient notification for results
2848. Abnormal result alerts
2849. NEGATIVE: Complete order without results — validation error
2850. Order-to-result linkage maintained

### Lab Order Printing
2851. Print lab order requisition
2852. Print preview shows order details
2853. Print includes patient demographics
2854. Print includes diagnosis codes
2855. Print includes ordering provider info
2856. Print includes lab instructions
2857. Barcode/QR code on requisition if supported
2858. Print layout matches configured print settings

### Lab Panel Orders
2859. Order a panel (e.g., Basic Metabolic Panel)
2860. Panel expands to show individual tests
2861. Panel results show all components
2862. Modify individual tests within panel
2863. Cancel individual test within panel
2864. NEGATIVE: Order duplicate panel — warning

### Lab Search & Filter
2865. Search lab orders by test name
2866. Filter lab orders by status
2867. Filter lab orders by date range
2868. Filter lab results by abnormal only
2869. Filter lab results by pending review
2870. Sort lab results by date (newest first)
2871. Pagination for large lab history
2872. NEGATIVE: Filter with no matching results — empty state

### Lab HL7/FHIR Integration
2873. Incoming HL7 ORU messages create DiagnosticReport
2874. Incoming results auto-linked to patient
2875. Incoming results auto-linked to order
2876. Result status updates from external lab
2877. Discrete result values mapped to LOINC codes
2878. PDF result attachment viewable
2879. External lab result imported into chart

### Lab Trending
2880. Select multiple lab results for trend
2881. Trend chart shows values over time
2882. Trend chart shows reference range bands
2883. Trend chart identifies abnormal points
2884. Date range selector for trend
2885. Export trend data
2886. Print trend chart
2887. NEGATIVE: Trend with single data point — shows point, no line

### Imaging Orders (tabKey: imagingOrders, ServiceRequest resource)
2888. Navigate to patient chart → Imaging tab — loads
2889. Imaging order list shows all orders
2890. Click "New Imaging Order" — opens form
2891. Imaging order — modality dropdown (X-Ray, MRI, CT, Ultrasound)
2892. Imaging order — body part/region
2893. Imaging order — laterality (Left, Right, Bilateral)
2894. Imaging order — clinical indication
2895. Imaging order — ordering provider
2896. Imaging order — priority
2897. Save imaging order — appears in list
2898. Edit imaging order — pre-populated
2899. Cancel imaging order — status updated
2900. NEGATIVE: Missing modality — validation error
2901. NEGATIVE: Missing body part — validation error

### Imaging Results
2902. Imaging result status: Ordered, Scheduled, Completed, Read
2903. Imaging result — radiologist report text
2904. Imaging result — impression/findings
2905. Imaging result — critical findings alert
2906. Imaging result — DICOM viewer link if available
2907. Imaging result acknowledged by ordering provider

### Referral Orders (tabKey: referrals, ServiceRequest resource)
2908. Navigate to patient chart → Referrals tab — loads
2909. Referral list shows all referrals
2910. Click "New Referral" — opens form
2911. Referral — referred-to provider (from referring providers settings)
2912. Referral — specialty
2913. Referral — reason for referral
2914. Referral — clinical notes
2915. Referral — urgency level
2916. Referral — diagnosis codes
2917. Referral — insurance authorization number
2918. Save referral — appears in list
2919. Edit referral — pre-populated
2920. Referral status: Pending, Sent, Accepted, Completed, Denied
2921. NEGATIVE: Missing referred-to provider — validation error
2922. NEGATIVE: Missing reason — validation error

### Referral Tracking
2923. Track referral status changes
2924. Referral follow-up date
2925. Referral response received
2926. Referral consultation report attached
2927. Referral closed/completed
2928. Overdue referral highlighting
2929. Referral reminder notifications

### Order Sets
2930. Create order set (group of related orders)
2931. Order set includes lab + imaging + referral
2932. Apply order set to patient — creates all orders
2933. Edit order set template
2934. Delete order set template
2935. NEGATIVE: Empty order set — validation error

### E-Prescribing (tabKey: medications)
2936. Navigate to patient chart → Medications tab — loads
2937. Medication list shows active medications
2938. Click "New Prescription" — opens form
2939. Prescription — drug search (NDC codes from ciyex-codes)
2940. Prescription — dosage field
2941. Prescription — frequency dropdown
2942. Prescription — route dropdown (oral, topical, injection, etc.)
2943. Prescription — quantity field
2944. Prescription — refills field
2945. Prescription — DAW (Dispense As Written) toggle
2946. Prescription — pharmacy selection (from pharmacies settings)
2947. Prescription — start date
2948. Prescription — end date
2949. Prescription — instructions/SIG field
2950. Save prescription — appears in medication list
2951. Edit prescription — pre-populated
2952. Discontinue medication — status updated
2953. NEGATIVE: Missing drug — validation error
2954. NEGATIVE: Missing dosage — validation error
2955. NEGATIVE: Missing pharmacy — validation error (for e-prescribe)
2956. NEGATIVE: End date before start date — validation error

### Drug Interaction Checking
2957. Add medication with known interaction — alert shown
2958. Drug-drug interaction severity levels
2959. Drug-allergy interaction check
2960. Interaction alert can be overridden with reason
2961. Interaction check uses patient's active medications
2962. Interaction check uses patient's allergy list
2963. NEGATIVE: Override interaction without reason — blocked

### Medication History
2964. Active medications tab
2965. Discontinued medications tab
2966. Medication history timeline view
2967. Medication refill history
2968. Medication adherence tracking if available
2969. Print medication list

### Prior Authorization
2970. Prior auth request from medication order
2971. Prior auth request from imaging order
2972. Prior auth status tracking
2973. Prior auth number field
2974. Prior auth expiration date
2975. Prior auth approval/denial display
2976. NEGATIVE: Expired prior auth — warning

### Orders Dashboard / Inbox
2977. Orders inbox shows pending orders
2978. Orders inbox shows unsigned results
2979. Orders inbox shows pending referrals
2980. Orders inbox count badge in sidebar
2981. Click order in inbox — navigates to patient chart
2982. Mark order as reviewed
2983. Batch review multiple orders
2984. Filter inbox by order type
2985. Filter inbox by provider
2986. Sort inbox by date/priority

### Orders Negative Tests
2987. NEGATIVE: Order for deceased patient — warning
2988. NEGATIVE: Order without active insurance — warning
2989. NEGATIVE: Duplicate order within 24 hours — warning
2990. NEGATIVE: Order by non-provider role — permission denied
2991. NEGATIVE: Lab order — invalid LOINC code — error
2992. NEGATIVE: Prescription — invalid NDC code — error
2993. NEGATIVE: Referral to inactive provider — warning
2994. NEGATIVE: Order without encounter context — appropriate handling
2995. NEGATIVE: Very long clinical notes (5000 chars) — handled
2996. NEGATIVE: Order search with no results — empty state message
2997. NEGATIVE: Cancel already-completed order — not allowed
2998. NEGATIVE: Edit signed/locked order — not allowed
2999. NEGATIVE: Network error during order save — retry option
3000. Orders audit trail — all order actions logged

---

## Section 9: Inventory Management (3001-3300)

### Inventory Dashboard (tabKey: inventory)
3001. Navigate to Inventory page — loads
3002. Inventory list shows all items
3003. Inventory columns: name, category, quantity, unit, reorder level
3004. Inventory status badges (In Stock, Low Stock, Out of Stock)
3005. Low stock items highlighted
3006. Out of stock items highlighted in red
3007. Inventory search by item name
3008. Inventory filter by category
3009. Inventory filter by status
3010. Inventory sort by name/quantity/category
3011. Inventory pagination works

### Inventory Items CRUD
3012. Click "Add Item" — opens form
3013. Item name field required
3014. Item SKU/barcode field
3015. Item category dropdown
3016. Item description field
3017. Item unit of measure (each, box, vial, etc.)
3018. Item current quantity field (numeric)
3019. Item reorder level threshold
3020. Item reorder quantity (auto-order amount)
3021. Item cost per unit (currency)
3022. Item selling price (currency)
3023. Item supplier/vendor field
3024. Item expiration date field
3025. Item lot number field
3026. Item storage location field
3027. Item NDC code (for medications) from ciyex-codes
3028. Save new item — appears in list
3029. Edit item — form pre-populated
3030. Update item — changes persist
3031. Delete item — removed from list
3032. NEGATIVE: Empty item name — validation error
3033. NEGATIVE: Negative quantity — validation error
3034. NEGATIVE: Negative reorder level — validation error
3035. NEGATIVE: Negative cost — validation error
3036. NEGATIVE: Expiration date in past — warning

### Inventory Transactions
3037. Record stock received — increases quantity
3038. Record stock used/dispensed — decreases quantity
3039. Record stock adjustment — manual correction
3040. Record stock wasted/expired — decreases quantity
3041. Transaction history per item
3042. Transaction columns: date, type, quantity, user, notes
3043. Transaction filter by type
3044. Transaction filter by date range
3045. Transaction audit trail complete
3046. NEGATIVE: Dispense more than available — warning/error
3047. NEGATIVE: Negative adjustment resulting in negative stock — error

### Inventory Categories
3048. View inventory categories list
3049. Create new category
3050. Edit category name
3051. Delete empty category
3052. NEGATIVE: Delete category with items — warning
3053. Category filter applied to inventory list

### Inventory Suppliers
3054. View supplier list
3055. Create new supplier — name, contact, phone, email
3056. Edit supplier details
3057. Delete supplier
3058. NEGATIVE: Delete supplier with linked items — warning
3059. Supplier appears in item form dropdown

### Inventory Reorder Alerts
3060. Low stock alert when quantity <= reorder level
3061. Alert badge in sidebar/notification area
3062. Alert list shows all low stock items
3063. Click alert — navigates to item
3064. Mark alert as acknowledged
3065. Auto-generate purchase order from alert
3066. NEGATIVE: Reorder level = 0 — no alerts generated

### Purchase Orders
3067. Navigate to Purchase Orders — list loads
3068. Click "New Purchase Order" — opens form
3069. PO supplier selection dropdown
3070. Add line items (item, quantity, unit cost)
3071. PO total auto-calculated
3072. PO expected delivery date
3073. PO notes field
3074. Save PO — appears in list
3075. PO status: Draft, Submitted, Received, Cancelled
3076. Submit PO — status changes
3077. Receive PO — inventory quantities updated
3078. Partial receive — track remaining
3079. Cancel PO — status updated
3080. NEGATIVE: PO with no line items — validation error
3081. NEGATIVE: PO with no supplier — validation error
3082. Print purchase order

### Inventory Reports
3083. Inventory valuation report (total cost)
3084. Stock movement report (in/out over period)
3085. Expired items report
3086. Low stock report
3087. Usage by category report
3088. Supplier spending report
3089. Report date range filter
3090. Report export to CSV
3091. Report print layout

### Inventory Barcode
3092. Barcode scan input field for quick lookup
3093. Scan barcode — finds matching item
3094. Barcode on printed labels
3095. Multiple barcode formats supported (UPC, Code 128)
3096. NEGATIVE: Scan unregistered barcode — "Not found" message

### Vaccine Inventory (VFC)
3097. Vaccine items have additional fields (lot, manufacturer, VFC eligible)
3098. Vaccine temperature tracking field
3099. Vaccine expiration monitoring
3100. VFC (Vaccines for Children) program tracking
3101. Vaccine lot number links to immunization records
3102. NEGATIVE: Expired vaccine — cannot administer warning

### Controlled Substance Tracking
3103. Controlled substance flag on item
3104. Additional logging for controlled substances
3105. Two-person verification for dispensing
3106. DEA schedule classification field
3107. Controlled substance inventory count reconciliation
3108. NEGATIVE: Dispense controlled substance without authorization — blocked

### Inventory Multi-location
3109. Inventory tracked per facility location
3110. Transfer stock between locations
3111. Transfer creates paired transactions (out from source, in to destination)
3112. Location-specific stock levels
3113. NEGATIVE: Transfer more than available at source — error
3114. Consolidated view across all locations

### Sample/Demo Items
3115. Sample medication tracking
3116. Sample expiration monitoring
3117. Sample dispensing log
3118. Drug rep sample receipt tracking
3119. Sample inventory separate from purchased stock

### Inventory Integration
3120. Inventory links to encounter (items used during visit)
3121. Inventory links to procedure (supplies consumed)
3122. Auto-decrement on procedure completion if configured
3123. Inventory cost tracked per encounter for billing
3124. Inventory usage in encounter summary

### Inventory Negative — Edge Cases
3125. NEGATIVE: Concurrent stock update — race condition handled
3126. NEGATIVE: Import items with duplicate SKU — warning
3127. NEGATIVE: Very large quantity (999999) — accepted
3128. NEGATIVE: Zero quantity item — allowed (placeholder)
3129. NEGATIVE: Special characters in item name — handled
3130. NEGATIVE: Unicode in item description — handled
3131. NEGATIVE: Inventory page with 10000 items — paginated/virtual scroll
3132. NEGATIVE: Delete item with transaction history — soft delete
3133. NEGATIVE: API timeout during save — error toast
3134. NEGATIVE: Network offline — appropriate error

### Inventory Audit
3135. Full audit log of all inventory changes
3136. Audit includes user, timestamp, action, old/new values
3137. Audit searchable by item, user, date
3138. Audit exportable
3139. Physical inventory count feature
3140. Discrepancy report (system vs physical count)

### Inventory Wastage/Disposal
3141. Record item disposal — reason required
3142. Disposal reasons: expired, damaged, recalled, contaminated
3143. Disposal requires supervisor approval for high-value items
3144. Disposal history report
3145. NEGATIVE: Disposal without reason — validation error

### Inventory Settings
3146. Inventory settings — default reorder levels
3147. Inventory settings — low stock threshold percentage
3148. Inventory settings — auto-reorder toggle
3149. Inventory settings — notification preferences
3150. Inventory settings — costing method (FIFO, LIFO, average)

### Inventory Search & Navigation
3151. Global search includes inventory items
3152. Quick search from inventory dashboard
3153. Advanced search with multiple filters
3154. Recent items quick access
3155. Favorite/frequently used items list
3156. Inventory breadcrumb navigation
3157. Inventory back button preserves filters

### Inventory Responsive
3158. Inventory list responsive on tablet
3159. Inventory list card view on mobile
3160. Inventory form responsive
3161. Purchase order form responsive on tablet
3162. Barcode scanner works on mobile device

### Inventory Permissions
3163. Admin can manage all inventory
3164. Provider can view inventory
3165. Staff can record transactions
3166. Billing can view inventory costs
3167. NEGATIVE: Staff cannot delete items — permission denied
3168. NEGATIVE: Provider cannot edit costs — permission denied

### Inventory Printing
3169. Print inventory list
3170. Print item detail/label
3171. Print barcode labels (batch)
3172. Print purchase order
3173. Print inventory valuation report
3174. Print configured with practice header

### Inventory Additional Tests
3175. Item image/photo upload
3176. Item attachment (MSDS, manual)
3177. Item notes/comments
3178. Item manufacturer field
3179. Item model number field
3180. Minimum order quantity field
3181. Lead time field (days for delivery)
3182. Item substitute/alternative linking
3183. Recalled item flag and alert
3184. NEGATIVE: Recalled item — cannot dispense warning

### Inventory Expiry Management
3185. Expiring items report (within 30/60/90 days)
3186. Expired items highlighted in list
3187. Auto-filter to show expiring items
3188. Expiry notification sent to responsible user
3189. NEGATIVE: Use expired item — warning/block
3190. First-expiry-first-out (FEFO) dispensing suggestion

### Inventory Import/Export
3191. Import inventory from CSV
3192. Export inventory to CSV
3193. Import validates required fields
3194. Import shows preview before commit
3195. Import error report per row
3196. Export includes all item fields
3197. Export filtered results
3198. NEGATIVE: Invalid CSV format — error message
3199. NEGATIVE: Missing required columns — error
3200. Template CSV download for import format

### Inventory Financial
3201. Inventory total value calculation
3202. Cost of goods sold tracking
3203. Markup/margin calculation per item
3204. Inventory write-off functionality
3205. Financial report for inventory valuation
3206. NEGATIVE: Cost > selling price — margin warning

### Inventory API Integration
3207. All inventory CRUD through GenericFhirResourceService
3208. Inventory form driven by tab_field_config
3209. Inventory fields from field_config JSON
3210. Inventory options from field_config (categories, units)
3211. No hardcoded inventory categories
3212. No hardcoded unit of measure options
3213. Inventory API calls use proper auth headers
3214. Inventory API respects org_alias tenant isolation

### Inventory Workflow Automation
3215. Auto-create PO when stock below reorder level
3216. Auto-notify manager on low stock
3217. Auto-flag expired items daily
3218. Batch expiry check scheduled job
3219. Auto-archive old transactions

### Inventory Edge Cases — Final
3220. Item with zero reorder level — never triggers alert
3221. Item with no category — uncategorized bucket
3222. Item with no supplier — supplier field blank
3223. Item with no SKU — system-generated ID
3224. Duplicate item names across categories — allowed
3225. Delete last item in category — category remains
3226. Inventory page no items — "No inventory items" empty state
3227. 100+ purchase orders — paginated
3228. PO with 50 line items — scrollable form
3229. Transaction history 1000+ entries — paginated
3230. Concurrent PO receive and manual adjustment — handled
3231. Switch practice — inventory changes to new org
3232. Multi-facility inventory isolated per location
3233. Inventory changes not visible to other tenants
3234. NEGATIVE: Access inventory via API with wrong org — forbidden
3235. NEGATIVE: Inventory API with expired token — 401

### Inventory — Dispensing
3236. Dispense item to patient — form with patient, quantity, reason
3237. Dispense links to patient record
3238. Dispense links to encounter if active
3239. Dispense tracks lot number used
3240. Dispense receipt printable
3241. Dispensing history per patient
3242. NEGATIVE: Dispense to non-existent patient — error
3243. NEGATIVE: Dispense without quantity — error

### Inventory — Returns
3244. Return item to supplier — form
3245. Return reason required
3246. Return adjusts inventory quantity
3247. Return authorization number field
3248. Return shipping tracking
3249. Return credit memo tracking
3250. NEGATIVE: Return more than received — error

### Inventory — Cycle Counting
3251. Schedule cycle count
3252. Cycle count assignment (items to count)
3253. Enter physical count
3254. Variance report (system vs counted)
3255. Approve adjustments
3256. NEGATIVE: Counted quantity negative — error
3257. Cycle count history

### Inventory — Cost Tracking
3258. Track cost per transaction
3259. Cost average calculation
3260. Cost trend over time
3261. Cost per encounter calculation
3262. Cost report by category
3263. Cost report by provider
3264. Cost report by date range

### Inventory — Kit/Bundle Management
3265. Create item kit (group of items)
3266. Kit depletes all component items on use
3267. Kit availability based on component availability
3268. Kit cost = sum of component costs
3269. NEGATIVE: Kit with unavailable component — warning

### Inventory — Temperature Sensitive
3270. Temperature log for cold chain items
3271. Temperature excursion alert
3272. Temperature monitoring integration
3273. Cold chain documentation
3274. NEGATIVE: Temperature out of range — alert

### Inventory — Performance
3275. Inventory list loads within 2 seconds
3276. Inventory search results within 500ms
3277. Inventory save completes within 2 seconds
3278. Transaction history loads within 2 seconds
3279. Large inventory export within 10 seconds
3280. Inventory page smooth scrolling

### Inventory — Final Accessibility
3281. Inventory forms keyboard accessible
3282. Inventory tables keyboard navigable
3283. Screen reader announces inventory changes
3284. High contrast mode for inventory badges
3285. Focus indicators visible on all controls
3286. Inventory modal dialogs accessible

### Inventory — Comprehensive CRUD Loop
3287. Create item → verify in list → edit → verify changes → delete → verify removed
3288. Create PO → add items → submit → receive → verify inventory updated
3289. Create category → assign items → delete category → items uncategorized
3290. Create supplier → assign to items → delete supplier → items supplier cleared
3291. Dispense item → verify quantity decreased → view transaction history
3292. Adjust quantity → verify new quantity → view adjustment in history
3293. Record waste → verify quantity decreased → view waste report
3294. Transfer between locations → verify both locations updated
3295. Import CSV → verify items created → export → verify export matches
3296. Inventory full workflow: create → stock → dispense → reorder → receive → repeat

### Inventory — Remaining
3297. Inventory dashboard summary cards (total items, total value, alerts)
3298. Inventory charts (stock level trends, usage patterns)
3299. Inventory email/notification when PO received
3300. Inventory year-end valuation snapshot

---

## Section 10: Reports (3301-3500)

### Reports Dashboard
3301. Navigate to Reports — page loads
3302. Reports categories list: Clinical, Financial, Operational, Custom
3303. Report tiles/cards with descriptions
3304. Search reports by name
3305. Favorite reports quick access
3306. Recently run reports list
3307. Report permissions based on user role
3308. NEGATIVE: Non-admin access restricted reports — permission denied

### Patient Reports
3309. Patient demographics report — all patients
3310. Patient demographics — filter by status (active/inactive)
3311. Patient demographics — filter by gender
3312. Patient demographics — filter by age range
3313. Patient demographics — filter by insurance
3314. Patient demographics — filter by provider
3315. Patient census report (total active patients)
3316. New patients report (by date range)
3317. Patient retention/attrition report
3318. Patient no-show report
3319. Patient recall due report
3320. Patient birthday list
3321. Report date range selector
3322. Report export to CSV
3323. Report export to PDF
3324. Report print layout
3325. NEGATIVE: Report with no data — "No results" message

### Appointment Reports
3326. Daily appointment schedule report
3327. Weekly appointment summary
3328. Monthly appointment volume
3329. Appointment by provider report
3330. Appointment by type report
3331. Appointment no-show rate report
3332. Appointment cancellation report
3333. Average wait time report
3334. Appointment utilization (booked vs available slots)
3335. Provider productivity report (patients per day)
3336. Filter by provider
3337. Filter by facility/location
3338. Filter by date range
3339. Filter by appointment type
3340. NEGATIVE: Date range > 1 year — performance warning or pagination

### Financial Reports
3341. Revenue summary report
3342. Revenue by provider report
3343. Revenue by service/CPT report
3344. Revenue by payer/insurance report
3345. Collection report (payments received)
3346. Aging report (outstanding balances by age bucket)
3347. Aging buckets: 0-30, 31-60, 61-90, 90+ days
3348. Write-off report
3349. Adjustment report
3350. Daily deposit/payment summary
3351. Monthly financial summary
3352. Year-over-year comparison
3353. Fee schedule utilization report
3354. Copay collection report
3355. Patient balance report
3356. Insurance payment report
3357. Denial report (claim denials)
3358. Filter by date range
3359. Filter by provider
3360. Filter by payer
3361. NEGATIVE: Financial report without billing data — empty state

### Clinical Reports
3362. Diagnosis frequency report (top ICD-10 codes)
3363. Procedure frequency report (top CPT codes)
3364. Medication prescribing report
3365. Lab order volume report
3366. Referral tracking report
3367. Immunization coverage report
3368. Preventive care gaps report
3369. Chronic disease registry (diabetes, hypertension, etc.)
3370. BMI distribution report
3371. Vital signs trending report (population)
3372. Allergy prevalence report
3373. Filter by diagnosis code
3374. Filter by provider
3375. Filter by date range
3376. NEGATIVE: Clinical report for empty practice — empty state

### Encounter Reports
3377. Encounter volume by date
3378. Encounter volume by provider
3379. Encounter volume by type
3380. Encounter duration analysis
3381. Encounter status distribution (signed/unsigned)
3382. Unsigned encounter report
3383. Encounter with missing documentation
3384. Encounter by specialty
3385. Average encounters per day/week/month
3386. Filter by provider, date range, status

### Operational Reports
3387. Staff productivity report
3388. Room utilization report
3389. Check-in to check-out time report
3390. Patient wait time report
3391. Provider schedule adherence report
3392. Appointment slot fill rate
3393. Peak hours analysis
3394. No-show trends over time
3395. Cancellation reasons report
3396. Patient satisfaction scores if tracked

### Report Builder (Custom Reports)
3397. Navigate to Custom Report Builder — loads
3398. Select data source/resource type
3399. Select fields/columns to include
3400. Add filter criteria
3401. Add sort criteria
3402. Add grouping/aggregation
3403. Preview report before running
3404. Save custom report template
3405. Load saved report template
3406. Share report template with other users
3407. Schedule report to run automatically
3408. NEGATIVE: No fields selected — validation error
3409. NEGATIVE: Incompatible filter — validation message

### Report Visualizations
3410. Bar chart visualization
3411. Line chart visualization
3412. Pie chart visualization
3413. Table/grid visualization
3414. Combination chart (bar + line)
3415. Chart color scheme matches ui_color_config
3416. Chart legend display
3417. Chart tooltip on hover
3418. Chart click-through to detail
3419. Chart responsive on resize
3420. Chart export as image
3421. Toggle between chart and table view

### Report Export & Sharing
3422. Export to CSV — correct formatting
3423. Export to PDF — print-quality layout
3424. Export to Excel if supported
3425. Email report to recipient
3426. Schedule recurring report email
3427. Report download progress indicator
3428. Large report export (10000+ rows) — chunked or async
3429. NEGATIVE: Export with invalid date format — error
3430. NEGATIVE: Export timeout — retry option

### Report Drill-Down
3431. Click summary value — drill to detail
3432. Drill-down maintains context/filters
3433. Breadcrumb shows drill path
3434. Back button returns to summary
3435. Drill to individual patient record
3436. Drill to individual encounter
3437. Drill to individual claim

### Compliance Reports
3438. HIPAA compliance audit report
3439. User access log report
3440. Failed login attempts report
3441. Data access audit trail
3442. PHI disclosure log
3443. Security incident report
3444. Password expiry report
3445. Role permission matrix report
3446. NEGATIVE: Non-admin access compliance reports — denied

### Quality Measures
3447. Quality measure dashboard
3448. HEDIS measures tracking
3449. MIPS/MACRA quality reporting
3450. CMS quality metrics
3451. Provider quality scorecard
3452. Measure numerator/denominator breakdown
3453. Gap analysis for quality measures
3454. Quality measure trend over time

### Report Performance
3455. Simple report loads within 3 seconds
3456. Complex report loads within 10 seconds
3457. Report pagination for large datasets
3458. Report loading indicator (spinner/skeleton)
3459. Report cancel button for long-running queries
3460. Cached report results for repeated runs
3461. NEGATIVE: Report timeout — appropriate error message

### Report Date Handling
3462. Report date range — today
3463. Report date range — this week
3464. Report date range — this month
3465. Report date range — this quarter
3466. Report date range — this year
3467. Report date range — custom range
3468. Report date range — last 30/60/90 days
3469. Report comparison — this period vs last period
3470. NEGATIVE: End date before start date — validation error
3471. NEGATIVE: Future date range — allowed but shows warning
3472. Date range persists on report re-run

### Report Filters
3473. Multi-select provider filter
3474. Multi-select facility filter
3475. Multi-select insurance filter
3476. Multi-select status filter
3477. Filter combination (AND logic)
3478. Clear all filters button
3479. Filter state saved with report
3480. Applied filters shown as chips/tags
3481. NEGATIVE: Filter with no matching data — empty state message

### Report Permissions & Security
3482. Reports respect user role permissions
3483. Financial reports — billing role only
3484. Clinical reports — provider + admin roles
3485. Compliance reports — admin only
3486. Report data respects multi-tenancy
3487. Report data scoped to current org_alias
3488. NEGATIVE: Report API with wrong org — forbidden
3489. NEGATIVE: Report API without auth — 401
3490. PHI in reports — appropriate access controls

### Report Accessibility
3491. Report tables keyboard navigable
3492. Report charts have alt text / data table equivalent
3493. Report filters keyboard accessible
3494. Report date pickers keyboard accessible
3495. Report export buttons accessible
3496. High contrast mode for report charts
3497. Screen reader announces report results

### Report Edge Cases
3498. Report spanning midnight — correct date handling
3499. Report with timezone differences — consistent times
3500. Report with null/missing data — shows "N/A" not blank

---

## Section 11: Messaging & Recall (3501-3650)

### Patient Messaging
3501. Navigate to Messages/Inbox — page loads
3502. Inbox shows received messages
3503. Sent messages tab
3504. Drafts tab
3505. Message list columns: from, subject, date, read/unread
3506. Unread message count badge in sidebar
3507. Click message — opens message detail
3508. Message detail shows full content
3509. Reply to message — opens compose
3510. Forward message — opens compose with content
3511. Compose new message — form opens
3512. Compose — recipient search (patient or provider)
3513. Compose — subject field required
3514. Compose — message body (rich text or plain)
3515. Compose — attachment support
3516. Send message — appears in sent folder
3517. Save as draft — appears in drafts
3518. Delete message — moved to trash or removed
3519. Mark message as read
3520. Mark message as unread
3521. Search messages by subject/content
3522. Filter messages by date range
3523. Filter messages by sender
3524. Message pagination
3525. NEGATIVE: Send with empty subject — validation error
3526. NEGATIVE: Send with no recipient — validation error
3527. NEGATIVE: Send with empty body — warning
3528. NEGATIVE: Attachment too large — size limit error
3529. NEGATIVE: Invalid file type attachment — error

### Secure Messaging
3530. Messages encrypted in transit (HTTPS)
3531. Message contains no PHI in subject (configurable warning)
3532. Message audit trail maintained
3533. Message read receipt if enabled
3534. Message expiry/auto-delete if configured
3535. Provider-to-provider messaging
3536. Provider-to-patient messaging (portal)
3537. Staff-to-provider messaging
3538. Message priority levels (Normal, Urgent)

### Patient Portal Messaging
3539. Patient sends message via portal
3540. Provider receives in inbox
3541. Provider replies — patient sees in portal
3542. Patient portal message notification (email)
3543. Portal message attachment support
3544. Portal message read status

### Recall Management (tabKey: recalls, Communication resource)
3545. Navigate to Recalls — page loads
3546. Recall list shows all scheduled recalls
3547. Recall columns: patient, type, due date, status, method
3548. Click "Create Recall" — opens form
3549. Recall — patient selection
3550. Recall — recall type (from recallTypes settings)
3551. Recall — due date
3552. Recall — notification method (email, SMS, phone, letter)
3553. Recall — provider assignment
3554. Recall — notes field
3555. Save recall — appears in list
3556. Edit recall — pre-populated
3557. Delete recall — removed
3558. NEGATIVE: Missing patient — validation error
3559. NEGATIVE: Missing due date — validation error
3560. NEGATIVE: Due date in past — warning

### Recall Status Management
3561. Recall status: Scheduled, Sent, Confirmed, Completed, Cancelled
3562. Status change via dropdown or action buttons
3563. Mark recall as sent — timestamp recorded
3564. Mark recall as confirmed — patient responded
3565. Mark recall as completed — appointment scheduled
3566. Cancel recall — reason field
3567. Auto-complete recall when appointment booked
3568. Overdue recalls highlighted

### Recall Batch Operations
3569. Select multiple recalls
3570. Batch send selected recalls
3571. Batch cancel selected recalls
3572. Batch export selected recalls
3573. Select all / deselect all
3574. Batch action confirmation dialog
3575. NEGATIVE: Batch action on 0 selected — disabled button

### Recall Notifications
3576. Email recall notification sent to patient
3577. SMS recall notification sent to patient
3578. Phone call recall logged
3579. Letter recall generated (merge with template)
3580. Notification template customization
3581. Notification history per recall
3582. NEGATIVE: Patient with no email — email method fails gracefully
3583. NEGATIVE: Patient with no phone — SMS method fails gracefully

### Recall Reports
3584. Recall due report (upcoming)
3585. Recall overdue report
3586. Recall completion rate report
3587. Recall by type report
3588. Recall by provider report
3589. Recall response rate report
3590. Filter by date range
3591. Filter by recall type
3592. Filter by status
3593. Export recall report

### Recall Auto-Generation
3594. Auto-create recall from encounter (e.g., 6-month dental recall)
3595. Auto-recall rules based on visit type
3596. Auto-recall interval from recall type settings
3597. Auto-recall respects patient preferences
3598. NEGATIVE: Duplicate recall prevention for same patient/type

### Recall Calendar View
3599. Recall calendar showing due dates
3600. Calendar color-coded by recall type
3601. Calendar click date — shows recalls due that day
3602. Calendar month/week toggle
3603. Calendar navigation (prev/next month)

### Task Management / To-Do
3604. Task list for staff
3605. Create task — assignee, due date, description
3606. Task priority levels
3607. Task status: Open, In Progress, Completed
3608. Task notifications to assignee
3609. Task overdue highlighting
3610. Task linked to patient if applicable
3611. Complete task — timestamp recorded
3612. NEGATIVE: Task with no assignee — validation error
3613. NEGATIVE: Task with past due date — warning

### Internal Notes
3614. Add internal note to patient chart
3615. Internal notes visible to staff only (not portal)
3616. Internal note timestamp and author
3617. Edit internal note
3618. Delete internal note
3619. Pin important note to top
3620. NEGATIVE: Empty note — validation error

### Communication Log
3621. All patient communications logged
3622. Communication types: phone, email, SMS, letter, portal
3623. Communication log — date, type, subject, user
3624. Add manual communication log entry
3625. Communication log linked to patient
3626. Communication log searchable
3627. Communication log filterable by type
3628. Communication log exportable
3629. NEGATIVE: Communication log without patient — validation error

### Messaging Negative & Edge Cases
3630. NEGATIVE: Message to deactivated patient — warning
3631. NEGATIVE: Reply to deleted message — error
3632. NEGATIVE: Forward message without content — warning
3633. NEGATIVE: Very long message body (50000 chars) — handled
3634. NEGATIVE: Message with multiple large attachments — size limit
3635. NEGATIVE: Send message during network outage — queued or error
3636. NEGATIVE: Recall for deceased patient — warning
3637. NEGATIVE: Recall for inactive patient — warning
3638. Message threading/conversation view
3639. Message auto-save draft while composing
3640. Message spell check in compose
3641. Recall list with 1000+ entries — paginated
3642. Recall search by patient name
3643. Messaging respects multi-tenancy (org_alias)
3644. Messages not visible to other tenants
3645. Messaging audit trail for HIPAA
3646. Bulk message to patient group
3647. Message template quick-insert
3648. Recall effectiveness tracking (sent → confirmed ratio)
3649. Messaging accessible (keyboard, screen reader)
3650. All messaging/recall through GenericFhirResourceService

---

## Section 12: Claims & Billing (3651-3850)

### Claims Dashboard
3651. Navigate to Claims/Billing — page loads
3652. Claims dashboard summary cards (pending, submitted, paid, denied)
3653. Claims list with columns: date, patient, CPT, amount, status, payer
3654. Claims status badges with colors from ui_color_config
3655. Claims search by patient name
3656. Claims search by claim number
3657. Claims filter by status
3658. Claims filter by payer
3659. Claims filter by date range
3660. Claims filter by provider
3661. Claims sort by date/amount/status
3662. Claims pagination

### Claim Creation (tabKey: claims, Claim resource)
3663. Click "New Claim" — opens form
3664. Claim — patient selection
3665. Claim — encounter association
3666. Claim — rendering provider
3667. Claim — billing provider (from settings)
3668. Claim — facility/service location
3669. Claim — date of service
3670. Claim — diagnosis codes (ICD-10, up to 12)
3671. Claim — procedure codes (CPT) with modifiers
3672. Claim — units for each procedure
3673. Claim — fee auto-populated from fee schedule
3674. Claim — total charge auto-calculated
3675. Claim — primary insurance from patient coverage
3676. Claim — secondary insurance if applicable
3677. Claim — prior authorization number
3678. Claim — referring provider if referral
3679. Claim — place of service code
3680. Claim — type of service
3681. Save claim as draft — editable
3682. Submit claim — status changes to Submitted
3683. NEGATIVE: Claim with no diagnosis — validation error
3684. NEGATIVE: Claim with no procedure — validation error
3685. NEGATIVE: Claim with no insurance — validation error
3686. NEGATIVE: Claim with invalid CPT-ICD linkage — NCCI warning
3687. NEGATIVE: Claim exceeding MUE limits — warning
3688. NEGATIVE: Duplicate claim for same DOS — warning

### Claim from Encounter
3689. Auto-generate claim from encounter checkout
3690. Encounter diagnoses auto-populate claim
3691. Encounter procedures auto-populate claim
3692. Provider from encounter auto-fills claim
3693. Patient insurance auto-fills claim
3694. Fee schedule lookup for encounter CPT codes
3695. Claim draft created, ready for review and submit
3696. Missing encounter data prompts for completion

### Claim Status Tracking
3697. Claim status: Draft, Ready, Submitted, Accepted, Paid, Denied, Appealed
3698. Status change with timestamp and user
3699. Status history viewable per claim
3700. Claim submission date tracked
3701. Claim response/adjudication date tracked
3702. Days in each status tracked
3703. Claim status timeline visualization

### Claim Editing
3704. Edit draft claim — all fields editable
3705. Edit submitted claim — limited fields (corrections)
3706. Void/cancel claim
3707. Resubmit corrected claim
3708. Clone claim for similar service
3709. NEGATIVE: Edit paid claim — not allowed
3710. NEGATIVE: Edit claim in transit — warning

### Claim Validation (NCCI Integration)
3711. NCCI PTP edit check before submission
3712. Column 1 / Column 2 code pair validation
3713. Modifier exemption handling (modifier 25, 59, XE, XP, XS, XU)
3714. MUE limit validation per CPT code
3715. Validation results displayed as warnings/errors
3716. Override validation with reason (provider attestation)
3717. NEGATIVE: Submit with unresolved validation errors — blocked

### Payment Posting (tabKey: payments, PaymentReconciliation resource)
3718. Navigate to Payment Posting — page loads
3719. Post insurance payment — amount, check/EFT number, date
3720. Apply payment to specific claim line items
3721. Partial payment handling
3722. Overpayment handling
3723. Contractual adjustment posting
3724. Other adjustment types (write-off, discount, etc.)
3725. Patient responsibility calculation (copay, deductible, coinsurance)
3726. Transfer balance to secondary insurance
3727. Transfer balance to patient
3728. Payment batch (multiple claims, one payment)
3729. ERA auto-posting (835 file import)
3730. NEGATIVE: Payment amount > claim balance — overpayment warning
3731. NEGATIVE: Negative payment amount — refund processing
3732. NEGATIVE: Payment to wrong claim — adjustment needed

### Patient Billing
3733. Patient statement generation
3734. Patient balance summary
3735. Patient payment history
3736. Accept patient payment (copay, balance)
3737. Payment methods: cash, check, credit card
3738. Payment receipt generation
3739. Payment plan setup
3740. Payment plan installments tracking
3741. NEGATIVE: Payment exceeds balance — change/credit generated
3742. NEGATIVE: Declined credit card — error message

### Claim Denial Management
3743. Denied claims list
3744. Denial reason codes displayed
3745. Denial reason descriptions
3746. Appeal workflow — create appeal
3747. Appeal letter generation
3748. Appeal tracking (sent, received, resolved)
3749. Denial analytics (top denial reasons)
3750. Denial prevention suggestions
3751. Resubmit denied claim with corrections
3752. NEGATIVE: Appeal without reason — validation error

### EOB Processing (ExplanationOfBenefit resource)
3753. View EOB from payer
3754. EOB line item detail
3755. Allowed amount display
3756. Patient responsibility breakdown
3757. Non-covered services highlighted
3758. EOB links to original claim
3759. Auto-post from EOB data

### Superbill / Charge Capture
3760. Superbill from encounter
3761. Superbill template with pre-populated codes
3762. Superbill diagnosis selection
3763. Superbill procedure selection with search
3764. Superbill fee auto-populated
3765. Superbill submit for claim generation
3766. Print superbill
3767. NEGATIVE: Superbill with no codes — validation error

### Billing Reports
3768. Revenue report by date range
3769. Revenue report by provider
3770. Revenue report by CPT code
3771. Revenue report by payer
3772. Aging report (A/R aging)
3773. Collection rate report
3774. Denial rate report
3775. Adjustment report
3776. Payment report by method
3777. Financial dashboard charts
3778. Daily closeout report
3779. Monthly financial statement
3780. Year-end financial summary

### CMS-1500 / UB-04 Forms
3781. CMS-1500 claim form generation
3782. CMS-1500 all boxes populated correctly
3783. CMS-1500 print preview
3784. CMS-1500 PDF export
3785. UB-04 form generation for facility claims
3786. Electronic claim submission (837P/837I)
3787. NEGATIVE: Missing required CMS-1500 fields — highlighted

### Insurance Eligibility
3788. Real-time eligibility check (270/271)
3789. Eligibility response display (active/inactive)
3790. Copay amount from eligibility
3791. Deductible remaining from eligibility
3792. Out-of-pocket maximum status
3793. Eligibility check before appointment
3794. Eligibility check at check-in
3795. Batch eligibility check (daily)
3796. NEGATIVE: Eligibility timeout — retry option
3797. NEGATIVE: Invalid member ID — not found message

### Claims Negative & Edge Cases
3798. NEGATIVE: Submit claim for uninsured patient — self-pay handling
3799. NEGATIVE: Claim with $0 charge — warning
3800. NEGATIVE: Claim for future date of service — warning
3801. NEGATIVE: Claim older than timely filing limit — warning
3802. NEGATIVE: Claim with inactive insurance — error
3803. NEGATIVE: Claim with inactive provider NPI — error
3804. NEGATIVE: Modifier without procedure code — error
3805. NEGATIVE: More than 4 modifiers per line — error
3806. NEGATIVE: Procedure code not in fee schedule — fee = $0 warning
3807. NEGATIVE: Payment posting to closed claim — not allowed
3808. NEGATIVE: Write-off without authorization — permission check
3809. NEGATIVE: Billing user access clinical data — restricted
3810. NEGATIVE: Delete claim with posted payments — not allowed
3811. Claims respect multi-tenancy (org_alias isolation)
3812. Claims data not visible to other tenants
3813. All claims through FhirFacadeController / GenericFhirResourceService
3814. No hardcoded claim status values — from config

### Claims Integration
3815. Claim auto-generated from encounter sign-off
3816. Claim diagnosis from encounter problem list
3817. Claim procedures from encounter procedures
3818. Claim insurance from patient coverage tab
3819. Claim fee from fee schedule settings
3820. Claim NPI from provider settings
3821. Claim facility from encounter location
3822. Claim referring provider from referral

### Claims Workflow
3823. Encounter → Charge capture → Claim creation → Validation → Submission
3824. Submission → Payer processing → EOB/ERA received → Payment posting
3825. Denial → Appeal → Resolution → Payment or write-off
3826. Patient balance → Statement → Patient payment → Account closed
3827. Full revenue cycle visibility

### Claims Accessibility
3828. Claims forms keyboard navigable
3829. Claims tables keyboard navigable
3830. Claims status badges have text labels (not color only)
3831. Claims amounts formatted with currency symbol
3832. Claims dates formatted consistently
3833. Screen reader compatible claim detail

### Claims Performance
3834. Claims list loads within 2 seconds
3835. Claim creation form within 1 second
3836. Claim validation within 2 seconds
3837. Payment posting within 2 seconds
3838. Claims search results within 500ms
3839. Large claims export within 10 seconds
3840. Claims pagination smooth transition

### Claims — Secondary Insurance
3841. Primary claim processed first
3842. Secondary claim created from primary EOB
3843. Coordination of benefits logic
3844. Secondary claim balance = patient responsibility from primary
3845. Tertiary insurance if applicable
3846. NEGATIVE: Secondary claim before primary adjudication — blocked

### Claims — Batch Submission
3847. Select multiple claims for batch submit
3848. Batch validation before submit
3849. Batch submission progress indicator
3850. Batch submission results (success/fail per claim)

---

## Section 13: Ciyex Hub / Marketplace (3851-4050)

### Hub Browse Page (/hub)
3851. Navigate to /hub — marketplace page loads
3852. Hub page shows app catalog tiles/cards
3853. App cards display: name, icon, short description, price
3854. App categories shown (Clinical, Administrative, Integration, etc.)
3855. Filter apps by category
3856. Search apps by name
3857. Search apps by keyword/description
3858. App cards show install status (Installed, Not Installed)
3859. App cards show pricing (Free, Paid, Trial)
3860. Click app card — navigates to /hub/[slug] detail page
3861. Hub page pagination or infinite scroll
3862. Hub page loading skeleton during fetch
3863. NEGATIVE: Search with no results — "No apps found" message
3864. NEGATIVE: Hub page API error — error state shown

### App Detail Page (/hub/[slug])
3865. Navigate to /hub/vaultik — detail page loads
3866. App name and full description displayed
3867. App screenshots/gallery
3868. App version information
3869. App publisher/developer info
3870. App pricing details
3871. App features list
3872. App requirements/compatibility
3873. Install button visible (if not installed)
3874. Uninstall button visible (if installed)
3875. Configure button visible (if installed and has settings)
3876. NEGATIVE: Navigate to /hub/nonexistent — 404 page
3877. NEGATIVE: Install button disabled during installation
3878. App reviews/ratings if available

### App Installation
3879. Click Install button — installation starts
3880. Installation progress indicator
3881. Installation creates app_installations record
3882. Installation sets extension_points JSONB
3883. After install — app appears in /hub/installed
3884. After install — plugin loaded via NativePluginLoader
3885. After install — extension points active (new tabs, nav items)
3886. NEGATIVE: Install already-installed app — button shows "Installed"
3887. NEGATIVE: Install without subscription (paid app) — payment required
3888. NEGATIVE: Installation failure — error message, rollback

### App Uninstallation
3889. Navigate to /hub/installed — click Uninstall
3890. Uninstall confirmation dialog
3891. Confirm uninstall — soft-delete app_installations record
3892. After uninstall — app removed from /hub/installed
3893. After uninstall — plugin unloaded, extension points deactivated
3894. After uninstall — associated tabs/nav items hidden
3895. NEGATIVE: Uninstall with active data — data preserved warning
3896. NEGATIVE: Cancel uninstall — no change

### Installed Apps Page (/hub/installed)
3897. Navigate to /hub/installed — shows installed apps
3898. Installed apps list with: name, version, install date, status
3899. Configure button per app
3900. Uninstall button per app
3901. Update available indicator
3902. App status: Active, Inactive, Error
3903. Toggle app active/inactive
3904. Filter installed apps by status
3905. NEGATIVE: No installed apps — "No apps installed" empty state

### Plugin Extension Points
3906. PluginSlot renders contributions for named slot
3907. patient-chart:tab extension — new tab in patient chart
3908. settings:nav-item extension — new item in settings sidebar
3909. dashboard:widget extension — new widget on dashboard if supported
3910. sidebar:menu-item extension — new sidebar menu item
3911. encounter:section extension — new section in encounter form
3912. Plugin contributions load dynamically
3913. Plugin contributions unload on app uninstall
3914. Multiple plugins contributing to same slot — all render
3915. NEGATIVE: Plugin with invalid contribution — graceful error
3916. NEGATIVE: Plugin slot with no contributions — renders nothing

### Vaultik Plugin (File Storage)
3917. After Vaultik installed — "Files" tab in patient chart
3918. Patient Files tab — loads file list for patient
3919. Upload file via Vaultik — file picker opens
3920. Upload file — progress bar shown
3921. Upload file — appears in patient files list
3922. File list columns: name, type, size, date, uploaded by
3923. Click file — downloads or previews
3924. Delete file — confirmation then removed
3925. File categories from documentCategories settings
3926. File stored in S3 via ciyex-files service
3927. S3 path: {orgAlias}/documents/{patientId}/{uuid}_{filename}
3928. NEGATIVE: Upload file > size limit — error message
3929. NEGATIVE: Upload invalid file type — error message
3930. NEGATIVE: Download deleted file — 404
3931. Vaultik settings page (via settings:nav-item extension)
3932. Vaultik settings — S3 configuration
3933. Vaultik settings — test connection button

### Demo Care Gaps Plugin
3934. Install demo-care-gaps app
3935. Care gaps tab appears in patient chart
3936. Care gaps shows patient's preventive care gaps
3937. Care gaps data calculated from patient record
3938. Uninstall demo-care-gaps — tab removed

### SMART on FHIR Launch (Tier 3 Apps)
3939. SMART app launch from Hub
3940. SmartLaunchController generates HMAC-signed token
3941. Launch URL includes patient context
3942. Launch URL includes encounter context if applicable
3943. SMART app opens in iframe or new tab
3944. SMART app receives valid launch parameters
3945. NEGATIVE: Invalid HMAC signature — launch blocked
3946. NEGATIVE: Expired launch token — error

### Marketplace Webhook
3947. Marketplace sends webhook on subscription change
3948. Webhook HMAC-SHA256 signature validated
3949. Subscription created → app_installations record created
3950. Subscription cancelled → app_installations soft-deleted
3951. Subscription updated → installation updated
3952. NEGATIVE: Invalid webhook signature — 403 rejected
3953. NEGATIVE: Duplicate webhook — idempotent handling

### Hub Stripe Integration
3954. Paid app — Stripe checkout flow
3955. Subscription plan selection (monthly/annual)
3956. Payment success — app installed
3957. Payment failure — appropriate error
3958. Subscription management (cancel, upgrade, downgrade)
3959. Invoice history viewable
3960. NEGATIVE: Expired credit card — payment failure handled
3961. Free trial — auto-install, trial period countdown

### Hub Multi-tenancy
3962. App installations scoped to org_alias
3963. Different orgs can have different apps installed
3964. Switch practice — installed apps update
3965. App data isolated between tenants
3966. NEGATIVE: Access other org's app installation — forbidden
3967. Hub catalog visible to all orgs (same catalog)

### Hub Permissions
3968. Admin can install/uninstall apps
3969. Admin can configure app settings
3970. Provider can use installed apps
3971. Staff can use installed apps based on permissions
3972. NEGATIVE: Non-admin install app — permission denied
3973. NEGATIVE: Non-admin uninstall app — permission denied
3974. NEGATIVE: Non-admin configure app — permission denied

### Hub Navigation
3975. "Ciyex Hub" menu item in sidebar (V47 migration)
3976. Hub icon: "Store" (Lucide)
3977. Hub submenu: Browse, Installed
3978. Hub breadcrumb navigation
3979. Hub back button from detail page
3980. Deep link to specific app: /hub/[slug]

### Hub Search & Discovery
3981. Featured apps section
3982. Most popular apps section
3983. Recently added apps section
3984. App recommendations based on specialty
3985. App compatibility indicators
3986. App required dependencies shown

### Hub UI Components
3987. App card hover effect
3988. App card responsive grid layout
3989. App detail page responsive
3990. Install/uninstall button loading state
3991. App status badge component
3992. App rating stars component if available
3993. Hub page title in browser tab
3994. Hub loading states (skeletons)

### Hub Edge Cases
3995. NEGATIVE: Install app during network outage — error
3996. NEGATIVE: Webhook delivery failure — retry mechanism
3997. NEGATIVE: Plugin JS error — error boundary catches
3998. NEGATIVE: Marketplace API down — Hub shows cached data or error
3999. NEGATIVE: Install 20+ apps — all extensions load correctly
4000. Hub with 0 apps in catalog — "Coming soon" message
4001. App with very long description — truncated in card, full in detail
4002. App with no screenshots — placeholder image
4003. App with special characters in name — displayed correctly
4004. Hub concurrent install by two admins — handled

### Hub Performance
4005. Hub catalog loads within 2 seconds
4006. App detail page loads within 1 second
4007. App install completes within 5 seconds
4008. Plugin load time within 1 second
4009. Hub search results within 500ms
4010. Hub page smooth scrolling

### Hub Accessibility
4011. Hub app cards keyboard navigable
4012. Hub install button keyboard accessible
4013. Hub search field keyboard accessible
4014. Hub app cards have alt text for icons
4015. Hub status badges have text labels
4016. Hub modals escapable (Escape key)

### Hub API Integration
4017. Hub catalog fetched from marketplace service (port 8081)
4018. App installations managed via ciyex-api
4019. Extension points queried via GIN index + @> containment
4020. NativePluginLoader maps slug to dynamic import
4021. Plugin register(api) called on load
4022. Plugin contributions available to PluginSlot components
4023. SMART launch via SmartLaunchController
4024. Webhook received at /api/internal/marketplace-webhook

### Hub Complete Workflow
4025. Browse catalog → view app detail → install → configure → use in patient chart
4026. Install Vaultik → upload file → download file → uninstall → files preserved
4027. Install paid app → Stripe checkout → subscription active → use app
4028. Cancel subscription → app uninstalled → features removed
4029. Admin installs → provider uses → admin configures → admin uninstalls

### Hub Data Integrity
4030. App installation record matches marketplace subscription
4031. Extension points accurately reflect installed apps
4032. Uninstall removes extension points but preserves data
4033. Reinstall restores extension points and finds existing data
4034. App version tracked in installation record
4035. Installation timestamp accurate

### Hub Notifications
4036. Notification on successful install
4037. Notification on successful uninstall
4038. Notification on available update
4039. Notification on subscription expiry warning
4040. Notification on app error/failure

### Hub Final Tests
4041. Hub sidebar menu item respects sort_order
4042. Hub accessible from all page contexts
4043. Hub state preserved on browser back
4044. Hub URL routing correct for all subpages
4045. Hub responsive on tablet
4046. Hub responsive on mobile
4047. Hub print layout (if applicable)
4048. Hub error boundary isolates failures
4049. Hub audit log of install/uninstall actions
4050. Hub all API calls authenticated with JWT

---

## Section 14: Developer Portal (4051-4200)

### Developer Portal Access
4051. Navigate to Developer Portal — page loads (if available)
4052. Developer portal requires admin/developer role
4053. Developer portal dashboard shows API overview
4054. NEGATIVE: Non-admin access developer portal — permission denied

### API Documentation
4055. API docs page shows all available endpoints
4056. Endpoints grouped by resource type
4057. Each endpoint shows: method, path, description
4058. Each endpoint shows request body schema
4059. Each endpoint shows response body schema
4060. Each endpoint shows authentication requirements
4061. Try-it/interactive API playground
4062. API docs search by endpoint name
4063. API docs filter by resource type
4064. API docs show FHIR resource types
4065. OpenAPI/Swagger specification available

### API Keys Management
4066. API keys list shows existing keys
4067. Create new API key — name and scope
4068. API key displayed once after creation (copy button)
4069. API key creation date and last used date
4070. Revoke API key — confirmation dialog
4071. Revoked key shows revoked status
4072. API key permissions/scopes
4073. NEGATIVE: Create key with empty name — validation error
4074. NEGATIVE: Use revoked key — 401 rejected
4075. NEGATIVE: Key without required scope — 403

### Webhook Configuration
4076. Webhook endpoints list
4077. Create webhook — URL, events, secret
4078. Webhook URL validation (HTTPS required)
4079. Webhook event selection (patient.created, encounter.signed, etc.)
4080. Webhook secret for HMAC signing
4081. Test webhook — sends test payload
4082. Webhook delivery log
4083. Webhook retry on failure (exponential backoff)
4084. Edit webhook endpoint
4085. Delete webhook endpoint
4086. NEGATIVE: Invalid URL — validation error
4087. NEGATIVE: HTTP URL — must be HTTPS error
4088. NEGATIVE: Webhook delivery failure — logged with error

### FHIR API
4089. FHIR base URL documented
4090. FHIR Patient resource CRUD
4091. FHIR Practitioner resource CRUD
4092. FHIR Encounter resource CRUD
4093. FHIR Observation resource CRUD
4094. FHIR Condition resource CRUD
4095. FHIR MedicationRequest resource CRUD
4096. FHIR Bundle search results format
4097. FHIR _search parameters documented
4098. FHIR _include and _revinclude support
4099. FHIR pagination (Bundle.link next/prev)
4100. FHIR Content-Type: application/fhir+json

### SMART on FHIR Configuration
4101. Register SMART app — client ID, redirect URI, scopes
4102. SMART app list shows registered apps
4103. Edit SMART app configuration
4104. Delete SMART app registration
4105. SMART launch endpoint configuration
4106. SMART authorization endpoint
4107. SMART token endpoint
4108. SMART app launch from EHR context
4109. NEGATIVE: Invalid redirect URI — error
4110. NEGATIVE: Invalid scope request — error

### Integration Hub
4111. Available integrations list
4112. HL7v2 interface configuration
4113. HL7v2 message types: ADT, ORM, ORU, SIU
4114. FHIR Subscription configuration
4115. External lab integration settings
4116. Pharmacy integration settings
4117. Imaging PACS integration
4118. Clearinghouse integration settings
4119. Health information exchange (HIE) configuration
4120. NEGATIVE: Integration with invalid credentials — test fails

### Developer Sandbox
4121. Sandbox environment for testing
4122. Sample patient data in sandbox
4123. API calls in sandbox don't affect production
4124. Sandbox rate limiting configuration
4125. Sandbox data reset option

### SDK / Client Libraries
4126. ciyex-platform-sdk documentation
4127. SDK installation instructions (Maven Central)
4128. SDK usage examples
4129. SDK version compatibility matrix
4130. SDK changelog

### Developer Analytics
4131. API call volume dashboard
4132. API call latency metrics
4133. API error rate tracking
4134. Top API endpoints by usage
4135. API rate limit status
4136. Webhook delivery success rate

### Developer Portal Navigation
4137. Developer portal sidebar navigation
4138. Developer portal breadcrumbs
4139. Developer portal responsive layout
4140. Developer portal search

### Developer Portal Security
4141. All developer APIs require authentication
4142. API keys encrypted at rest
4143. Webhook secrets hashed in database
4144. Rate limiting per API key
4145. IP allowlist per API key if supported
4146. Audit log of all API key operations

### Developer Portal Edge Cases
4147. NEGATIVE: Create 100 API keys — limit check
4148. NEGATIVE: Create 100 webhooks — limit check
4149. NEGATIVE: Very long webhook URL (2000 chars) — handled
4150. NEGATIVE: Webhook with invalid JSON payload — error logged
4151. NEGATIVE: API docs for deprecated endpoint — marked deprecated
4152. Developer portal with no integrations — empty state
4153. Developer portal cache/refresh

### Developer Portal FHIR Conformance
4154. FHIR CapabilityStatement endpoint
4155. Supported FHIR resources listed
4156. Supported search parameters listed
4157. Supported operations listed
4158. FHIR version (R4) documented
4159. FHIR profiles documented

### Developer Portal Testing Tools
4160. API request builder/tester
4161. Request headers configuration
4162. Request body JSON editor
4163. Response viewer with syntax highlighting
4164. Response headers display
4165. HTTP status code display
4166. Request/response timing display
4167. Save request as example
4168. Load example requests

### Developer Portal Batch Operations
4169. Batch API endpoint documentation
4170. FHIR Bundle transaction support
4171. Batch import documentation
4172. Bulk export documentation (FHIR $export)
4173. Batch operation progress tracking

### Developer Portal Logs
4174. API access logs viewable
4175. Log filter by endpoint
4176. Log filter by status code
4177. Log filter by date range
4178. Log filter by API key
4179. Log detail shows full request/response
4180. Log export for debugging

### Developer Portal Notifications
4181. API deprecation notices
4182. Breaking change announcements
4183. Maintenance window notifications
4184. New feature announcements
4185. SDK update notifications

### Developer Portal Documentation
4186. Getting started guide
4187. Authentication guide (OAuth2 + JWT)
4188. FHIR resource guide per resource type
4189. Webhook events reference
4190. Error codes reference
4191. Rate limiting documentation
4192. Data model documentation
4193. Migration guides between versions

### Developer Portal Final
4194. Developer portal loads within 2 seconds
4195. Developer portal code examples copyable
4196. Developer portal syntax highlighting
4197. Developer portal keyboard accessible
4198. Developer portal mobile responsive
4199. Developer portal language/format toggles (JSON/XML)
4200. Developer portal version selector for docs

---

## Section 15: Dynamic Form Fields (4201-4500)

### tab_field_config System — Field Types
4201. text field type — renders text input
4202. phone field type — renders phone-formatted input with mask
4203. email field type — renders email input with validation
4204. textarea field type — renders multiline text area
4205. date field type — renders date picker component
4206. datetime field type — renders date + time picker
4207. number field type — renders numeric input
4208. toggle/boolean field type — renders switch/toggle
4209. select field type — renders dropdown from options
4210. combobox field type — renders searchable dropdown with free text
4211. radio field type — renders radio button group
4212. file field type — renders file upload zone
4213. richtext field type — renders rich text editor (if supported)
4214. hidden field type — renders hidden input (not visible)
4215. password field type — renders password input (masked)
4216. color field type — renders color picker
4217. currency field type — renders currency-formatted input
4218. percentage field type — renders percentage input
4219. url field type — renders URL input with validation
4220. multiselect field type — renders multi-select dropdown

### Field Config — Options Source
4221. Options defined inline in field_config JSON
4222. Options from `options` array in field_config
4223. Options from nested config (e.g., familyHistoryConfig.relationships)
4224. Options from rosConfig.systems array
4225. Options loaded from API endpoint
4226. Options from code lookup (ICD-10, CPT, LOINC)
4227. Dynamic options filtered by context (e.g., by specialty)
4228. NEGATIVE: Field with empty options array — empty dropdown
4229. NEGATIVE: Field with undefined options — fallback or error
4230. No hardcoded options in React components — all from field_config

### Field Config — Validation
4231. required: true — field shows asterisk, blocks submit if empty
4232. required: false — field is optional
4233. minLength validation — error if input too short
4234. maxLength validation — input truncated or error
4235. min/max for number fields — range validation
4236. pattern (regex) validation — custom format check
4237. Custom validation messages from field_config
4238. Email format validation (built-in)
4239. Phone format validation (built-in)
4240. NPI format validation (10 digits)
4241. SSN format validation (if applicable)
4242. Date format validation
4243. URL format validation
4244. NEGATIVE: Submit form with validation errors — errors shown inline
4245. NEGATIVE: All required fields empty — all errors shown
4246. Validation errors clear on correction
4247. Real-time validation on blur
4248. Real-time validation on change (optional)

### Field Config — Layout
4249. colSpan: 12 — full width field
4250. colSpan: 6 — half width (2 per row)
4251. colSpan: 4 — third width (3 per row)
4252. colSpan: 3 — quarter width (4 per row)
4253. colSpan: 2 — sixth width (6 per row)
4254. Mixed colSpan in same form section
4255. Section headers/dividers between field groups
4256. Section collapsible/expandable
4257. Responsive layout — mobile stacks to full width
4258. Form field order matches field_config array order
4259. Hidden fields don't take space in layout
4260. Conditional field visibility (show/hide based on other field value)

### Field Config — FHIR Mapping (fhirMapping)
4261. fhirMapping.path maps form field to FHIR resource path
4262. Simple path: "Patient.name[0].given[0]"
4263. Nested path: "Patient.extension.where(url='...').valueString"
4264. Array path: "Patient.identifier.where(system='MRN').value"
4265. Extension path: mapped to FHIR extension URL
4266. Coding path: maps to code + system + display
4267. Reference path: maps to FHIR Reference (e.g., Practitioner/123)
4268. FhirPathMapper extracts form data from FHIR resource
4269. FhirPathMapper builds FHIR resource from form data
4270. Bidirectional mapping: form → FHIR → form roundtrip preserves data
4271. NEGATIVE: Invalid fhirMapping path — graceful error
4272. NEGATIVE: Missing fhirMapping — field stored in extension
4273. FHIR extension fallback: unmapped fields stored in formDataExtension

### Field Config — Sections
4274. Form sections from field_config sections array
4275. Section title displayed as header
4276. Section fields grouped under section
4277. Section collapsible with expand/collapse toggle
4278. Section initially expanded (default)
4279. Section initially collapsed (configurable)
4280. Multiple sections per form
4281. Section order matches config
4282. Empty section hidden
4283. Section with single field — still shows section header

### Dynamic Form — Demographics (tabKey: demographics)
4284. Demographics form loads fields from tab_field_config
4285. Fields: firstName, lastName, middleName, suffix, prefix
4286. Fields: dateOfBirth, gender, sex, race, ethnicity
4287. Fields: SSN, MRN (auto-generated via lifecycle hook)
4288. Fields: address (street, city, state, zip)
4289. Fields: phone (home, cell, work), email
4290. Fields: maritalStatus, language, preferredPharmacy
4291. Fields: emergencyContact (name, phone, relationship)
4292. Fields: employer, occupation
4293. All fields rendered from field_config, not hardcoded
4294. Field order matches config
4295. Required fields marked
4296. Save updates Patient FHIR resource

### Dynamic Form — Allergies (tabKey: allergies)
4297. Allergies form fields from tab_field_config
4298. Fields: allergen (searchable), reaction, severity, onset date
4299. Fields: status (active, inactive, resolved)
4300. Fields: type (medication, food, environmental)
4301. Allergy list per patient
4302. Add new allergy — form opens
4303. Edit existing allergy — pre-populated
4304. Delete allergy — removed
4305. NKDA (No Known Drug Allergies) option
4306. Allergy severity badge color from config
4307. All fields from field_config

### Dynamic Form — Problems (tabKey: problems)
4308. Problems list per patient
4309. Fields: diagnosis (ICD-10 search), status, onset date, notes
4310. Fields: severity, body site
4311. Add problem — ICD-10 code search from ciyex-codes
4312. ICD-10 search autocomplete
4313. Edit problem — pre-populated
4314. Resolve/inactivate problem — status change
4315. Delete problem
4316. Problem list sorted by status (active first)
4317. All fields from field_config

### Dynamic Form — Medications (tabKey: medications)
4318. Medications list per patient
4319. Fields: drug name (NDC search), dosage, frequency, route
4320. Fields: start date, end date, prescribing provider
4321. Fields: quantity, refills, DAW, pharmacy
4322. Fields: instructions/SIG, status (active, discontinued)
4323. Add medication — drug search
4324. Edit medication — pre-populated
4325. Discontinue medication — status + end date
4326. All fields from field_config

### Dynamic Form — Immunizations (tabKey: immunizations)
4327. Immunizations list per patient
4328. Fields: vaccine name (CVX code), date administered
4329. Fields: lot number, manufacturer, site, route
4330. Fields: administered by, VIS date, funding source
4331. Add immunization — vaccine search
4332. Edit immunization — pre-populated
4333. Delete immunization
4334. Immunization history timeline
4335. Due/overdue immunization alerts
4336. All fields from field_config

### Dynamic Form — Vitals (tabKey: vitals)
4337. Vitals flowsheet view (rows = vital types, columns = encounter dates)
4338. Vital types from field_config: BP systolic, BP diastolic, pulse, temp, resp rate, SpO2, height, weight, BMI
4339. BMI auto-calculated from height + weight
4340. Enter vitals for current encounter
4341. View historical vitals in flowsheet columns
4342. Abnormal vitals highlighted
4343. Vital ranges from field_config
4344. Most recent encounter column first
4345. All vital type rows from field_config, not hardcoded

### Dynamic Form — Family History (tabKey: familyHistory)
4346. Family history list per patient
4347. Fields: relationship (from familyHistoryConfig.relationships in field_config)
4348. Fields: condition, age at onset, deceased toggle, age at death
4349. Relationships: Mother, Father, Sister, Brother, Maternal Grandmother, etc.
4350. Add family history entry
4351. Edit family history entry
4352. Delete family history entry
4353. All relationship options from field_config

### Dynamic Form — Social History (tabKey: socialHistory)
4354. Social history form per patient
4355. Fields: smoking status, alcohol use, drug use
4356. Fields: occupation, education, marital status
4357. Fields: exercise habits, diet
4358. Fields: sexual orientation, gender identity (if configured)
4359. Smoking status options from field_config
4360. Alcohol use options from field_config
4361. Save social history — singleton per patient
4362. All options from field_config

### Dynamic Form — ROS (tabKey: ros)
4363. Review of Systems form per encounter
4364. Systems from rosConfig.systems in field_config
4365. Systems: Constitutional, Eyes, ENT, Cardiovascular, Respiratory, GI, GU, MSK, Skin, Neuro, Psych, Endocrine, Heme/Lymph, Allergy/Immunology
4366. Each system: Normal/Abnormal toggle + findings text
4367. "All Normal" quick-fill button
4368. Abnormal systems expanded for detail
4369. ROS saved per encounter
4370. All systems from field_config, not hardcoded

### Dynamic Form — Physical Exam (tabKey: physicalExam)
4371. Physical exam form per encounter
4372. Exam sections from field_config (e.g., examSections)
4373. Sections: General, HEENT, Neck, Cardiovascular, Respiratory, Abdomen, MSK, Neuro, Skin, Psych
4374. Each section: Normal/Abnormal + findings
4375. "All Normal" quick-fill
4376. Template macro insertion
4377. Physical exam saved per encounter
4378. All sections from field_config

### Dynamic Form — Assessment & Plan (tabKey: assessmentPlan)
4379. Assessment & Plan form per encounter
4380. Fields: assessment text (rich text or plain)
4381. Fields: plan text
4382. Fields: linked diagnoses (from problems)
4383. Fields: follow-up interval
4384. Fields: patient instructions
4385. Save assessment per encounter
4386. Template/macro support for common assessments

### Dynamic Form — Procedures (tabKey: procedures)
4387. Procedure list per encounter
4388. Fields: procedure code (CPT search from ciyex-codes)
4389. Fields: modifier codes, units, diagnosis pointer
4390. Fields: performing provider, date
4391. Fields: notes, laterality
4392. CPT code search autocomplete
4393. Add multiple procedures per encounter
4394. Edit procedure — pre-populated
4395. Delete procedure
4396. All fields from field_config

### Dynamic Form — HPI (tabKey: hpi)
4397. History of Present Illness form per encounter
4398. Fields: chief complaint
4399. Fields: HPI elements (location, quality, severity, duration, timing, context, modifying factors, associated signs/symptoms)
4400. Fields: HPI narrative text
4401. Structured HPI with elements checkboxes
4402. Free-text HPI with rich text
4403. Template support for HPI
4404. Save HPI per encounter
4405. All HPI elements from field_config

### Dynamic Form — Patient Notes (tabKey: patientNotes)
4406. Patient notes list per patient
4407. Fields: note type, title, body, date, author
4408. Add note — rich text editor
4409. Edit note — pre-populated
4410. Delete note — confirmation
4411. Pin important note
4412. Note search by title/content
4413. Note filter by type
4414. All fields from field_config

### Dynamic Form — Insurance/Coverage (tabKey: insurance, patient scope)
4415. Patient insurance list
4416. Fields: insurance company, plan name, member ID, group number
4417. Fields: subscriber (self, spouse, parent, other)
4418. Fields: subscriber name, DOB, relationship
4419. Fields: effective date, termination date
4420. Fields: copay amount, deductible
4421. Primary/secondary/tertiary designation
4422. Insurance card image upload
4423. Verify eligibility button
4424. Save insurance — creates Coverage FHIR resource
4425. All fields from field_config

### Dynamic Form — Documents (tabKey: documents)
4426. Document list per patient
4427. Fields: document name, category, date, description
4428. File upload zone
4429. Supported file types: PDF, images, DOCX
4430. Document preview (PDF inline viewer)
4431. Document download
4432. Document delete
4433. Document category from documentCategories settings
4434. All fields from field_config

### Dynamic Form — Consent Forms
4435. Consent form list per patient
4436. Consent form template selection
4437. Patient signature capture
4438. Witness signature capture
4439. Consent date auto-filled
4440. Consent form PDF generation
4441. Consent form attached to patient record
4442. NEGATIVE: Missing signature — validation error

### Dynamic Form — Generic Behavior
4443. All dynamic forms read tab_field_config via API
4444. Form fields generated from field_config.fields array
4445. Field visibility respects hidden flag
4446. Field order respects array index
4447. Field layout respects colSpan
4448. Field validation respects required, min, max, pattern
4449. Field options loaded from field_config (never hardcoded)
4450. Form save calls GenericFhirResourceService (create or update)
4451. Form data mapped to FHIR via FhirPathMapper
4452. Unmapped fields stored in formDataExtension
4453. Form load populates fields from FHIR resource
4454. Form handles null/undefined values gracefully
4455. Form reset/cancel reverts to original values
4456. Form dirty state tracked (unsaved changes warning)

### Dynamic Form — All 48 tab_field_config Tabs
4457. demographics — Patient resource (patient scope)
4458. allergies — AllergyIntolerance (patient scope)
4459. problems — Condition (patient scope)
4460. medications — MedicationRequest (patient scope)
4461. immunizations — Immunization (patient scope)
4462. vitals — Observation (encounter scope, flowsheet)
4463. familyHistory — FamilyMemberHistory (patient scope)
4464. socialHistory — Observation (patient scope, singleton)
4465. ros — Composition (encounter scope)
4466. physicalExam — Composition (encounter scope)
4467. assessmentPlan — Composition (encounter scope)
4468. procedures — Procedure (encounter scope)
4469. hpi — Composition (encounter scope)
4470. patientNotes — DocumentReference (patient scope)
4471. insurance — Coverage (patient scope)
4472. documents — DocumentReference (patient scope)
4473. encounters — Encounter (patient scope)
4474. practice — Organization (settings, singleton)
4475. facilities — Location (settings)
4476. providers — Practitioner (settings)
4477. services — HealthcareService (settings)
4478. appointmentTypes — config-based (settings)
4479. rooms — config-based (settings)
4480. feeSchedules — config-based (settings)
4481. referringProviders — Practitioner (settings)
4482. pharmacies — Organization (settings)
4483. labs — Organization (settings)
4484. letterTemplates — config-based (settings)
4485. printSettings — config-based (settings, singleton)
4486. recallTypes — config-based (settings)
4487. documentCategories — config-based (settings)
4488. claims — Claim (claims scope)
4489. payments — PaymentReconciliation (financial scope)
4490. labOrders — ServiceRequest (patient scope)
4491. labResults — DiagnosticReport (patient scope)
4492. imagingOrders — ServiceRequest (patient scope)
4493. referrals — ServiceRequest (patient scope)
4494. recalls — Communication (general scope)
4495. inventory — SupplyDelivery (general scope)

### Dynamic Form — Negative Tests
4496. NEGATIVE: Form with 100+ fields — scrollable, no overflow
4497. NEGATIVE: Form with deeply nested field_config — renders correctly
4498. NEGATIVE: tab_field_config API error — form shows error state
4499. NEGATIVE: Malformed field_config JSON — graceful error handling
4500. NEGATIVE: Form submit with network error — error toast, data preserved

---

## Section 16: Navigation & Layout (4501-4650)

### Sidebar Navigation
4501. Sidebar loads with menu items from menu_item table
4502. Sidebar shows icons (Lucide) for each menu item
4503. Sidebar shows labels for each menu item
4504. Sidebar items ordered by sort_order
4505. Sidebar parent items expand to show children
4506. Sidebar child items indented under parent
4507. Active page highlighted in sidebar
4508. Sidebar toggle (collapse/expand) button
4509. Collapsed sidebar shows only icons
4510. Expanded sidebar shows icons + labels
4511. Sidebar state persists across page navigation
4512. Sidebar state persists across browser refresh (localStorage)
4513. Sidebar hover on collapsed item — tooltip with label
4514. Sidebar menu items respect user role permissions
4515. Non-permitted menu items hidden (not greyed out)
4516. NEGATIVE: Sidebar menu item with broken route — handled gracefully
4517. Sidebar scroll if many menu items exceed viewport
4518. Sidebar responsive — hidden on mobile, hamburger toggle

### Top Header/Navbar
4519. Header shows practice name/logo
4520. Header shows logged-in user name
4521. Header shows user avatar/initials
4522. Header user dropdown menu
4523. User dropdown — Profile link
4524. User dropdown — Logout link
4525. User dropdown — Switch Practice if multiple
4526. Header notification bell icon
4527. Notification bell badge count for unread
4528. Click notification bell — dropdown with recent notifications
4529. Header search bar (global search) if available
4530. Global search — patients by name
4531. Global search — patients by MRN
4532. Global search — appointments
4533. Global search results dropdown
4534. Header responsive on mobile
4535. NEGATIVE: Logo not configured — placeholder/text shown

### AdminLayout Component
4536. AdminLayout wraps all authenticated pages
4537. AdminLayout sidebar + content area layout
4538. AdminLayout content area uses overflow-hidden
4539. Child pages handle their own scrolling
4540. No unwanted vertical scrollbar on AdminLayout
4541. AdminLayout responsive breakpoints (desktop, tablet, mobile)
4542. AdminLayout keyboard navigation (sidebar ↔ content)

### Breadcrumbs
4543. Breadcrumbs show navigation path
4544. Breadcrumbs show: Home > Section > Page
4545. Breadcrumb links clickable (navigate back)
4546. Last breadcrumb item is current page (not clickable)
4547. Breadcrumbs update on navigation
4548. Breadcrumbs on patient chart show: Patients > [Patient Name] > [Tab]
4549. Breadcrumbs on settings show: Settings > [Settings Page]
4550. NEGATIVE: Very long breadcrumb text — truncated with ellipsis

### Page Routing
4551. / — redirects to /dashboard or /signin
4552. /signin — Keycloak login page
4553. /callback — OAuth callback processing
4554. /select-practice — practice selection
4555. /dashboard — main dashboard
4556. /patients — patient list
4557. /patients/[id] — patient chart
4558. /appointments or /calendar — appointment calendar
4559. /encounters — encounter browse
4560. /settings — settings root (redirects to first settings page)
4561. /settings/[tabKey] — specific settings page
4562. /hub — marketplace browse
4563. /hub/installed — installed apps
4564. /hub/[slug] — app detail
4565. /reports — reports page
4566. /messages — messaging inbox
4567. /inventory — inventory page
4568. /claims or /billing — billing page
4569. Unknown route — 404 page
4570. Route guards — unauthenticated → /signin redirect
4571. Route guards — unauthorized → access denied page

### Page Transitions
4572. Page transition smooth (no full page reload)
4573. Loading indicator during page transition
4574. Page data fetched on navigation
4575. Previous page state preserved in history
4576. Browser back button works correctly
4577. Browser forward button works correctly
4578. Page scroll position reset on new page
4579. Page scroll position restored on back navigation

### Responsive Design
4580. Desktop layout (>1280px) — full sidebar + content
4581. Tablet layout (768-1280px) — collapsed sidebar
4582. Mobile layout (<768px) — hidden sidebar, hamburger
4583. All pages render without horizontal scroll
4584. All forms usable on tablet
4585. All tables horizontally scrollable on mobile
4586. Touch-friendly tap targets (min 44px) on mobile
4587. Font sizes readable on all devices
4588. Images/icons scale appropriately

### Loading States
4589. Page loading shows skeleton/shimmer
4590. List loading shows skeleton rows
4591. Form loading shows field placeholders
4592. Chart/graph loading shows skeleton
4593. Button loading shows spinner (disabled while loading)
4594. Full-page loading overlay for heavy operations
4595. Loading state for each API call
4596. NEGATIVE: Very slow API — loading persists until timeout

### Empty States
4597. Patient list empty — "No patients found" + Add button
4598. Appointment list empty — "No appointments" message
4599. Encounter list empty — "No encounters" message
4600. Lab results empty — "No lab results" message
4601. Claims empty — "No claims" message
4602. Messages empty — "No messages" message
4603. Settings list empty — "No items" + Add button
4604. Search no results — "No results found" message
4605. Each empty state has appropriate illustration/icon
4606. Empty state CTA button where applicable

### Error States
4607. API 500 error — "Something went wrong" page
4608. API 403 error — "Access Denied" page
4609. API 404 error — "Not Found" page
4610. API timeout — "Request timed out" message
4611. Network offline — "No internet connection" banner
4612. Error boundary catches component crashes — fallback UI
4613. Error messages are user-friendly (no stack traces)
4614. Retry button on error pages
4615. NEGATIVE: Multiple simultaneous API errors — each shown

### Notifications / Toast Messages
4616. Success toast — green, auto-dismiss 3-5s
4617. Error toast — red, persistent until dismissed
4618. Warning toast — yellow/amber
4619. Info toast — blue
4620. Toast stacking (multiple toasts visible)
4621. Toast dismiss button (X)
4622. Toast positioned top-right or bottom-right consistently
4623. Toast animation (slide in/out)
4624. NEGATIVE: 20 toasts at once — scrollable or limit

### Modals / Dialogs
4625. Modal opens centered with backdrop
4626. Modal closeable with X button
4627. Modal closeable with Escape key
4628. Modal closeable by clicking backdrop (configurable)
4629. Modal focus trapped inside
4630. Modal scrollable if content exceeds viewport
4631. Confirmation dialog — Confirm/Cancel buttons
4632. Destructive confirmation — red Confirm button
4633. Modal loading state during async operation
4634. Nested modals if applicable — proper z-index
4635. NEGATIVE: Modal with form — unsaved changes on close — warning

### Tables / Data Grids
4636. Table column headers clickable for sort
4637. Table sort indicator (arrow up/down)
4638. Table row hover highlight
4639. Table row click navigates to detail
4640. Table checkbox selection (multi-select)
4641. Table pagination controls
4642. Table page size selector (10, 25, 50, 100)
4643. Table total count display
4644. Table column resize if supported
4645. Table responsive — horizontal scroll on small screens
4646. Table sticky header on scroll
4647. Table empty state when no data
4648. Table loading skeleton
4649. NEGATIVE: Table with 10000 rows — paginated, not rendered all
4650. Table keyboard navigation (arrow keys, Enter to select)

---

## Section 17: Encounter Form Specialties (4651-4800)

### Universal Encounter Form (specialty: *)
4651. Universal encounter form loads for any specialty
4652. Universal sections: HPI, ROS, Physical Exam, Assessment, Plan
4653. Universal vitals section
4654. Universal procedures section
4655. Universal diagnosis/problems section
4656. Universal patient instructions section
4657. Universal follow-up scheduling section
4658. Universal encounter metadata (date, provider, type, room)
4659. All sections from tab_field_config encounter fields
4660. Section order from field_config

### Cardiology Encounter Form
4661. Cardiology encounter loads specialty sections
4662. Cardiology — cardiac history section
4663. Cardiology — chest pain assessment
4664. Cardiology — dyspnea assessment
4665. Cardiology — palpitations assessment
4666. Cardiology — cardiac risk factors
4667. Cardiology — EKG findings section
4668. Cardiology — echocardiogram results section
4669. Cardiology — stress test results section
4670. Cardiology — cardiac catheterization data
4671. Cardiology — medication management (anticoagulants, statins, etc.)
4672. Cardiology — device management (pacemaker, ICD)
4673. Cardiology-specific vitals: BP (sitting, standing), heart rate variability
4674. Cardiology ROS emphasizes cardiovascular system
4675. Cardiology PE emphasizes cardiovascular exam
4676. All cardiology fields from field_config specialty configuration

### Psychiatry Encounter Form
4677. Psychiatry encounter loads specialty sections
4678. Psychiatry — mental status exam (MSE)
4679. Psychiatry — appearance, behavior, speech assessment
4680. Psychiatry — mood and affect assessment
4681. Psychiatry — thought process and content
4682. Psychiatry — perception (hallucinations, illusions)
4683. Psychiatry — cognition (orientation, memory, attention)
4684. Psychiatry — insight and judgment
4685. Psychiatry — suicidal ideation screening (PHQ-9, Columbia)
4686. Psychiatry — homicidal ideation screening
4687. Psychiatry — substance use assessment
4688. Psychiatry — GAF/WHODAS score
4689. Psychiatry — medication management (psychotropics)
4690. Psychiatry — therapy notes section
4691. Psychiatry — safety plan
4692. Psychiatry — treatment goals
4693. Psychiatry-specific diagnosis (DSM-5 aligned)
4694. All psychiatry fields from field_config specialty configuration

### Dermatology Encounter Form
4695. Dermatology encounter loads specialty sections
4696. Dermatology — skin lesion description
4697. Dermatology — lesion location (body map/diagram)
4698. Dermatology — lesion morphology (macule, papule, nodule, etc.)
4699. Dermatology — lesion size measurement
4700. Dermatology — lesion color
4701. Dermatology — lesion distribution
4702. Dermatology — lesion configuration
4703. Dermatology — biopsy results section
4704. Dermatology — photo documentation (image upload)
4705. Dermatology — skin cancer screening
4706. Dermatology — procedure documentation (excision, biopsy, cryotherapy)
4707. Dermatology — wound care instructions
4708. Dermatology — patch test results
4709. Dermatology — phototherapy documentation
4710. All dermatology fields from field_config specialty configuration

### Specialty Form — Dynamic Loading
4711. Encounter form detects specialty from provider or appointment type
4712. Specialty sections loaded dynamically from tab_field_config
4713. Universal sections always present regardless of specialty
4714. Specialty sections added after universal sections
4715. Specialty-specific field options loaded
4716. Specialty-specific templates available
4717. Unknown specialty — only universal sections shown
4718. NEGATIVE: Specialty config missing — falls back to universal

### Encounter Form — Sign/Lock
4719. Sign encounter — all required fields validated
4720. Sign encounter — status changes to SIGNED
4721. Signed encounter — all fields read-only/locked
4722. Signed encounter — badge shows "Signed"
4723. Unsign encounter — requires permission
4724. Unsign encounter — status changes to UNSIGNED
4725. Unsigned encounter — fields editable again
4726. Addendum to signed encounter
4727. Addendum preserves original signed content
4728. Sign timestamp and signer recorded
4729. Co-sign workflow (resident + attending)
4730. NEGATIVE: Sign with missing required fields — error
4731. NEGATIVE: Sign by non-provider — permission denied

### Encounter Form — Auto-Save
4732. Encounter auto-saves draft periodically
4733. Auto-save interval configurable (e.g., every 30 seconds)
4734. Auto-save indicator (last saved timestamp)
4735. Manual save button always available
4736. Recover auto-saved draft on page return
4737. Auto-save does not trigger signature requirement
4738. NEGATIVE: Auto-save during network outage — queued

### Encounter Form — Templates & Macros
4739. Select encounter template — pre-fills sections
4740. Template by specialty
4741. Template by visit type (New, Follow-up, Annual)
4742. Macro/quick text insertion in text fields
4743. Macro trigger (e.g., dot-phrase like ".normal")
4744. Macro expansion in HPI, PE, Assessment
4745. Custom macros from settings
4746. Copy forward from previous encounter
4747. Copy forward selective sections

### Encounter Form — Clinical Decision Support
4748. Drug interaction alert during prescribing
4749. Allergy alert when ordering medication
4750. Preventive care reminder
4751. Diagnosis-procedure linking suggestions
4752. Quality measure gaps highlighted
4753. Clinical guidelines reference if available
4754. NEGATIVE: Override CDS alert without reason — logged

### Encounter Form — Patient Context
4755. Patient demographics panel visible during encounter
4756. Patient allergy list visible (sidebar or header)
4757. Patient active medications visible
4758. Patient active problems visible
4759. Patient insurance info visible
4760. Patient last visit summary
4761. Patient alerts/flags visible
4762. Quick navigation between encounter sections

### Encounter Form — Orders During Encounter
4763. Order labs from within encounter
4764. Order imaging from within encounter
4765. Create referral from within encounter
4766. Prescribe medication from within encounter
4767. Orders linked to current encounter
4768. Orders auto-populate encounter diagnosis

### Encounter Form — E&M Coding Assistance
4769. E&M level suggestion based on documentation
4770. HPI element count for E&M
4771. ROS system count for E&M
4772. PE element count for E&M
4773. Medical decision making complexity assessment
4774. Time-based coding support
4775. E&M code displayed (99212-99215 for established, 99202-99205 for new)
4776. NEGATIVE: Insufficient documentation for selected E&M — warning

### Encounter Form — Print/Export
4777. Print encounter summary
4778. Print patient instructions
4779. Print prescription (paper Rx)
4780. Print superbill from encounter
4781. Export encounter as PDF
4782. Export encounter as CDA (if supported)
4783. Print layout matches practice print settings
4784. Print header/footer from print settings

### Encounter Form — Navigation
4785. Section navigation sidebar within encounter
4786. Jump to specific section
4787. Section completion indicators (filled/empty)
4788. Previous/Next section buttons
4789. Scroll-spy highlights current section in nav
4790. Encounter form breadcrumb: Patient > Encounters > [Date]
4791. Back to patient chart from encounter

### Encounter Form — Responsive
4792. Encounter form on desktop — two-column layout
4793. Encounter form on tablet — single column
4794. Encounter form on mobile — stacked sections
4795. All encounter form fields usable on tablet
4796. Encounter section collapse/expand on mobile

### Encounter Form — Edge Cases
4797. Very long encounter (50+ sections) — scrollable
4798. Multiple concurrent encounters for same patient — handled
4799. Encounter for walk-in patient (no appointment) — allowed
4800. Encounter without vitals — valid (not all encounters need vitals)

---

## Section 18: Edge Cases & Error Handling (4801-5000)

### Authentication Edge Cases
4801. Session timeout during active use — redirect to login
4802. Token refresh succeeds transparently
4803. Token refresh fails — redirect to login
4804. Multiple browser tabs — token synchronized
4805. Concurrent login from two browsers — both valid
4806. Login while already logged in — handled gracefully
4807. OAuth callback with invalid state — error page
4808. OAuth callback with expired code — error page
4809. Keycloak down — login page shows error
4810. Keycloak slow response — loading indicator

### Multi-tenancy Edge Cases
4811. Switch practice — all data refreshes to new org
4812. Switch practice — sidebar menu updates
4813. Switch practice — URL preserved (same page, different data)
4814. API call with wrong org_alias header — 403
4815. API call without org_alias — 400 or inferred from JWT
4816. Two orgs with same patient name — correctly isolated
4817. Cross-org data leak prevention — verified
4818. TenantContext ThreadLocal properly cleaned per request
4819. Async operations maintain tenant context
4820. NEGATIVE: Direct API manipulation of other org's data — blocked by RLS

### Concurrent Access
4821. Two users edit same patient simultaneously — last save wins
4822. Two users edit same encounter — last save wins
4823. Two users book same slot — second gets conflict error
4824. Appointment created while viewing calendar — calendar refreshes
4825. Patient created while searching — appears in next search
4826. Setting changed while another admin edits — handled
4827. NEGATIVE: Optimistic locking conflict — user-friendly message

### Data Validation Edge Cases
4828. Unicode characters in all text fields — preserved
4829. Emoji in text fields — preserved or stripped cleanly
4830. RTL text in fields — handled or left-to-right forced
4831. Very long text (100K chars) — truncated or rejected
4832. HTML tags in text fields — escaped in display
4833. Script injection attempt — XSS prevented
4834. SQL injection attempt via form fields — no effect
4835. Null bytes in input — stripped
4836. Control characters in input — stripped
4837. Double-byte characters (Chinese, Japanese) — handled
4838. Email with international domain — validated correctly
4839. Phone with international format — handled
4840. Date before 1900 — accepted (elderly patients)
4841. Date after 2100 — warning for unlikely dates
4842. Future birth date — error
4843. Negative age calculated — error
4844. SSN format variations — normalized
4845. NPI with leading zeros — preserved as string

### Network Error Handling
4846. API request timeout — toast with retry option
4847. API 500 error — user-friendly error page
4848. API 502/503/504 — "Service unavailable" message
4849. API 429 rate limit — "Too many requests" message
4850. Network offline detection — banner shown
4851. Network reconnection — banner dismissed, data refreshed
4852. Partial API failure (some calls succeed, some fail) — handled
4853. API returns HTML instead of JSON — error handled
4854. API returns empty body — handled
4855. API returns malformed JSON — error handled
4856. CORS error — appropriate message
4857. Certificate error — appropriate handling

### Browser Compatibility
4858. Chrome latest — all features work
4859. Firefox latest — all features work
4860. Safari latest — all features work
4861. Edge latest — all features work
4862. Chrome mobile — all features work
4863. Safari iOS — all features work
4864. NEGATIVE: Internet Explorer — not supported banner
4865. NEGATIVE: Very old browser — graceful degradation or upgrade prompt

### Performance Edge Cases
4866. Page with 100 patients in list — renders smoothly
4867. Page with 1000 appointments in calendar — performs
4868. Patient chart with 500 allergies — paginated
4869. Encounter with 100 sections — scrollable
4870. Dashboard with 10 chart widgets — all render
4871. Rapid navigation between pages — no memory leak
4872. Long session (8+ hours) — no degradation
4873. Multiple open modals — proper z-index stacking
4874. Rapid click on save button — debounced (single request)
4875. Rapid pagination clicks — last request wins

### Accessibility (WCAG)
4876. All pages keyboard navigable (Tab, Shift+Tab)
4877. Focus indicators visible on all interactive elements
4878. Skip navigation link for keyboard users
4879. ARIA labels on all form fields
4880. ARIA roles on navigation, main, complementary regions
4881. Alt text on all images
4882. Color contrast ratio >= 4.5:1 for normal text
4883. Color contrast ratio >= 3:1 for large text
4884. Information not conveyed by color alone (badges have text)
4885. Form error messages associated with fields (aria-describedby)
4886. Screen reader announces page changes
4887. Screen reader announces modal open/close
4888. Screen reader announces toast notifications
4889. Reduced motion preference respected (prefers-reduced-motion)
4890. Zoom to 200% — no horizontal scroll, all content visible

### Internationalization / Localization
4891. Date format respects locale (MM/DD/YYYY for US)
4892. Time format respects locale (12h for US)
4893. Currency format respects locale ($)
4894. Number format respects locale (comma thousands separator)
4895. Phone format respects country
4896. All text can accommodate longer translations (no overflow)
4897. UI language change if supported

### Print Layout
4898. Print any page — header/footer from print settings
4899. Print patient chart — clean layout
4900. Print encounter summary — complete and formatted
4901. Print appointment schedule — daily layout
4902. Print prescription — proper format
4903. Print invoice/statement — financial format
4904. Print hides sidebar, header navigation
4905. Print shows practice logo and address
4906. Print uses black-and-white friendly styling
4907. NEGATIVE: Print with no practice logo — text name only

### Security Edge Cases
4908. XSS via URL parameters — sanitized
4909. XSS via form input — HTML escaped
4910. XSS via file name upload — sanitized
4911. CSRF protection active on all POST/PUT/DELETE
4912. JWT tampered — API rejects with 401
4913. JWT expired — token refresh or re-login
4914. JWT with wrong audience — rejected
4915. Sensitive data not in URL query parameters
4916. Sensitive data not in browser history
4917. Password not visible in network inspector (HTTPS)
4918. API responses don't include extra/unrelated data
4919. File upload — virus/malware scanning if configured
4920. File download — content-disposition header prevents execution
4921. Rate limiting on authentication endpoints
4922. Account lockout after N failed attempts

### Data Import Edge Cases
4923. Import CSV with UTF-8 BOM — handled
4924. Import CSV with different line endings (CRLF, LF) — handled
4925. Import CSV with quoted fields containing commas — parsed correctly
4926. Import CSV with empty rows — skipped
4927. Import CSV with header row mismatch — error
4928. Import very large CSV (100MB) — chunked processing
4929. Import with duplicate records — appropriate handling
4930. NEGATIVE: Import malformed CSV — error with line number

### Data Export Edge Cases
4931. Export to CSV — proper escaping of commas and quotes
4932. Export large dataset — streaming/chunked download
4933. Export with date fields — formatted correctly
4934. Export with special characters — UTF-8 encoded
4935. Export with null values — empty cells, not "null" text
4936. Export filename includes date and report name
4937. NEGATIVE: Export with no data — empty file or message

### URL Edge Cases
4938. Direct URL navigation to any page — works with auth
4939. Deep link to patient chart tab — loads correct tab
4940. Deep link to settings page — loads correct settings
4941. URL with query parameters — applied as filters
4942. URL with invalid patient ID — 404 page
4943. URL with invalid tab key — fallback to default tab
4944. URL encoding of special characters — handled
4945. Very long URL (2000+ chars) — handled or truncated

### Browser State
4946. Browser refresh — maintains auth, reloads page data
4947. Browser back from form — unsaved changes warning
4948. Browser close during edit — data in localStorage/draft
4949. Browser history clean — no sensitive data in history
4950. Multiple tabs — each operates independently
4951. Copy page URL — shareable (auth required)
4952. Bookmark page — returns to correct page on visit

### WebSocket / Real-Time (if implemented)
4953. Real-time appointment updates on calendar
4954. Real-time patient check-in notification
4955. Real-time new message notification
4956. WebSocket reconnection after disconnect
4957. WebSocket authentication
4958. NEGATIVE: WebSocket connection lost — graceful degradation

### API Edge Cases
4959. API response with extra unknown fields — ignored gracefully
4960. API response with missing optional fields — defaults applied
4961. API response with different field types — type coercion
4962. API pagination — last page has fewer items
4963. API pagination — page beyond total — empty result
4964. API concurrent requests — all resolve correctly
4965. API retry on transient failure (503)
4966. API idempotency — duplicate POST doesn't create duplicates
4967. API large response (10MB) — handled without crash
4968. API binary response (file download) — saved correctly

### FHIR-Specific Edge Cases
4969. FHIR resource with no id — create (POST) not update (PUT)
4970. FHIR resource with server-generated id — id returned in response
4971. FHIR Bundle with 0 entries — empty list
4972. FHIR Bundle with total=0 but entries present — trust entries
4973. FHIR resource version conflict (409) — handled
4974. FHIR search with no results — Bundle.total = 0
4975. FHIR reference to deleted resource — handled gracefully
4976. FHIR extension with unknown URL — preserved
4977. FHIR Coding with no display — show code only
4978. FhirPathMapper with complex where() — correct extraction
4979. formDataExtension roundtrip — all unmapped fields preserved

### Config Server Edge Cases
4980. Config server unavailable — app uses cached config or fails gracefully
4981. Config server returns different values — hot reload if supported
4982. Config change for service URL — takes effect after restart
4983. NEGATIVE: Missing required config property — app fails with clear message

### Deployment Edge Cases
4984. Rolling deployment — no downtime
4985. New version deployed — old connections gracefully drained
4986. Database migration during deployment — Flyway runs first
4987. Migration failure — deployment rolls back
4988. NEGATIVE: Migration conflict (concurrent migrations) — one wins

### End-to-End Workflows
4989. New patient workflow: Register → Add insurance → Schedule appointment → Check-in → Start encounter → Vitals → HPI → ROS → PE → Assessment → Procedures → Sign → Generate claim → Submit claim → Post payment
4990. Follow-up workflow: Recall triggered → Patient contacted → Appointment scheduled → Encounter → Sign → Claim
4991. Lab workflow: Order labs → Collect specimen → Results received → Provider reviews → Patient notified
4992. Referral workflow: Create referral → Send → Track → Consultation received → Close
4993. Billing workflow: Encounter → Charge capture → Claim → Submit → ERA → Post payment → Patient statement
4994. Provider onboarding: Add provider in settings → Set schedule → Assign to facility → Provider appears in dropdowns
4995. Practice setup: Create practice → Add facilities → Add providers → Configure insurance → Set fee schedules → Ready for patients

### Final Edge Cases
4996. System with zero data (fresh install) — all pages show empty states
4997. System with maximal data (100K patients, 1M encounters) — pagination handles
4998. All error messages user-friendly (no UUIDs, stack traces, or technical jargon)
4999. All destructive actions require confirmation dialog
5000. All features accessible from both keyboard and mouse

---

## Summary

| Section | Range | Count |
|---------|-------|-------|
| 1. Authentication & Login | 1-100 | 100 |
| 2. Dashboard | 101-200 | 100 |
| 3. Patient Management | 201-600 | 400 |
| 4. Appointments & Calendar | 601-1000 | 400 |
| 5. Encounters | 1001-1500 | 500 |
| 6. Patient Chart Tabs | 1501-2200 | 700 |
| 7. Settings Pages | 2201-2800 | 600 |
| 8. Labs & Orders | 2801-3000 | 200 |
| 9. Inventory Management | 3001-3300 | 300 |
| 10. Reports | 3301-3500 | 200 |
| 11. Messaging & Recall | 3501-3650 | 150 |
| 12. Claims & Billing | 3651-3850 | 200 |
| 13. Ciyex Hub / Marketplace | 3851-4050 | 200 |
| 14. Developer Portal | 4051-4200 | 150 |
| 15. Dynamic Form Fields | 4201-4500 | 300 |
| 16. Navigation & Layout | 4501-4650 | 150 |
| 17. Encounter Form Specialties | 4651-4800 | 150 |
| 18. Edge Cases & Error Handling | 4801-5000 | 200 |
| **Total** | **1-5000** | **5000** |
