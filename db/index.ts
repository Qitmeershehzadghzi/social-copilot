import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const sql = neon(process.env.DATABASE_URL)
export const db = drizzle(sql, { schema })

export type Database = typeof db
export type NewUser = typeof schema.users.$inferInsert
export type User = typeof schema.users.$inferSelect
export type NewPost = typeof schema.posts.$inferInsert
export type Post = typeof schema.posts.$inferSelect
export type NewConnectedAccount = typeof schema.connectedAccounts.$inferInsert
export type ConnectedAccount = typeof schema.connectedAccounts.$inferSelect