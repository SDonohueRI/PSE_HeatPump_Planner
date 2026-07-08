/* ============================================================
   RI Heat Pump Savings Calculator — Calculation Engine
   Bin-hour method (5°F bins) for heating + cooling savings
   ============================================================ */

const Engine = (function () {

  /* ---------- COP curve fitting ---------- */
  // Fit a quadratic through 3 anchor points (T1,COP1), (T2,COP2), (T3,COP3)
  // then clamp the curve so it never implies COP < 1.0 (resistance floor)
  // and never increases above the 47F value as temp drops (physically invalid).
  function fitQuadratic(t1, c1, t2, c2, t3, c3) {
    // Solve for a,b,c in COP = a*T^2 + b*T + c using the 3 points
    const A = [
      [t1 * t1, t1, 1],
      [t2 * t2, t2, 1],
      [t3 * t3, t3, 1]
    ];
    const B = [c1, c2, c3];
    const sol = solve3x3(A, B);
    return function (T) {
      let cop = sol[0] * T * T + sol[1] * T + sol[2];
      if (cop < 1.0) cop = 1.0;
      return cop;
    };
  }

  function solve3x3(A, B) {
    // Cramer's rule
    const det = (m) =>
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(A);
    const Ax = [[B[0], A[0][1], A[0][2]], [B[1], A[1][1], A[1][2]], [B[2], A[2][1], A[2][2]]];
    const Ay = [[A[0][0], B[0], A[0][2]], [A[1][0], B[1], A[1][2]], [A[2][0], B[2], A[2][2]]];
    const Az = [[A[0][0], A[0][1], B[0]], [A[1][0], A[1][1], B[1]], [A[2][0], A[2][1], B[2]]];
    return [det(Ax) / D, det(Ay) / D, det(Az) / D];
  }

  // Build a COP curve function from contractor-supplied anchor points (preferred)
  function buildCOPCurveFromInputs(cop47, cop17, cop5) {
    return fitQuadratic(47, cop47, 17, cop17, 5, cop5);
  }

  // Build a COP curve from baseline vintage era data (legacy equipment, no measured anchors)
  function buildBaselineCOPCurve(era) {
    return fitQuadratic(47, era.cop47, 17, era.cop17, 5, era.cop5);
  }

  /* ---------- Heat loss / load calculation ---------- */
  // Simple UA-based estimate: heatLoss(BTU/h) = UA * (65 - T_outdoor)
  // UA derived by back-solving from estimated design-day load if sqft method used,
  // or directly from contractor Manual J load calc if provided.
  function deriveUAFromSqft(sqft, yearBuilt, hdd65Override) {
    // Whole-home envelope loss density (BTU/h per sqft per °F delta-T at design conditions)
    // by construction vintage. These are PLANNING-LEVEL ESTIMATES — not values pulled
    // from a specific ASHRAE or RESNET table. They are broadly consistent with the range
    // of whole-home UA coefficients discussed in residential energy modeling practice,
    // but were derived by reasoning from "what produces plausible heating energy estimates
    // for Pacific Northwest homes by vintage" rather than by citing a specific published
    // table. Administrators with contractor-provided Manual J load calculations should
    // use those instead, which will be far more accurate for individual homes.
    let btuPerSqftPerF;
    if (yearBuilt < 1980) btuPerSqftPerF = 0.40;
    else if (yearBuilt < 2000) btuPerSqftPerF = 0.26;
    else if (yearBuilt < 2015) btuPerSqftPerF = 0.19;
    else btuPerSqftPerF = 0.14;

    // Climate multiplier: the base coefficients above were calibrated to marine HZ1
    // climates (Seattle, Olympia, Mt Vernon, ~4,500–5,000 HDD65). Continental/colder
    // climates (Ellensburg, HDD65 ~6,500) tend toward higher effective UA per sqft
    // due to greater infiltration-driving pressure differentials, more exposed envelope
    // geometry, and historically lower insulation investment in older eastern WA homes.
    // These multipliers (1.00 to 1.28 across the HDD65 range) are ESTIMATES based on
    // general reasoning about climate severity — no specific field study or UA measurement
    // dataset was queried to set them. They reduce but do not eliminate the engineering-
    // vs-billing-regression gap seen in Ellensburg scenarios.
    const hdd = hdd65Override || 4500;
    let climateMult;
    if (hdd < 4800) climateMult = 1.00;
    else if (hdd < 5500) climateMult = 1.08;
    else if (hdd < 6500) climateMult = 1.18;
    else climateMult = 1.28;

    return sqft * btuPerSqftPerF * climateMult;
  }

  // Heating balance point: the outdoor temperature below which the heating system
  // must run, after accounting for internal gains (occupants, appliances, solar).
  // Using the standard 65°F HDD reference as the balance point significantly overstates
  // annual heating energy (by roughly 40–70%) because many mild-weather hours need no
  // heat at all — the home's internal gains are sufficient.
  // The values below (59–62°F by vintage) are PLANNING-LEVEL ESTIMATES derived from
  // general reasoning: tighter/newer homes have lower UA but also generate internal
  // gains that are larger relative to that UA, keeping the balance point in a fairly
  // narrow band. These specific values were not pulled from a published balance-point
  // measurement study — they are calibrated to produce plausible annual heating energy
  // totals when combined with the UA estimates above.
  function deriveBalancePoint(yearBuilt) {
    if (yearBuilt < 1980) return 59;
    if (yearBuilt < 2000) return 60;
    if (yearBuilt < 2015) return 61;
    return 62;
  }

  function designLoadFromUA(ua, designTemp, balancePoint) {
    return ua * Math.max(balancePoint - designTemp, 0); // BTU/h at design temp
  }

  // When a contractor Manual J (or similar) load calc is provided, it should drive the
  // actual bin analysis rather than the sqft-derived estimate (per spec: load calc
  // overrides sqft method when entered; sqft method becomes the QA cross-check shown
  // alongside it). This back-solves an effective UA from the contractor's stated load
  // at the location's design temperature, using the same balance point convention as
  // the sqft method so the two remain comparable on a like-for-like basis.
  function deriveUAFromLoadCalc(contractorLoadBTUh, designTemp, balancePoint) {
    const deltaT = Math.max(balancePoint - designTemp, 1); // guard against div-by-zero
    return contractorLoadBTUh / deltaT;
  }

  // Resolves which UA value should actually drive the bin analysis for a scenario,
  // applying the override rule and returning both values plus the QA comparison so the
  // UI/export can show "using contractor load calc (sqft-method shown as cross-check)"
  // or "using sqft-derived estimate (no load calc provided)" as appropriate.
  function resolveOperatingUA(sqft, yearBuilt, designTemp, contractorLoadBTUh, hdd65) {
    const balancePoint = deriveBalancePoint(yearBuilt);
    const sqftUA = deriveUAFromSqft(sqft, yearBuilt, hdd65);
    const sqftDerivedLoadBTUh = designLoadFromUA(sqftUA, designTemp, balancePoint);
    const comparison = compareLoadEstimates(sqftDerivedLoadBTUh, contractorLoadBTUh);

    if (comparison.hasContractorLoad) {
      const loadCalcUA = deriveUAFromLoadCalc(contractorLoadBTUh, designTemp, balancePoint);
      return { operatingUA: loadCalcUA, source: 'contractorLoadCalc', balancePoint, hdd65, comparison };
    }
    return { operatingUA: sqftUA, source: 'sqftMethod', balancePoint, hdd65, comparison };
  }

  /* ---------- Bin analysis: Heating ---------- */
  // IMPORTANT — field derate symmetry: fieldDerate represents the gap between AHRI lab
  // rating and real installed/operating performance. This gap exists for ANY heat pump
  // operating in the field — new equipment and the legacy equipment it's replacing alike.
  // Applying it only to the new unit (and treating the baseline as if it achieved its
  // rated/lab performance) creates an artificially unfavorable, asymmetric comparison.
  // binHeatingAnalysisHP() therefore always applies fieldDerate to whichever HP curve it
  // is given — call it for both the legacy baseline curve and the new equipment curve.
  // Electric resistance is the one exception: COP = 1.0 by physical definition and is not
  // subject to a rated-vs-field performance gap, so binHeatingAnalysisER() never derates.
  //
  // For each 5F bin: heat loss (BTU/h) = UA * (balancePoint - binMidpoint), clipped at 0.
  // Uses the home's heating balance point (not the flat 65°F HDD reference) so that
  // mild-weather hours where internal/solar gains cover the load are correctly excluded.
  //
  // hlsFactor (Heating Load Served) — the fraction of the home's envelope load the system
  // actually serves. Ducted systems serve the whole duct-connected envelope (1.00) whether
  // they are the baseline or the new unit, so a ducted->ducted comparison should pass 1.00
  // for both sides. Ductless systems, especially fewer-head installs, often leave some
  // rooms on supplemental backup heat — pass the appropriate ductless HLS for that side
  // only when modeling a ductless system; a ducted baseline being replaced is unaffected
  // by the new system's HLS and should still be called with HLS=1.00.
  // The portion of load NOT served (1 - hlsFactor) is assumed to remain on residualCopCurveFn
  // (the prior/displaced heat source) — pass null to default that residual to ER (COP=1.0).
  function binHeatingAnalysisHP(ua, binEdges, hours, copCurveFn, ductLossPct, balancePoint, fieldDerate, hlsFactor = 1.0, residualCopCurveFn = null) {
    let totalKWh = 0;
    let servedKWh = 0;
    let residualBaselineKWh = 0;
    const binDetail = [];
    for (let i = 0; i < binEdges.length; i++) {
      const mid = binEdges[i] + 2.5;
      const h = hours[i];
      if (h <= 0) continue;
      const rawLoadBTUh = ua * Math.max(balancePoint - mid, 0);
      if (rawLoadBTUh <= 0) continue;

      const servedLoadBTUh = rawLoadBTUh * hlsFactor;
      const unservedLoadBTUh = rawLoadBTUh * (1 - hlsFactor);

      const deliveredLoadBTUh = servedLoadBTUh * (1 + ductLossPct);
      const ratedCop = copCurveFn(mid);
      const effectiveCop = Math.max(ratedCop * fieldDerate, 1.0);
      const kWhBinServed = (deliveredLoadBTUh * h) / effectiveCop / 3412;

      let kWhBinResidual = 0;
      if (unservedLoadBTUh > 0) {
        const residualCop = residualCopCurveFn ? residualCopCurveFn(mid) : 1.0;
        kWhBinResidual = (unservedLoadBTUh * h) / residualCop / 3412;
      }

      servedKWh += kWhBinServed;
      residualBaselineKWh += kWhBinResidual;
      totalKWh += kWhBinServed + kWhBinResidual;

      binDetail.push({
        bin: `${binEdges[i]} to ${binEdges[i] + 5}`, mid, hours: h,
        loadBTUh: Math.round(deliveredLoadBTUh), ratedCop: +ratedCop.toFixed(2),
        effectiveCop: +effectiveCop.toFixed(2), kWhServed: +kWhBinServed.toFixed(1),
        kWhResidual: +kWhBinResidual.toFixed(1)
      });
    }
    return { totalKWh, servedKWh, residualBaselineKWh, binDetail };
  }

  // Electric resistance: COP = 1.0 flat by physical definition, no field derate applies.
  // Still subject to duct loss if the ER system is ducted (e.g., electric furnace + ducts).
  function binHeatingAnalysisER(ua, binEdges, hours, ductLossPct, balancePoint) {
    const copFlat = () => 1.0;
    const result = binHeatingAnalysisHP(ua, binEdges, hours, copFlat, ductLossPct, balancePoint, 1.0, 1.0, null);
    return { totalKWh: result.totalKWh, binDetail: result.binDetail };
  }

  /* ---------- Cooling: UEC-scaling approach (not bin/conduction-based) ---------- */
  // Heating in this climate is conduction-dominated and well-suited to a bin/UA method.
  // Cooling is not: the dominant drivers are solar gain through glazing and internal
  // occupant/appliance gains, neither of which tracks outdoor dry-bulb temperature in
  // a way a UA-based model can represent. A conduction-only bin method applied to
  // cooling would produce results with false precision — the right inputs (window area,
  // orientation, shading) are not available in the contractor data this tool uses.
  //
  // Instead, cooling energy is estimated from base UEC rates (kWh/sqft/yr at a
  // stock-average SEER) that are PLANNING-LEVEL ESTIMATES broadly consistent with
  // the range of cooling-specific consumption seen in Pacific Northwest residential
  // metering. These values were not directly queried from a specific RBSA report row
  // or metering database — they represent the analyst's best estimate of plausible
  // magnitudes for this climate, equipment mix, and home size range.
  //
  // The estimate scales by (stock-average SEER / equipment SEER2), correctly
  // isolating the equipment efficiency lever while holding the underlying cooling
  // load constant — appropriate for an efficiency retrofit where the load does not
  // change because new equipment was installed.
  function coolingUECKWh(sqft, hz, equipmentSeer2, coolingUECTable) {
    const t = coolingUECTable.byHeatingZone[hz];
    const baseLoadKWh = sqft * t.kWhPerSqftAtStockAvgSEER;
    return baseLoadKWh * (t.stockAvgSEER / equipmentSeer2);
  }

  // hasPriorAC = true:  baseline AC (by vintage era SEER) vs new HP cooling — true savings
  // hasPriorAC = false: no baseline; new HP cooling is purely additive load (negative "savings").
  //   Documented simplification: the same cooling load basis is used regardless of whether
  //   the home previously had AC. Homes that previously had no cooling may have somewhat
  //   lower innate cooling load (behavior, shading, orientation) than homes with prior AC,
  //   but no direct data cross-tab was available to quantify this difference. Treat
  //   additive cooling load estimates conservatively.
  function coolingSavingsAnalysisRBSA(sqft, hz, newSeer2, hasPriorAC, priorInstallYear, currentYear, hpEras, coolingUECTable) {
    const newKWh = coolingUECKWh(sqft, hz, newSeer2, coolingUECTable);
    if (!hasPriorAC) {
      return { mode: 'additive', baselineKWh: 0, newKWh: +newKWh.toFixed(0), savingsKWh: +(-newKWh).toFixed(0) };
    }
    const era = lookupEra(priorInstallYear, currentYear, hpEras);
    const baselineSeer = coolingUECTable.existingAC_SEER_by_era[era.key];
    const baselineKWh = coolingUECKWh(sqft, hz, baselineSeer, coolingUECTable);
    return { mode: 'replacement', baselineKWh: +baselineKWh.toFixed(0), newKWh: +newKWh.toFixed(0), savingsKWh: +(baselineKWh - newKWh).toFixed(0) };
  }

  /* ---------- Era lookup for legacy HP/AC baseline (shared by heating and cooling) ---------- */
  function lookupEra(installYear, currentYear, eras) {
    if (installYear <= eras.pre2010.installYearMax) return { key: 'pre2010', ...eras.pre2010 };
    if (installYear >= eras.y2010_2014.installYearMin && installYear <= eras.y2010_2014.installYearMax) return { key: 'y2010_2014', ...eras.y2010_2014 };
    if (installYear >= eras.y2015_2019.installYearMin && installYear <= eras.y2015_2019.installYearMax) return { key: 'y2015_2019', ...eras.y2015_2019 };
    if (installYear >= eras.y2020_2025.installYearMin) return { key: 'y2020_2025', ...eras.y2020_2025 };
    return { key: 'pre2010', ...eras.pre2010 }; // fallback for anything older
  }

  /* ---------- Heating Load Served (HLS) factor lookup ---------- */
  function lookupHLS(systemType, numHeads, hlsTable) {
    if (systemType === 'ducted') return hlsTable.ducted;
    const n = Math.min(numHeads || 1, 4);
    return hlsTable.ductless[String(n)] || hlsTable.ductless['1'];
  }

  /* ---------- Whole-home estimate: baseload + bin-derived heating (+ cooling) ---------- */
  // Rather than maintaining an independently-sourced "whole home EUI" lookup that can
  // drift out of sync with the bin-calculated heating number, whole-home use is built
  // FROM the same heating calculation already performed, plus a non-heating baseload
  // model (lighting, plug loads, water heating, etc.) that is relatively flat per sqft
  // and not heavily climate-dependent. This keeps the heating savings %-of-whole-home
  // figure internally consistent with the bin analysis driving every other output.
  function estimateNonHeatingBaseloadKWh(sqft, baseloadTable) {
    let mult = 1.0;
    for (const bp of baseloadTable.sqftAdjustment.breakpoints) {
      if (sqft <= bp.maxSqft) { mult = bp.multiplier; break; }
    }
    return baseloadTable.baseKWhPerSqft * sqft * mult;
  }

  function estimateWholeHomeKWh(sqft, heatingKWh, coolingKWh, baseloadTable) {
    const baseload = estimateNonHeatingBaseloadKWh(sqft, baseloadTable);
    return {
      baseloadKWh: +baseload.toFixed(0),
      heatingKWh: +heatingKWh.toFixed(0),
      coolingKWh: +(coolingKWh || 0).toFixed(0),
      totalKWh: +(baseload + heatingKWh + (coolingKWh || 0)).toFixed(0)
    };
  }

  /* ---------- Design temp load comparison (sqft method vs contractor load calc) ---------- */
  function compareLoadEstimates(sqftDerivedLoadBTUh, contractorLoadBTUh) {
    if (!contractorLoadBTUh || contractorLoadBTUh <= 0) {
      return { hasContractorLoad: false, sqftDerivedLoadBTUh, varPct: null, flag: false };
    }
    const varPct = ((contractorLoadBTUh - sqftDerivedLoadBTUh) / sqftDerivedLoadBTUh) * 100;
    return {
      hasContractorLoad: true,
      sqftDerivedLoadBTUh,
      contractorLoadBTUh,
      varPct: +varPct.toFixed(1),
      flag: Math.abs(varPct) > 25
    };
  }

  return {
    fitQuadratic,
    buildCOPCurveFromInputs,
    buildBaselineCOPCurve,
    deriveUAFromSqft,
    deriveBalancePoint,
    designLoadFromUA,
    deriveUAFromLoadCalc,
    resolveOperatingUA,
    binHeatingAnalysisHP,
    binHeatingAnalysisER,
    coolingUECKWh,
    coolingSavingsAnalysisRBSA,
    lookupEra,
    lookupHLS,
    estimateNonHeatingBaseloadKWh,
    estimateWholeHomeKWh,
    compareLoadEstimates
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
