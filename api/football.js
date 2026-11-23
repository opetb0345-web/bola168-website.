// Vercel Serverless Function for API-Football
// Set API_FOOTBALL_KEY in Vercel Project Settings > Environment Variables.
module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return res.status(503).json({ error: "API_FOOTBALL_KEY belum dipasang di Vercel." });
  }

  const q = req.query || {};
  const headers = { "x-apisports-key": key };

  async function requestBody(endpoint, params) {
    const url = new URL("https://v3.football.api-sports.io/" + endpoint);
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(name, String(value));
      }
    }
    const response = await fetch(url, { headers });
    const body = await response.json();
    if (!response.ok || (body.errors && Object.keys(body.errors).length)) {
      const error = new Error("API-Football menolak permintaan.");
      error.status = response.status || 502;
      throw error;
    }
    return body;
  }

  try {
    if (q.teams) {
      const body = await requestBody("teams", { search: String(q.teams).slice(0, 80) });
      return res.status(200).json(body);
    }

    if (q.h2h) {
      const ids = String(q.h2h).split("-");
      if (ids.length !== 2 || !ids.every(x => /^\d+$/.test(x))) {
        return res.status(400).json({ error: "Format H2H tidak valid." });
      }
      const body = await requestBody("fixtures", { h2h: q.h2h, last: 10 });
      return res.status(200).json(body);
    }

    if (q.live === "all") {
      const body = await requestBody("fixtures", { live: "all" });
      return res.status(200).json(body);
    }

    if (q.next) {
      const jakartaDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
      }).format(new Date());
      const start = new Date(jakartaDate + "T00:00:00Z");
      const dates = [];
      for (let i = 1; i <= 3; i++) {
        const date = new Date(start);
        date.setUTCDate(date.getUTCDate() + i);
        dates.push(date.toISOString().slice(0, 10));
      }
      const results = await Promise.all(dates.map(date => requestBody("fixtures", { date })));
      const matches = results.flatMap(item => item.response || []).filter(match =>
        match.fixture && ["NS", "TBD"].includes(match.fixture.status.short)
      );
      return res.status(200).json({
        get: "fixtures", parameters: { dates }, results: matches.length, response: matches
      });
    }

    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(q.date || ""))
      ? String(q.date)
      : new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
        }).format(new Date());
    const body = await requestBody("fixtures", { date });
    return res.status(200).json(body);
  } catch (error) {
    console.error("BOLA168 football API:", error.message);
    return res.status(error.status && error.status >= 400 && error.status < 600 ? error.status : 502)
      .json({ error: "Gagal mengambil data pertandingan. Periksa kuota dan konfigurasi API-Football." });
  }
};
