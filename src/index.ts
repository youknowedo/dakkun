import { WebClient } from "@slack/web-api";
import { eq, inArray } from "drizzle-orm";
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

let downKnown = false;

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

setInterval(async () => {
    const db = await drizzle;

    const down = await isDown();
    if (down) {
        if (!downKnown) {
            downKnown = true;

            web.chat.postMessage({
                channel: "C06SBHMQU8G",
                text: "down, hakkuun is! enter `/dakkuun` to get a reminder, you must.",
            });
            web.chat.postMessage({
                channel: "C0P5NE354",
                blocks: [
                    {
                        type: "rich_text",
                        elements: [
                            {
                                type: "rich_text_section",
                                elements: [
                                    {
                                        type: "text",
                                        text: "GUYS BOT IS DOWN. Please be patient and check ",
                                    },
                                    {
                                        type: "link",
                                        url: "https://status.hackclub.com/?duration=1d",
                                    },
                                    {
                                        type: "text",
                                        text: " for status.\nAlso if you are in a session - Hakkuun stops counting time and will resume counting it when going up. Please post your commit early if you want - when an hour should have passed, and inform about it in your session thread. Then wait for it to end. Don't click end early button, as we won't be able to give you full credits\n\nrun ",
                                    },
                                    {
                                        type: "text",
                                        text: "/dakuun",
                                        style: {
                                            code: true,
                                        },
                                    },
                                    {
                                        type: "text",
                                        text: " to be notified when she's back!\n\n~Bartosz AI ",
                                    },
                                    {
                                        type: "emoji",
                                        name: "tm",
                                        unicode: "2122-fe0f",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        }

        return;
    }

    if (!downKnown) return;

    const users = await db.select().from(reminders);

    users.forEach(async (user) => {
        const convo = await web.conversations.open({
            users: user.id,
        });
        if (!convo.channel?.id) return;

        await web.chat.postMessage({
            channel: convo.channel.id,
            text: "up, hakkuun is!",
        });
    });

    await db.delete(reminders).where(
        inArray(
            reminders.id,
            users.map((u) => {
                return u.id;
            })
        )
    );

    downKnown = false;
}, 60000);

app.post("/dakkuun/down", async (c) => {
    return c.text((await isDown()) ? "down, hakkuun is!" : "up, hakkuun is!");
});

app.post("/dakkuun/remind", async (c) => {
    const db = await drizzle;

    const userId = (await c.req.formData()).get("user_id")?.toString();
    if (!userId)
        return c.text("hmmm. no user id, i found. message Sigfredo, you must.");

    const user = (
        await db.select().from(reminders).where(eq(reminders.id, userId))
    )[0];
    if (user) return c.text("remind you, i already will");

    const down = await isDown();
    if (!down) return c.text("up, hakkuun is!");

    await db.insert(reminders).values({
        id: userId,
    });

    return c.text("remind you, i will");
});

export default {
    ...app,
    port: values.port,
};
