import polka from "polka";
import sirv from "sirv";
import loki from "lokijs";
import fs from "node:fs/promises";
import templite from "templite";
import QRCode from "qrcode";
import { randomUUID } from "node:crypto";

const baseUrl = process.env.BASE_URL || "http://localhost:3000/"

const db = new loki("database");
db.addCollection("confirmed");

const app = polka();

app.get("/confirm", async (req, res) => {
    const id = req.query?.id;
    if (id === undefined) {
        const htmlTemplate = await fs.readFile("public/empty.html", { encoding: "utf-8" });
        res.writeHead(200, { "Content-Type": "text/html"})
            .end(templite(htmlTemplate, { page_name: "confirm" }));
        return;
    }

    db.getCollection("confirmed").insert({ id: id, confirmed: true });
    const htmlTemplate = await fs.readFile("public/close.html", { encoding: "utf-8" });
    res.writeHead(200, { "Content-Type": "text/html"})
        .end(htmlTemplate);
});

app.get("/status", async (req, res) => {
    const id = req.query?.id;
    if (id === undefined) {
        res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ message: "id must not be empty" }));
        return;
    }

    const item = db.getCollection("confirmed").findOne({ id: { "$eq": id }});
    if (item == null) {
        res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ message: "not yet" }));
        return
    }

    if (item?.confirmed === true) {
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ message: "yeah!" }));
        return;
    }

    res.writeHead(500, { "COntent-Type": "application/json" }).end(JSON.stringify({ message: "unexpected behavior", item }))
});

app.get("/", async (req, res) => {
    const randomId = randomUUID();
    const destinationUrl = new URL("/confirm?" + new URLSearchParams({ id: randomId }).toString(), baseUrl);
    const qrcode = await QRCode.toDataURL(destinationUrl.toString());
    const htmlTemplate = await fs.readFile("public/index.html", { encoding: "utf-8" });
    res.writeHead(200, { "Content-Type": "text/html"})
        .end(templite(htmlTemplate, {
            qrcode_dataurl: qrcode,
            qrcode_id: randomId,
        }));
});

app.use(sirv("public", { dev: true }));

app.listen(3000, () => console.log("Starting on http://localhost:3000"));