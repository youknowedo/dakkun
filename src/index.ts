import { WebClient } from "@slack/web-api";
import { Hono } from "hono";

const web = new WebClient();

const app = new Hono({});

app.get("/dakkun/down", async (c) => {
    const isDown = await fetch("https://hackhour.hackclub.com/status")
        .then((res) => {
            if (res.ok) return res.json();
        })
        .then((data) => {
            return !data.slackConnected;
        })
        .catch(() => {
            return true;
        });

    return c.text(
        JSON.stringify({ text: isDown ? "down hakkun is" : "up hakkun is" })
    );
});

export default {
    port: 3030,
    fetch: app.fetch,
};
