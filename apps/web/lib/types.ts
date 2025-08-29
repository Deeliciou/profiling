export type IndicatorMap = Record<string, number>; // bebas: "Influence", "Trust", dst

export type Tenure = {
  scope: "DPR" | "Partai" | "Badan";
  role: string;            // "Anggota Komisi VI", "Sekjen", "Ketua Badan Anggaran"
  commission?: string;     // "Komisi VI" (jika scope DPR)
  body?: string;           // "Badan Anggaran", "BURT", dst (jika scope Badan)
  start?: string;          // "2024-10-01"
  end?: string | null;
  current?: boolean;
};

export type Politician = {
  id: string;              // slug unik
  name: string;            // "Muhammad Sarmuji"
  party: string;           // "Golkar"
  photo?: string;
  tenures: Tenure[];       // riwayat peran
  votes?: { year: number; total: number; region?: string }[];
  indicators: IndicatorMap;// dinamis: { "Influence": 78, "Trust": 72, ... }
  socials?: Record<string, string>; // { instagram:"...", x:"..." }
  meta?: Record<string, string>;    // fleksibel (dapil, email, dsb)
};
