import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './styles.css';

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
};

const nycbcDefaults = {
  ...emptyInputs,
  SS: '0.296',
  S1: '0.061',
  Fa: '1.57',
  Fv: '2.40',
  TL: '6.0',
  Ie: '1.0',
};

const exampleInputs = {
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
  R: '5',
  Ie: '1',
  Ct: '0.02',
  x: '0.75',
  hn: '48',
};

const groups = [
  {
    label: 'Loads',
    fields: [
      ['D', 'D', 'dead load above base', 'kip'],
      ['Wpart', 'Wpart', 'required partition weight', 'kip'],
      ['Wequip', 'Wequip', 'operating equipment weight', 'kip'],
      ['Lstorage', 'Lstorage', 'storage live load', 'kip'],
      ['WsnowReq', 'WsnowReq', 'code snow contribution', 'kip'],
    ],
  },
  {
    label: 'Hazard/site',
    fields: [
      ['SS', 'SS', 'mapped short-period MCE acceleration', 'g'],
      ['S1', 'S1', 'mapped 1 s MCE acceleration', 'g'],
      ['Fa', 'Fa', 'short-period site coefficient', ''],
      ['Fv', 'Fv', '1 s site coefficient', ''],
      ['TL', 'TL', 'long-period transition period', 's'],
    ],
  },
  {
    label: 'System / period',
    fields: [
      ['R', 'R', 'response modification coefficient', ''],
      ['Ie', 'Ie', 'seismic importance factor', ''],
      ['Ct', 'Ct', 'approximate-period coefficient', ''],
      ['x', 'x', 'approximate-period exponent', ''],
      ['hn', 'hn', 'structural height above base', 'ft'],
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
  ['T', 'period used in direction considered'],
  ['Ta', 'approximate fundamental period'],
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
  T: 'T',
  Ta: 'T_a',
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

function compute(raw) {
  const n = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, toNum(value)]));
  const required = ['D', 'SS', 'S1', 'Fa', 'Fv', 'TL', 'R', 'Ie', 'Ct', 'x', 'hn'];

  const missing = required.filter((key) => n[key] === null);
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

  return { n, missing, invalid, Wpart, Wequip, Lstorage, WsnowReq, W, SMS, SM1, SDS, SD1, Ta, T, ratio, Cs0, CsMax, CsMaxBranch, CsS1, CsMin, capped, Cs, V, control };
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
          <p>Supply these values first; the equations below then give <MathLabel name="V" />.</p>
          <div className="input-grid">
            {groups.map((group) => (
              <fieldset key={group.label} className="input-group">
                <legend>{group.label}</legend>
                {group.fields.map(([key, label, description, unit]) => (
                  <label key={key} className={`field ${result.missing.includes(key) ? 'missing' : ''}`}>
                    <span className="field-symbol"><MathLabel name={label} /></span>
                    <input
                      value={inputs[key]}
                      inputMode="decimal"
                      type="number"
                      step="any"
                      placeholder="--"
                      onChange={(event) => setField(key, event.target.value)}
                    />
                    <span className="unit">{unit}</span>
                    <span className="field-help">{description}</span>
                  </label>
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

        <section className="section final">
          <h2>5 Seismic Base Shear <MathLabel name="V" /></h2>
          <p>ASCE 7 Eq. 12.8-1:</p>
          <Equation number="10" tex={`${tex.V}=${tex.Cs}${tex.W}`} />
          <div className="final-output">
            <span><MathLabel name="V" /></span>
            <strong>{fmt(result.V, 5)}</strong>
            <em>kip</em>
          </div>
          <Status missing={result.missing} invalid={result.invalid} />
        </section>
      </div>

      <PrintNote result={result} />

      <footer>SEISMIC-BASE-SHEAR <span>REV {today}</span></footer>
    </main>
  );
}

function PrintNote({ result }) {
  const loadRows = [
    ['D', result.n.D, 'kip'],
    ['Wpart', result.Wpart, 'kip'],
    ['Wequip', result.Wequip, 'kip'],
    ['Lstorage', result.Lstorage, 'kip'],
    ['WsnowReq', result.WsnowReq, 'kip'],
  ];
  const hazardRows = [
    ['SS', result.n.SS, 'g'],
    ['S1', result.n.S1, 'g'],
    ['Fa', result.n.Fa, ''],
    ['Fv', result.n.Fv, ''],
    ['TL', result.n.TL, 's'],
  ];
  const systemRows = [
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

      <section className="section final-print">
        <h2>4 Seismic Base Shear <MathLabel name="V" /></h2>
        <PrintEquation tex={`${tex.V}=${tex.Cs}${tex.W}=${texNum(result.Cs)}(${texNum(result.W)})=${texNum(result.V, 5)}\\ \\text{kip}`} />
        <Status missing={result.missing} invalid={result.invalid} />
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
        {rows.map(([label, value, unit]) => (
          <tr key={label}>
            <th><MathLabel name={label} /></th>
            <td>{fmt(value)}</td>
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
