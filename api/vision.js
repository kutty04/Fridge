export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: "No image provided" });

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    const gRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: image },
              features: [
                { type: "LABEL_DETECTION", maxResults: 10 },
                { type: "TEXT_DETECTION", maxResults: 1 }
              ]
            }
          ]
        })
      }
    );

    const json = await gRes.json();
    if (json.error) throw new Error(json.error.message);
    res.status(200).json(json.responses[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
