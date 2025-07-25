// pages/index.tsx
import { useState, useEffect } from 'react';

type Result = {
  videoId: string;
  filename: string | null;
  content: string | null;
  error: string | null;
  title?: string;
  channel?: string;
};

export default function Home() {
  const [input, setInput] = useState('');
  const [languageCode, setLanguageCode] = useState('en');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lang = navigator.language.slice(0, 2);
    setLanguageCode(lang);
  }, []);

  function parseVideoIds(text: string): string[] {
    const regex = /(?:v=|\/)([a-zA-Z0-9_-]{11})/g;
    const ids = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      ids.push(match[1]);
    }
    if (ids.length === 0) {
      return text
        .split(/[\n, ]+/)
        .map((s) => s.trim())
        .filter((s) => s.length === 11);
    }
    return ids;
  }

  async function handleSubmit() {
    setLoading(true);
    setResults([]);

    const videoIds = parseVideoIds(input).slice(0, 10);
    if (videoIds.length === 0) {
      alert('Insira ao menos 1 vídeo válido (URL ou ID)');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds, languageCode }),
      });
      const data = await res.json();
      setResults(data.results);
    } catch (error) {
      alert('Erro ao chamar API');
    } finally {
      setLoading(false);
    }
  }

  function downloadFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h1>Youtube Transcript Tool</h1>

      <textarea
        rows={6}
        placeholder="Cole URLs ou IDs dos vídeos (máx 10)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ width: '100%', marginBottom: 10 }}
      />

      <label>
        Idioma das legendas:{' '}
        <select
          value={languageCode}
          onChange={(e) => setLanguageCode(e.target.value)}
        >
          <option value="en">English</option>
          <option value="pt">Português</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
        </select>
      </label>

      <br />
      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? 'Processando...' : 'Gerar transcrição'}
      </button>

      <div style={{ marginTop: 20 }}>
        {results.map(({ videoId, filename, content, error, title, channel }) => (
          <div key={videoId} style={{ marginBottom: 15, borderBottom: '1px solid #ccc' }}>
            <strong>{title ? `${title} — ${channel ?? 'Canal desconhecido'}` : videoId}</strong>
            <br />
            {error ? (
              <span style={{ color: 'red' }}>Erro: {error}</span>
            ) : (
              <button
                onClick={() => {
                  if (filename && content) downloadFile(filename, content);
                }}
              >
                Baixar {filename}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
