"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  party: string;
  badges: string[];
  indicators: Record<string, number>;
};

export default function CariPage() {
  const [activeTab, setActiveTab] = useState<"komisi" | "badan">("komisi");
  const [q, setQ] = useState("");
  const [all, setAll] = useState<Item[]>([]);
  const [results, setResults] = useState<Item[]>([]);
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

  // fetch 1x buat dapetin semua nama/badges (buat render daftar kategori)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/politicians?by=nama&q=", { cache: "no-store" });
        if (!res.ok) {
          console.error("API error", res.status);
          return;
        }
        const json = await res.json();
        setAll(json.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const KOMISI_OPTIONS = useMemo(
    () => [
      "Komisi I",
      "Komisi II",
      "Komisi III",
      "Komisi IV",
      "Komisi V",
      "Komisi VI",
      "Komisi VII",
      "Komisi VIII",
      "Komisi IX",
      "Komisi X",
      "Komisi XI",
      "Komisi XII",
      "Komisi XIII",
    ],
    []
  );

  // BADAN: ambil unique badges dari data, buang komisi & EXCLUDES
  const BADAN_EXCLUDES = new Set(["Ketua Komisi", "Wakil Ketua Komisi"]);
  const badanOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const p of all) {
      for (const b of p.badges || []) {
        // skip komisi
        if (/^komisi\s+/i.test(b)) continue;
        if (BADAN_EXCLUDES.has(b)) continue;
        uniq.add(b);
      }
    }
    return Array.from(uniq).sort((a, b) => a.localeCompare(b));
  }, [all]);

  async function runSearch(
    by: "nama" | "komisi" | "badan-kerja",
    query: string,
    label?: string
  ) {
    setSelectedBadge(by === "nama" ? null : query);
    setSubtitle(label ?? `${by}: ${query}`);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/politicians?by=${encodeURIComponent(by)}&q=${encodeURIComponent(query)}`,
        { cache: "no-store" }
      );
      const text = await res.text();
      const json = text ? JSON.parse(text) : { items: [] };
      setResults(json.items || []);
    } finally {
      setLoading(false);
    }
  }

  // UI helpers
  const TabBtn = ({
    active,
    children,
    onClick,
  }: {
    active: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl border transition ${
        active
          ? "bg-yellow-500 text-black border-yellow-500"
          : "border-gray-600 text-gray-200 hover:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );

  const Chip = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full border text-sm transition ${
        active
          ? "bg-yellow-500 text-black border-yellow-500"
          : "border-gray-600 text-gray-300 hover:bg-gray-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="px-4 sm:px-6 md:px-8 lg:px-12 py-6 max-w-6xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-extrabold text-yellow-400">
        Cari Profil — Fraksi Golkar
      </h1>
      <p className="text-gray-400 mt-2">
        Cari nama langsung, atau pilih kategori Komisi / Badan Kerja.
      </p>

      {/* Search */}
      <div className="mt-5 flex gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch("nama", q.trim(), `Nama • ${q.trim()}`);
          }}
          placeholder="ketik nama…"
          className="flex-1 bg-[#0e1726] border border-gray-700 rounded-xl px-4 py-3 text-gray-100 outline-none"
        />
        <button
          onClick={() => runSearch("nama", q.trim(), `Nama • ${q.trim()}`)}
          className="px-6 py-3 rounded-xl bg-yellow-500 text-black font-semibold"
        >
          Cari
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-3">
        <TabBtn active={activeTab === "komisi"} onClick={() => setActiveTab("komisi")}>
          Komisi
        </TabBtn>
        <TabBtn active={activeTab === "badan"} onClick={() => setActiveTab("badan")}>
          Badan Kerja
        </TabBtn>
      </div>

      {/* Panel Komisi */}
      {activeTab === "komisi" && (
        <div className="mt-4 bg-gray-900 p-4 rounded-xl border border-gray-800">
          <p className="text-gray-400 mb-2">Pilih Komisi:</p>
          <div className="flex flex-wrap gap-3">
            {KOMISI_OPTIONS.map((k) => (
              <Chip
                key={k}
                label={k}
                active={selectedBadge === k}
                onClick={() => runSearch("komisi", k, `Komisi • ${k}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Panel Badan Kerja */}
      {activeTab === "badan" && (
        <div className="mt-4 bg-gray-900 p-4 rounded-xl border border-gray-800">
          <p className="text-gray-400 mb-2">Pilih Badan Kerja:</p>
          <div className="flex flex-wrap gap-3">
            {badanOptions.map((b) => (
              <Chip
                key={b}
                label={b}
                active={selectedBadge === b}
                onClick={() => runSearch("badan-kerja", b, `Badan Kerja • ${b}`)}
              />
            ))}
          </div>
          <p className="sr-only">* Tombol Ketua Komisi & Wakil Ketua Komisi disembunyikan</p>
        </div>
      )}

      {/* Hasil */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-gray-400">
            Hasil:{" "}
            <span className="text-gray-200">
              {subtitle ? subtitle : "—"}
            </span>{" "}
            •{" "}
            <span className="text-gray-200">{results.length} orang</span>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400">Memuat…</div>
        ) : results.length === 0 ? (
          <div className="text-gray-400">Tidak ada hasil.</div>
        ) : (
          <div className="space-y-3">
            {results.map((p) => (
              <div
                key={p.id}
                className="bg-[#0e1526] border border-gray-800 rounded-xl p-4 flex items-start gap-3"
              >
                <div className="h-12 w-12 rounded-xl grid place-items-center bg-gray-800 text-yellow-300 font-bold">
                  {p.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-lg">{p.name}</div>
                  <div className="text-gray-400 text-sm">{p.party}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(p.badges || []).map((b, i) => (
                      <span
                        key={i}
                        className="text-xs border border-gray-700 rounded-full px-2 py-0.5 text-gray-300"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
                <a
                  href={`/p/${p.id}`}
                  className="px-4 py-2 rounded-lg border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black transition"
                >
                  Lihat
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
