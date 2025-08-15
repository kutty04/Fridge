// api/vision.js (Vercel)
// Uses Google Cloud Vision REST API
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const key = process.env.GOOGLE_VISION_API_KEY;
    if (!key) return res.status(500).json({ error: 'Missing API key' });

    const body = {
      requests: [{
        image: { content: image },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'TEXT_DETECTION',  maxResults: 5 }
        ]
      }]
    };

    const r = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(body)
    });
    const json = await r.json();

    const annotations = json?.responses?.[0] || {};
    const labels = (annotations.labelAnnotations || []).map(x => x.description);
    const text   = annotations.textAnnotations?.[0]?.description || '';
    const textHints = text
      .split(/\s+/).map(s => s.trim()).filter(Boolean).slice(0, 10);

    return res.status(200).json({ labels: Array.from(new Set([...textHints, ...labels])) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Vision request failed' });
  }
}
