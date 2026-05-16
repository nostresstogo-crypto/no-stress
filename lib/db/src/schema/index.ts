import { pgTable, text, serial, timestamp, integer, doublePrecision, jsonb, uniqueIndex, smallint } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  gender: text("gender"),
  phone: text("phone"),
  country: text("country"),
  role: text("role").notNull().default("user"),
  status: text("status").notNull().default("active"),
  statusReason: text("status_reason"),
  statusUntil: timestamp("status_until"),
  profileImage: text("profile_image"),
  emailVerified: timestamp("email_verified"),
  verificationCode: text("verification_code"),
  verificationCodeExpires: timestamp("verification_code_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const partnersTable = pgTable("partners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  contactName: text("contact_name").notNull(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  description: text("description"),
  websiteUrl: text("website_url"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  statusReason: text("status_reason"),
  statusUntil: timestamp("status_until"),
  profileImage: text("profile_image"),
  emailVerified: timestamp("email_verified"),
  verificationCode: text("verification_code"),
  verificationCodeExpires: timestamp("verification_code_expires"),
  subscriptionUntil: timestamp("subscription_until"),
  subscriptionStart: timestamp("subscription_start"),
  subscriptionWarningSentAt: timestamp("subscription_warning_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPartnerSchema = createInsertSchema(partnersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  rejectionReason: true,
  userId: true,
  subscriptionUntil: true,
});
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Partner = typeof partnersTable.$inferSelect;

export const deletionRequestsTable = pgTable(
  "deletion_requests",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    accountType: text("account_type").notNull(),
    reason: text("reason"),
    status: text("status").notNull().default("pending"),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    partnerId: integer("partner_id").references(() => partnersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pendingEmailUnique: uniqueIndex("deletion_requests_pending_email_unique")
      .on(t.email)
      .where(sql`status = 'pending'`),
  }),
);

export const insertDeletionRequestSchema = createInsertSchema(deletionRequestsTable).omit({
  id: true,
  createdAt: true,
  status: true,
  userId: true,
  partnerId: true,
});
export type InsertDeletionRequest = z.infer<typeof insertDeletionRequestSchema>;
export type DeletionRequest = typeof deletionRequestsTable.$inferSelect;

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  replacedById: integer("replaced_by_id"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminsTable = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  role: text("role").notNull().default("superadmin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partnersTable.id, { onDelete: "cascade" }),
  venueId: integer("venue_id"),
  title: text("title").notNull(),
  titleFr: text("title_fr"),
  description: text("description"),
  descriptionFr: text("description_fr"),
  date: text("date").notNull(),
  time: text("time"),
  venue: text("venue"),
  city: text("city"),
  category: text("category"),
  imageUrl: text("image_url"),
  images: jsonb("images"),
  price: integer("price"),
  currency: text("currency").default("FCFA"),
  status: text("status").notNull().default("pending"),
  ticketTypes: jsonb("ticket_types"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Event = typeof eventsTable.$inferSelect;
export type InsertEvent = typeof eventsTable.$inferInsert;

export const registrationLogTable = pgTable("registration_log", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export const venuesTable = pgTable("venues", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partnersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type"),
  city: text("city").notNull(),
  country: text("country"),
  address: text("address"),
  description: text("description"),
  imageUrl: text("image_url"),
  images: jsonb("images"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  openingTime: text("opening_time"),
  closingTime: text("closing_time"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Venue = typeof venuesTable.$inferSelect;
export type InsertVenue = typeof venuesTable.$inferInsert;

export const venueSpecialtiesTable = pgTable("venue_specialties", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").notNull().references(() => venuesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  price: integer("price"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VenueSpecialty = typeof venueSpecialtiesTable.$inferSelect;
export type InsertVenueSpecialty = typeof venueSpecialtiesTable.$inferInsert;

export const favoritesTable = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  itemId: integer("item_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqUserItem: uniqueIndex("favorites_user_item_unique").on(t.userId, t.itemType, t.itemId),
}));

export type Favorite = typeof favoritesTable.$inferSelect;
export type InsertFavorite = typeof favoritesTable.$inferInsert;

export const pushTokensTable = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  platform: text("platform"),
  city: text("city"),
  favoriteCategories: jsonb("favorite_categories"),
  language: text("language").default("fr"),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  partnerId: integer("partner_id").references(() => partnersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PushToken = typeof pushTokensTable.$inferSelect;
export type InsertPushToken = typeof pushTokensTable.$inferInsert;

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  itemType: text("item_type").notNull(), // 'event' | 'venue'
  itemId: integer("item_id").notNull(),
  reporterUserId: integer("reporter_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  reporterEmail: text("reporter_email"),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'reviewed' | 'dismissed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Report = typeof reportsTable.$inferSelect;
export type InsertReport = typeof reportsTable.$inferInsert;

export const contactMessagesTable = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Configuration tables ─────────────────────────────────────────────────────

export const countriesTable = pgTable("countries", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🌍"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Country = typeof countriesTable.$inferSelect;
export type InsertCountry = typeof countriesTable.$inferInsert;

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  countryId: integer("country_id").notNull().references(() => countriesTable.id, { onDelete: "restrict" }),
  emoji: text("emoji").notNull().default("🏙️"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("cities_name_country_unique").on(t.name, t.countryId)]);

export type City = typeof citiesTable.$inferSelect;
export type InsertCity = typeof citiesTable.$inferInsert;

export const eventCategoriesTable = pgTable("event_categories", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  labelFr: text("label_fr").notNull(),
  labelEn: text("label_en").notNull(),
  icon: text("icon").notNull().default("calendar"),
  color: text("color").notNull().default("#9B8FE8"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EventCategory = typeof eventCategoriesTable.$inferSelect;
export type InsertEventCategory = typeof eventCategoriesTable.$inferInsert;

export const venueTypesTable = pgTable("venue_types", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  labelFr: text("label_fr").notNull(),
  labelEn: text("label_en").notNull(),
  icon: text("icon").notNull().default("business"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VenueType = typeof venueTypesTable.$inferSelect;
export type InsertVenueType = typeof venueTypesTable.$inferInsert;

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  partnerId: integer("partner_id").references(() => partnersTable.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  itemId: integer("item_id").notNull(),
  rating: smallint("rating").notNull(),
  comment: text("comment"),
  status: text("status").notNull().default("pending"),
  adminId: integer("admin_id").references(() => adminsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("reviews_user_item_unique")
    .on(t.itemType, t.itemId, t.userId)
    .where(sql`user_id IS NOT NULL`),
  uniqueIndex("reviews_partner_item_unique")
    .on(t.itemType, t.itemId, t.partnerId)
    .where(sql`partner_id IS NOT NULL`),
]);

export type Review = typeof reviewsTable.$inferSelect;
export type InsertReview = typeof reviewsTable.$inferInsert;

export * from "./conversations";
export * from "./messages";