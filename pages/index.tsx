import { useState, useEffect } from 'react';

export default function Home() {
  const [language, setLanguage] = useState('en');
  const [inputLinks, setInputLinks] = useState('');
  const [results, setResults] = useState<{ link: string, status: string, transcript?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const browserLang = navigator.language.slice(0, 2);
    setLanguage(browserLang);
  }, []);

  const handleSubmit = async () => {
    const links = inputLinks.split('\n').map(l => l.trim()).filter(l => l);
    setResults([]);
    setLoading(true);

    for (const link of links) {
      const videoIdMatch = link.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      if (!videoId) {
        setResults(prev => [...prev, { link, status: 'Invalid YouTube link' }]);
        continue;
      }

      try {
        const res = await fetch('/api/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, lang: language }),
        });

        const data = await res.json();

        if (res.ok) {
          setResults(prev => [...prev, { link, status: 'Success', transcript: data.transcript }]);
        } else {
          setResults(prev => [...prev, { link, status: data.error }]);
        }
      } catch (err) {
        setResults(prev => [...prev, { link, status: 'Request failed' }]);
      }
    }

    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">YouTube Transcript Tool</h1>

      <div className="mb-4">
        <label className="block mb-2">Language:</label>
        <input
          type="text"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border p-2 w-32"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2">YouTube Links (one per line):</label>
        <textarea
          rows={5}
          value={inputLinks}
          onChange={(e) => setInputLinks(e.target.value)}
          className="border p-2 w-full"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? 'Processing...' : 'Get Transcripts'}
      </button>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Results:</h2>
        <ul>
          {results.map((result, index) => (
            <li key={index} className="mb-4 border p-2">
              <p><strong>Video:</strong> {result.link}</p>
              <p><strong>Status:</strong> {result.status}</p>
              {result.transcript && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Show Transcript</summary>
                  <pre className="bg-gray-100 p-2 whitespace-pre-wrap">{result.transcript}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
