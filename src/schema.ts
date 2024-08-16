import { pgTable, text } from "drizzle-orm/pg-core";

export const reminders = pgTable("reminders", {
    id: text("id").primaryKey(),
});
