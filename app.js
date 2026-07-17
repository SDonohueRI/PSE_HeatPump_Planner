/* ============================================================
   RI Heat Pump Savings Calculator — App Logic
   Wires the input form to Engine.js and renders results.
   ============================================================ */

const CLIMATE = window.__CLIMATE_DATA__;
const REF = window.__REFERENCE_DATA__;
const CURRENT_YEAR = 2025;

const LOCATIONS = [
  { key: 'seattle', label: 'Seattle (Sea-Tac)', hz: 'HZ1' },
  { key: 'mtvernon', label: 'Mt Vernon', hz: 'HZ1' },
  { key: 'olympia', label: 'Olympia', hz: 'HZ1' },
  { key: 'northbend', label: 'North Bend', hz: 'HZ1' },
  { key: 'ellensburg', label: 'Ellensburg', hz: 'HZ2' },
  { key: 'cadmus_c1_coastal_eastern_ma', Label: 'Cluster 1 - Coastal Eastern MA', hz: 'HZ3' },
  { key: 'cadmus_c2_cape_cod', Label: 'Cluster 2 - Cape Cod', hz: 'HZ3' },
  { key: 'cadmus_c3_ct_river_valley', Label: 'Cluster 3 - CT River Valley', hz: 'HZ3' },
  { key: 'cadmus_c4_central_ma_hills', Label: 'Cluster 4 - Central MA Hills', hz: 'HZ3' },
  { key: 'cadmus_c5_finger_lakes_southern_tier', Label: 'Cluster 5 - Finger Lakes / Southern Tier', hz: 'HZ3' },
  { key: 'cadmus_c6_lake_ontario_syracuse', Label: 'Cluster 6 - Lake Ontario / Syracuse', hz: 'HZ3' },
  { key: 'cadmus_c7_hudson_valley', Label: 'Cluster 7 - Hudson Valley', hz: 'HZ3' },
  { key: 'cadmus_c8_nyc_metro', Label: 'Cluster 8 - NYC Metro', hz: 'HZ3' }
];

const state = {
  location: 'seattle',
  sqft: 1800,
  yearBuilt: 1995,
  priorHeatType: 'ER',          // 'ER' | 'HP'
  priorHPInstallYear: 2012,
  newSystemType: 'ductless',    // 'ductless' | 'ducted'
  numHeads: 2,
  cop47: 4.2, cop17: 2.8, cop5: 2.1,
  seer2: 15.2,
  hasPriorAC: false,
  ductLossPct: 15,              // percent, UI-facing
  fieldDerate: Math.round(REF.heatPumpAdjustmentFactors.fieldPerformanceDerate.default * 100),
  contractorLoadBTUh: null
};

/* ---------- Input panel rendering ---------- */
function renderInputPanel() {
  const panel = document.getElementById('input-panel');
  panel.innerHTML = `
    <div class="card">
      <h2>Home &amp; Location</h2>

      <label for="f-location">Location</label>
      <select id="f-location">
        ${LOCATIONS.map(l => `<option value="${l.key}" ${l.key === state.location ? 'selected' : ''}>${l.label}</option>`).join('')}
      </select>
      <div class="field-hint" id="location-hz-note"></div>

      <div class="field-row">
        <div>
          <label for="f-sqft">Square footage</label>
          <input type="number" id="f-sqft" min="400" max="8000" step="50" value="${state.sqft}">
        </div>
        <div>
          <label for="f-yearbuilt">Year built</label>
          <input type="number" id="f-yearbuilt" min="1900" max="${CURRENT_YEAR}" step="1" value="${state.yearBuilt}">
        </div>
      </div>

      <label>Prior heating source</label>
      <div class="toggle-group" id="t-priorheat">
        <div class="toggle-btn ${state.priorHeatType === 'ER' ? 'active' : ''}" data-val="ER">Electric Resistance</div>
        <div class="toggle-btn ${state.priorHeatType === 'HP' ? 'active' : ''}" data-val="HP">Existing Heat Pump</div>
      </div>

      <div id="prior-hp-year-wrap" style="display:${state.priorHeatType === 'HP' ? 'block' : 'none'}">
        <label for="f-priorhpyear">Existing HP install year</label>
        <input type="number" id="f-priorhpyear" min="1985" max="${CURRENT_YEAR}" step="1" value="${state.priorHPInstallYear}">
        <div class="field-hint" id="prior-hp-era-note"></div>
      </div>

      <label>Prior air conditioning present?</label>
      <div class="toggle-group" id="t-priorac">
        <div class="toggle-btn ${!state.hasPriorAC ? 'active' : ''}" data-val="no">No</div>
        <div class="toggle-btn ${state.hasPriorAC ? 'active' : ''}" data-val="yes">Yes</div>
      </div>
    </div>

    <div class="card">
      <h2>New Equipment</h2>

      <label>New system type</label>
      <div class="toggle-group" id="t-systemtype">
        <div class="toggle-btn ${state.newSystemType === 'ductless' ? 'active' : ''}" data-val="ductless">Ductless</div>
        <div class="toggle-btn ${state.newSystemType === 'ducted' ? 'active' : ''}" data-val="ducted">Centrally Ducted</div>
      </div>

      <div id="numheads-wrap" style="display:${state.newSystemType === 'ductless' ? 'block' : 'none'}">
        <label for="f-numheads"># Indoor heads installed</label>
        <input type="number" id="f-numheads" min="1" max="8" step="1" value="${state.numHeads}">
        <div class="field-hint" id="hls-note"></div>
      </div>

      <div id="ductloss-wrap" style="display:${state.newSystemType === 'ducted' ? 'block' : 'none'}">
        <label for="f-ductloss">Duct loss (%)</label>
        <input type="number" id="f-ductloss" min="0" max="40" step="1" value="${state.ductLossPct}">
        <div class="field-hint">Default reflects typical unsealed ducts in unconditioned space; override with measured/estimated value when available.</div>
      </div>

      <h3>Heating performance (from AHRI certificate)</h3>
      <div class="field-row">
        <div>
          <label for="f-cop47">COP @ 47°F</label>
          <input type="number" id="f-cop47" min="1" max="8" step="0.1" value="${state.cop47}">
        </div>
        <div>
          <label for="f-cop17">COP @ 17°F</label>
          <input type="number" id="f-cop17" min="0.5" max="6" step="0.1" value="${state.cop17}">
        </div>
      </div>
      <label for="f-cop5">COP @ 5°F</label>
      <input type="number" id="f-cop5" min="0.5" max="5" step="0.1" value="${state.cop5}">

      <h3>Cooling performance</h3>
      <label for="f-seer2">SEER2</label>
      <input type="number" id="f-seer2" min="8" max="30" step="0.1" value="${state.seer2}">
    </div>

    <div class="card">
      <h2>Load Calculation</h2>
      <label for="f-loadcalc">Contractor Manual J load @ design temp (BTU/h) <span style="font-weight:400;color:var(--ri-gray-90)">— optional</span></label>
      <input type="number" id="f-loadcalc" min="0" step="500" placeholder="Leave blank to use sqft-based estimate" value="${state.contractorLoadBTUh ?? ''}">
      <div class="field-hint">When provided, this drives the savings calculation directly. The sqft-based estimate is still shown alongside it as a cross-check.</div>
    </div>

    <div class="card">
      <h2>Adjustment Factors</h2>
      <label for="f-fieldderate">Field performance derate (%)</label>
      <input type="number" id="f-fieldderate" min="50" max="100" step="1" value="${state.fieldDerate}">
      <div class="field-hint">Ratio of real-world installed performance to AHRI lab rating. Applied symmetrically to baseline and new heat pump equipment. See Assumptions &amp; Sources for basis.</div>
    </div>

    <button class="btn-primary" id="btn-calculate">Calculate Savings</button>
  `;

  wireInputEvents();
  updateDerivedNotes();
}

/* ---------- Event wiring ---------- */
function wireInputEvents() {
  document.getElementById('f-location').addEventListener('change', e => { state.location = e.target.value; updateDerivedNotes(); });
  document.getElementById('f-sqft').addEventListener('input', e => { state.sqft = +e.target.value; });
  document.getElementById('f-yearbuilt').addEventListener('input', e => { state.yearBuilt = +e.target.value; updateDerivedNotes(); });
  document.getElementById('f-priorhpyear').addEventListener('input', e => { state.priorHPInstallYear = +e.target.value; updateDerivedNotes(); });
  document.getElementById('f-numheads').addEventListener('input', e => { state.numHeads = +e.target.value; updateDerivedNotes(); });
  document.getElementById('f-ductloss').addEventListener('input', e => { state.ductLossPct = +e.target.value; });
  document.getElementById('f-cop47').addEventListener('input', e => { state.cop47 = +e.target.value; });
  document.getElementById('f-cop17').addEventListener('input', e => { state.cop17 = +e.target.value; });
  document.getElementById('f-cop5').addEventListener('input', e => { state.cop5 = +e.target.value; });
  document.getElementById('f-seer2').addEventListener('input', e => { state.seer2 = +e.target.value; });
  document.getElementById('f-loadcalc').addEventListener('input', e => { state.contractorLoadBTUh = e.target.value ? +e.target.value : null; });
  document.getElementById('f-fieldderate').addEventListener('input', e => { state.fieldDerate = +e.target.value; });

  setupToggle('t-priorheat', val => {
    state.priorHeatType = val;
    document.getElementById('prior-hp-year-wrap').style.display = val === 'HP' ? 'block' : 'none';
    // Heat pumps provide cooling by definition — auto-set hasPriorAC = true when switching
    // to prior HP. Admin can override back to No for unusual cases (e.g. heating-only HP).
    if (val === 'HP' && !state.hasPriorAC) {
      state.hasPriorAC = true;
      const priorACGroup = document.getElementById('t-priorac');
      priorACGroup.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      priorACGroup.querySelector('.toggle-btn[data-val="yes"]').classList.add('active');
    }
    updateDerivedNotes();
  });
  setupToggle('t-priorac', val => { state.hasPriorAC = (val === 'yes'); });
  setupToggle('t-systemtype', val => {
    state.newSystemType = val;
    document.getElementById('numheads-wrap').style.display = val === 'ductless' ? 'block' : 'none';
    document.getElementById('ductloss-wrap').style.display = val === 'ducted' ? 'block' : 'none';
    updateDerivedNotes();
  });

  document.getElementById('btn-calculate').addEventListener('click', runCalculation);
}

function setupToggle(groupId, onChange) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.val);
    });
  });
}

/* ---------- Inline derived-value notes (transparency as the user types) ---------- */
function updateDerivedNotes() {
  const loc = LOCATIONS.find(l => l.key === state.location);
  document.getElementById('location-hz-note').textContent =
    `RTF ${loc.hz === 'HZ1' ? 'Heating Zone 1' : 'Heating Zone 2'} · ${CLIMATE.stations[state.location].name}`;

  if (state.priorHeatType === 'HP') {
    const era = Engine.lookupEra(state.priorHPInstallYear, CURRENT_YEAR, REF.baselineHPCurves.eras);
    document.getElementById('prior-hp-era-note').textContent =
      `Detected vintage: ${era.label} (assumed COP 47/17/5°F: ${era.cop47}/${era.cop17}/${era.cop5})`;
  }

  if (state.newSystemType === 'ductless') {
    const hls = Engine.lookupHLS('ductless', state.numHeads, REF.heatPumpAdjustmentFactors.heatingLoadServed);
    document.getElementById('hls-note').textContent =
      `Estimated heating load served: ${(hls * 100).toFixed(0)}% (remaining load assumed to stay on prior heat source)`;
  }
}

/* ---------- RTF lookup helper ---------- */
// Returns the representative kWh value for a given scenario/HZ.
// For ductless (DHP Zonal), uses tier-matched RTF value based on estimated whole-home kWh
// (the RTF pre-kWh tier structure) when available, since the "Any Pre-kWh" catch-all is
// diluted by low-use homes and underestimates savings for typical high-use ER households.
// For ducted (CDHP), uses the representative conversion or upgrade row as appropriate.
function lookupRTF(scenarioKey, hz, estimatedWholeHomeKWh) {
  const measure = REF.rtfReference[scenarioKey];
  if (!measure) return { representativeValue: null, representativeNote: 'No RTF measure found', measureName: 'Unknown' };
  const sfData = measure.SF;

  let row;
  if (hz === 'HZ1') {
    row = sfData.HZ1 || sfData;
  } else {
    row = sfData.HZ2 || sfData.HZ2_3 || sfData;
  }

  // For ductless DHP Zonal: attempt tier-matched lookup if tier data and whole-home estimate available
  if (scenarioKey === 'ER_to_Ductless' && estimatedWholeHomeKWh && row.tiers_CZ1_highR2) {
    const tiers = row.tiers_CZ1_highR2;
    let tierValue, tierLabel;
    if (estimatedWholeHomeKWh <= 10000) {
      tierValue = tiers['0_10000']; tierLabel = '0-10,000 kWh/yr prior (CZ1, R²≥0.8)';
    } else if (estimatedWholeHomeKWh <= 15000) {
      tierValue = tiers['10001_15000']; tierLabel = '10,001-15,000 kWh/yr prior (CZ1, R²≥0.8)';
    } else if (estimatedWholeHomeKWh <= 20000) {
      tierValue = tiers['15001_20000']; tierLabel = '15,001-20,000 kWh/yr prior (CZ1, R²≥0.8)';
    } else {
      tierValue = tiers['gt20000']; tierLabel = '>20,000 kWh/yr prior (CZ1, R²≥0.8)';
    }
    return {
      representativeValue: tierValue,
      representativeNote: `Tier-matched: ${tierLabel}. Any Pre-kWh (catch-all): ${tiers.anyPreKwh} kWh.`,
      catchAllValue: tiers.anyPreKwh,
      isTierMatched: true,
      measureName: measure.measureName,
      EUL: measure.EUL,
      structureNote: measure.note + ' ' + (REF.rtfReference.ER_to_Ductless.tierNote || '')
    };
  }

  return {
    representativeValue: row.representativeValue,
    representativeNote: row.representativeNote,
    comparatorCaveat: row.comparatorCaveat || null,
    isTierMatched: false,
    measureName: measure.measureName,
    EUL: measure.EUL,
    structureNote: measure.note
  };
}

/* ============================================================
   Calculation orchestration
   ============================================================ */
function runCalculation() {
  const loc = LOCATIONS.find(l => l.key === state.location);
  const climate = CLIMATE.stations[state.location];
  const fieldDerate = state.fieldDerate / 100;
  const ductLossFraction = state.ductLossPct / 100;

  // --- Resolve operating UA (load calc override vs sqft method, with climate correction) ---
  const uaResolution = Engine.resolveOperatingUA(state.sqft, state.yearBuilt, climate.designHeat99, state.contractorLoadBTUh, climate.calcHDD65);
  const ua = uaResolution.operatingUA;
  const balancePoint = uaResolution.balancePoint;

  // --- New equipment COP curve ---
  const newCurve = Engine.buildCOPCurveFromInputs(state.cop47, state.cop17, state.cop5);
  const hls = Engine.lookupHLS(state.newSystemType, state.numHeads, REF.heatPumpAdjustmentFactors.heatingLoadServed);
  const newDuctLoss = state.newSystemType === 'ducted' ? ductLossFraction : 0;

  // --- Baseline + new heating ---
  let baselineHeatKWh, rtfLookup, residualCurve, baselineDetail;
  if (state.priorHeatType === 'ER') {
    const erResult = Engine.binHeatingAnalysisER(ua, climate.binEdges, climate.hours, 0, balancePoint);
    baselineHeatKWh = erResult.totalKWh;
    baselineDetail = erResult;
    rtfLookup = state.newSystemType === 'ducted'
      ? lookupRTF('ER_to_Ducted', loc.hz, null)
      : lookupRTF('ER_to_Ductless', loc.hz, null); // whole-home kWh added after calc below
    residualCurve = () => 1.0;
  } else {
    const era = Engine.lookupEra(state.priorHPInstallYear, CURRENT_YEAR, REF.baselineHPCurves.eras);
    const baselineCurve = Engine.buildBaselineCOPCurve(era);
    const baselineDuctLoss = state.newSystemType === 'ducted' ? ductLossFraction : 0;
    const baselineResult = Engine.binHeatingAnalysisHP(ua, climate.binEdges, climate.hours, baselineCurve, baselineDuctLoss, balancePoint, fieldDerate, 1.0, null);
    baselineHeatKWh = baselineResult.totalKWh;
    baselineDetail = baselineResult;
    rtfLookup = state.newSystemType === 'ducted'
      ? lookupRTF('HP_to_Ducted', loc.hz, null)
      : lookupRTF('HP_to_Ductless', loc.hz, null);
    residualCurve = baselineCurve;
  }

  const newHeatResult = Engine.binHeatingAnalysisHP(ua, climate.binEdges, climate.hours, newCurve, newDuctLoss, balancePoint, fieldDerate, hls, residualCurve);
  const heatingSavingsKWh = baselineHeatKWh - newHeatResult.totalKWh;

  // --- Cooling (RBSA-based) ---
  const cooling = Engine.coolingSavingsAnalysisRBSA(
    state.sqft, loc.hz, state.seer2, state.hasPriorAC, state.priorHPInstallYear, CURRENT_YEAR,
    REF.baselineHPCurves.eras, REF.coolingUEC
  );

  const totalSavingsKWh = heatingSavingsKWh + cooling.savingsKWh;

  // --- RTF comparison ---
  const rtfSavingsKWh = rtfLookup.representativeValue;
  const ratioVsRTF = totalSavingsKWh / rtfSavingsKWh;

  // --- Whole-home % ---
  const wholeHome = Engine.estimateWholeHomeKWh(state.sqft, baselineHeatKWh, state.hasPriorAC ? cooling.baselineKWh : 0, REF.nonHeatingBaseload);
  const savingsPctOfWholeHome = (totalSavingsKWh / wholeHome.totalKWh) * 100;

  // For ER->Ductless, refine RTF lookup with tier-matched value now that we have whole-home estimate
  if (state.priorHeatType === 'ER' && state.newSystemType === 'ductless') {
    rtfLookup = lookupRTF('ER_to_Ductless', loc.hz, wholeHome.totalKWh);
  }

  const results = {
    inputs: { ...state },
    location: loc, climate, balancePoint, ua, uaResolution,
    heating: { baselineKWh: baselineHeatKWh, newKWh: newHeatResult.totalKWh, savingsKWh: heatingSavingsKWh, detail: newHeatResult, baselineDetail, hls },
    cooling,
    totalSavingsKWh,
    rtf: { lookup: rtfLookup, savingsKWh: rtfSavingsKWh, vintage: REF.rtfReference.dataVintage },
    ratioVsRTF,
    wholeHome, savingsPctOfWholeHome,
    fieldDerate
  };

  window.__LAST_RESULTS__ = results;
  renderResults(results);
}

/* ============================================================
   Results rendering
   ============================================================ */
function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
function fmtSigned(n) { return (n >= 0 ? '+' : '') + fmt(n); }

function renderResults(r) {
  const panel = document.getElementById('results-panel');
  const deltaKWh = r.totalSavingsKWh - r.rtf.savingsKWh;
  const deltaClass = deltaKWh >= 0 ? 'delta-pos' : 'delta-neg';
  const scenarioLabel = `${r.inputs.priorHeatType === 'ER' ? 'Electric Resistance' : 'Existing Heat Pump'} → ${r.inputs.newSystemType === 'ductless' ? 'Ductless Heat Pump' : 'Centrally Ducted Heat Pump'}`;

  panel.innerHTML = `
    <div class="export-bar">
      <button class="btn-secondary" id="btn-export">Export to Excel</button>
    </div>

    <div class="card">
      <h2>Results — ${r.location.label}</h2>
      <p style="font-size:13.5px;color:var(--ri-gray-90);margin-bottom:18px;">${scenarioLabel} · ${r.inputs.sqft.toLocaleString()} sqft, built ${r.inputs.yearBuilt}</p>

      <div class="result-summary">
        <div class="stat-box rtf">
          <div class="stat-label">RTF Assumed Savings</div>
          <div class="stat-value">${fmt(r.rtf.savingsKWh)}</div>
          <div class="stat-sub">kWh/yr · ${r.rtf.lookup.measureName ? r.rtf.lookup.measureName.substring(0,38) + '…' : 'RTF measure'} · EUL ${r.rtf.lookup.EUL}yr</div>
          <div class="stat-sub" style="margin-top:3px;font-style:italic">${r.rtf.lookup.representativeNote || ''}</div>
        </div>
        <div class="stat-box engineered">
          <div class="stat-label">Engineered Savings</div>
          <div class="stat-value">${fmt(r.totalSavingsKWh)}</div>
          <div class="stat-sub">kWh/yr · heating + cooling, net</div>
        </div>
        <div class="stat-box ${deltaClass}">
          <div class="stat-label">Delta vs. RTF</div>
          <div class="stat-value">${fmtSigned(deltaKWh)}</div>
          <div class="stat-sub">${r.ratioVsRTF.toFixed(2)}x RTF assumption</div>
        </div>
      </div>

      ${r.uaResolution.comparison.flag ? `
      <div class="flag-banner">
        <span class="icon">⚠</span>
        <span><strong>Load calc variance flag:</strong> Contractor load calc (${fmt(r.uaResolution.comparison.contractorLoadBTUh)} BTU/h) differs from the sqft-based estimate (${fmt(r.uaResolution.comparison.sqftDerivedLoadBTUh)} BTU/h) by ${r.uaResolution.comparison.varPct > 0 ? '+' : ''}${r.uaResolution.comparison.varPct}%. Review the load calculation before relying on this estimate for rebate sizing.</span>
      </div>` : ''}

      ${r.rtf.lookup.comparatorCaveat ? `
      <div class="flag-banner" style="border-color:var(--ri-gold);background:#FEFBF2;color:#7A5A00;">
        <span class="icon">⚠</span>
        <span><strong>RTF comparator note:</strong> ${r.rtf.lookup.comparatorCaveat}</span>
      </div>` : ''}

      <h3>Heating</h3>
      <table>
        <thead><tr><th>Scenario</th><th class="num">kWh/yr</th></tr></thead>
        <tbody>
          <tr><td>Baseline (${r.inputs.priorHeatType === 'ER' ? 'electric resistance' : 'existing heat pump'})</td><td class="num">${fmt(r.heating.baselineKWh)}</td></tr>
          <tr><td>New equipment scenario</td><td class="num">${fmt(r.heating.newKWh)}</td></tr>
          <tr class="total-row"><td>Heating savings</td><td class="num">${fmtSigned(r.heating.savingsKWh)}</td></tr>
        </tbody>
      </table>

      <h3>Cooling</h3>
      <table>
        <thead><tr><th>Scenario</th><th class="num">kWh/yr</th></tr></thead>
        <tbody>
          <tr><td>${r.cooling.mode === 'additive' ? 'Baseline (no prior cooling)' : 'Baseline (existing AC)'}</td><td class="num">${fmt(r.cooling.baselineKWh)}</td></tr>
          <tr><td>New equipment cooling</td><td class="num">${fmt(r.cooling.newKWh)}</td></tr>
          <tr class="total-row"><td>Cooling ${r.cooling.mode === 'additive' ? 'added load' : 'savings'}</td><td class="num">${fmtSigned(r.cooling.savingsKWh)}</td></tr>
        </tbody>
      </table>

      <h3>Whole-Home Context</h3>
      <table>
        <thead><tr><th>Component</th><th class="num">kWh/yr</th></tr></thead>
        <tbody>
          <tr><td>Non-heating baseload (est.)</td><td class="num">${fmt(r.wholeHome.baseloadKWh)}</td></tr>
          <tr><td>Baseline heating</td><td class="num">${fmt(r.wholeHome.heatingKWh)}</td></tr>
          <tr><td>Baseline cooling</td><td class="num">${fmt(r.wholeHome.coolingKWh)}</td></tr>
          <tr class="total-row"><td>Estimated whole-home use</td><td class="num">${fmt(r.wholeHome.totalKWh)}</td></tr>
        </tbody>
      </table>
      <p style="font-size:13px;margin-top:10px;"><strong>Total savings = ${r.savingsPctOfWholeHome.toFixed(1)}% of estimated whole-home electric use.</strong></p>

      ${renderAssumptionsNotes(r)}
    </div>
  `;

  document.getElementById('btn-export').addEventListener('click', () => exportToExcel(r));
}

/* ---------- Assumptions & Sources notes, separated by category ---------- */
function renderAssumptionsNotes(r) {
  const adj = REF.heatPumpAdjustmentFactors;
  return `
    <details class="assumptions">
      <summary>Assumptions &amp; Sources</summary>
      <div class="note-body">

        <p><strong>Climate data (${CLIMATE.dataVintage})</strong><br>${CLIMATE.sourceNote}</p>

        <p><strong>RTF comparison values (workbook: ${r.rtf.vintage})</strong><br>${REF.rtfReference.sourceNote}<br><em>${REF.rtfReference.structureNote}</em>${r.rtf.lookup.structureNote ? '<br><em>' + r.rtf.lookup.structureNote + '</em>' : ''}</p>

        <p><strong>Heating calculation method</strong><br>
        Engineered heating savings use a 5°F bin-hour method: envelope heat loss (UA × ΔT) is calculated for each temperature bin using the location's typical-year hours, divided by the equipment's coefficient of performance (COP) at that bin's temperature, summed across the year. UA is derived from ${r.uaResolution.source === 'contractorLoadCalc' ? 'the contractor-provided Manual J load calculation' : 'square footage and vintage-based envelope loss assumptions (ASHRAE/RESNET typical coefficients)'}. The calculation uses a heating balance point of ${r.balancePoint}°F (not the standard 65°F HDD reference), since occupied homes' internal and solar gains offset envelope losses until outdoor temperatures drop below this point — using 65°F as a flat reference would overstate annual heating energy by roughly 40-70%.</p>

        ${r.inputs.priorHeatType === 'HP' ? `<p><strong>Legacy baseline heat pump performance</strong><br>${REF.baselineHPCurves.sourceNote}</p>` : ''}

        <p><strong>Field performance derate (${(r.fieldDerate * 100).toFixed(0)}%)</strong><br>${adj.fieldPerformanceDerate.description} This is applied symmetrically to both the legacy baseline heat pump (when applicable) and the new equipment, so the comparison reflects field-realistic performance on both sides rather than comparing a derated new unit against an idealized baseline.</p>

        <p><strong>Heating Load Served factor (${(r.heating.hls * 100).toFixed(0)}%)</strong><br>${adj.heatingLoadServed.description}</p>

        <p><strong>Duct loss</strong><br>${REF.ductLossDefaults.sourceNote}</p>

        <p><strong>Cooling calculation method</strong><br>${REF.coolingUEC.sourceNote}</p>

        <p><strong>Non-heating baseload (whole-home estimate)</strong><br>${REF.nonHeatingBaseload.sourceNote}</p>

        <p><strong>Load calculation comparison</strong><br>
        ${r.uaResolution.comparison.hasContractorLoad
          ? `Using contractor-provided load calculation (${fmt(r.uaResolution.comparison.contractorLoadBTUh)} BTU/h at design temperature). Square footage-based estimate (${fmt(r.uaResolution.comparison.sqftDerivedLoadBTUh)} BTU/h) is shown as a cross-check; variance of ${r.uaResolution.comparison.varPct}% is ${r.uaResolution.comparison.flag ? 'flagged for review (exceeds ±25% threshold).' : 'within the normal review threshold (±25%).'}`
          : `No contractor load calculation provided; using square footage-based estimate (${fmt(r.uaResolution.comparison.sqftDerivedLoadBTUh)} BTU/h at design temperature).`}</p>

      </div>
    </details>
  `;
}

/* ============================================================
   Excel export — separate sheets by category, all calculations
   and assumptions/sources visible (not just final numbers)
   ============================================================ */
function exportToExcel(r) {
  const wb = XLSX.utils.book_new();
  const adj = REF.heatPumpAdjustmentFactors;

  // --- Sheet 1: Summary ---
  const summaryRows = [
    ['Heat Pump Savings Calculator — Summary', ''],
    ['Generated', new Date().toLocaleDateString('en-US')],
    [''],
    ['Location', r.location.label],
    ['RTF Heating Zone', r.location.hz],
    ['Scenario', `${r.inputs.priorHeatType === 'ER' ? 'Electric Resistance' : 'Existing Heat Pump'} -> ${r.inputs.newSystemType === 'ductless' ? 'Ductless Heat Pump' : 'Centrally Ducted Heat Pump'}`],
    ['Square footage', r.inputs.sqft],
    ['Year built', r.inputs.yearBuilt],
    [''],
    ['', 'kWh/yr'],
    ['RTF Assumed Savings', r.rtf.savingsKWh],
    ['Engineered Savings (Total, Net)', Math.round(r.totalSavingsKWh)],
    ['Delta vs. RTF', Math.round(r.totalSavingsKWh - r.rtf.savingsKWh)],
    ['Ratio vs. RTF', r.ratioVsRTF.toFixed(2) + 'x'],
    [''],
    ['Heating Savings', Math.round(r.heating.savingsKWh)],
    ['Cooling ' + (r.cooling.mode === 'additive' ? 'Added Load' : 'Savings'), Math.round(r.cooling.savingsKWh)],
    [''],
    ['Estimated Whole-Home Use (kWh/yr)', r.wholeHome.totalKWh],
    ['Total Savings as % of Whole-Home Use', r.savingsPctOfWholeHome.toFixed(1) + '%']
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // --- Sheet 2: Inputs ---
  const inputRows = [
    ['Input Parameter', 'Value'],
    ['Location', r.location.label],
    ['Square footage', r.inputs.sqft],
    ['Year built', r.inputs.yearBuilt],
    ['Prior heating source', r.inputs.priorHeatType === 'ER' ? 'Electric Resistance' : 'Existing Heat Pump'],
    ['Prior HP install year', r.inputs.priorHeatType === 'HP' ? r.inputs.priorHPInstallYear : 'N/A'],
    ['Prior air conditioning present', r.inputs.hasPriorAC ? 'Yes' : 'No'],
    ['New system type', r.inputs.newSystemType === 'ductless' ? 'Ductless' : 'Centrally Ducted'],
    ['Number of indoor heads (if ductless)', r.inputs.newSystemType === 'ductless' ? r.inputs.numHeads : 'N/A'],
    ['Duct loss % (if ducted)', r.inputs.newSystemType === 'ducted' ? r.inputs.ductLossPct + '%' : 'N/A'],
    ['COP @ 47°F', r.inputs.cop47],
    ['COP @ 17°F', r.inputs.cop17],
    ['COP @ 5°F', r.inputs.cop5],
    ['SEER2', r.inputs.seer2],
    ['Contractor load calc (BTU/h)', r.inputs.contractorLoadBTUh || 'Not provided'],
    ['Field performance derate', r.inputs.fieldDerate + '%']
  ];
  const wsInputs = XLSX.utils.aoa_to_sheet(inputRows);
  wsInputs['!cols'] = [{ wch: 34 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsInputs, 'Inputs');

  // --- Sheet 3: Climate & Bin Data ---
  const climate = r.climate;
  const climateRows = [
    ['Climate Station', climate.name],
    ['Design Heat Temp (99%)', climate.designHeat99 + ' °F'],
    ['Design Cool Temp (1%)', climate.designCool1 + ' °F'],
    ['HDD65 (calculated)', climate.calcHDD65],
    ['CDD65 (calculated)', climate.calcCDD65],
    ['Heating Balance Point Used', r.balancePoint + ' °F'],
    ['Operating UA (BTU/h per °F)', r.ua.toFixed(1)],
    ['UA Source', r.uaResolution.source === 'contractorLoadCalc' ? 'Contractor load calculation' : 'Square footage-based estimate'],
    [''],
    ['Bin (°F)', 'Hours/yr']
  ];
  for (let i = 0; i < climate.binEdges.length; i++) {
    climateRows.push([`${climate.binEdges[i]} to ${climate.binEdges[i] + 5}`, climate.hours[i]]);
  }
  const wsClimate = XLSX.utils.aoa_to_sheet(climateRows);
  wsClimate['!cols'] = [{ wch: 30 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsClimate, 'Climate Data');

  // --- Sheet 4: Heating Calculation Detail ---
  const heatRows = [
    ['Heating Bin Detail — New Equipment Scenario'],
    ['Bin (°F)', 'Hours', 'Load BTU/h', 'Rated COP', 'Effective COP (derated)', 'kWh Served', 'kWh Residual (unserved load)']
  ];
  r.heating.detail.binDetail.forEach(b => {
    heatRows.push([b.bin, b.hours, b.loadBTUh, b.ratedCop, b.effectiveCop, b.kWhServed, b.kWhResidual]);
  });
  heatRows.push(['']);
  heatRows.push(['Total Baseline Heating kWh/yr', '', '', '', '', r.heating.baselineKWh.toFixed(0)]);
  heatRows.push(['Total New Equipment Heating kWh/yr', '', '', '', '', r.heating.newKWh.toFixed(0)]);
  heatRows.push(['Heating Savings kWh/yr', '', '', '', '', r.heating.savingsKWh.toFixed(0)]);
  const wsHeat = XLSX.utils.aoa_to_sheet(heatRows);
  wsHeat['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsHeat, 'Heating Calc Detail');

  // --- Sheet 5: Cooling Calculation Detail ---
  const coolRows = [
    ['Cooling Calculation (RBSA-Consistent UEC Method)'],
    ['Mode', r.cooling.mode],
    ['Baseline Cooling kWh/yr', r.cooling.baselineKWh],
    ['New Equipment Cooling kWh/yr', r.cooling.newKWh],
    [r.cooling.mode === 'additive' ? 'Added Cooling Load kWh/yr' : 'Cooling Savings kWh/yr', r.cooling.savingsKWh]
  ];
  const wsCool = XLSX.utils.aoa_to_sheet(coolRows);
  wsCool['!cols'] = [{ wch: 34 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCool, 'Cooling Calc Detail');

  // --- Sheet 6: RTF Comparison ---
  const rtfRows = [
    ['RTF Comparison'],
    ['RTF Workbook Vintage', r.rtf.vintage],
    ['RTF Measure', r.rtf.lookup.measureName || ''],
    ['RTF Heating Zone', r.location.hz],
    ['RTF Measure Life (years)', r.rtf.lookup.EUL || ''],
    ['RTF Representative Row', r.rtf.lookup.representativeNote || ''],
    ['RTF Measure Note', r.rtf.lookup.structureNote || ''],
    ['RTF Assumed Savings (kWh/yr)', r.rtf.savingsKWh],
    [''],
    ['Engineered Total Savings (kWh/yr)', Math.round(r.totalSavingsKWh)],
    ['Delta (kWh/yr)', Math.round(r.totalSavingsKWh - r.rtf.savingsKWh)],
    ['Ratio (Engineered / RTF)', r.ratioVsRTF.toFixed(2) + 'x']
  ];
  const wsRTF = XLSX.utils.aoa_to_sheet(rtfRows);
  wsRTF['!cols'] = [{ wch: 32 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsRTF, 'RTF Comparison');

  // --- Sheet 7: Assumptions & Sources ---
  const assumeRows = [
    ['Category', 'Assumption / Source'],
    ['Climate Data', CLIMATE.sourceNote],
    ['RTF Comparison Values', REF.rtfReference.sourceNote],
    ['Heating Balance Point', `${r.balancePoint}°F used instead of flat 65°F HDD reference, since occupied homes' internal/solar gains offset envelope losses until this point; using 65°F would overstate annual heating energy by roughly 40-70%.`],
    ['Legacy Baseline HP Performance', REF.baselineHPCurves.sourceNote],
    ['Field Performance Derate', adj.fieldPerformanceDerate.description + ' Applied symmetrically to baseline and new heat pump equipment.'],
    ['Heating Load Served Factor', adj.heatingLoadServed.description],
    ['Duct Loss Defaults', REF.ductLossDefaults.sourceNote],
    ['Cooling Calculation Method', REF.coolingUEC.sourceNote],
    ['Non-Heating Baseload', REF.nonHeatingBaseload.sourceNote],
    ['Tool Data Vintage', REF._meta.toolDataVintage]
  ];
  const wsAssume = XLSX.utils.aoa_to_sheet(assumeRows);
  wsAssume['!cols'] = [{ wch: 26 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wsAssume, 'Assumptions & Sources');

  const filename = `HP_Savings_${r.location.label.replace(/\s/g, '')}_${r.inputs.priorHeatType}to${r.inputs.newSystemType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/* ============================================================
   Init
   ============================================================ */
renderInputPanel();
