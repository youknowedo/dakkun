import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { drizzle, web } from ".";
import { reminders } from "./schema";
import { checkIsDown, isDown } from "./utils";

export const app = new Hono();

app.post("/dakkuun/down", async (c) => {
    return c.text(
        (await checkIsDown()) ? "down, hakkuun is!" : "up, hakkuun is!"
    );
});

app.post("/dakkuun/remind", async (c) => {
    if (!isDown) return c.text("up, hakkuun is!");

    const db = await drizzle;

    const userId = (await c.req.formData()).get("user_id")?.toString();
    if (!userId)
        return c.text("hmmm. no user id, i found. message Sigfredo, you must.");

    const user = (
        await db.select().from(reminders).where(eq(reminders.id, userId))
    )[0];
    if (user) return c.text("remind you, i already will");

    await db.insert(reminders).values({
        id: userId,
    });

    return c.text("remind you, i will");
});
