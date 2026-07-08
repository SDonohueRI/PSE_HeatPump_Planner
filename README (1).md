# Heat Pump Savings Calculator

**Resource Innovations · Program Administration Tool**

An engineering-based savings estimator for heat pump electrification rebate planning. Produces bin-method heating savings estimates alongside RTF deemed savings for comparison, helping program administrators understand the range of plausible savings for a given installation before pre/post metering data is available.

---

## Purpose and Intended Use

This tool is designed for **program administrators**, not contractors or customers. It is a planning instrument, not a final determination of rebate eligibility or savings verification.

It answers two questions for a given installation scenario:

1. **What does the RTF currently assume** this measure saves in this climate zone?
2. **What does an engineering calculation suggest** this specific installation could save, given the equipment specifications and home characteristics?

The gap between those two numbers — and understanding what drives it — is the primary value the tool provides. Your program's pre/post metering will determine which side of that gap individual installations actually fall on.

---

## Deployment

The tool is a self-contained web application. All three files must be in the same folder:

```
index.html   ← open this in a browser
engine.js    ← calculation engine (loaded by index.html)
app.js       ← form logic and results rendering (loaded by index.html)
```

No server, build step, or internet connection is required after the initial page load (fonts load from Google Fonts on first open; the tool functions without them). To deploy to GitHub Pages or an internal server, upload all three files to the same directory.

---

## Step-by-Step Usage

### Step 1 — Home & Location

**Location**
Select the closest of the five available stations. Each station maps to an RTF Heating Zone (HZ1 or HZ2) which determines which RTF comparison figures are used.

| Station | RTF HZ | Notes |
|---|---|---|
| Seattle (Sea-Tac) | HZ1 | Direct station match |
| Mt Vernon | HZ1 | Proxy: Bellingham Intl AP |
| Olympia | HZ1 | Direct station match |
| North Bend | HZ1 | Proxy: Boeing Field (closest available TMYx station to Snoqualmie Valley) |
| Ellensburg | HZ2 | Direct station match — see RTF comparison notes below |

**Square footage** and **Year built** drive the envelope loss estimate when no contractor load calculation is provided. Year built also determines the heating balance point used in the bin analysis.

**Prior heating source**
- *Electric Resistance* — covers zonal baseboards, electric radiant, and electric furnace (non-HP forced air)
- *Existing Heat Pump* — selecting this will automatically set "Prior air conditioning" to Yes, since heat pumps provide cooling by definition. You can override this if the prior HP was heating-only.

**Prior HP install year** (shown when prior heat = Existing Heat Pump)
The tool uses this to estimate the baseline heat pump's performance tier (pre-2010, 2010–2014, 2015–2019, 2020–2025) and derive approximate COP anchor points for that vintage. The detected vintage and assumed COPs are shown beneath the field as you type.

**Prior air conditioning present**
Affects the cooling calculation:
- *No* — new HP cooling is treated as a purely additive electric load (a cost that partially offsets heating savings). This is typical for ER-heated PNW homes that had no prior cooling.
- *Yes* — new HP cooling is compared against the prior AC system's estimated SEER by vintage, producing a cooling savings figure.

---

### Step 2 — New Equipment

**System type**
- *Ductless* — shows the number of indoor heads field. More heads = higher Heating Load Served factor (the fraction of the home's load the HP actually displaces).
- *Centrally Ducted* — shows the duct loss % field.

**Number of indoor heads** (ductless only)
This is the most important input for ductless savings estimates. The tool uses it to estimate what fraction of the home's heating load the new HP actually serves, since rooms without a head often continue using existing ER backup heat. The estimated load served percentage is shown beneath the field.

| Heads | Estimated load served |
|---|---|
| 1 | 55% |
| 2 | 72% |
| 3 | 85% |
| 4+ | 92% |

These are planning estimates — not sourced from a specific evaluation dataset.

**Duct loss %** (ducted only)
Enter the estimated or measured distribution loss for the existing duct system. Default is 15%. This is applied symmetrically to both the baseline and new system (they share the same physical ducts), so it affects the absolute energy figures but does not cancel out in the savings calculation.

**COP at 47°F, 17°F, and 5°F**
Available on the AHRI certificate for the installed equipment. These three anchor points define the equipment's heating performance curve across the temperature range. The tool fits a quadratic through them and applies it bin-by-bin.

*Where to find these values:* The AHRI certificate number is already collected in your rebate application data. Look up the certificate at [ahridirectory.org](https://www.ahridirectory.org) — the 47°F, 17°F, and 5°F COP values are listed in the certified ratings table.

**SEER2**
Also on the AHRI certificate. Used for the cooling savings estimate.

---

### Step 3 — Load Calculation (optional but recommended)

If the contractor performed a Manual J or equivalent load calculation, enter the design heating load in BTU/h here. When provided:

- This value drives the bin analysis directly, overriding the sqft-based estimate
- The sqft-based estimate is still shown as a cross-check
- A flag appears if the two estimates differ by more than 25%

When no load calculation is entered, the tool uses square footage and year built to derive a rough envelope loss estimate. This is adequate for portfolio-level planning but carries meaningful uncertainty for individual homes.

---

### Step 4 — Adjustment Factors

**Field performance derate (%)**
The ratio of real-world installed performance to AHRI lab-rated performance. Default is 88% (a 12% derate), reflecting the general finding in heat pump evaluation literature that installed equipment typically achieves 80–90% of its nameplate efficiency due to installation quality variation, real defrost cycling, and non-ideal airflow. Applied symmetrically to both baseline and new heat pump equipment.

This default can be adjusted as your program accumulates metered pre/post data — if your participants consistently achieve closer to rated performance, raise this; if field performance is worse, lower it.

---

### Step 5 — Calculate and Read Results

Click **Calculate Savings** to run the analysis.

#### Summary Stat Boxes

Three boxes appear at the top of the results:

- **RTF Assumed Savings** — the current RTF deemed value for this scenario, measure, and heating zone. For ductless (DHP Zonal), this is tier-matched to the estimated whole-home kWh range rather than the "Any Pre-kWh" catch-all, which better represents high-use ER homes. The RTF measure name, EUL, and the specific application row used are shown below the figure.

- **Engineered Savings** — the bin-method net total: heating savings plus (or minus) the cooling impact. This is what the equipment can theoretically save given the inputs provided.

- **Delta vs. RTF** — the difference between the two, shown as an absolute kWh figure and a ratio. A ratio above 1.0x means the engineering estimate exceeds RTF assumptions; below 1.0x means it falls short.

#### Flags

Two types of flags may appear:

**⚠ Load calc variance** (red/salmon) — fires when the contractor load calculation and sqft-based estimate differ by more than 25%. Review the load calculation before relying on this result for rebate sizing.

**⚠ RTF comparator note** (gold) — fires when the RTF figure being used as the comparison may not be well-matched to this specific scenario. Currently fires for Ellensburg ducted conversions, where the RTF CDHP measure covers a mixed-fuel baseline (gas and ER) rather than pure ER-to-HP conversions.

#### Breakdown Tables

Three tables show the component-level calculation:

- **Heating** — baseline vs. new equipment heating energy and savings
- **Cooling** — baseline vs. new cooling energy, or additive cooling load if no prior AC
- **Whole-home context** — estimated baseload + heating + cooling, and total savings as a percentage of estimated whole-home use

#### Assumptions & Sources

An expandable section at the bottom of the results explains every assumption made in the calculation, including what is directly sourced vs. what is a planning estimate. Read this section before using results for any formal program decision.

---

### Step 6 — Export to Excel

Click **Export to Excel** to download a workbook with seven sheets:

| Sheet | Contents |
|---|---|
| Summary | Key figures at a glance |
| Inputs | All entered values |
| Climate Data | Station info and full bin-hour table used |
| Heating Calc Detail | Bin-by-bin heating calculation with COP values |
| Cooling Calc Detail | Cooling estimate and mode (replacement vs. additive) |
| RTF Comparison | RTF measure, EUL, tier matched, delta |
| Assumptions & Sources | Full text of every assumption and its basis |

The export is designed to be fully auditable — a reviewer should be able to trace any output figure back to its inputs and assumptions without returning to this tool.

---

## Understanding the RTF vs. Engineered Gap

The engineering estimate will almost always be higher than the RTF deemed value. This is expected and methodologically documented — it is not a bug in either approach.

**RTF's UES figures** are calibrated against regression analysis of actual billing data from program participants. They measure the net observed change in total annual electricity bills across a mixed population of real homes. That population includes homes where:
- The HP is used as supplemental/comfort heat rather than primary heat
- Some rooms continue using ER backup heat
- The home has supplemental fuel (wood, propane) that was not captured in billing data
- Occupant behavior shifts after installation

**The engineering calculation** assumes the HP is the primary heat source, that it operates at the estimated COP curve and load-served fraction you've specified, and that the home's envelope loss matches the sqft/vintage estimate. It measures theoretical potential, not observed behavioral realization.

The gap between these two figures is precisely what your program's pre/post metering is designed to measure. For homes where the HP genuinely is used as the primary heat source and covers most of the home, realized savings should be meaningfully closer to the engineering estimate than to RTF. For homes with significant supplemental fuel use or limited coverage, realized savings will be closer to RTF.

**Ellensburg-specific note:** The RTF CDHP measure for HZ2 covers conversions from all forced-air systems, and the HZ2 average reflects a mixed-fuel baseline that likely includes many gas-to-HP conversions. For pure electric resistance homes in Ellensburg, the engineering estimate is the more appropriate planning figure; the RTF CDHP value is shown for reference but flagged accordingly.

---

## Data Sources and Vintage

| Data | Source | Vintage |
|---|---|---|
| Climate bin data | TMYx 2011-2025 EPW files (climate.onebuilding.org), parsed from uploaded station files | 2011–2025 |
| RTF UES figures | RTF Master UES Workbook v8 | 2024-11-27 |
| Baseline HP COP curves | Estimated from DOE minimum HSPF standards by era; planning estimates | — |
| Cooling UEC rates | Planning estimates broadly consistent with PNW residential metering patterns | — |
| UA coefficients | Planning estimates; not from a specific published table | — |
| Field derate / HLS factors | Planning estimates; not from a specific evaluation dataset | — |

When RTF publishes updated UES workbooks, the RTF figures in `reference_data.json` (embedded in `index.html`) should be updated. The key fields to update are under `rtfReference` — specifically the `representativeValue` entries by heating zone and the `dataVintage` stamp.

---

## Limitations

- **Five locations only.** The tool covers Seattle, Mt Vernon, Olympia, North Bend, and Ellensburg. It does not interpolate between locations or support custom climate inputs.
- **Single-family homes.** The RTF comparison figures are for SF homes. MH (manufactured home) values differ; this tool does not distinguish.
- **Heating-only for the bin analysis.** Cooling is estimated from UEC scaling, not from a bin calculation — see the Assumptions & Sources section in the tool for detail.
- **No occupant behavior modeling.** The engineering calculation assumes the HP is operated as the primary heat source. It does not model setback behavior, thermostat settings, or partial use.
- **Planning estimates throughout.** Several key inputs (UA coefficients, HLS factors, field derate, cooling UEC rates) are planning estimates without direct dataset grounding. They produce plausible results at the portfolio level but carry meaningful uncertainty for any individual installation. Always prefer contractor-provided data (load calculation, measured duct losses) over the tool's defaults when available.

---

## Files

```
index.html          Main application (open in browser)
engine.js           Calculation engine — bin analysis, COP curves, UA derivation
app.js              Form rendering, input wiring, results display, Excel export
README.md           This file
```

Source data (embedded in `index.html`):
- Climate bin data derived from TMYx 2011-2025 EPW files
- RTF UES values from Master UES Workbook v8 (2024-11-27)
- All reference data and assumptions in `reference_data.json` (embedded as JSON in the HTML)

---

*Resource Innovations · Heat Pump Savings Calculator · For program planning use only. Not a determination of rebate eligibility. Verify all figures against current RTF workbooks and site-specific conditions before final program decisions.*
