import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './styles.css';

document.addEventListener('focusin', (event) => {
  if (event.target instanceof HTMLInputElement && !event.target.readOnly) {
    event.target.select();
  }
});

const today = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date());

const emptyInputs = {
  D: '',
  Wpart: '',
  Wequip: '',
  Lstorage: '',
  WsnowReq: '',
  SS: '',
  S1: '',
  Fa: '',
  Fv: '',
  TL: '',
  R: '',
  Ie: '',
  Ct: '',
  x: '',
  hn: '',
  siteClass: 'manual',
  riskCat: 'manual',
  sfrs: 'manual',
};

const nycbcDefaults = {
  ...emptyInputs,
  SS: '0.296',
  S1: '0.061',
  TL: '6.0',
  siteClass: 'D',
  riskCat: 'II',
};

const exampleInputs = {
  ...emptyInputs,
  D: '1250',
  Wpart: '45',
  Wequip: '80',
  Lstorage: '120',
  WsnowReq: '35',
  SS: '1.20',
  S1: '0.48',
  Fa: '1.00',
  Fv: '1.50',
  TL: '8',
  hn: '48',
  riskCat: 'II',
  sfrs: 'bw-scsw',
};

// ASCE 7-16 Table 11.4-1: Fa vs SS, by site class (linear interpolation between columns)
const SS_BREAKS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
const FA_TABLE = {
  A: [0.8, 0.8, 0.8, 0.8, 0.8, 0.8],
  B: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
  C: [1.3, 1.3, 1.2, 1.2, 1.2, 1.2],
  D: [1.6, 1.4, 1.2, 1.1, 1.0, 1.0],
  E: [2.4, 1.7, 1.3, null, null, null],
};

// ASCE 7-16 Table 11.4-2: Fv vs S1, by site class
const S1_BREAKS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
const FV_TABLE = {
  A: [0.8, 0.8, 0.8, 0.8, 0.8, 0.8],
  B: [0.8, 0.8, 0.8, 0.8, 0.8, 0.8],
  C: [1.5, 1.5, 1.5, 1.5, 1.5, 1.4],
  D: [2.4, 2.2, 2.0, 1.9, 1.8, 1.7],
  E: [4.2, null, null, null, null, null],
};

const SITE_OPTIONS = [
  ['manual', 'manual entry'],
  ['A', 'A hard rock'],
  ['B', 'B rock'],
  ['C', 'C very dense soil / soft rock'],
  ['D', 'D stiff soil'],
  ['E', 'E soft clay soil'],
];

// ASCE 7-16 Table 1.5-2
const RISK_IE = { I: 1.0, II: 1.0, III: 1.25, IV: 1.5 };
const RISK_OPTIONS = [
  ['manual', 'manual entry'],
  ['I', 'I (Ie = 1.00)'],
  ['II', 'II (Ie = 1.00)'],
  ['III', 'III (Ie = 1.25)'],
  ['IV', 'IV (Ie = 1.50)'],
];

// ASCE 7-16 Table 12.8-2 structure types -> [Ct, x]
const CT_TABLE = {
  steelMF: [0.028, 0.8],
  concMF: [0.016, 0.9],
  brace: [0.03, 0.75],
  other: [0.02, 0.75],
};

// ASCE 7-16 Table 12.2-1 (common systems)
const SFRS_GROUPS = [
  {
    label: 'Bearing wall systems',
    options: [
      { value: 'bw-scsw', label: 'Special reinforced concrete shear walls (R=5)', short: 'Sp. RC shear walls (BW)', R: 5, ct: 'other' },
      { value: 'bw-ocsw', label: 'Ordinary reinforced concrete shear walls (R=4)', short: 'Ord. RC shear walls (BW)', R: 4, ct: 'other' },
      { value: 'bw-srmw', label: 'Special reinforced masonry shear walls (R=5)', short: 'Sp. masonry walls (BW)', R: 5, ct: 'other' },
      { value: 'bw-wood', label: 'Light-frame wood walls, WSP sheathing (R=6.5)', short: 'Wood light-frame walls', R: 6.5, ct: 'other' },
    ],
  },
  {
    label: 'Building frame systems',
    options: [
      { value: 'bf-ebf', label: 'Steel eccentrically braced frames (R=8)', short: 'Steel EBF', R: 8, ct: 'brace' },
      { value: 'bf-brbf', label: 'Steel buckling-restrained braced frames (R=8)', short: 'Steel BRBF', R: 8, ct: 'brace' },
      { value: 'bf-scbf', label: 'Steel special concentrically braced frames (R=6)', short: 'Steel SCBF', R: 6, ct: 'other' },
      { value: 'bf-ocbf', label: 'Steel ordinary concentrically braced frames (R=3.25)', short: 'Steel OCBF', R: 3.25, ct: 'other' },
      { value: 'bf-spsw', label: 'Steel special plate shear walls (R=7)', short: 'Steel SPSW', R: 7, ct: 'other' },
      { value: 'bf-scsw', label: 'Special reinforced concrete shear walls (R=6)', short: 'Sp. RC shear walls (BF)', R: 6, ct: 'other' },
      { value: 'bf-ocsw', label: 'Ordinary reinforced concrete shear walls (R=5)', short: 'Ord. RC shear walls (BF)', R: 5, ct: 'other' },
    ],
  },
  {
    label: 'Moment frame systems',
    options: [
      { value: 'mf-ssmf', label: 'Steel special moment frames (R=8)', short: 'Steel SMF', R: 8, ct: 'steelMF' },
      { value: 'mf-simf', label: 'Steel intermediate moment frames (R=4.5)', short: 'Steel IMF', R: 4.5, ct: 'steelMF' },
      { value: 'mf-somf', label: 'Steel ordinary moment frames (R=3.5)', short: 'Steel OMF', R: 3.5, ct: 'steelMF' },
      { value: 'mf-csmf', label: 'Concrete special moment frames (R=8)', short: 'Concrete SMF', R: 8, ct: 'concMF' },
      { value: 'mf-cimf', label: 'Concrete intermediate moment frames (R=5)', short: 'Concrete IMF', R: 5, ct: 'concMF' },
      { value: 'mf-comf', label: 'Concrete ordinary moment frames (R=3)', short: 'Concrete OMF', R: 3, ct: 'concMF' },
    ],
  },
];

const SFRS_BY_VALUE = Object.fromEntries(
  SFRS_GROUPS.flatMap((group) => group.options).map((option) => [option.value, option]),
);

const groups = [
  {
    label: 'Loads',
    fields: [
      { key: 'D', label: 'D', description: 'dead load above base', unit: 'kip' },
      { key: 'Wpart', label: 'Wpart', description: 'required partition weight', unit: 'kip' },
      { key: 'Wequip', label: 'Wequip', description: 'operating equipment weight', unit: 'kip' },
      { key: 'Lstorage', label: 'Lstorage', description: 'storage live load', unit: 'kip' },
      { key: 'WsnowReq', label: 'WsnowReq', description: 'code snow contribution', unit: 'kip' },
    ],
  },
  {
    label: 'Hazard/site',
    fields: [
      { key: 'SS', label: 'SS', description: 'mapped short-period MCE acceleration', unit: 'g' },
      { key: 'S1', label: 'S1', description: 'mapped 1 s MCE acceleration', unit: 'g' },
      { key: 'siteClass', text: 'SITE', description: 'site class (ASCE 7-16 Ch. 20)', select: SITE_OPTIONS },
      { key: 'Fa', label: 'Fa', description: 'short-period site coefficient', unit: '', autoFrom: 'siteClass' },
      { key: 'Fv', label: 'Fv', description: '1 s site coefficient', unit: '', autoFrom: 'siteClass' },
      { key: 'TL', label: 'TL', description: 'long-period transition period', unit: 's' },
    ],
  },
  {
    label: 'System / period',
    fields: [
      { key: 'sfrs', text: 'SFRS', description: 'seismic force-resisting system (Table 12.2-1)', selectGroups: SFRS_GROUPS },
      { key: 'R', label: 'R', description: 'response modification coefficient', unit: '', autoFrom: 'sfrs' },
      { key: 'riskCat', text: 'RISK', description: 'risk category (Table 1.5-2)', select: RISK_OPTIONS },
      { key: 'Ie', label: 'Ie', description: 'seismic importance factor', unit: '', autoFrom: 'riskCat' },
      { key: 'Ct', label: 'Ct', description: 'approximate-period coefficient', unit: '', autoFrom: 'sfrs' },
      { key: 'x', label: 'x', description: 'approximate-period exponent', unit: '', autoFrom: 'sfrs' },
      { key: 'hn', label: 'hn', description: 'structural height above base', unit: 'ft' },
    ],
  },
];

const symbols = [
  ['V', 'base shear'],
  ['Cs', 'seismic response coefficient'],
  ['W', 'effective seismic weight'],
  ['D', 'dead load above base'],
  ['Wpart', 'required partition weight'],
  ['Wequip', 'operating equipment weight'],
  ['Lstorage', 'storage live load'],
  ['WsnowReq', 'code snow contribution'],
  ['SS', 'mapped short-period MCE acceleration'],
  ['S1', 'mapped 1 s MCE acceleration'],
  ['Fa', 'short-period site coefficient'],
  ['Fv', '1 s site coefficient'],
  ['SMS', 'site-adjusted short-period MCE acceleration'],
  ['SM1', 'site-adjusted 1 s MCE acceleration'],
  ['SDS', 'design short-period acceleration'],
  ['SD1', 'design 1 s acceleration'],
  ['Sa', 'design spectral response acceleration'],
  ['T', 'period used in direction considered'],
  ['Ta', 'approximate fundamental period'],
  ['T0', 'lower spectrum corner period'],
  ['TS', 'upper spectrum corner period'],
  ['TL', 'long-period transition period'],
  ['R', 'response modification coefficient'],
  ['Ie', 'seismic importance factor'],
  ['Ct', 'approximate-period coefficient'],
  ['x', 'approximate-period exponent'],
  ['hn', 'structural height above base'],
  ['Cs0', 'response coefficient before bounds'],
  ['CsMax', 'upper bound on response coefficient'],
  ['CsS1', 'high-S1 minimum response coefficient'],
  ['CsMin', 'lower bound on response coefficient'],
  ['g', 'acceleration of gravity'],
];

const tex = {
  V: 'V',
  Cs: 'C_s',
  W: 'W',
  D: 'D',
  Wpart: 'W_{\\text{part}}',
  Wequip: 'W_{\\text{equip}}',
  Lstorage: 'L_{\\text{storage}}',
  WsnowReq: 'W_{\\text{snow,req}}',
  SS: 'S_S',
  S1: 'S_1',
  Fa: 'F_a',
  Fv: 'F_v',
  SMS: 'S_{MS}',
  SM1: 'S_{M1}',
  SDS: 'S_{DS}',
  SD1: 'S_{D1}',
  Sa: 'S_a',
  T: 'T',
  Ta: 'T_a',
  T0: 'T_0',
  TS: 'T_S',
  TL: 'T_L',
  R: 'R',
  Ie: 'I_e',
  Ct: 'C_t',
  x: 'x',
  hn: 'h_n',
  Cs0: 'C_{s,0}',
  CsMax: 'C_{s,\\max}',
  CsS1: 'C_{s,S_1}',
  CsMin: 'C_{s,\\min}',
  g: 'g',
};

const fieldLabels = {
  D: 'D',
  Wpart: 'Wpart',
  Wequip: 'Wequip',
  Lstorage: 'Lstorage',
  WsnowReq: 'WsnowReq',
  SS: 'SS',
  S1: 'S1',
  Fa: 'Fa',
  Fv: 'Fv',
  TL: 'TL',
  R: 'R',
  Ie: 'Ie',
  Ct: 'Ct',
  x: 'x',
  hn: 'hn',
};

function toNum(value) {
  if (value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fmt(value, digits = 4) {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  if (!Number.isFinite(value)) return '--';
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  return Number(value.toPrecision(digits)).toString();
}

function texNum(value, digits = 4) {
  return fmt(value, digits).replace(/,/g, '{,}');
}

function interpTable(breaks, row, value) {
  if (value === null || !row) return null;
  const last = breaks.length - 1;
  if (value <= breaks[0]) return row[0];
  if (value >= breaks[last]) return row[last];
  const i = breaks.findIndex((b) => value <= b);
  const lo = row[i - 1];
  const hi = row[i];
  if (lo === null || hi === null) return null;
  const t = (value - breaks[i - 1]) / (breaks[i] - breaks[i - 1]);
  return Math.round((lo + (hi - lo) * t) * 1000) / 1000;
}

function compute(raw) {
  const numericKeys = ['D', 'Wpart', 'Wequip', 'Lstorage', 'WsnowReq', 'SS', 'S1', 'Fa', 'Fv', 'TL', 'R', 'Ie', 'Ct', 'x', 'hn'];
  const n = Object.fromEntries(numericKeys.map((key) => [key, toNum(raw[key])]));
  const auto = {};
  const notes = [];

  if (raw.siteClass !== 'manual') {
    n.Fa = interpTable(SS_BREAKS, FA_TABLE[raw.siteClass], n.SS);
    n.Fv = interpTable(S1_BREAKS, FV_TABLE[raw.siteClass], n.S1);
    auto.Fa = true;
    auto.Fv = true;
    if (n.SS !== null && n.Fa === null) notes.push('Site class E with SS >= 1.0g: site-specific hazard analysis required (ASCE 7-16 11.4.8).');
    if (n.S1 !== null && n.Fv === null) notes.push('Site class E with S1 >= 0.2g: site-specific hazard analysis required (ASCE 7-16 11.4.8).');
    if (raw.siteClass === 'D' && n.S1 !== null && n.S1 >= 0.2) notes.push('Site class D with S1 >= 0.2g: Fv taken from Table 11.4-2 per the 11.4.8 ELF exception.');
  }
  if (raw.riskCat !== 'manual') {
    n.Ie = RISK_IE[raw.riskCat];
    auto.Ie = true;
  }
  const sfrs = SFRS_BY_VALUE[raw.sfrs];
  if (sfrs) {
    n.R = sfrs.R;
    [n.Ct, n.x] = CT_TABLE[sfrs.ct];
    auto.R = true;
    auto.Ct = true;
    auto.x = true;
  }

  const required = ['D', 'SS', 'S1', 'Fa', 'Fv', 'TL', 'R', 'Ie', 'Ct', 'x', 'hn'];
  let missing = required.filter((key) => n[key] === null);
  if (auto.Fa && n.SS === null) missing = missing.filter((key) => key !== 'Fa');
  if (auto.Fv && n.S1 === null) missing = missing.filter((key) => key !== 'Fv');
  const invalid = [];
  ['R', 'Ie', 'TL', 'Ct', 'hn'].forEach((key) => {
    if (n[key] !== null && n[key] <= 0) invalid.push(key);
  });

  const Wpart = n.Wpart ?? 0;
  const Wequip = n.Wequip ?? 0;
  const Lstorage = n.Lstorage ?? 0;
  const WsnowReq = n.WsnowReq ?? 0;
  const W = n.D !== null
    ? n.D + Wpart + Wequip + 0.25 * Lstorage + WsnowReq
    : null;
  const SMS = allPresent(n, ['Fa', 'SS']) ? n.Fa * n.SS : null;
  const SM1 = allPresent(n, ['Fv', 'S1']) ? n.Fv * n.S1 : null;
  const SDS = SMS === null ? null : (2 / 3) * SMS;
  const SD1 = SM1 === null ? null : (2 / 3) * SM1;
  const Ta = allPresent(n, ['Ct', 'hn', 'x']) && n.hn > 0 ? n.Ct * n.hn ** n.x : null;
  const T = Ta;

  const ratio = allPresent(n, ['R', 'Ie']) && n.R > 0 && n.Ie > 0 ? n.R / n.Ie : null;
  const Cs0 = SDS !== null && ratio !== null ? SDS / ratio : null;
  const CsMaxBranch = T !== null && n.TL !== null && T > n.TL ? 'long' : 'short';
  const CsMax = SD1 !== null && T !== null && ratio !== null && n.TL !== null && T > 0
    ? CsMaxBranch === 'short'
      ? SD1 / (T * ratio)
      : (SD1 * n.TL) / (T ** 2 * ratio)
    : null;
  const CsS1 = n.S1 !== null && ratio !== null ? (n.S1 >= 0.6 ? (0.5 * n.S1) / ratio : 0) : null;
  const CsMin = SDS !== null && n.Ie !== null && CsS1 !== null
    ? Math.max(0.044 * SDS * n.Ie, 0.01, CsS1)
    : null;
  const capped = Cs0 !== null && CsMax !== null ? Math.min(Cs0, CsMax) : null;
  const Cs = CsMin !== null && capped !== null ? Math.max(CsMin, capped) : null;
  const V = Cs !== null && W !== null ? Cs * W : null;

  let control = 'missing inputs';
  if (Cs !== null) {
    if (Cs === CsMin && CsMin >= capped) {
      control = 'cs-min';
    } else if (CsMax !== null && Cs0 !== null && CsMax < Cs0) {
      control = 'cs-max';
    } else {
      control = 'cs-zero';
    }
  }

  const T0 = SDS !== null && SD1 !== null && SDS > 0 ? 0.2 * (SD1 / SDS) : null;
  const TSpec = SDS !== null && SD1 !== null && SDS > 0 ? SD1 / SDS : null;

  return { n, auto, notes, missing, invalid, Wpart, Wequip, Lstorage, WsnowReq, W, SMS, SM1, SDS, SD1, Ta, T, T0, TSpec, ratio, Cs0, CsMax, CsMaxBranch, CsS1, CsMin, capped, Cs, V, control };
}

function allPresent(n, keys) {
  return keys.every((key) => n[key] !== null);
}

function App() {
  const [inputs, setInputs] = useState(nycbcDefaults);
  const result = useMemo(() => compute(inputs), [inputs]);

  function setField(key, value) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="sheet">
      <header className="note-header">
        <img src="/logo.svg" alt="" />
        <div className="title-block">
          <h1>Seismic Base Shear</h1>
          <time>{today}</time>
        </div>
      </header>

      <div className="screen-note">
        <section className="section required">
          <h2>1 Required Inputs</h2>
          <p>Supply these values first; the equations below then give <MathLabel name="V" />. Selecting a site class, SFRS, or risk category derives the grayed values automatically.</p>
          <div className="input-grid">
            {groups.map((group) => (
              <fieldset key={group.label} className="input-group">
                <legend>{group.label}</legend>
                {group.fields.map((field) => (
                  <Field
                    key={field.key}
                    field={field}
                    inputs={inputs}
                    result={result}
                    setField={setField}
                  />
                ))}
              </fieldset>
            ))}
          </div>
          <p className="period-note"><MathLabel name="T" /> = <MathLabel name="Ta" /> by code approximate period.</p>
          <div className="actions">
            <button type="button" onClick={() => setInputs((current) => ({ ...current, ...nycbcDefaults }))}>Load NYCBC</button>
            <button type="button" onClick={() => setInputs(exampleInputs)}>Load example</button>
            <button type="button" onClick={() => setInputs(emptyInputs)}>Clear</button>
            <button type="button" onClick={() => window.print()}>Print</button>
          </div>
          <p className="order">
            Order: <MathLabel name="W" /> to <MathLabel name="SMS" />,<MathLabel name="SM1" /> to <MathLabel name="SDS" />,<MathLabel name="SD1" /> to <MathLabel name="T" /> to <MathLabel name="Cs" /> to <MathLabel name="V" />.
          </p>
        </section>

        <section className="section symbols">
          <h2>2 Symbols</h2>
          <div className="symbol-grid">
            {symbols.map(([symbol, definition]) => (
              <div className="symbol-row" key={symbol}>
                <MathLabel name={symbol} />
                <span>{definition}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>3 Effective Seismic Weight <MathLabel name="W" /></h2>
          <Equation number="1" tex={`${tex.W}=${tex.D}+${tex.Wpart}+${tex.Wequip}+0.25${tex.Lstorage}+${tex.WsnowReq}`} />
          <OutputGrid items={[
            ['D', result.n.D, 'kip'],
            ['Wpart', result.Wpart, 'kip'],
            ['Wequip', result.Wequip, 'kip'],
            ['0.25Lstorage', 0.25 * result.Lstorage, 'kip'],
            ['WsnowReq', result.WsnowReq, 'kip'],
            ['W', result.W, 'kip'],
          ]} />
        </section>

        <section className="section">
          <h2>4 Seismic Response Coefficient <MathLabel name="Cs" /></h2>
          <h3>4.1 Dependencies</h3>
          <Equation number="2" tex={`${tex.SMS}=${tex.Fa}${tex.SS},\\qquad ${tex.SM1}=${tex.Fv}${tex.S1}`} />
          <Equation number="3" tex={`${tex.SDS}=\\frac{2}{3}${tex.SMS},\\qquad ${tex.SD1}=\\frac{2}{3}${tex.SM1}`} />
          <Equation number="4" tex={`${tex.Ta}=${tex.Ct}${tex.hn}^{${tex.x}},\\qquad ${tex.T}=${tex.Ta}`} />
          <OutputGrid items={[
            ['SMS', result.SMS, 'g'],
            ['SM1', result.SM1, 'g'],
            ['SDS', result.SDS, 'g'],
            ['SD1', result.SD1, 'g'],
            ['Ta', result.Ta, 's'],
            ['T', result.T, 's'],
          ]} />

          <h3>4.2 Coefficient Checks</h3>
          <Equation number="5" tex={`${tex.Cs0}=\\frac{${tex.SDS}}{R/I_e}`} />
          <Equation number="6" tex={`${tex.CsMax}=\\frac{${tex.SD1}}{${tex.T}(R/I_e)}\\ \\text{for}\\ ${tex.T}\\le ${tex.TL};\\quad \\frac{${tex.SD1}${tex.TL}}{${tex.T}^2(R/I_e)}\\ \\text{for}\\ ${tex.T}>${tex.TL}`} />
          <Equation number="7" tex={`${tex.CsS1}=\\frac{0.5${tex.S1}}{R/I_e}\\ \\text{when}\\ ${tex.S1}\\ge0.6g;\\ \\text{otherwise}\\ 0`} />
          <Equation number="8" tex={`${tex.CsMin}=\\max\\left(0.044${tex.SDS}${tex.Ie},\\ 0.01,\\ ${tex.CsS1}\\right)`} />
          <Equation number="9" tex={`${tex.Cs}=\\max\\left(${tex.CsMin},\\ \\min\\left(${tex.Cs0},${tex.CsMax}\\right)\\right)`} />
          <OutputGrid items={[
            ['Cs0', result.Cs0, ''],
            ['CsMax', result.CsMax, ''],
            ['CsS1', result.CsS1, ''],
            ['CsMin', result.CsMin, ''],
            ['Cs', result.Cs, ''],
          ]} />
          <p className="control">CONTROL: cap <MathLabel name="Cs0" /> at <MathLabel name="CsMax" />, then compare to <MathLabel name="CsMin" />. <ControlText control={result.control} />.</p>
        </section>

        <section className="section">
          <h2>5 Design Response Spectrum <MathLabel name="Sa" /></h2>
          <Equation number="10" tex={`${tex.Sa}=\\begin{cases}${tex.SDS}\\left(0.4+0.6\\,${tex.T}/${tex.T0}\\right) & ${tex.T}<${tex.T0}\\\\ ${tex.SDS} & ${tex.T0}\\le ${tex.T}\\le ${tex.TS}\\\\ ${tex.SD1}/${tex.T} & ${tex.TS}<${tex.T}\\le ${tex.TL}\\\\ ${tex.SD1}${tex.TL}/${tex.T}^2 & ${tex.T}>${tex.TL}\\end{cases}`} />
          <Equation number="11" tex={`${tex.T0}=0.2\\,\\frac{${tex.SD1}}{${tex.SDS}},\\qquad ${tex.TS}=\\frac{${tex.SD1}}{${tex.SDS}}`} />
          <Spectrum result={result} />
        </section>

        <section className="section final">
          <h2>6 Seismic Base Shear <MathLabel name="V" /></h2>
          <p>ASCE 7 Eq. 12.8-1:</p>
          <Equation number="12" tex={`${tex.V}=${tex.Cs}${tex.W}`} />
          <div className="final-output">
            <span><MathLabel name="V" /></span>
            <strong>{fmt(result.V, 5)}</strong>
            <em>kip</em>
          </div>
          <Status missing={result.missing} invalid={result.invalid} />
          <Notes notes={result.notes} />
        </section>
      </div>

      <PrintNote result={result} inputs={inputs} />

      <footer>SEISMIC-BASE-SHEAR <span>REV {today}</span></footer>
    </main>
  );
}

function Field({ field, inputs, result, setField }) {
  if (field.select || field.selectGroups) {
    return (
      <label className="field field-select">
        <span className="field-symbol select-label">{field.text}</span>
        <select value={inputs[field.key]} onChange={(event) => setField(field.key, event.target.value)}>
          {field.select && field.select.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
          {field.selectGroups && (
            <>
              <option value="manual">manual entry</option>
              {field.selectGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </optgroup>
              ))}
            </>
          )}
        </select>
        <span className="unit" />
        <span className="field-help">{field.description}</span>
      </label>
    );
  }

  const isAuto = Boolean(result.auto[field.key]);
  return (
    <label className={`field ${result.missing.includes(field.key) ? 'missing' : ''}`}>
      <span className="field-symbol"><MathLabel name={field.label} /></span>
      <input
        value={isAuto ? (result.n[field.key] === null ? '' : fmt(result.n[field.key])) : inputs[field.key]}
        inputMode="decimal"
        type={isAuto ? 'text' : 'number'}
        step="any"
        placeholder="--"
        readOnly={isAuto}
        className={isAuto ? 'auto' : ''}
        onChange={(event) => setField(field.key, event.target.value)}
      />
      <span className="unit">{field.unit}</span>
      <span className="field-help">{field.description}</span>
    </label>
  );
}

function spectrumStep(range, targetTicks) {
  const steps = [0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2];
  for (const step of steps) {
    if (range / step <= targetTicks) return step;
  }
  return 2;
}

function Spectrum({ result, print = false }) {
  const { SDS, SD1, Ta, T0, TSpec } = result;
  const TL = result.n.TL;
  if (SDS === null || SD1 === null || SDS <= 0 || SD1 <= 0) {
    return <p className="spectrum-empty">Spectrum plots once <Latex tex={tex.SDS} /> and <Latex tex={tex.SD1} /> are available.</p>;
  }

  const sa = (T) => {
    if (T <= 0) return 0.4 * SDS;
    if (T < T0) return SDS * (0.4 + 0.6 * (T / T0));
    if (T <= TSpec) return SDS;
    if (TL !== null && T > TL) return (SD1 * TL) / (T * T);
    return SD1 / T;
  };

  const tEnd = Math.max(1, Math.ceil(Math.max(3 * TSpec, Ta !== null ? 1.5 * Ta : 0) * 2) / 2);
  const width = 640;
  const height = 250;
  const left = 52;
  const right = 14;
  const top = 14;
  const bottom = 36;
  const yStep = spectrumStep(SDS * 1.15, 5);
  const yMax = Math.max(yStep, Math.ceil((SDS * 1.15) / yStep) * yStep);
  const xStep = spectrumStep(tEnd, 8);
  const xScale = (T) => left + (T / tEnd) * (width - left - right);
  const yScale = (v) => top + (1 - v / yMax) * (height - top - bottom);

  const samples = [];
  const count = 160;
  for (let i = 0; i <= count; i += 1) {
    samples.push((i / count) * tEnd);
  }
  samples.push(T0, TSpec);
  samples.sort((a, b) => a - b);
  const path = samples
    .map((T, index) => `${index === 0 ? 'M' : 'L'}${xScale(T).toFixed(1)},${yScale(sa(T)).toFixed(1)}`)
    .join('');

  const xTicks = [];
  for (let t = 0; t <= tEnd + 1e-9; t += xStep) xTicks.push(Math.round(t * 100) / 100);
  const yTicks = [];
  for (let v = 0; v <= yMax + 1e-9; v += yStep) yTicks.push(Math.round(v * 1000) / 1000);

  const guides = [
    { T: T0, label: `T0=${fmt(T0, 3)}` },
    { T: TSpec, label: `TS=${fmt(TSpec, 3)}` },
  ];
  const showTa = Ta !== null && Ta <= tEnd;

  return (
    <svg
      className={`spectrum ${print ? 'spectrum-print' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="ASCE 7 design response spectrum"
    >
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={left} x2={width - right} y1={yScale(v)} y2={yScale(v)} stroke="#e2ded4" strokeWidth="1" />
          <text x={left - 6} y={yScale(v) + 3} textAnchor="end" fontSize="10" fill="#6f6a61">{fmt(v, 3)}</text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line x1={xScale(t)} x2={xScale(t)} y1={height - bottom} y2={height - bottom + 4} stroke="#151515" strokeWidth="1" />
          <text x={xScale(t)} y={height - bottom + 15} textAnchor="middle" fontSize="10" fill="#6f6a61">{fmt(t, 3)}</text>
        </g>
      ))}
      {guides.map((guide) => (
        <g key={guide.label}>
          <line x1={xScale(guide.T)} x2={xScale(guide.T)} y1={yScale(sa(guide.T))} y2={height - bottom} stroke="#9c978d" strokeWidth="1" strokeDasharray="3 3" />
          <text x={xScale(guide.T) + 3} y={top + 10} fontSize="10" fill="#6f6a61">{guide.label}</text>
        </g>
      ))}
      <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="#151515" strokeWidth="1" />
      <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} stroke="#151515" strokeWidth="1" />
      <path d={path} fill="none" stroke="#151515" strokeWidth="1.6" />
      {showTa && (
        <g>
          <circle cx={xScale(Ta)} cy={yScale(sa(Ta))} r="3.2" fill="#9c2d2d" />
          <text x={xScale(Ta) + 6} y={yScale(sa(Ta)) - 6} fontSize="10" fill="#9c2d2d">{`Ta=${fmt(Ta, 3)}s, Sa=${fmt(sa(Ta), 3)}g`}</text>
        </g>
      )}
      <text x={(left + width - right) / 2} y={height - 4} textAnchor="middle" fontSize="10" fill="#151515">T (s)</text>
      <text x={12} y={(top + height - bottom) / 2} textAnchor="middle" fontSize="10" fill="#151515" transform={`rotate(-90 12 ${(top + height - bottom) / 2})`}>Sa (g)</text>
    </svg>
  );
}

function PrintNote({ result, inputs }) {
  const sfrs = SFRS_BY_VALUE[inputs.sfrs];
  const loadRows = [
    ['D', result.n.D, 'kip'],
    ['Wpart', result.Wpart, 'kip'],
    ['Wequip', result.Wequip, 'kip'],
    ['Lstorage', result.Lstorage, 'kip'],
    ['WsnowReq', result.WsnowReq, 'kip'],
  ];
  const hazardRows = [
    ['Site class', inputs.siteClass === 'manual' ? 'manual' : inputs.siteClass, '', true],
    ['SS', result.n.SS, 'g'],
    ['S1', result.n.S1, 'g'],
    ['Fa', result.n.Fa, ''],
    ['Fv', result.n.Fv, ''],
    ['TL', result.n.TL, 's'],
  ];
  const systemRows = [
    ['SFRS', sfrs ? sfrs.short : 'manual', '', true],
    ['Risk cat.', inputs.riskCat === 'manual' ? 'manual' : inputs.riskCat, '', true],
    ['R', result.n.R, ''],
    ['Ie', result.n.Ie, ''],
    ['Ct', result.n.Ct, ''],
    ['x', result.n.x, ''],
    ['hn', result.n.hn, 'ft'],
  ];

  const csMaxTex = result.CsMaxBranch === 'long'
    ? `${tex.CsMax}=\\frac{${tex.SD1}${tex.TL}}{${tex.T}^2(R/I_e)}=\\frac{${texNum(result.SD1)}(${texNum(result.n.TL)})}{${texNum(result.T)}^2(${texNum(result.ratio)})}=${texNum(result.CsMax)}`
    : `${tex.CsMax}=\\frac{${tex.SD1}}{${tex.T}(R/I_e)}=\\frac{${texNum(result.SD1)}}{${texNum(result.T)}(${texNum(result.ratio)})}=${texNum(result.CsMax)}`;

  const csS1Tex = result.n.S1 !== null && result.n.S1 < 0.6
    ? `${tex.CsS1}=0\\quad (${tex.S1}<0.6g)`
    : `${tex.CsS1}=\\frac{0.5${tex.S1}}{R/I_e}=\\frac{0.5(${texNum(result.n.S1)})}{${texNum(result.ratio)}}=${texNum(result.CsS1)}`;

  return (
    <div className="print-note">
      <section className="section">
        <h2>1 Input Values</h2>
        <div className="print-input-grid">
          <PrintTable title="Loads" rows={loadRows} />
          <PrintTable title="Hazard/site" rows={hazardRows} />
          <PrintTable title="System / Period" rows={systemRows} />
        </div>
      </section>

      <section className="section">
        <h2>2 Effective Seismic Weight <MathLabel name="W" /></h2>
        <PrintEquation tex={`${tex.W}=${tex.D}+${tex.Wpart}+${tex.Wequip}+0.25${tex.Lstorage}+${tex.WsnowReq}`} />
        <PrintEquation tex={`${tex.W}=${texNum(result.n.D)}+${texNum(result.Wpart)}+${texNum(result.Wequip)}+0.25(${texNum(result.Lstorage)})+${texNum(result.WsnowReq)}=${texNum(result.W)}\\ \\text{kip}`} />
      </section>

      <section className="section">
        <h2>3 Seismic Response Coefficient <MathLabel name="Cs" /></h2>
        <PrintEquation tex={`${tex.SMS}=${tex.Fa}${tex.SS}=${texNum(result.n.Fa)}(${texNum(result.n.SS)})=${texNum(result.SMS)}\\ \\text{g}`} />
        <PrintEquation tex={`${tex.SM1}=${tex.Fv}${tex.S1}=${texNum(result.n.Fv)}(${texNum(result.n.S1)})=${texNum(result.SM1)}\\ \\text{g}`} />
        <PrintEquation tex={`${tex.SDS}=\\frac{2}{3}${tex.SMS}=\\frac{2}{3}(${texNum(result.SMS)})=${texNum(result.SDS)}\\ \\text{g}`} />
        <PrintEquation tex={`${tex.SD1}=\\frac{2}{3}${tex.SM1}=\\frac{2}{3}(${texNum(result.SM1)})=${texNum(result.SD1)}\\ \\text{g}`} />
        <PrintEquation tex={`${tex.Ta}=${tex.Ct}${tex.hn}^{${tex.x}}=${texNum(result.n.Ct)}(${texNum(result.n.hn)})^{${texNum(result.n.x)}}=${texNum(result.Ta)}\\ \\text{s}`} />
        <PrintEquation tex={`${tex.T}=${tex.Ta}=${texNum(result.T)}\\ \\text{s}`} />
        <PrintEquation tex={`${tex.Cs0}=\\frac{${tex.SDS}}{R/I_e}=\\frac{${texNum(result.SDS)}}{${texNum(result.ratio)}}=${texNum(result.Cs0)}`} />
        <PrintEquation tex={csMaxTex} />
        <PrintEquation tex={csS1Tex} />
        <PrintEquation tex={`${tex.CsMin}=\\max\\left(0.044${tex.SDS}${tex.Ie},0.01,${tex.CsS1}\\right)=\\max\\left(${texNum(result.SDS === null || result.n.Ie === null ? null : 0.044 * result.SDS * result.n.Ie)},0.01,${texNum(result.CsS1)}\\right)=${texNum(result.CsMin)}`} />
        <PrintEquation tex={`${tex.Cs}=\\max\\left(${tex.CsMin},\\min(${tex.Cs0},${tex.CsMax})\\right)=\\max\\left(${texNum(result.CsMin)},\\min(${texNum(result.Cs0)},${texNum(result.CsMax)})\\right)=${texNum(result.Cs)}`} />
        <p className="control">CONTROL: <ControlText control={result.control} />.</p>
      </section>

      <section className="section">
        <h2>4 Design Response Spectrum <MathLabel name="Sa" /></h2>
        <PrintEquation tex={`${tex.T0}=0.2\\,\\frac{${tex.SD1}}{${tex.SDS}}=${texNum(result.T0)}\\ \\text{s},\\qquad ${tex.TS}=\\frac{${tex.SD1}}{${tex.SDS}}=${texNum(result.TSpec)}\\ \\text{s}`} />
        <Spectrum result={result} print />
      </section>

      <section className="section final-print">
        <h2>5 Seismic Base Shear <MathLabel name="V" /></h2>
        <PrintEquation tex={`${tex.V}=${tex.Cs}${tex.W}=${texNum(result.Cs)}(${texNum(result.W)})=${texNum(result.V, 5)}\\ \\text{kip}`} />
        <Status missing={result.missing} invalid={result.invalid} />
        <Notes notes={result.notes} />
      </section>
    </div>
  );
}

function Latex({ tex: latex, display = false, className = '' }) {
  const html = useMemo(
    () => katex.renderToString(latex, {
      displayMode: display,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    }),
    [latex, display],
  );
  const Tag = display ? 'div' : 'span';
  return <Tag className={`latex ${display ? 'latex-display' : ''} ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

function MathLabel({ name }) {
  return <Latex tex={tex[name] ?? name} />;
}

function Equation({ tex: equationTex, number }) {
  return (
    <div className="equation">
      <Latex tex={equationTex} display />
      <span>({number})</span>
    </div>
  );
}

function PrintEquation({ tex: equationTex }) {
  return (
    <div className="print-equation">
      <Latex tex={equationTex} display />
    </div>
  );
}

function OutputGrid({ items }) {
  return (
    <div className="output-grid">
      {items.map(([label, value, unit]) => (
        <div className="output" key={label}>
          <span><MathLabel name={label} /></span>
          <strong>{fmt(value)}</strong>
          <em>{unit}</em>
        </div>
      ))}
    </div>
  );
}

function PrintTable({ title, rows }) {
  return (
    <table className="print-table">
      <caption>{title}</caption>
      <tbody>
        {rows.map(([label, value, unit, isText]) => (
          <tr key={label}>
            <th>{isText ? <span className="print-text">{label}</span> : <MathLabel name={label} />}</th>
            <td>{isText ? value : fmt(value)}</td>
            <td>{unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ControlText({ control }) {
  if (control === 'cs-min') {
    return <strong><MathLabel name="CsMin" /> controls</strong>;
  }
  if (control === 'cs-max') {
    return <strong><MathLabel name="CsMax" /> cap controls</strong>;
  }
  if (control === 'cs-zero') {
    return <strong><MathLabel name="Cs0" /> controls</strong>;
  }
  return <strong>missing inputs</strong>;
}

function Status({ missing, invalid }) {
  if (!missing.length && !invalid.length) {
    return <p className="status ready">Ready. All required inputs are valid.</p>;
  }
  return (
    <p className="status">
      {missing.length ? <>Missing: <MathNameList names={missing.map((key) => fieldLabels[key])} suffix=". " /></> : ''}
      {invalid.length ? <>Must be positive: <MathNameList names={invalid.map((key) => fieldLabels[key])} suffix="." /></> : ''}
    </p>
  );
}

function Notes({ notes }) {
  if (!notes.length) return null;
  return (
    <div className="code-notes">
      {notes.map((note) => (
        <p key={note}>NOTE: {note}</p>
      ))}
    </div>
  );
}

function MathNameList({ names, suffix }) {
  return (
    <>
      {names.map((name, index) => (
        <React.Fragment key={name}>
          {index > 0 ? ', ' : ''}
          <MathLabel name={name} />
        </React.Fragment>
      ))}
      {suffix}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
