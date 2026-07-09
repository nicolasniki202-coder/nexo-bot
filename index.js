const express = require("express");

const app = express();
app.use(express.json());

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

let lastMatch = null;
let finishedMatches = new Set();

async function sendDiscordEmbed(embed) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log("Brak DISCORD_WEBHOOK_URL w Render Environment");
    return;
  }

  await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Nexo Match Bot",
      embeds: [embed]
    })
  });
}

function getMvp(team1 = {}, team2 = {}) {
  const players = [...(team1.players || []), ...(team2.players || [])];

  if (players.length === 0) return "Brak danych";

  players.sort((a, b) => {
    const aScore = a.stats?.score || 0;
    const bScore = b.stats?.score || 0;
    return bScore - aScore;
  });

  const p = players[0];

  return `**${p.name || "Nieznany"}**\nScore: ${p.stats?.score || 0} | K: ${p.stats?.kills || 0} | D: ${p.stats?.deaths || 0} | MVP: ${p.stats?.mvp || 0}`;
}

function getScoreText(team1 = {}, team2 = {}) {
  return `**${team1.name || "Team 1"} ${team1.score ?? 0} : ${team2.score ?? 0} ${team2.name || "Team 2"}**`;
}

function isMatchFinished(team1 = {}, team2 = {}) {
  const score1 = Number(team1.score || 0);
  const score2 = Number(team2.score || 0);

  return score1 >= 13 || score2 >= 13;
}

function getWinner(team1 = {}, team2 = {}) {
  const score1 = Number(team1.score || 0);
  const score2 = Number(team2.score || 0);

  if (score1 > score2) return team1.name || "Team 1";
  if (score2 > score1) return team2.name || "Team 2";
  return "Remis / dogrywka";
}

async function sendLive(data) {
  await sendDiscordEmbed({
    title: "🔥 Mecz wystartował",
    color: 0xffcc00,
    fields: [
      { name: "Match ID", value: String(data.matchid ?? "brak"), inline: true },
      { name: "Mapa nr", value: String(data.map_number ?? "brak"), inline: true }
    ],
    footer: { text: "Nexo Esports • LIVE" },
    timestamp: new Date().toISOString()
  });
}

async function sendResult(data) {
  const team1 = data.team1 || {};
  const team2 = data.team2 || {};
  const matchKey = `${data.matchid ?? "unknown"}-${data.map_number ?? "0"}`;

  if (finishedMatches.has(matchKey)) {
    console.log("Wynik już wysłany, pomijam:", matchKey);
    return;
  }

  finishedMatches.add(matchKey);

  lastMatch = {
    matchid: data.matchid ?? "brak",
    map_number: data.map_number ?? "brak",
    team1,
    team2,
    winner: getWinner(team1, team2),
    mvp: getMvp(team1, team2),
    date: new Date().toISOString()
  };

  await sendDiscordEmbed({
    title: "🏆 Mecz zakończony",
    color: 0x00ff66,
    fields: [
      { name: "🗺️ Mapa", value: `Mapa nr ${data.map_number ?? "brak"}`, inline: true },
      { name: "🥇 Zwycięzca", value: lastMatch.winner, inline: true },
      { name: "📊 Wynik", value: getScoreText(team1, team2), inline: false },
      { name: "⭐ MVP", value: lastMatch.mvp, inline: false }
    ],
    footer: { text: "Nexo Esports • MatchZy" },
    timestamp: new Date().toISOString()
  });
}

app.post("/", async (req, res) => {
  const data = req.body;

  console.log("Webhook:");
  console.log(JSON.stringify(data, null, 2));

  try {
    if (data.event === "going_live") {
      await sendLive(data);
    }

    if (data.event === "round_end") {
      const team1 = data.team1 || {};
      const team2 = data.team2 || {};

      if (isMatchFinished(team1, team2)) {
        await sendResult(data);
      }
    }

    if (
      data.event === "map_end" ||
      data.event === "match_end" ||
      data.event === "series_end"
    ) {
      await sendResult(data);
    }
  } catch (err) {
    console.error("Błąd bota:", err);
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Nexo Bot działa!");
});

app.get("/wynik", (req, res) => {
  if (!lastMatch) {
    return res.json({ message: "Brak zapisanego wyniku." });
  }

  res.json(lastMatch);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
