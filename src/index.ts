import { WebClient } from "@slack/web-api";
import { Hono } from "hono";
import { parseArgs } from "util";

const { values, positionals } = parseArgs({
    args: Bun.argv,
    options: {
        port: {
            type: "string",
        },
    },
    strict: true,
    allowPositionals: true,
});
const web = new WebClient();

const app = new Hono({});

app.post("/dakkun/down", async (c) => {
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

    return c.text(JSON.stringify(isDown ? "down hakkun is" : "up hakkun is"));
});

export default {
    ...app,
    port: values.port,
};
