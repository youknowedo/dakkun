import { WebClient } from "@slack/web-api";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { parseArgs } from "util";
import { bartosz } from "./blocks";
import { initDb } from "./db";
import { app } from "./routes";
import { reminders } from "./schema";
import { checkIsDown } from "./utils";

const { values } = parseArgs({
    args: Bun.argv,
    options: {
        port: {
            type: "string",
        },
    },
    strict: true,
    allowPositionals: true,
});

export const drizzle = initDb();
export const web = new WebClient(process.env.SLACK_TOKEN);

drizzle.then(async (db) => {
    const users = await db.select().from(reminders);

    // delete
    users.forEach(async (user) => {
        await db.delete(reminders).where(eq(reminders.id, user.id));
    });
});

setInterval(async () => {}, 60000);

export default {
    ...app,
    port: values.port,
};
