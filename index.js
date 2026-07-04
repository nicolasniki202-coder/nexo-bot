const express = require("express");

const app = express();

app.use(express.json());

app.post("/", (req, res) => {
    console.log("Webhook:");
    console.log(JSON.stringify(req.body, null, 2));

    res.sendStatus(200);
});

app.get("/", (req, res) => {
    res.send("Nexo Bot działa!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
