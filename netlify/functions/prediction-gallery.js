
exports.handler = async () => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud || !apiKey || !secret) {
    return json(500, { error: "Konfigurasi belum lengkap." });
  }

  try {
    const auth = Buffer.from(`${apiKey}:${secret}`).toString("base64");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/resources/by_tag/bola168-prediksi?max_results=100`,
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return json(502, { error: "Gagal mengambil galeri." });
    }

    const images = (data.resources || []).map(image => ({
      url: image.secure_url,
      date: image.created_at,
      id: image.public_id
    }));

    return json(200, { images }, 60);
  } catch (error) {
    return json(500, { error: "Galeri gagal dimuat." });
  }
};

function json(statusCode, body, cache = 0) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${cache}`
    },
    body: JSON.stringify(body)
  };
}
