// Vercel Serverless Function for API-Football
// Set API_FOOTBALL_KEY in Vercel Project Settings > Environment Variables.
module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // Cache each query type to conserve the API daily quota.
  const q = req.query || {};
  const cacheSeconds = q.bigmatch === "1" ? 86400 : q.live === "all" ? 900 : q.teams ? 86400 : q.h2h ? 86400 : q.next ? 86400 : 43200;
  res.setHeader("Cache-Control", `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`);

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return res.status(503).json({ error: "API_FOOTBALL_KEY belum dipasang di Vercel." });
  }

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
      const body = await requestBody("fixtures", { h2h: q.h2h, last: 5 });
      return res.status(200).json(body);
    }

    if (q.bigmatch === "1") {
      const pairs = [
        { home: 42, away: 165 }, { home: 50, away: 492 },
        { home: 327, away: 755 }, { home: 541, away: 197 },
        { home: 560, away: 543 }, { home: 895, away: 553 },
        { home: 209, away: 212 }
      ];
      const fixtureLists = await Promise.all(pairs.map(pair =>
        requestBody("fixtures", { team: pair.home, next: 20 })
      ));
      const results = await Promise.all(pairs.map(async (pair, index) => {
        const fixture = (fixtureLists[index].response || []).find(item =>
          item.teams?.home?.id === pair.home && item.teams?.away?.id === pair.away
        );
        if (!fixture) return { ...pair, available: false, reason: "Belum ditemukan jadwal resmi untuk pasangan ini." };
        try {
          const predictionBody = await requestBody("predictions", { fixture: fixture.fixture.id });
          const prediction = predictionBody.response?.[0];
          const percent = prediction?.predictions?.percent;
          if (!percent?.home || !percent?.draw || !percent?.away) {
            return { ...pair, available: false, fixture: fixture.fixture, teams: fixture.teams, league: fixture.league, reason: "Data persentase belum tersedia dari API." };
          }
          return { ...pair, available: true, fixture: fixture.fixture, teams: fixture.teams, league: fixture.league, percent };
        } catch (error) {
          return { ...pair, available: false, fixture: fixture.fixture, teams: fixture.teams, league: fixture.league, reason: "Prediksi belum tersedia dari API." };
        }
      }));
      return res.status(200).json({ get: "bigmatch-predictions", results: results.length, response: results });
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
