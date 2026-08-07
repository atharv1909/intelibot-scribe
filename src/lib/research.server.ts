export type RetrievedSource = {
  title: string;
  authors: string;
  venue: string;
  year: number | null;
  url: string;
  doi: string | null;
  abstract: string;
  retrieval_method: "keyword" | "dense";
  injection_flag: boolean;
  injection_detail: string | null;
  retrieved_at: string;
};

const INJECTION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i, label: "override directive" },
  { re: /disregard\s+(the\s+)?(system|previous)\s+prompt/i, label: "system-prompt override" },
  { re: /you\s+are\s+now\s+(a|an|in)\s+/i, label: "role reassignment" },
  { re: /\b(sudo|rm\s+-rf|curl\s+http|wget\s+http|os\.system|subprocess\.)/i, label: "command injection" },
  { re: /(api[_\s-]?key|secret|password|token)\s*[:=]/i, label: "credential solicitation" },
  { re: /<\s*\/?\s*(system|assistant|untrusted-source)\s*>/i, label: "tag smuggling" },
  { re: /cite\s+this\s+paper\s+as\s+the\s+only/i, label: "citation manipulation" },
];

export function scanForInjection(text: string): { flagged: boolean; detail: string | null } {
  const hits = INJECTION_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
  if (!hits.length) return { flagged: false, detail: null };
  return { flagged: true, detail: `Detected: ${[...new Set(hits)].join(", ")}` };
}

function strip(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(text: string): { injection_flag: boolean; injection_detail: string | null } {
  const scan = scanForInjection(text);
  return { injection_flag: scan.flagged, injection_detail: scan.detail };
}

async function searchArxiv(query: string, limit: number): Promise<RetrievedSource[]> {
  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
    query,
  )}&start=0&max_results=${limit}&sortBy=relevance`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const xml = await res.text();
  const entries = xml.split("<entry>").slice(1);
  return entries.map((entry) => {
    const pick = (t: string) => strip(entry.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1] ?? "");
    const title = pick("title");
    const summary = pick("summary");
    const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)]
      .map((m) => strip(m[1] ?? ""))
      .slice(0, 6)
      .join(", ");
    const published = pick("published");
    const link = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() ?? "";
    const doi = pick("arxiv:doi") || null;
    return {
      title,
      authors,
      venue: "arXiv",
      year: published ? Number(published.slice(0, 4)) : null,
      url: link,
      doi,
      abstract: summary,
      retrieval_method: "keyword" as const,
      retrieved_at: new Date().toISOString(),
      ...tag(`${title}\n${summary}`),
    };
  });
}

type CrossrefItem = {
  title?: string[];
  author?: Array<{ given?: string; family?: string }>;
  "container-title"?: string[];
  issued?: { "date-parts"?: number[][] };
  URL?: string;
  DOI?: string;
  abstract?: string;
};

async function searchCrossref(query: string, limit: number): Promise<RetrievedSource[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(
    query,
  )}&rows=${limit}&select=title,author,container-title,issued,URL,DOI,abstract`;
  const res = await fetch(url, { headers: { "User-Agent": "intelibot-scribe-pipeline/1.0" } });
  if (!res.ok) return [];
  const json = (await res.json()) as { message?: { items?: CrossrefItem[] } };
  return (json.message?.items ?? []).map((item) => {
    const title = strip(item.title?.[0] ?? "Untitled");
    const abstract = strip(item.abstract ?? "");
    return {
      title,
      authors: (item.author ?? [])
        .slice(0, 6)
        .map((a) => [a.given, a.family].filter(Boolean).join(" "))
        .join(", "),
      venue: strip(item["container-title"]?.[0] ?? "Crossref"),
      year: item.issued?.["date-parts"]?.[0]?.[0] ?? null,
      url: item.URL ?? "",
      doi: item.DOI ?? null,
      abstract,
      retrieval_method: "dense" as const,
      retrieved_at: new Date().toISOString(),
      ...tag(`${title}\n${abstract}`),
    };
  });
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

async function embed(inputs: string[]): Promise<number[][] | null> {
  return null;
}

/** Keyword + dense hybrid retrieval across arXiv and Crossref. */
export async function retrieveSources(
  queries: string[],
  perQuery = 6,
): Promise<Array<RetrievedSource & { relevance: number }>> {
  const batches = await Promise.all(
    queries.flatMap((q) => [searchArxiv(q, perQuery), searchCrossref(q, perQuery)]),
  );
  const seen = new Set<string>();
  const merged: RetrievedSource[] = [];
  for (const batch of batches) {
    for (const item of batch) {
      const key = (item.doi ?? item.title).toLowerCase().trim();
      if (!item.title || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  const queryText = queries.join(" ; ");
  const vectors = await embed([queryText, ...merged.map((m) => `${m.title}. ${m.abstract}`)]);
  const qv = vectors?.[0];

  const scored = merged.map((m, i) => {
    const v = vectors?.[i + 1];
    const relevance = qv && v ? Number(cosine(qv, v).toFixed(4)) : 0.5;
    return { ...m, relevance, retrieval_method: (qv && v ? "dense" : m.retrieval_method) as "keyword" | "dense" };
  });

  return scored.sort((a, b) => b.relevance - a.relevance).slice(0, 24);
}