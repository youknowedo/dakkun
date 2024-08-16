import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";
import { Client } from "pg";

export const initDb = async () => {
    const client = new Client({
        host: process.env.DB_HOST,
        port: +(process.env.DB_PORT ?? 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: {
            rejectUnauthorized: false,
        },
    });
    await client.connect();
    return drizzle(client);
};
