import { inArray } from "drizzle-orm";
import { drizzle, web } from ".";
import { bartosz } from "./blocks";
import { reminders } from "./schema";

export let isDown = false;
let downKnown = false;

export const checkIsDown = async (): Promise<boolean> => {
    const db = await drizzle;

    isDown = await fetch("https://hackhour.hackclub.com/status")
        .then((res) => {
            if (res.ok) return res.json();
        })
        .then((data) => {
            return !data.slackConnected;
        })
        .catch(() => {
            return true;
        });

    if (isDown) {
        if (!downKnown) {
            downKnown = true;

            web.chat.postMessage({
                channel: "C06SBHMQU8G",
                text: "down, hakkuun is! enter `/dakkuun` to get a reminder, you must.",
            });
            web.chat.postMessage({
                channel: "C077TSWKER0",
                blocks: [bartosz],
            });
        }

        return true;
    }

    if (!downKnown) return false;

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

    return (downKnown = false);
};
