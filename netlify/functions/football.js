
exports.handler = async (event) => {
  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    return json(503, { error: "API key belum dipasang." });
  }

  const q = event.queryStringParameters || {};
  const headers = { "x-apisports-key": key };

  try {
    // Pencarian klub
    if (q.teams) {
      return await request("teams", { search: q.teams });
    }

    // Head to Head
    if (q.h2h) {
      return await request("fixtures", {
        h2h: q.h2h,
        last: "10"
      });
    }

    // Live Score
    if (q.live === "all") {
      return await request("fixtures", { live: "all" });
    }

    // Jadwal 3 hari ke depan
    if (q.next) {
      const dates = [];
      const jakartaDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());

      const start = new Date(jakartaDate + "T00:00:00Z");

      for (let i = 1; i <= 3; i++) {
        const date = new Date(start);
        date.setUTCDate(date.getUTCDate() + i);
        dates.push(date.toISOString().slice(0, 10));
      }

      const results = await Promise.all(
        dates.map(date => requestBody("fixtures", { date }))
      );

      const matches = results.flatMap(result =>
        result.response || []
      ).filter(match =>
        match.fixture &&
        ["NS", "TBD"].includes(match.fixture.status.short)
      );

      return json(200, {
        get: "fixtures",
        parameters: { dates },
        results: matches.length,
        response: matches
      }, 300);
    }

    // Jadwal berdasarkan tanggal
    return await request("fixtures", {
      date: q.date || new Date().toISOString().slice(0, 10)
    });

  } catch (error) {
    return json(502, {
      error: "Gagal mengambil data pertandingan."
    });
  }

  async function request(endpoint, params) {
    const body = await requestBody(endpoint, params);
    return json(200, body, 60);
  }

  async function requestBody(endpoint, params) {
    const query = new URLSearchParams(params);

    const response = await fetch(
      "https://v3.football.api-sports.io/" +
      endpoint + "?" + query.toString(),
      { headers }
    );

    const body = await response.json();

    if (!response.ok || (body.errors && Object.keys(body.errors).length)) {
      throw new Error("API-Football error");
    }

    return body;
  }
};

function json(statusCode, body, cache = 60) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": `public, max-age=${cache}`
    },
    body: JSON.stringify(body)
  };
}
