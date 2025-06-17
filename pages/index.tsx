import React, { useState, useEffect } from 'react';

type Result = {
  url: string;
  success: boolean;
  filename?: string;
  transcript?: string;
  error?: string;
};

export default function Home() {
  const [urls, setUrls] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [blobUrls, setBlobUrls] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    return () => {
      Object.values(blobUrls).forEach(URL.revokeObjectURL);
      setBlobUrls({});
    };
  }, [results]);

  function createDownloadUrl(text: string) {
    const blob = new Blob([text], { type: 'text/plain' });
    return URL.createObjectURL(blob);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setBlobUrls({});

    const list = urls
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean)
      .slice(0, 10);

    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: list }),
      });

      const data: Result[] = await res.json();
      setResults(data);

      const urlsBlob: { [key: number]: string } = {};
      data.forEach((r, i) => {
        if (r.success && r.transcript) {
          urlsBlob[i] = createDownloadUrl(r.transcript);
        }
      });
      setBlobUrls(urlsBlob);
    } catch {
      alert('Erro ao buscar transcrições');
    }
    setLoading(false);
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Transcrição YouTube</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          rows={10}
          value={urls}
          onChange={e => setUrls(e.target.value)}
          placeholder="Cole até 10 links de vídeos ou playlist, um por linha"
          style={{ width: '100%', fontSize: 16 }}
        />
        <button type="submit" disabled={loading} style={{ marginTop: 10 }}>
          {loading ? 'Processando...' : 'Gerar transcrições'}
        </button>
      </form>

      <ul style={{ marginTop: 20 }}>
        {results.map((r, i) => (
          <li
            key={i}
            style={{ color: r.success ? 'green' : 'red', marginBottom: 8 }}
          >
            <strong>{r.url}</strong>: {' '}
            {r.success ? (
              <>
                Transcrição pronta!{' '}
                <a href={blobUrls[i]} download={r.filename}>
                  {r.filename}
                </a>
              </>
            ) : (
              <>Erro: {r.error}</>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
