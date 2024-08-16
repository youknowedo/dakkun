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
    })
})

app.post("/dakkun/down", async (c) => {
    return c.text((await isDown()) ? "down, hakkun is!" : "up, hakkun is!");
});

let t: Timer | undefined = undefined;
app.post("/dakkun/remind", async (c) => {
    const db = await drizzle;

    const userId = JSON.stringify((await c.req.formData()).get("user_id"));
    if (!userId) return c.text("no user id");

    const user = (
        await db.select().from(reminders).where(eq(reminders.id, userId))
    )[0];
    if (user) return c.text("already set");
    
    await db.insert(reminders).values({
        id: userId,
    });
    
    if (!t)
        t = setInterval(async () => {
                clearInterval(t);
                t = undefined;

                const down = await isDown();

                if (down) return;
                
                const convo = await web.conversations.open({
                    users: userId.substring(1, userId.length-1),
                });
                if (!convo.channel?.id) return;

                await web.chat.postMessage({
                    channel: convo.channel.id,
                    text: "up, hakkun is!",
                });
            
        }, 100);

    return c.text("setting reminder");
});

export default {
    ...app,
    port: values.port,
};
