import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

type IndicatorMap = Record<string, number>;
type Tenure = {
  scope: "DPR" | "Badan" | "Partai";
  role: string;
  commission?: string;
  body?: string;
  current?: boolean;
};
type Person = {
  id: string;
  name: string;
  party: string;
  tenures: Tenure[];
  indicators: IndicatorMap;
  // additional optional profile fields
  education?: string[];
  career_history?: string[];
  policy_focus?: string[];
  assets_links?: string[];
  contacts?: string[];
};

const CSV_PATH = path.join(process.cwd(), "data", "golkar.csv");

// ---------- helpers ----------
const splitCsvLine = (l: string) => l.split(",").map((s) => s.trim());
const safeSlug = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const normalizeBadge = (raw: string) => {
  let v = (raw || "").replace(/\s+/g, " ").trim();
  if (!v) return "";
  // Komisi roman
  const m = v.match(/komisi\s*([ivx]+)/i);
  if (m) return `Komisi ${m[1].toUpperCase()}`;
  // badan kerja uppercase canonical
  const UPPER = new Set([
    "BAKN",
    "BALEG",
    "BAM",
    "BAMUS",
    "BANGGAR",
    "BKSAP",
    "BURT",
    "MKD",
    "BAMUS-BANGGAR",
    "BANGGAR-BAMUS",
    "KETUA KOMISI",
    "WAKIL KETUA KOMISI",
  ]);
  const up = v.replace(/\s*-\s*/g, "-").toUpperCase();
  if (UPPER.has(up)) return up;
  // Title Case fallback
  return v.replace(/\b(\w)(\w*)/g, (_, a, b) => a.toUpperCase() + b.toLowerCase());
};

const normKey = (s: string) =>
  safeSlug(
    s
      .replace(/\s*-\s*/g, "-")
      .replace(/\bkomisi\s+([0-9]+)/gi, (_, n) => {
        // angka -> roman biar konsisten
        const R = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];
        const i = Math.max(1, Math.min(13, Number(n))) - 1;
        return "Komisi " + R[i];
      })
  );

// ---------- loader ----------
async function loadAll(): Promise<Person[]> {
  const raw = await fs.readFile(CSV_PATH, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  if (!header) return [];

  const cols = splitCsvLine(header).map((c) => c.replace(/^\uFEFF/, "").trim().toLowerCase());

  // adaptif terhadap header csv
  const iNama = cols.findIndex((c) => /(nama|name)/.test(c));
  const iFraksi = cols.findIndex((c) => /(fraksi|fpg|party)/.test(c));
  const iKomisi = cols.findIndex((c) => /komisi/.test(c));
  const iBadan = cols.findIndex((c) => /(badan|bamus|banggar|bksap|burt|baleg|mkd)/.test(c));

  // optional profile and indicator columns
  const iEducation = cols.indexOf("education");
  const iCareer = cols.indexOf("career_history");
  const iPolicy = cols.indexOf("policy_focus");
  const iAssets = cols.indexOf("assets_links");
  const iContacts = cols.indexOf("contacts");
  const iIndInfluence = cols.findIndex((c) => /ind[_-]?influence/.test(c));
  const iIndTrust = cols.findIndex((c) => /ind[_-]?trust/.test(c));
  const iIndNetwork = cols.findIndex((c) => /ind[_-]?network/.test(c));

  const pick = (arr: string[], i: number, fb = "") => (i >= 0 ? arr[i] ?? fb : fb);

  const map = new Map<string, Person>();

  for (const line of lines) {
    const parts = splitCsvLine(line);
    const nama = (pick(parts, iNama, "") || "").trim();
    if (!nama) continue;

    const fraksiRaw = (pick(parts, iFraksi, "") || "").trim();
    const fraksi = fraksiRaw === "FPG" || !fraksiRaw ? "Golkar" : fraksiRaw;

    const komisiRaw = pick(parts, iKomisi, "");
    const badanRaw = pick(parts, iBadan, "");

    const komisi = normalizeBadge(komisiRaw);
    const badan = normalizeBadge(badanRaw);

    const id = safeSlug(nama);

    // helper to parse semicolon-/comma-/pipe-separated lists
    const parseList = (raw: string) =>
      (raw || "")
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
    // parse indicators from csv (if available), otherwise fallback random
    const indInfluenceRaw = pick(parts, iIndInfluence, "");
    const indTrustRaw = pick(parts, iIndTrust, "");
    const indNetworkRaw = pick(parts, iIndNetwork, "");
    const newIndicators: IndicatorMap = {
      Influence:
        indInfluenceRaw && !isNaN(Number(indInfluenceRaw))
          ? Number(indInfluenceRaw)
          : Math.floor(Math.random() * 100),
      Trust:
        indTrustRaw && !isNaN(Number(indTrustRaw))
          ? Number(indTrustRaw)
          : Math.floor(Math.random() * 100),
      Network:
        indNetworkRaw && !isNaN(Number(indNetworkRaw))
          ? Number(indNetworkRaw)
          : Math.floor(Math.random() * 100),
    };
    // parse optional lists
    const edu = parseList(pick(parts, iEducation, ""));
    const career = parseList(pick(parts, iCareer, ""));
    const policy = parseList(pick(parts, iPolicy, ""));
    const assets = parseList(pick(parts, iAssets, ""));
    const contactList = parseList(pick(parts, iContacts, ""));

    if (!map.has(id)) {
      // first time we encounter this person
      map.set(id, {
        id,
        name: nama,
        party: fraksi,
        tenures: [],
        indicators: newIndicators,
        ...(edu.length ? { education: edu } : {}),
        ...(career.length ? { career_history: career } : {}),
        ...(policy.length ? { policy_focus: policy } : {}),
        ...(assets.length ? { assets_links: assets } : {}),
        ...(contactList.length ? { contacts: contactList } : {}),
      });
    } else {
      // existing person: merge indicators and lists
      const pExisting = map.get(id)!;
      // override indicators if csv provides explicit numbers
      (['Influence', 'Trust', 'Network'] as Array<keyof IndicatorMap>).forEach((k) => {
        const v = (newIndicators as any)[k];
        if (v !== undefined && !isNaN(Number(v))) {
          pExisting.indicators[k] = v;
        }
      });
      // helper to merge arrays without duplicates
      const mergeList = (target: string[] | undefined, incoming: string[]) => {
        if (!incoming.length) return target;
        const set = new Set([...(target || []), ...incoming]);
        return Array.from(set);
      };
      if (edu.length) pExisting.education = mergeList(pExisting.education, edu);
      if (career.length) pExisting.career_history = mergeList(pExisting.career_history, career);
      if (policy.length) pExisting.policy_focus = mergeList(pExisting.policy_focus, policy);
      if (assets.length) pExisting.assets_links = mergeList(pExisting.assets_links, assets);
      if (contactList.length) pExisting.contacts = mergeList(pExisting.contacts, contactList);
    }
    const p = map.get(id)!;

    // push tenures unik
    const pushUnique = (t: Tenure) => {
      const k = t.scope + "|" + (t.role || "");
      const has = p.tenures.some((x) => x.scope + "|" + (x.role || "") === k);
      if (!has) p.tenures.push(t);
    };

    if (komisi) pushUnique({ scope: "DPR", role: komisi, commission: komisi, current: true });
    if (badan) pushUnique({ scope: "Badan", role: badan, body: badan, current: true });
  }

  return [...map.values()];
}

// ---------- GET ----------
export async function GET(req: Request) {
  const url = new URL(req.url);
  const by = (url.searchParams.get("by") || "nama").toLowerCase() as
    | "nama"
    | "komisi"
    | "badan-kerja";
  const q = (url.searchParams.get("q") || "").trim();

  const all = await loadAll();

  let items = all.map((p) => ({
    id: p.id,
    name: p.name,
    party: p.party,
    badges: p.tenures.filter((t) => t.current).map((t) => t.role),
    indicators: p.indicators,
  }));

  // filter robust
  if (by === "nama" && q) {
    const nq = q.toLowerCase();
    items = items.filter((x) => x.name.toLowerCase().includes(nq));
  } else if (by === "komisi" && q) {
    const target = normKey(q);
    items = items.filter((x) => (x.badges || []).some((b) => normKey(b) === target));
  } else if (by === "badan-kerja" && q) {
    const target = normKey(q);
    items = items.filter((x) =>
      (x.badges || []).some((b) => {
        const nb = normKey(b);
        return nb === target || nb.includes(target) || target.includes(nb);
      })
    );
  }

  return NextResponse.json({ count: items.length, items });
}

// preflight
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
export async function HEAD() {
  return new Response(null, { status: 204 });
}
