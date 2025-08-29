"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Detail = {
  id: string;
  name: string;
  party: string;
  badges: string[];
  indicators: Record<string, number>;
  // optional extended profile fields returned by API
  education?: string[];
  career_history?: string[];
  policy_focus?: string[];
  assets_links?: string[];
  contacts?: string[];
};

export default function DetailPage() {
  const params = useParams<{ id: string }>();
  const id = (params?.id ?? "").toString();

  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        // 1) coba API detail
        let res = await fetch(`/api/politicians/${id}`, { cache: "no-store" });
        if (res.status === 404) {
          // 2) fallback cari by nama dari slug
          const qName = id.replace(/-/g, " ");
          const resList = await fetch(
            `/api/politicians?by=nama&q=${encodeURIComponent(qName)}`,
            { cache: "no-store" }
          );
          const listText = await resList.text();
          const listJson = listText ? JSON.parse(listText) : { items: [] };
          const first = Array.isArray(listJson.items) ? listJson.items[0] : null;
          if (first?.id) {
            // map minimal result from list API to detail shape
            setData({
              id: first.id,
              name: first.name,
              party: first.party,
              badges: first.badges || [],
              indicators: first.indicators || {},
              // ensure optional lists exist (empty arrays fallback)
              education: first.education || [],
              career_history: first.career_history || [],
              policy_focus: first.policy_focus || [],
              assets_links: first.assets_links || [],
              contacts: first.contacts || [],
            });
            setLoading(false);
            return;
          }
        }
        const text = await res.text();
        setData(res.ok ? (text ? JSON.parse(text) : null) : null);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <main className="px-4 py-6 max-w-4xl mx-auto text-gray-400">Memuat…</main>;
  }
  if (!data) {
    return (
      <main className="px-4 py-6 max-w-4xl mx-auto">
        <a href="/cari" className="text-yellow-400">&larr; Kembali</a>
        <div className="mt-4 text-red-400">Profil tidak ditemukan.</div>
      </main>
    );
  }

  const initials = data.name.split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();
  const P = ({ label, val = 0 }: { label: string; val?: number }) => {
    const v = Math.max(0, Math.min(100, Number(val) || 0));
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{label}</span><span className="text-gray-200">{v}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded">
          <div className="h-2 bg-yellow-400 rounded" style={{ width: `${v}%` }} />
        </div>
      </div>
    );
  };

  // dummy articles placeholder until real fetch is implemented
  const dummyArticles = [
    { title: "Golkar Dorong Revisi UU Energi Terbarukan", source: "Kompas", daysAgo: 2 },
    { title: "Sosialisasi Program Kesejahteraan Petani", source: "Detik", daysAgo: 5 },
    { title: "Penguatan Jejaring UMKM di Daerah", source: "Tempo", daysAgo: 7 },
  ];

  return (
    <main className="px-4 sm:px-6 md:px-8 lg:px-12 py-6 max-w-4xl mx-auto">
      <a href="/cari" className="text-yellow-400">&larr; Kembali</a>

      <section className="mt-4 border border-gray-800 rounded-xl p-4 bg-gray-900">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 grid place-items-center rounded-xl bg-gray-800 text-yellow-300 font-bold">{initials}</div>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">{data.name}</h1>
            <div className="text-sm text-gray-400">{data.party}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.badges.map((b,i)=>(
                <span key={i} className="text-xs border border-gray-700 rounded-full px-2 py-0.5 text-gray-300">{b}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <P label="Influence" val={data.indicators?.Influence} />
          <P label="Trust" val={data.indicators?.Trust} />
          <P label="Network" val={data.indicators?.Network} />
        </div>
      </section>

      <section className="mt-4 border border-gray-800 rounded-xl p-4 bg-gray-900">
        <h2 className="font-semibold mb-3">Perolehan Suara</h2>
        <svg viewBox="0 0 340 160" className="w-full">
          <line x1="30" y1="10" x2="30" y2="140" stroke="#334155" strokeWidth="1" />
          <line x1="30" y1="140" x2="320" y2="140" stroke="#334155" strokeWidth="1" />
          {[
            { x: 70, y: 110, h: 30, year: "2014" },
            { x: 150, y: 80,  h: 60, year: "2019" },
            { x: 230, y: 60,  h: 80, year: "2024" },
          ].map((b,i)=>(
            <g key={i}>
              <rect x={b.x-15} y={b.y} width="30" height={b.h} fill="#fbbf24" />
              <text x={b.x} y="150" fontSize="10" textAnchor="middle" fill="#94a3b8">{b.year}</text>
            </g>
          ))}
        </svg>
      </section>

      {/* Profil lengkap section: pendidikan, karier, fokus kebijakan, aset & kontak */}
      <section className="mt-4 border border-gray-800 rounded-xl p-4 bg-gray-900">
        <h2 className="font-semibold mb-3">Profil Lengkap</h2>
        <div className="space-y-4 text-sm">
          {/* Pendidikan */}
          {Array.isArray(data.education) && data.education.length > 0 && (
            <div>
              <div className="font-medium text-gray-400">Pendidikan</div>
              <ul className="list-disc list-inside text-gray-300">
                {data.education.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {/* Riwayat Jabatan / Karier */}
          {Array.isArray(data.career_history) && data.career_history.length > 0 && (
            <div>
              <div className="font-medium text-gray-400">Riwayat Jabatan</div>
              <ul className="list-disc list-inside text-gray-300">
                {data.career_history.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {/* Fokus Kebijakan */}
          {Array.isArray(data.policy_focus) && data.policy_focus.length > 0 && (
            <div>
              <div className="font-medium text-gray-400">Fokus Kebijakan</div>
              <ul className="list-disc list-inside text-gray-300">
                {data.policy_focus.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {/* Aset / Dokumen */}
          {Array.isArray(data.assets_links) && data.assets_links.length > 0 && (
            <div>
              <div className="font-medium text-gray-400">Dokumen / Foto</div>
              <ul className="list-disc list-inside text-gray-300">
                {data.assets_links.map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      className="text-yellow-400 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Kontak / Sosial Media */}
          {Array.isArray(data.contacts) && data.contacts.length > 0 && (
            <div>
              <div className="font-medium text-gray-400">Kontak</div>
              <ul className="list-disc list-inside text-gray-300">
                {data.contacts.map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      className="text-yellow-400 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* fallback text if nothing provided */}
          {(!data.education?.length && !data.career_history?.length && !data.policy_focus?.length && !data.assets_links?.length && !data.contacts?.length) && (
            <div className="text-gray-500">Belum ada informasi profil lengkap.</div>
          )}
        </div>
        {/* dummy articles placeholder */}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Artikel 7 Hari Terakhir</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {dummyArticles.map((art, i) => (
              <div
                key={i}
                className="border border-gray-800 rounded-lg p-3 bg-gray-800 hover:bg-gray-700 transition"
              >
                <div className="font-medium text-gray-200">{art.title}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {art.source} • {art.daysAgo} hari lalu
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
