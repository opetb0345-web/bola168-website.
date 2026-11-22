
// Netlify Function: proxy API-Football tanpa membuka API key di browser.
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

  // Pencarian klub berdasarkan nama
  if (q.teams) {
    endpoint = "teams";
    params.set("search", q.teams);
  }

  // Head to Head
  else if (q.h2h) {
    params.set("h2h", q.h2h);
    params.set("last", "10");
  }

  // Live Score dan jadwal pertandingan
  else {
    if (q.live === "all") {
      params.set("live", "all");
    } else if (q.date) {
      params.set("date", q.date);
    } else {
      params.set("date", new Date().toISOString().slice(0, 10));
    }

    if (q.next === "1") {
      params.set("next", "10");
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

  } catch (e) {
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
      "cache-control": "public, max-age=30"
    },
    body: JSON.stringify(body)
  };
}
