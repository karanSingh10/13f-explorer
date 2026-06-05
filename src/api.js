const wait = (ms) => new Promise(r => setTimeout(r, ms));
const pad = c => String(c).padStart(10, "0");

const CK = "13f_v4";
const rc = () => { try { return JSON.parse(localStorage.getItem(CK) || "{}"); } catch { return {}; } };
const wc = (cik, rd, d) => { const c = rc(); if (!c[cik]) c[cik] = {}; c[cik][rd] = d; try { localStorage.setItem(CK, JSON.stringify(c)); } catch {} };
export const getAll = () => rc();
export const nuke = () => localStorage.removeItem(CK);

export async function getFilings(cik) {
  const r = await fetch(`/sec-data/submissions/CIK${pad(cik)}.json`);
  if (!r.ok) throw new Error(`SEC ${r.status}`);
  const d = await r.json();
  const f = d.filings?.recent;
  if (!f) throw new Error("No filings");
  const out = [];
  for (let i = 0; i < f.form.length; i++)
    if (f.form[i] === "13F-HR")
      out.push({ acc: f.accessionNumber[i], filed: f.filingDate[i], report: f.reportDate?.[i] || f.filingDate[i] });
  return { name: d.name, filings: out };
}

export async function fetchQ(cik, filing) {
  const key = `${cik}_${filing.report}`;
  const c = rc();
  if (c[cik]?.[filing.report]) return c[cik][filing.report];

  const acc = filing.acc.replace(/-/g, "");
  const base = `/sec-archives/Archives/edgar/data/${cik}/${acc}`;
  const ir = await fetch(`${base}/index.json`);
  if (!ir.ok) throw new Error(`Idx ${ir.status}`);
  const ix = await ir.json();
  const docs = ix.directory?.item || [];
  let xf = null;
  for (const d of docs) { const n = (d.name || "").toLowerCase(); if (n.includes("infotable") && n.endsWith(".xml")) { xf = d.name; break; } }
  if (!xf) for (const d of docs) { const n = (d.name || "").toLowerCase(); if (n.endsWith(".xml") && !n.includes("primary") && !n.includes("cover") && n !== "form13fhr.xml") { xf = d.name; break; } }
  if (!xf) throw new Error("No infotable");

  await wait(200);
  const xr = await fetch(`${base}/${xf}`);
  if (!xr.ok) throw new Error(`XML ${xr.status}`);
  const result = {
    holdings: parseXML(await xr.text()),
    filed: filing.filed,
    report: filing.report,
    acc: filing.acc,
    secUrl: `https://www.sec.gov/Archives/edgar/data/${cik}/${acc}/`,
  };
  wc(cik, filing.report, result);
  return result;
}

// ═════════════════════════════════════════════════════════════════════════════
// FIXED XML PARSER
// 1. Strips all namespace prefixes
// 2. Uses el.children (direct children only, not recursive)
// 3. Auto-detects if values are in dollars or thousands using median price/share
// ═════════════════════════════════════════════════════════════════════════════
function parseXML(xml) {
  const clean = xml.replace(/xmlns[^=]*="[^"]*"/g, "").replace(/<(\/?)\w+:/g, "<$1");
  const doc = new DOMParser().parseFromString(clean, "text/xml");
  const entries = doc.querySelectorAll("infoTable");

  const raw = [];
  entries.forEach(el => {
    let name = "", cls = "", cusip = "", val = 0, shares = 0, stype = "";
    for (const ch of el.children) {
      const tag = ch.tagName.toLowerCase();
      const txt = (ch.textContent || "").trim();
      if (tag === "nameofissuer") name = txt;
      else if (tag === "titleofclass") cls = txt;
      else if (tag === "cusip") cusip = txt;
      else if (tag === "value") val = parseInt(txt) || 0;
      else if (tag === "shrsorprnamt") {
        for (const sub of ch.children) {
          const st = sub.tagName.toLowerCase();
          if (st === "sshprnamt") shares = parseInt(sub.textContent.trim()) || 0;
          else if (st === "sshprnamttype") stype = sub.textContent.trim();
        }
      }
    }
    if (cusip && val > 0) raw.push({ name, cls, cusip, val, shares, stype });
  });
  if (!raw.length) return [];

  // ── MULTIPLIER DETECTION ──
  // SEC spec says values are in thousands, but some filers report in dollars.
  // We detect this by computing the median implied price per share.
  // Standard (thousands): price = val/shares ≈ $0.01-$5 (real price / 1000)
  // Non-standard (dollars): price = val/shares ≈ $1-$5000 (actual stock price)
  // Threshold: median > $8 → values are already in dollars
  let multiplier = 1000;
  const priced = raw.filter(h => h.shares > 100 && h.val > 0);
  if (priced.length >= 3) {
    const prices = priced.map(h => h.val / h.shares).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    if (median > 8) multiplier = 1;
  }

  // Aggregate by CUSIP — detect duplicates vs splits
  const groups = {};
  for (const h of raw) {
    if (!groups[h.cusip]) groups[h.cusip] = [];
    groups[h.cusip].push(h);
  }
  const holdings = [];
  for (const [, items] of Object.entries(groups)) {
    if (items.length === 1) {
      holdings.push({ ...items[0], value: items[0].val * multiplier });
    } else {
      const uniqShares = new Set(items.map(e => e.shares));
      if (uniqShares.size === 1) {
        holdings.push({ ...items[0], value: items[0].val * multiplier });
      } else {
        holdings.push({
          ...items[0],
          shares: items.reduce((s, e) => s + e.shares, 0),
          value: items.reduce((s, e) => s + e.val, 0) * multiplier,
        });
      }
    }
  }

  const sorted = holdings.sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, h) => s + h.value, 0);
  return sorted.map(h => ({ ...h, pct: total > 0 ? +((h.value / total) * 100).toFixed(2) : 0 }));
}

export async function loadAll(cik, onProgress, max = 8) {
  const { name, filings } = await getFilings(cik);
  const quarters = [];
  for (let i = 0; i < Math.min(filings.length, max); i++) {
    try {
      quarters.push(await fetchQ(cik, filings[i]));
      if (onProgress) onProgress(quarters, name);
      if (i < filings.length - 1) await wait(500);
    } catch (e) { console.warn(`Q${i}:`, e.message); }
  }
  return { name, quarters };
}

export async function searchEdgar(query) {
  const r = await fetch(`/sec-search/LATEST/search-index?q=${encodeURIComponent(query)}&forms=13F-HR&dateRange=custom&startdt=2023-01-01&from=0&size=8`);
  if (!r.ok) throw new Error(`Search ${r.status}`);
  const d = await r.json();
  const seen = new Set();
  return (d.hits?.hits || []).reduce((a, h) => {
    const s = h._source || {};
    const cik = String(s.entity_id || "").replace(/^0+/, "");
    if (cik && !seen.has(cik)) { seen.add(cik); a.push({ name: s.entity_name, cik }); }
    return a;
  }, []);
}
