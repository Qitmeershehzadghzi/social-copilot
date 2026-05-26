import { 
  pgTable, 
  text, 
  timestamp, 
  uuid, 
  varchar, 
  integer, 
  boolean, 
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const platformEnum = pgEnum('platform', ['twitter', 'linkedin', 'facebook', 'instagram', 'threads', 'tiktok', 'youtube', 'pinterest'])
export const postStatusEnum = pgEnum('post_status', ['draft', 'scheduled', 'published', 'failed'])
export const targetStatusEnum = pgEnum('target_status', ['pending', 'published', 'failed'])
export const mediaTypeEnum = pgEnum('media_type', ['image', 'video'])
export const triggerTypeEnum = pgEnum('trigger_type', ['keyword', 'any'])
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['free', 'pro', 'agency'])
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'past_due', 'unpaid'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  preferences: text('preferences'), // using text to store JSON since Drizzle pg-core jsonb might need specific imports depending on setup, but jsonb is better if available. Let me use text for now or jsonb.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Connected accounts table
export const connectedAccounts = pgTable('connected_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  platform: platformEnum('platform').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accountHandle: varchar('account_handle', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Posts table
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  status: postStatusEnum('status').default('draft').notNull(),
  scheduledAt: timestamp('scheduled_at'),
  scheduledEndAt: timestamp('scheduled_end_at'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Post targets table (for cross-posting to multiple platforms)
export const postTargets = pgTable('post_targets', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  platform: platformEnum('platform').notNull(),
  platformPostId: varchar('platform_post_id', { length: 255 }),
  status: targetStatusEnum('status').default('pending').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Media assets table
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  imagekitFileId: varchar('imagekit_file_id', { length: 255 }).notNull(),
  url: text('url').notNull(),
  type: mediaTypeEnum('type').notNull(),
  size: integer('size').notNull(), // size in bytes
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Auto-reply rules table
export const autoReplyRules = pgTable('auto_reply_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  triggerType: triggerTypeEnum('trigger_type').notNull(),
  keywords: text('keywords').array(), // array of keywords for keyword triggers
  promptTemplate: text('prompt_template').notNull(),
  connectedAccountIds: uuid('connected_account_ids').array().default([]).notNull(),
  platforms: platformEnum('platform').array().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Comment events table
export const commentEvents = pgTable('comment_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  ruleId: uuid('rule_id').references(() => autoReplyRules.id, { onDelete: 'cascade' }),
  connectedAccountId: uuid('connected_account_id').references(() => connectedAccounts.id, { onDelete: 'set null' }),
  externalCommentId: varchar('external_comment_id', { length: 255 }),
  platform: platformEnum('platform').notNull(),
  commentText: text('comment_text').notNull(),
  commentAuthor: varchar('comment_author', { length: 255 }).notNull(),
  replyText: text('reply_text'),
  status: targetStatusEnum('status').default('pending').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  clerkSubscriptionId: varchar('clerk_subscription_id', { length: 255 }).notNull().unique(),
  plan: subscriptionPlanEnum('plan').notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  connectedAccounts: many(connectedAccounts),
  posts: many(posts),
  mediaAssets: many(mediaAssets),
  autoReplyRules: many(autoReplyRules),
  subscription: many(subscriptions),
}))

export const connectedAccountsRelations = relations(connectedAccounts, ({ one }) => ({
  user: one(users, {
    fields: [connectedAccounts.userId],
    references: [users.id],
  }),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  targets: many(postTargets),
  mediaAssets: many(mediaAssets),
}))

export const postTargetsRelations = relations(postTargets, ({ one }) => ({
  post: one(posts, {
    fields: [postTargets.postId],
    references: [posts.id],
  }),
}))

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  post: one(posts, {
    fields: [mediaAssets.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [mediaAssets.userId],
    references: [users.id],
  }),
}))

export const autoReplyRulesRelations = relations(autoReplyRules, ({ one, many }) => ({
  user: one(users, {
    fields: [autoReplyRules.userId],
    references: [users.id],
  }),
  commentEvents: many(commentEvents),
}))

export const commentEventsRelations = relations(commentEvents, ({ one }) => ({
  rule: one(autoReplyRules, {
    fields: [commentEvents.ruleId],
    references: [autoReplyRules.id],
  }),
  connectedAccount: one(connectedAccounts, {
    fields: [commentEvents.connectedAccountId],
    references: [connectedAccounts.id],
  }),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}))
