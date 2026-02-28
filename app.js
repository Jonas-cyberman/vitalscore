/* ====================================================
   NurseTrack — app.js
   All data, rendering, and calculation logic
   ==================================================== */

const APP_VERSION = "1.0.0";
const CHANGELOG = [
  {
    version: "1.0.0",
    date: "2025",
    changes: [
      "Initial launch of Vital Score",
      "Year 1 and Year 2 curriculum loaded",
      "Full GPA calculator and cumulative engine",
      "Resit grade handling added",
      "GPA projection and what-if simulator"
    ]
  }
];

// ─── GRADE POINT TABLE (Single Source of Truth) ───────────────────────────
const GRADE_POINTS = { 'A':4.00,'A-':3.75,'B+':3.50,'B':3.00,'B-':2.50,'C+':2.00,'C':1.50,'D':1.00,'F':0.00 };

// ─── CURRICULUM DATA ──────────────────────────────────────────────────────
const CURRICULUM = [
  // Y1 S1
  { name:'Professional Adjustment in Nursing',             code:'ADJ 111', credits:2, year:1, semester:1 },
  { name:'Basic Nursing',                                  code:'BNS 111', credits:3, year:1, semester:1 },
  { name:'Anatomy and Physiology I',                       code:'HAP 111', credits:3, year:1, semester:1 },
  { name:'Microbiology and Infection Prevention/Control',  code:'MIP 111', credits:2, year:1, semester:1 },
  { name:'Nursing and Midwifery Health Informatics',       code:'NMI 111', credits:2, year:1, semester:1 },
  { name:'Therapeutic Communication',                      code:'TCM 111', credits:3, year:1, semester:1 },
  // Y1 S2
  { name:'First Aid, Emergency and Disaster Management',   code:'FED 121', credits:3, year:1, semester:2 },
  { name:'Introductory French Language',                   code:'IFL 041', credits:0, year:1, semester:2, nonGraded:true },
  { name:'Introductory Sign Language',                     code:'ISL 041', credits:0, year:1, semester:2, nonGraded:true },
  { name:'Behavioural Science',                            code:'PNM 121', credits:2, year:1, semester:2 },
  { name:'Anatomy and Physiology II',                      code:'RGN 121', credits:3, year:1, semester:2 },
  { name:'Advanced Nursing I',                             code:'RGN 122', credits:2, year:1, semester:2 },
  { name:'Nursing Process',                                code:'RGN 123', credits:3, year:1, semester:2 },
  { name:'Child Protection and Abuse',                     code:'RGN 124', credits:3, year:1, semester:2 },
  { name:'Statistics',                                     code:'STA 121', credits:2, year:1, semester:2 },
  // Y2 S1
  { name:'Nutrition and Dietetics',                        code:'NAD 122', credits:3, year:2, semester:1 },
  { name:'Anatomy and Physiology III',                     code:'RGN 211A',credits:2, year:2, semester:1 },
  { name:'Advanced Nursing II',                            code:'RGN 211', credits:2, year:2, semester:1 },
  { name:'Medical Nursing I',                              code:'RGN 213', credits:3, year:2, semester:1 },
  { name:'Surgical Nursing I',                             code:'RGN 215', credits:3, year:2, semester:1 },
  { name:'Pharmacology, Therapeutics & Pharmacovigilance I', code:'RGN 217', credits:3, year:2, semester:1 },
  { name:'Gerontology',                                    code:'RGN 232', credits:2, year:2, semester:1 },
  // Y2 S2
  { name:'Medical Nursing II',                             code:'H RGN 060',credits:3, year:2, semester:2 },
  { name:'Psychiatric Nursing',                            code:'H RGN 066',credits:3, year:2, semester:2 },
  { name:'Surgical Nursing II',                            code:'H RGN 070',credits:3, year:2, semester:2 },
  { name:'Pharmacology, Therapeutics & Pharmacovigilance II',code:'PTP 221',credits:3, year:2, semester:2 },
  { name:'Research Methods',                               code:'RES 221', credits:3, year:2, semester:2 },
  { name:'Community-Based Rehabilitation',                 code:'RGN 321', credits:3, year:2, semester:2 },
  { name:'Supply Chain Management',                        code:'SCM 311', credits:2, year:2, semester:2 },
  // Y3 S1
  { name:'Medicine and Medical Nursing III',               code:'RGN 315', credits:3, year:3, semester:1 },
  { name:'Obstetric Nursing I',                            code:'OBS 311', credits:2, year:3, semester:1 },
  { name:'Paediatric Nursing I',                           code:'RGN 313', credits:3, year:3, semester:1 },
  { name:'Surgery and Surgical Nursing III',               code:'RGN 317', credits:3, year:3, semester:1 },
  { name:'Traditional Medicine',                           code:'GHN 211', credits:3, year:3, semester:1 },
  // Y3 S2
  { name:'Management and Administration in Nursing',       code:'RGN 222', credits:3, year:3, semester:2 },
  { name:'Obstetric Nursing II',                           code:'HRGN 051',credits:1, year:3, semester:2 },
  { name:'Paediatric Nursing II',                          code:'RGN 322', credits:3, year:3, semester:2 },
  { name:'Patient/Family Care Study',                      code:'HRGN 053',credits:3, year:3, semester:2 },
  { name:'Public Health',                                  code:'PHN 321', credits:3, year:3, semester:2 },
  { name:'Relationship Marketing Strategy & Entrepreneurship', code:'RSE 321', credits:3, year:3, semester:2 },
];

// ─── STATE ────────────────────────────────────────────────────────────────
let profile     = JSON.parse(localStorage.getItem('nt_profile')     || 'null');
let savedGrades = JSON.parse(localStorage.getItem('nt_grades')      || '{}');
let savedResits = JSON.parse(localStorage.getItem('nt_resits')      || '{}');
// semResults key = "year-sem" e.g. "1-1" — { year, semester, gpa, credits }
let semResults  = JSON.parse(localStorage.getItem('nt_sem_results') || '{}');
let currentYear = 1;

// ─── RESIT HELPERS ────────────────────────────────────────────────────────
function getEffectiveGP(code) {
  const g = savedGrades[code];
  if (!g || GRADE_POINTS[g] === undefined) return null;
  const origGP = GRADE_POINTS[g];
  const r = savedResits[code];
  if (r && r.resit && GRADE_POINTS[r.resit] !== undefined) {
    return Math.round(((origGP + GRADE_POINTS[r.resit]) / 2) * 100) / 100;
  }
  return origGP;
}

function addResit(code) {
  const origGrade = savedGrades[code];
  if (!origGrade) {
    showToast('Select an original grade first.', 'error'); return;
  }
  if (origGrade !== 'F') {
    if (!confirm('⚠️ Resits are typically for failed courses. Are you sure this course was resitted?')) return;
  }
  savedResits[code] = savedResits[code] || {};
  localStorage.setItem('nt_resits', JSON.stringify(savedResits));
  refreshCourseRow(code);
  updateCalc();
}

function removeResit(code) {
  delete savedResits[code];
  localStorage.setItem('nt_resits', JSON.stringify(savedResits));
  refreshCourseRow(code);
  updateCalc();
  autoCalculateSemesters();
}

function resitGradeChanged(code, val) {
  const origGrade = savedGrades[code];
  if (val && origGrade === val) {
    showToast('Resit grade must be different from original grade.', 'error');
    document.getElementById('rg-' + code).value = savedResits[code] ? (savedResits[code].resit || '') : '';
    return;
  }
  if (!savedResits[code]) savedResits[code] = {};
  if (val) { savedResits[code].resit = val; }
  else { delete savedResits[code].resit; }
  localStorage.setItem('nt_resits', JSON.stringify(savedResits));
  refreshCourseRow(code);
  updateCalc();
  autoCalculateSemesters();
}

function refreshCourseRow(code) {
  // find the course definition
  const course = CURRICULUM.find(c => c.code === code);
  if (!course) return;
  // Re-render just this row
  const sem = course.semester;
  const el  = document.getElementById('s' + sem + '-courses');
  if (!el) return;
  renderCalcCourses(currentYear);
  renderResitSummary(currentYear);
}

function renderResitSummary(yr) {
  [1, 2].forEach(sem => {
    const summaryId = `resit-summary-s${sem}`;
    const existing  = document.getElementById(summaryId);
    if (existing) existing.remove();

    const courses = CURRICULUM.filter(c => c.year === yr && c.semester === sem && !c.nonGraded);
    const resitted = courses.filter(c => savedResits[c.code] && savedResits[c.code].resit);
    if (!resitted.length) return;

    // Build summary card
    let rows = resitted.map(c => {
      const orig  = savedGrades[c.code] || '—';
      const res   = savedResits[c.code].resit;
      const effGP = getEffectiveGP(c.code);
      const origOrigGP = savedGrades[c.code] && GRADE_POINTS[savedGrades[c.code]] !== undefined ? GRADE_POINTS[savedGrades[c.code]] : null;
      const resGP     = GRADE_POINTS[res] !== undefined ? GRADE_POINTS[res] : null;
      const origColor = orig === 'F' ? 'color:#ef4444' : '';
      const resColor  = (resGP !== null && origOrigGP !== null && resGP > origOrigGP) ? 'color:#22c55e' : 'color:#ef4444';
      return `<tr>
        <td style="font-size:0.78rem;">${c.name}</td>
        <td style="text-align:center;${origColor};font-weight:700">${orig}</td>
        <td style="text-align:center;${resColor};font-weight:700">${res}</td>
        <td style="text-align:center;color:#f5a623;font-weight:700">${effGP !== null ? effGP.toFixed(2) : '—'}</td>
      </tr>`;
    }).join('');

    const card = document.createElement('div');
    card.id = summaryId;
    card.style.cssText = 'margin-top:10px;';
    card.innerHTML = `
      <div class="card">
        <div class="section-label">📋 Resit Comparison — Semester ${sem}</div>
        <table class="resit-table">
          <thead><tr><th>Course</th><th>1st</th><th>2nd</th><th>Eff. GP</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="resit-policy-note">ℹ️ Resit grades are averaged with your original grade as per DONMTC academic policy. Your effective grade points are used in all GPA calculations.</p>
      </div>`;

    // Insert after semester card
    const semCard = document.getElementById('s' + sem + '-courses').closest('.card');
    if (semCard && semCard.nextSibling) semCard.parentNode.insertBefore(card, semCard.nextSibling);
    else document.getElementById('year-content').appendChild(card);
  });
}

// ─── PRINT SHEET POPULATION ───────────────────────────────────────────────
function populatePrintSheet() {
  // Student info
  document.getElementById('pr-name').textContent = profile ? profile.nick : '—';
  document.getElementById('pr-prog').textContent = profile ? profile.prog : '—';
  document.getElementById('pr-report-label').textContent = 'VITAL SCORE — THE COLEMAN INDEX · Official Academic GPA Record';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'})
    + ' at ' + now.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
  document.getElementById('pr-date').textContent     = dateStr;
  document.getElementById('pr-footer-right').textContent = 'Document printed on ' + dateStr + ' — Page 1/1';

  // Build per-year sections
  const container = document.getElementById('pr-year-sections');
  container.innerHTML = '';
  let totalAllPts = 0, totalAllCred = 0;

  [1, 2, 3].forEach(yr => {
    // Only render this year's results if at least one semester is saved
    const s1saved = !!semResults[`${yr}-1`];
    const s2saved = !!semResults[`${yr}-2`];
    if (!s1saved && !s2saved) return;

    const courses = CURRICULUM.filter(c => c.year === yr && !c.nonGraded);
    let semPts = [0, 0], semCred = [0, 0];

    let rows = '';
    courses.forEach(c => {
      const isSaved = (c.semester === 1 && s1saved) || (c.semester === 2 && s2saved);
      const g = isSaved ? (savedGrades[c.code] || '') : '';
      const r = isSaved ? (savedResits[c.code] && savedResits[c.code].resit) : null;
      const displayGrade = r ? `${g} (${r})` : (g || '—');
      
      const gp = isSaved ? getEffectiveGP(c.code) : '';
      const fullGP = gp !== '' ? (gp * c.credits).toFixed(2) : '—';
      
      if (gp !== '') {
        semPts[c.semester - 1]  += gp * c.credits;
        semCred[c.semester - 1] += c.credits;
      }
      
      rows += `<tr>
        <td>${c.code}</td>
        <td>${c.name}</td>
        <td style="text-align:center">${c.credits}</td>
        <td style="text-align:center">${displayGrade}</td>
        <td style="text-align:center">${gp !== '' ? gp.toFixed(2) : '—'}</td>
        <td style="text-align:center">${fullGP}</td>
      </tr>`;
    });

    const s1gpa = semCred[0] ? (semPts[0] / semCred[0]).toFixed(2) : '—';
    const s2gpa = semCred[1] ? (semPts[1] / semCred[1]).toFixed(2) : '—';
    const totPts  = semPts[0]  + semPts[1];
    const totCred = semCred[0] + semCred[1];
    const yrGPA   = totCred ? (totPts / totCred).toFixed(2) : '—';
    totalAllPts  += totPts;
    totalAllCred += totCred;

    container.innerHTML += `
      <div class="pr-year-heading">YEAR ${yr} RESULT</div>
      <table class="pr-course-table">
        <thead>
          <tr>
            <th>COURSE CODE</th><th>COURSE TITLE</th><th>CREDITS</th>
            <th>GRADE</th><th>GRADE POINT</th><th>FULL GP</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <table class="pr-course-table" style="width:70%;margin-bottom:14px;">
        <tr>
          <td><strong>Sem 1 GPA</strong></td><td>${s1gpa}</td>
          <td><strong>Sem 2 GPA</strong></td><td>${s2gpa}</td>
          <td><strong>Year ${yr} GPA</strong></td><td>${yrGPA}</td>
        </tr>
      </table>`;
  });

  // Cumulative totals
  const cgpa = totalAllCred ? (totalAllPts / totalAllCred) : 0;
  document.getElementById('pr-tot-credits').textContent  = totalAllCred;
  document.getElementById('pr-tot-pts').textContent      = totalAllPts.toFixed(2);
  document.getElementById('pr-cgpa-pts').textContent     = totalAllPts.toFixed(2);
  document.getElementById('pr-cgpa-cred').textContent    = totalAllCred;
  document.getElementById('pr-cgpa').textContent         = cgpa.toFixed(2);
}

window.addEventListener('beforeprint', populatePrintSheet);

// ─── INITIALIZATION & VERSIONING ──────────────────────────────────────────
function checkVersion() {
  const storedVersion = localStorage.getItem('nt_version');
  if (storedVersion !== APP_VERSION) {
    const list = document.getElementById('cl-list');
    list.innerHTML = '';
    const currentLog = CHANGELOG.find(c => c.version === APP_VERSION) || CHANGELOG[0];
    document.getElementById('cl-title').textContent = `🎉 What's New in v${APP_VERSION}`;
    currentLog.changes.forEach(change => {
      const li = document.createElement('li');
      li.style.marginBottom = '8px';
      li.textContent = change;
      list.appendChild(li);
    });
    showModal('changelog-modal');
    localStorage.setItem('nt_version', APP_VERSION);
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Splash screen: fade out after 2 seconds
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 650);
    }
  }, 2000);

  applyTheme();
  applyFontSize();
  autoCalculateSemesters();
  
  if (!profile) showModal('onboarding-modal');
  else          populateProfile();
  
  switchYear(1);
  checkVersion();
  
  // Offline / Online listeners
  const offBanner = document.getElementById('offline-banner');
  const netDot    = document.getElementById('network-dot');
  
  function updateNetworkStatus() {
    if (!navigator.onLine) {
      offBanner.textContent = "📡 You're offline — Vital Score still works fully. Your data is safe.";
      offBanner.style.background = "#f5a623";
      offBanner.style.color = "#1e3a5f";
      offBanner.style.display = "block";
      if (netDot) {
        netDot.style.background = "#f5a623";
        netDot.title = "Offline mode - Your data is safe";
      }
    } else {
      offBanner.textContent = "✅ Back online";
      offBanner.style.background = "#22c55e";
      offBanner.style.color = "#fff";
      if (netDot) {
        netDot.style.background = "#22c55e";
        netDot.title = "All data stored on your device";
      }
      setTimeout(() => { offBanner.style.display = "none"; }, 3000);
    }
  }
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  if (!navigator.onLine) updateNetworkStatus(); // Initial check

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
});

// ─── THEME ────────────────────────────────────────────────────────────────
function toggleTheme() {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('nt_theme', t);
  document.getElementById('theme-btn-icon').textContent = t === 'dark' ? '☀️' : '🌙';
}
function applyTheme() {
  const stored = localStorage.getItem('nt_theme');
  const pref   = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const t = stored || pref;
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('theme-btn-icon').textContent = t === 'dark' ? '☀️' : '🌙';
}

// ─── ACCESSIBILITY: FONT SIZE ──────────────────────────────────────────────
function setFontSize(size) {
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  if (size !== 'medium') document.body.classList.add(`font-${size}`);
  localStorage.setItem('nt_font_size', size);
  showToast(`Text size set to ${size}`, 'success');
}
function applyFontSize() {
  const size = localStorage.getItem('nt_font_size') || 'medium';
  if (size !== 'medium') document.body.classList.add(`font-${size}`);
}

// ─── MODAL ────────────────────────────────────────────────────────────────
function showModal(id)  { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// ─── PROGRAMME CARD SELECTOR ──────────────────────────────────────────────
function selectProg(value, type) {
  // Reset all cards
  ['pcard-rgn','pcard-mid','pcard-nac'].forEach(id => {
    const c = document.getElementById(id);
    if (c) c.classList.remove('selected-live','selected-soon');
  });

  // Apply selected class to the clicked card
  const cardMap = {
    'General Nursing (RGN)':           'pcard-rgn',
    'Midwifery':                       'pcard-mid',
    'Nursing Assistants Certificate (NAC)': 'pcard-nac',
  };
  const card = document.getElementById(cardMap[value]);
  if (card) card.classList.add(type === 'live' ? 'selected-live' : 'selected-soon');

  // Store value in hidden input
  document.getElementById('ob-prog').value = value;

  // Show/hide notices & WIP banner
  const notice  = document.getElementById('prog-soon-notice');
  const banner  = document.getElementById('prog-wip-banner');
  const btn     = document.getElementById('ob-start-btn');
  if (type === 'soon') {
    notice.classList.add('visible');
    banner.classList.add('visible');
    btn.classList.add('btn-disabled');
    btn.textContent = 'Not Available Yet';
  } else {
    notice.classList.remove('visible');
    banner.classList.remove('visible');
    btn.classList.remove('btn-disabled');
    btn.textContent = 'Get Started →';
  }
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────
function saveProfile() {
  const nick = document.getElementById('ob-nick').value.trim() || 'Student';
  const prog = document.getElementById('ob-prog').value || 'General Nursing (RGN)';
  profile = { nick, prog };
  localStorage.setItem('nt_profile', JSON.stringify(profile));
  closeModal('onboarding-modal');
  populateProfile();
  
  if (!localStorage.getItem('nt_tutorial_done')) {
    setTimeout(startTutorial, 300);
  } else {
    showToast('Welcome, ' + nick + '! Track your vitals. 💗', 'success');
  }
}

function populateProfile() {
  if (!profile) return;
  document.getElementById('prof-name').textContent      = profile.nick;
  document.getElementById('prof-prog-badge').textContent= profile.prog;
  document.getElementById('ob-nick').value = profile.nick === 'Student' ? '' : profile.nick;

  // Restore programme card selection
  const progVal = profile.prog || 'General Nursing (RGN)';
  const isLive = progVal === 'General Nursing (RGN)';
  document.getElementById('ob-prog').value = progVal;
  selectProg(progVal, isLive ? 'live' : 'soon');

  // Print info
  document.getElementById('print-name').textContent     = profile.nick;
  document.getElementById('print-prog').textContent     = profile.prog;

  // Profile semester GPA summary
  const semLabels = ['Y1S1','Y1S2','Y2S1','Y2S2','Y3S1','Y3S2'];
  [[1,1],[1,2],[2,1],[2,2],[3,1],[3,2]].forEach(([y,s], i) => {
    const elId = `prof-sem-${y}-${s}`;
    const el   = document.getElementById(elId);
    const r    = semResults[`${y}-${s}`];
    if (el) el.textContent = r ? r.gpa.toFixed(2) : '—';
    const row = document.getElementById(`prof-sem-row-${y}-${s}`);
    if (row) row.style.display = r ? '' : 'none';
  });
  const cgpa = calcCGPA();
  document.getElementById('prof-cgpa').textContent = cgpa > 0 ? cgpa.toFixed(2) : '—';

  // Resit count
  const resitCount = Object.keys(savedResits).filter(k => savedResits[k] && savedResits[k].resit).length;
  const resitEl = document.getElementById('prof-resit-count');
  if (resitEl) {
    resitEl.parentElement.style.display = resitCount > 0 ? '' : 'none';
    resitEl.textContent = resitCount;
  }
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────
function switchTab(id, navEl) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  navEl.classList.add('active');
  if (id === 'cumulative')  renderCumulative();
  if (id === 'projection')  renderProjection();
  if (id === 'profile')     populateProfile();
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function gradeChipClass(g) {
  if (!g) return 'chip-na';
  if (g === 'A' || g === 'A-')        return 'chip-a';
  if (g.startsWith('B'))              return 'chip-b';
  if (g.startsWith('C'))              return 'chip-c';
  if (g === 'D')                      return 'chip-d';
  return 'chip-f';
}
function gradeOptions(selected) {
  return '<option value="">—</option>' +
    Object.keys(GRADE_POINTS).map(g =>
      `<option value="${g}" ${g === selected ? 'selected' : ''}>${g}</option>`
    ).join('');
}
function getClassification(c) {
  if (c >= 3.60) return { label:'First Class',                    cls:'badge-gold',   color:'#f5a623' };
  if (c >= 3.00) return { label:'Second Class (Upper Division)',  cls:'badge-blue',   color:'#3b82f6' };
  if (c >= 2.50) return { label:'Second Class (Lower Division)',  cls:'badge-green',  color:'#22c55e' };
  if (c >= 2.00) return { label:'Third Class Division',           cls:'badge-purple', color:'#7c3aed' };
  if (c >= 1.00) return { label:'Pass',                          cls:'badge-grey',   color:'#9ca3af' };
  return           { label:'Fail',                          cls:'badge-red',    color:'#ef4444' };
}
function calcCGPA() {
  let pts = 0, cred = 0;
  Object.values(semResults).forEach(r => { pts += r.gpa * r.credits; cred += r.credits; });
  return cred ? pts / cred : 0;
}

// ─── TAB 1 — CALCULATOR ───────────────────────────────────────────────────
function switchYear(yr) {
  currentYear = yr;
  document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('yr-btn-' + yr).classList.add('active');

  const locked  = document.getElementById('year-locked');
  const content = document.getElementById('year-content');

  locked.style.display  = 'none';
  content.style.display = 'block';
  document.getElementById('completion-wrap').style.display = 'flex';
  document.getElementById('calc-yr-label').textContent = yr;
  renderCalcCourses(yr);
  updateCalc();
  renderResitSummary(yr);
}

function renderCalcCourses(yr) {
  [1, 2].forEach(sem => {
    const el = document.getElementById('s' + sem + '-courses');
    el.innerHTML = '';
    CURRICULUM.filter(c => c.year === yr && c.semester === sem).forEach(course => {
      const ng      = !!course.nonGraded;
      const sel     = savedGrades[course.code] || '';
      const resit   = savedResits[course.code];
      const hasResit = !ng && resit && resit.resit;
      const effGP   = !ng ? getEffectiveGP(course.code) : null;

      const resitBadge = hasResit ? '<span class="resit-badge">RESIT</span>' : '';

      const resitBlock = hasResit ? `
        <div class="resit-row">
          <div class="resit-sub-label">2nd Attempt</div>
          <select class="grade-select" id="rg-${course.code}"
            onchange="resitGradeChanged('${course.code}', this.value)">
            ${gradeOptions(resit.resit || '')}
          </select>
          <div class="resit-eff-gp">∅ Effective GP: <strong>${effGP !== null ? effGP.toFixed(2) : '—'}</strong> (averaged)</div>
          <button class="resit-link" onclick="removeResit('${course.code}')">Remove Resit</button>
        </div>` : '';

      const addResitLink = (!ng && !hasResit) ? `
        <button class="resit-link" onclick="addResit('${course.code}')">+ Add Resit</button>` : '';

      el.innerHTML += `
        <div class="course-row">
          <div class="course-info">
            <div class="course-name">${course.name} ${resitBadge}</div>
            <div class="course-meta">${course.code} · ${course.credits} cr</div>
          </div>
          <div class="course-right">
            ${ ng
              ? `<span class="grade-chip chip-na">N/A</span>`
              : `<div class="grade-col">
                   <div class="resit-sub-label">${hasResit ? '1st Attempt' : 'Grade'}</div>
                   <span class="grade-chip ${gradeChipClass(sel)}" id="chip-${course.code}">${sel || '—'}</span>
                   <select class="grade-select" id="g-${course.code}"
                     onchange="gradeChanged('${course.code}', this.value)">
                     ${gradeOptions(sel)}
                   </select>
                   ${addResitLink}
                 </div>
                 ${resitBlock}`
            }
          </div>
        </div>`;
    });
  });
}

function gradeChanged(code, val) {
  if (val) savedGrades[code] = val; else delete savedGrades[code];
  // If original grade changed, clear any pending resit to avoid stale invalid combos
  if (savedResits[code] && savedResits[code].resit === val) {
    delete savedResits[code].resit;
    localStorage.setItem('nt_resits', JSON.stringify(savedResits));
  }
  localStorage.setItem('nt_grades', JSON.stringify(savedGrades));
  const chip = document.getElementById('chip-' + code);
  if (chip) { chip.textContent = val || '—'; chip.className = 'grade-chip ' + gradeChipClass(val); }
  renderResitSummary(currentYear);
  updateCalc();
  autoCalculateSemesters();
}

function updateCalc() {
  let s1pts=0,s1cr=0, s2pts=0,s2cr=0, graded=0;
  const gradable = CURRICULUM.filter(c => c.year === currentYear && !c.nonGraded);
  gradable.forEach(c => {
    const effGP = getEffectiveGP(c.code);
    if (effGP !== null) {
      graded++;
      if (c.semester === 1) { s1pts += effGP * c.credits; s1cr += c.credits; }
      else                  { s2pts += effGP * c.credits; s2cr += c.credits; }
    }
  });
  const s1gpa = s1cr ? s1pts/s1cr : 0;
  const s2gpa = s2cr ? s2pts/s2cr : 0;
  const totcr = s1cr + s2cr;
  const yrgpa = totcr ? (s1pts+s2pts)/totcr : 0;

  document.getElementById('calc-s1').textContent = s1gpa.toFixed(2);
  document.getElementById('calc-s2').textContent = s2gpa.toFixed(2);
  document.getElementById('calc-yr').textContent = yrgpa.toFixed(2);

  const pct = gradable.length ? Math.round((graded/gradable.length)*100) : 0;
  document.getElementById('completion-label').textContent = `${graded} of ${gradable.length} courses graded`;
  document.getElementById('completion-pct').textContent   = pct + '%';
}

function autoCalculateSemesters() {
  semResults = {};
  [1, 2, 3].forEach(yr => {
    [1, 2].forEach(sem => {
      let pts = 0, cr = 0, graded = 0;
      const courses = CURRICULUM.filter(c => c.year === yr && c.semester === sem && !c.nonGraded);
      if (!courses.length) return;
      courses.forEach(c => {
        const effGP = getEffectiveGP(c.code);
        if (effGP !== null) { pts += effGP * c.credits; cr += c.credits; graded++; }
      });
      if (graded > 0) {
        semResults[`${yr}-${sem}`] = { year: yr, semester: sem, gpa: cr ? pts/cr : 0, credits: cr };
      }
    });
  });
  localStorage.setItem('nt_sem_results', JSON.stringify(semResults));
}

// ─── TAB 2 — CUMULATIVE ───────────────────────────────────────────────────
function renderCumulative() {
  const totalCred = Object.values(semResults).reduce((s,r) => s + r.credits, 0);
  const empty = document.getElementById('cumul-empty');
  const cont  = document.getElementById('cumul-content');

  if (!totalCred) {
    empty.style.display = 'flex'; cont.style.display = 'none'; return;
  }
  empty.style.display = 'none'; cont.style.display = 'block';

  const cgpa = calcCGPA();
  const cl   = getClassification(cgpa);

  // Badge
  document.getElementById('cgpa-num').textContent  = cgpa.toFixed(2);
  const badge = document.getElementById('cgpa-badge');
  badge.style.background = cl.color;
  if (cl.cls === 'badge-gold') badge.style.background = 'linear-gradient(135deg,#f5a623,#f59e0b)';
  if (cl.cls === 'badge-blue') badge.style.background = 'linear-gradient(135deg,#1e3a5f,#3b82f6)';
  if (cl.cls === 'badge-green')badge.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';

  const clBadge = document.getElementById('class-badge');
  clBadge.textContent  = cl.label;
  clBadge.className    = 'class-badge ' + cl.cls;

  document.getElementById('cgpa-credits').textContent = totalCred + ' total credits';

  // Progress bar
  const fill = document.getElementById('prog-fill');
  setTimeout(() => { fill.style.width = Math.min((cgpa/4)*100,100) + '%'; fill.style.backgroundColor = cl.color; }, 60);

  // Semester summaries
  const sumEl = document.getElementById('year-summaries');
  sumEl.innerHTML = '';
  const semLabels = ['Y1S1','Y1S2','Y2S1','Y2S2','Y3S1','Y3S2'];
  [[1,1],[1,2],[2,1],[2,2],[3,1],[3,2]].forEach(([y,s], i) => {
    const r = semResults[`${y}-${s}`];
    if (r) {
      sumEl.innerHTML += `
        <div class="summary-row">
          <span>${semLabels[i]}</span>
          <div style="text-align:right;">
            <div class="summary-val">${r.gpa.toFixed(2)}</div>
            <div style="font-size:0.75rem;color:var(--text-sub)">${r.credits} cr</div>
          </div>
        </div>`;
    }
  });
  // Trigger chart render (Feature 1)
  renderGPAChart();

  // Alerts — official DONMTC 6-tier rules
  const alertsEl = document.getElementById('cgpa-alerts');
  alertsEl.innerHTML = '';

  if (cgpa >= 3.60) {
    alertsEl.innerHTML = `<div class="alert alert-gold">🏆 First Class Standing. Outstanding performance. Maintain it.</div>`;
  } else if (cgpa < 1.00) {
    alertsEl.innerHTML = `<div class="alert alert-danger">🚨 Academic Dismissal Risk: Your CGPA is below 1.0. You are at risk of being dismissed. Please seek academic counseling immediately.</div>`;
  } else if (cgpa < 2.00) {
    alertsEl.innerHTML = `<div class="alert alert-warning">⚠️ Pass Level: Your CGPA is in the Pass range. Work harder to move into Third Class and above.</div>`;
  } else if (cgpa < 2.50) {
    const gap = (2.50 - cgpa).toFixed(2);
    alertsEl.innerHTML = `<div class="alert alert-warning">📈 Third Class Zone: You are <strong>${gap}</strong> grade points away from Second Class Lower Division. You can move up.</div>`;
  } else {
    // Within 0.15 of the next boundary?
    const boundaries = [
      { b:3.60, name:'First Class' },
      { b:3.00, name:'Second Class (Upper Division)' },
      { b:2.50, name:'Second Class (Lower Division)' },
    ];
    boundaries.forEach(({b, name}) => {
      if (cgpa < b && b - cgpa <= 0.15) {
        alertsEl.innerHTML = `<div class="alert alert-info">💡 You are <strong>${(b-cgpa).toFixed(2)}</strong> grade points away from <strong>${name}</strong>. Keep pushing.</div>`;
      }
    });
  }
} // end renderCumulative

// ─── TAB 3 — WHAT-IF SIMULATOR ────────────────────────────────────────────
let simYear = 1;
let simGrades = { a: {}, b: {} };

function renderProjection() {
  // Determine next unsaved year (by semester)
  simYear = 1;
  if (semResults['1-1'] || semResults['1-2']) simYear = 2;
  if (semResults['2-1'] || semResults['2-2']) simYear = 3;
  // If all 3 years have both sems saved, still show year 3
  if (simYear > 3) simYear = 3;

  simGrades = { a: {}, b: {} };
  renderSimulator();
}

function renderSimulator() {
  const courses = CURRICULUM.filter(c => c.year === simYear && !c.nonGraded);
  ['a','b'].forEach(sc => {
    const el = document.getElementById(`sim-col-${sc}`);
    if (!el) return;
    el.innerHTML = '';
    courses.forEach(course => {
      const saved = savedGrades[course.code] || '';
      const val   = simGrades[sc][course.code] || saved;
      el.innerHTML += `
        <div class="course-row">
          <div class="course-info">
            <div class="course-name" style="font-size:0.82rem;">${course.name}</div>
            <div class="course-meta">${course.code} · ${course.credits} cr · S${course.semester}</div>
          </div>
          <div class="course-right">
            <span class="grade-chip ${gradeChipClass(val)}" id="sch-${sc}-${course.code}">${val||'—'}</span>
            <select class="grade-select" onchange="simGradeChanged('${sc}','${course.code}',this.value)">
              ${gradeOptions(val)}
            </select>
          </div>
        </div>`;
    });
  });

  document.getElementById('sim-year-a').textContent = `Year ${simYear} — Current Plan`;
  document.getElementById('sim-year-b').textContent = `Year ${simYear} — What If...`;
  updateComparison();
  renderMinGrades();
}

function simGradeChanged(sc, code, val) {
  simGrades[sc][code] = val;
  const chip = document.getElementById(`sch-${sc}-${code}`);
  if (chip) { chip.textContent = val||'—'; chip.className = 'grade-chip ' + gradeChipClass(val); }
  updateComparison();
}

function updateComparison() {
  // Past semesters (all saved sems NOT for simYear)
  let pastPts = 0, pastCr = 0;
  Object.values(semResults).forEach(r => {
    if (r.year !== simYear) { pastPts += r.gpa * r.credits; pastCr += r.credits; }
  });

  ['a','b'].forEach(sc => {
    let pts = 0, cr = 0;
    CURRICULUM.filter(c => c.year === simYear && !c.nonGraded).forEach(c => {
      const val = simGrades[sc][c.code] || savedGrades[c.code] || '';
      if (val && GRADE_POINTS[val] !== undefined) { pts += GRADE_POINTS[val]*c.credits; cr += c.credits; }
    });
    const totCr   = pastCr + cr;
    const newCGPA = totCr ? (pastPts + pts) / totCr : 0;
    const cl      = getClassification(newCGPA);
    const curCGPA = pastCr ? pastPts / pastCr : 0;
    const diff    = newCGPA - curCGPA;

    document.getElementById(`sim-cgpa-${sc}`).textContent       = newCGPA.toFixed(2);
    document.getElementById(`sim-class-${sc}`).textContent      = cl.label;
    document.getElementById(`sim-class-${sc}`).className        = `class-badge ${cl.cls}`;
    const diffEl = document.getElementById(`sim-diff-${sc}`);
    diffEl.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(2);
    diffEl.style.color = diff >= 0 ? 'var(--success)' : 'var(--danger)';
  });

  ['a','b'].forEach(sc => {
    const card = document.getElementById(`sim-card-${sc}`);
    if (card) card.classList.remove('sim-winner');
  });
  const cgpaA = parseFloat(document.getElementById('sim-cgpa-a').textContent);
  const cgpaB = parseFloat(document.getElementById('sim-cgpa-b').textContent);
  if (cgpaA > cgpaB) document.getElementById('sim-card-a').classList.add('sim-winner');
  else if (cgpaB > cgpaA) document.getElementById('sim-card-b').classList.add('sim-winner');
}

function resetSimulator() {
  simGrades = { a: {}, b: {} };
  renderSimulator();
}

function renderMinGrades() {
  const targetEl = document.getElementById('min-target');
  const outEl    = document.getElementById('min-grades-out');
  if (!targetEl || !outEl) return;
  const target = parseFloat(targetEl.value);

  let pastPts = 0, pastCr = 0;
  Object.values(semResults).forEach(r => {
    if (r.year !== simYear) { pastPts += r.gpa * r.credits; pastCr += r.credits; }
  });

  const courses  = CURRICULUM.filter(c => c.year === simYear && !c.nonGraded);
  const totSimCr = courses.reduce((s,c) => s + c.credits, 0);
  const totCr    = pastCr + totSimCr;
  const needed   = totCr ? (target * totCr - pastPts) / totSimCr : 0;

  if (needed > 4.00) {
    outEl.innerHTML = `<span style="color:var(--danger)">Mathematically impossible — you'd need ${needed.toFixed(2)} GP (max 4.00).</span>`;
    return;
  }
  if (needed <= 0) {
    outEl.innerHTML = `<span style="color:var(--success)">🎉 Already achieved! Your saved semesters are enough.</span>`;
    return;
  }

  // Pick minimum grade at or above needed
  const gradeOrder = [['A',4.00],['A-',3.75],['B+',3.50],['B',3.00],['B-',2.50],['C+',2.00],['C',1.50],['D',1.00],['F',0.00]];
  function minGrade(gp) {
    for (const [g,v] of gradeOrder) { if (v >= gp) return g; }
    return 'F';
  }

  let html = `<p style="font-size:0.82rem;margin-bottom:8px;">You need an average of <strong style="color:var(--primary)">${needed.toFixed(2)} GP</strong> across your Year ${simYear} courses. Minimum by course:</p><div>`;
  courses.forEach(c => {
    const min = minGrade(needed);
    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
      <span>${c.name} <span style="color:var(--text-sub)">(${c.credits}cr)</span></span>
      <span class="grade-chip ${gradeChipClass(min)}" style="font-size:0.75rem;">${min}</span>
    </div>`;
  });
  html += '</div>';
  outEl.innerHTML = html;
}

// ─── UTILS ────────────────────────────────────────────────────────────────
function resetAllData() {
  if (confirm('Are you sure? All saved GPA data will be permanently deleted.')) {
    ['nt_profile','nt_grades','nt_resits','nt_sem_results'].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  }
}


function showToast(msg, type='success') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { t.classList.add('hide'); setTimeout(()=>t.remove(), 400); }, 3000);
}

// ─── FEATURE 1: GPA HISTORY CHART ─────────────────────────────────────────
let gpaChartInstance = null;

function renderGPAChart() {
  const chartWrap = document.getElementById('gpa-chart-wrap');
  const canvas    = document.getElementById('gpa-chart');
  const msg       = document.getElementById('gpa-chart-msg');
  if (!chartWrap || !canvas) return;

  const pairs = [[1,1],[1,2],[2,1],[2,2],[3,1],[3,2]];
  const labels = ['Y1S1','Y1S2','Y2S1','Y2S2','Y3S1','Y3S2'];
  const data   = [], usedLabels = [];
  pairs.forEach(([y,s], i) => {
    const r = semResults[`${y}-${s}`];
    if (r) { data.push(r.gpa); usedLabels.push(labels[i]); }
  });

  if (data.length < 2) {
    canvas.style.display = 'none';
    msg.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  msg.style.display    = 'none';

  if (gpaChartInstance) { gpaChartInstance.destroy(); gpaChartInstance = null; }

  if (typeof Chart === 'undefined') return; // CDN not loaded yet

  const boundaries = [
    { y: 3.60, color: '#f5a623', label: 'First Class' },
    { y: 3.00, color: '#3b82f6', label: '2nd Upper' },
    { y: 2.50, color: '#22c55e', label: '2nd Lower' },
    { y: 2.00, color: '#7c3aed', label: '3rd Class' },
    { y: 1.00, color: '#9ca3af', label: 'Pass' },
  ];

  const boundaryDatasets = boundaries.map(b => ({
    label: b.label,
    data: new Array(usedLabels.length).fill(b.y),
    borderColor: b.color,
    borderDash: [5, 5],
    borderWidth: 1.5,
    pointRadius: 0,
    fill: false,
    tension: 0,
  }));

  gpaChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: usedLabels,
      datasets: [
        ...boundaryDatasets,
        {
          label: 'Your GPA',
          data,
          borderColor: '#f5a623',
          backgroundColor: '#f5a623',
          borderWidth: 2.5,
          tension: 0.4,
          pointBackgroundColor: '#1e3a5f',
          pointBorderColor: '#f5a623',
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      animation: { duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          labels: {
            filter: item => item.text === 'Your GPA',
            color: '#6b7280', font: { size: 11 }
          }
        },
        title: {
          display: true,
          text: 'Your Academic Vital Signs',
          color: '#1e3a5f',
          font: { size: 14, weight: '700' },
          padding: { bottom: 10 }
        },
        tooltip: {
          filter: item => item.dataset.label === 'Your GPA',
          callbacks: {
            label: ctx => ` GPA: ${ctx.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        y: { min: 0, max: 4, ticks: { stepSize: 0.5 }, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ─── FEATURE 2: SHARE CARD ────────────────────────────────────────────────
function generateShareCard() {
  const wrap = document.getElementById('share-card-wrap');
  if (!wrap) return;
  wrap.style.display = wrap.style.display === 'block' ? 'none' : 'block';
  if (wrap.style.display !== 'block') return;

  const canvas = document.getElementById('share-canvas');
  const ctx    = canvas.getContext('2d');
  const cgpa   = calcCGPA();
  const cl     = getClassification(cgpa);
  const nick   = profile ? profile.nick : 'Student';
  const prog   = profile ? profile.prog : 'DNMTC';

  canvas.width = 800; canvas.height = 450;

  // Navy background
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(0, 0, 800, 450);

  // Gold left accent bar
  ctx.fillStyle = '#f5a623';
  ctx.fillRect(0, 0, 8, 450);

  // Heartbeat line decoration
  ctx.strokeStyle = 'rgba(245,166,35,0.20)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const beats = [0,80,110,130,160,195,220,250,280,310,330,360,390,420,450,480,510,540,570,600,630,660,690,720,750,780,800];
  const vals  = [225,225,205,245,185,265,225,225,225,215,235,215,235,225,225,215,235,225,225,225,215,235,225,215,235,225,225];
  beats.forEach((x,i) => i===0 ? ctx.moveTo(x,vals[i]) : ctx.lineTo(x,vals[i]));
  ctx.stroke();

  // "VITAL SCORE" header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Inter, sans-serif';
  ctx.fillText('VITAL SCORE', 40, 80);

  // "The Coleman Index" sub
  ctx.fillStyle = '#f5a623';
  ctx.font = '22px Inter, sans-serif';
  ctx.fillText('The Coleman Index', 42, 114);

  // CGPA number
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 120px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(cgpa.toFixed(2), 400, 280);

  // Classification pill
  ctx.fillStyle = cl.color;
  const pillW = 320, pillH = 44, pillX = 400 - pillW/2, pillY = 295;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 22);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Inter, sans-serif';
  ctx.fillText(cl.label, 400, pillY + 28);

  // Bottom left: nick + prog
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 16px Inter, sans-serif';
  ctx.fillText(nick, 30, 415);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText(prog, 30, 438);

  // Bottom right: college
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('DONMTC | Powered by SRC', 770, 438);

  ctx.textAlign = 'left';
}

function downloadShareCard() {
  const canvas = document.getElementById('share-canvas');
  const a = document.createElement('a');
  a.download = 'MyVitalScore.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
}

function shareToWhatsApp() {
  const cgpa = calcCGPA().toFixed(2);
  const cl   = getClassification(parseFloat(cgpa)).label;
  const msg  = `My Vital Score: ${cgpa} — ${cl} | Dunkwa Nursing & Midwifery | Track yours at Vital Score (The Coleman Index)`;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

// ─── FEATURE 4: PWA INSTALL PROMPT ────────────────────────────────────────
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Show after 30s or on 2nd visit
  const visits = parseInt(localStorage.getItem('nt_visits') || '0') + 1;
  localStorage.setItem('nt_visits', visits);
  const dismissed = parseInt(localStorage.getItem('nt_install_dismissed') || '0');
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (now - dismissed > sevenDays) {
    if (visits >= 2) {
      showInstallBanner();
    } else {
      setTimeout(showInstallBanner, 30000);
    }
  }
});

function showInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.add('visible');
}

function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(() => {
    document.getElementById('install-banner').classList.remove('visible');
    deferredInstallPrompt = null;
  });
}

function dismissInstall() {
  localStorage.setItem('nt_install_dismissed', Date.now());
  document.getElementById('install-banner').classList.remove('visible');
}

// ─── FEATURE 13: ORIENTATION TUTORIAL ──────────────────────────────────────
function startTutorial() {
  closeModal('onboarding-modal');
  document.getElementById('tutorial-overlay').style.display = 'flex';
  nextTutorialSlide(1);
}

function nextTutorialSlide(slideNum) {
  const slider = document.getElementById('tutorial-slider');
  const slideWidth = slider.clientWidth;
  slider.style.transform = `translateX(-${(slideNum - 1) * slideWidth}px)`;
  
  [1, 2, 3].forEach(n => {
    document.getElementById(`tdot-${n}`).classList.toggle('active', n === slideNum);
  });
}

function endTutorial() {
  document.getElementById('tutorial-overlay').style.display = 'none';
  localStorage.setItem('nt_tutorial_done', 'true');
  showToast('Welcome to Vital Score! Track your vitals. 💗', 'success');
}

