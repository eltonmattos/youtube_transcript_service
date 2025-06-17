import { useState, useEffect } from 'react';

export default function Home() {
  const [language, setLanguage] = useState('en');
  const [inputLinks, setInputLinks] = useState('');
  const [format, setFormat] = useState<'txt' | 'md'>('txt');
  const [results, setResults] = useState<
    {
      videoId: string;
      filename: string | null;
      content: string | null;
      error: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [zipDataUrl, setZipDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const navLang = navigator.language.slice(0, 2);
    setLanguage(navLang);
  }, []);

  const extractVideoId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const handleSubmit = async () => {
    setResults([]);
    setZipDataUrl(null);
    setLoading(true);

    const links = inputLinks
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l);

    if (links.length === 0) {
      alert('Please enter at least one YouTube video URL.');
      setLoading(false);
      return;
    }

    if (links.length > 10) {
      alert('Please limit to max 10 links.');
      setLoading(false);
      return;
    }

    const videoIds = links.map((link) => extractVideoId(link)).filter((id) => id !== null) as string[];

    if (videoIds.length !== links.length) {
      alert('Some links are invalid YouTube URLs.');
      setLoading(false);
      return;
    }

    // Chama backend sem ZIP primeiro para resultados individuais
    const res = await fetch('/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videos: videoIds, lang: language, format }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Error fetching transcripts');
      setLoading(false);
      return;
    }

    setResults(data.results);

    // Agora gera zip com todos juntos
    const zipRes = await fetch('/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videos: videoIds, lang: language, format, zip: true }),
    });
    const zipData = await zipRes.json();

    if (zipRes.ok && zipData.zip) {
      setZipDataUrl(`data:application/zip;base64,${zipData.zip}`);
    } else {
      setZipDataUrl(null);
    }

    setLoading(false);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">YouTube Transcript Tool</h1>

      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold">Language (e.g., en, pt, es):</label>
          <input
            type="text"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-32"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Output Format:</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'txt' | 'md')}
            className="border border-gray-300 rounded px-3 py-2 w-24"
          >
            <option value="txt">TXT</option>
            <option value="md">Markdown</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold">YouTube Video Links (max 10, one per line):</label>
          <textarea
            rows={6}
            value={inputLinks}
            onChange={(e) => setInputLinks(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX"
            className="border border-gray-300 rounded px-3 py-2 w-full"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`${
            loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
          } text-white px-4 py-2 rounded font-semibold`}
        >
          {loading ? 'Processing...' : 'Get Transcripts'}
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-3">Results</h2>
        <ul className="space-y-4">
          {results.map(({ videoId, filename, content, error }, idx) => (
            <li key={idx} className="border border-gray-300 rounded p-4">
              <p>
                <strong>Video ID:</strong> {videoId}
              </p>
              {error ? (
                <p className="text-red-600 font-semibold">Error: {error}</p>
              ) : (
                <button
                  onClick={() => filename && content && downloadFile(filename, content)}
                  className="mt-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                >
                  Download {filename}
                </button>
              )}
            </li>
          ))}
        </ul>

        {zipDataUrl && (
          <div className="mt-6">
            <a
              href={zipDataUrl}
              download={`youtube_transcripts_${new Date().toISOString()}.zip`}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-semibold"
            >
              Download All as ZIP
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
