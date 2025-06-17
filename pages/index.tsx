import { useState } from 'react';

export default function Home() {
  const [urls, setUrls] = useState('');
  const [format, setFormat] = useState('txt');
  const [result, setResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setResult([]);

    const urlList = urls.split('\n').map(u => u.trim()).filter(Boolean);

    if(urlList.length > 10){
      alert('Limite máximo de 10 vídeos por vez');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: urlList, format }),
    });

    const data = await res.json();
    if (res.ok) {
      setResult(data.files);
    } else {
      alert(data.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-3xl mb-4">YouTube Transcript Tool</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          className="w-full border p-2"
          rows={6}
          placeholder="Cole até 10 links de vídeos do YouTube, um por linha"
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
        />
        <div>
          <label className="mr-4">Formato:</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="txt">TXT</option>
            <option value="md">Markdown</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="bg-blue-500 text-white px-4 py-2">
          {loading ? 'Processando...' : 'Gerar Transcrição'}
        </button>
      </form>

      {result.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl mb-4">Arquivos Gerados</h2>
          <ul className="space-y-2">
            {result.map((file) => (
              <li key={file.filename}>
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(file.content)}`}
                  download={file.filename}
                  className="text-blue-600 underline"
                >
                  {file.filename}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}