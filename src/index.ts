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
const web = new WebClient(process.env.SLACK_TOKEN);
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

drizzle.then(async (db) => {
    const users = await db.select().from(reminders);

    // delete
    users.forEach(async (user) => {
        await db.delete(reminders).where(eq(reminders.id, user.id));
    });
});

app.post("/dakkuun/down", async (c) => {
    return c.text((await isDown()) ? "down, hakkuun is!" : "up, hakkuun is!");
});

let t: Timer | undefined = undefined;
app.post("/dakkuun/remind", async (c) => {
    const db = await drizzle;

    const userId = JSON.stringify((await c.req.formData()).get("user_id"));
    if (!userId)
        return c.text("hmmm. no user id, i found. message Sigfredo, you must.");

    const user = (
        await db.select().from(reminders).where(eq(reminders.id, userId))
    )[0];
    if (user) return c.text("remind you, i already will");

    await db.insert(reminders).values({
        id: userId,
    });

    if (!t) {
        const down = await isDown();
        if (!down) {
            return c.text("up, hakkuun is!");
        }

        t = setInterval(async () => {
            const down = await isDown();
            if (down) return;

            clearInterval(t);
            t = undefined;

            const convo = await web.conversations.open({
                users: userId.substring(1, userId.length - 1),
            });
            if (!convo.channel?.id) return;

            await web.chat.postMessage({
                channel: convo.channel.id,
                text: "up, hakkuun is!",
            });
        }, 60000);
    }

    return c.text("remind you, i will");
});

export default {
    ...app,
    port: values.port,
};
