const express = require("express");

const app = express();
app.use(express.json());

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

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

function getMvp(team1, team2) {
  const players = [...(team1.players || []), ...(team2.players || [])];

  if (players.length === 0) return "Brak danych";

  players.sort((a, b) => {
    const aScore = a.stats?.score || 0;
    const bScore = b.stats?.score || 0;
    return bScore - aScore;
  });

  const p = players[0];
  return `${p.name} | MVP: ${p.stats?.mvp || 0} | K: ${p.stats?.kills || 0} | D: ${p.stats?.deaths || 0}`;
}

app.post("/", async (req, res) => {
  const data = req.body;

  console.log("Webhook:");
  console.log(JSON.stringify(data, null, 2));

  try {
    if (data.event === "going_live") {
      await sendDiscordEmbed({
        title: "🔥 Mecz wystartował",
        color: 0xffcc00,
        fields: [
          { name: "Match ID", value: String(data.matchid ?? "brak"), inline: true },
          { name: "Mapa nr", value: String(data.map_number ?? "brak"), inline: true }
        ],
        footer: { text: "Nexo Esports" }
      });
    }

    if (data.event === "round_end") {
      const team1 = data.team1 || {};
      const team2 = data.team2 || {};

      const score1 = Number(team1.score || 0);
      const score2 = Number(team2.score || 0);

      if (score1 >= 13 || score2 >= 13) {
        const winner = score1 > score2 ? team1.name : team2.name;

        await sendDiscordEmbed({
          title: "🏆 Mecz zakończony",
          color: 0x00ff66,
          fields: [
            { name: "Mapa", value: `Mapa nr ${data.map_number ?? 0}`, inline: true },
            { name: "Zwycięzca", value: winner || "Brak danych", inline: true },
            { name: "Wynik", value: `**${team1.name || "Team 1"} ${score1} : ${score2} ${team2.name || "Team 2"}**` },
            { name: "⭐ MVP", value: getMvp(team1, team2) }
          ],
          footer: { text: "Nexo Esports • MatchZy" }
        });
      }
    }
  } catch (err) {
    console.error("Błąd wysyłania na Discord:", err);
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Nexo Bot działa!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
