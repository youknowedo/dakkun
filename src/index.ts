import { WebClient } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { parseArgs } from "util";
import { initDb } from "./db";
import { reminders } from "./schema";

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

const drizzle = initDb();
const web = new WebClient();
const app = new Hono({});

const isDown = async () =>
    await fetch("https://hackhour.hackclub.com/status")
        .then((res) => {
            if (res.ok) return res.json();
        })
        .then((data) => {
            return !data.slackConnected;
        })
        .catch(() => {
            return true;
        });

app.post("/dakkun/down", async (c) => {
    return c.text((await isDown()) ? "down, hakkun is!" : "up, hakkun is!");
});

let t: Timer | undefined = undefined;
app.post("/dakkun/remind", async (c) => {
    const db = await drizzle;

    const userId = c.req.query("user_id");
    if (!userId) return c.text("no user");

    const user = (
        await db.select().from(reminders).where(eq(reminders.id, userId))
    )[0];
    if (user) return c.text("already set");

    db.insert(reminders).values({
        id: userId,
    });

    if (!t)
        t = setInterval(async () => {
            const down = await isDown();
            if (down) {
                clearInterval(t);
                t = undefined;
                await web.chat.postMessage({
                    channel: userId,
                    text: "up, hakkun is!",
                });
            }
        }, 60000);
});

export default {
    ...app,
    port: values.port,
};
