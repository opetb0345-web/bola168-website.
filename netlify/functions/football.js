
exports.handler = async (event) => {
  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    return json(503, {
      error: "API_FOOTBALL_KEY belum dipasang di Netlify."
    });
  }

  const q = event.queryStringParameters || {};
  const params = new URLSearchParams();
  let endpoint = "fixtures";

  // Pencarian klub
  if (q.teams) {
    endpoint = "teams";
    params.set("search", q.teams);
  }

  // Head to Head
  else if (q.h2h) {
    params.set("h2h", q.h2h);
    params.set("last", "10");
  }

  // Pertandingan lainnya
  else {
    if (q.live === "all") {
      params.set("live", "all");
    }

    // Jadwal mendatang: 7 hari ke depan
    else if (q.next === "1") {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);

      const formatDate = (date) =>
        date.toISOString().slice(0, 10);

      params.set("from", formatDate(start));
      params.set("to", formatDate(end));
      params.set("status", "NS");
    }

    // Jadwal berdasarkan tanggal
    else {
      params.set(
        "date",
        q.date || new Date().toISOString().slice(0, 10)
      );
    }
  }

  try {
    const response = await fetch(
      "https://v3.football.api-sports.io/" +
      endpoint + "?" + params.toString(),
      {
        headers: {
          "x-apisports-key": key
        }
      }
    );

    const body = await response.json();
    return json(response.status, body);

  } catch (error) {
    return json(502, {
      error: "Tidak dapat mengambil data dari API-Football."
    });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60"
    },
    body: JSON.stringify(body)
  };
}
