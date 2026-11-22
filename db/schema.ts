import {
  sqliteTable,
  text,
  integer,
  blob,
  uniqueIndex,
  index,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  login: text("login").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  name: text("name").notNull(),
  faculty: text("faculty").notNull(),
  program: text("program").notNull(),
  course: integer("course").notNull(),
  group: text("student_group").notNull(),
  timetableGroup: text("timetable_group"),
  languageStream: text("language_stream"),
  latinName: text("latin_name").notNull(),
  email: text("email").notNull(),
  grades: text("grades").notNull(),
});
export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at").notNull(),
});
export const requests = sqliteTable(
  "requests",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    service: text("service").notNull(),
    format: text("format").notNull(),
    organization: text("organization").notNull(),
    latinName: text("latin_name").notNull(),
    phone: text("phone").notNull(),
    recipient: text("recipient").notNull(),
    representative: text("representative").notNull(),
    topic: text("topic").notNull().default(""),
    message: text("message").notNull().default(""),
    department: text("department").notNull().default(""),
    relatedRequestId: text("related_request_id").references(
      (): AnySQLiteColumn => requests.id,
    ),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
    dueAt: text("due_at").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
  },
  (t) => [uniqueIndex("requests_owner_key").on(t.ownerId, t.idempotencyKey)],
);
export const events = sqliteTable("request_events", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => requests.id),
  status: text("status").notNull(),
  comment: text("comment").notNull(),
  createdAt: text("created_at").notNull(),
});
export const documentArtifacts = sqliteTable("document_artifacts", {
  requestId: text("request_id")
    .primaryKey()
    .references(() => requests.id),
  preparedAt: text("prepared_at").notNull(),
  pdf: blob("pdf").notNull(),
  signature: blob("signature").notNull(),
  pdfDigest: text("pdf_digest").notNull(),
  signatureDigest: text("signature_digest").notNull(),
});
export const requestEvidence = sqliteTable("request_evidence", {
  requestId: text("request_id")
    .primaryKey()
    .references(() => requests.id),
  name: text("name").notNull(),
  mediaType: text("media_type").notNull(),
  content: blob("content").notNull(),
});
export const reads = sqliteTable("notification_reads", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  noticeId: text("notice_id").notNull(),
});
export const attempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  until: integer("until").notNull(),
});
export const favorites = sqliteTable("favorites", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  service: text("service").notNull(),
});

export const announcements = sqliteTable("announcements", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => users.id),
  submissionKey: text("submission_key").notNull(),
  audience: text("audience").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  publishedAt: text("published_at").notNull(),
  withdrawnAt: text("withdrawn_at"),
}, (t) => [
  uniqueIndex("announcements_author_key").on(t.authorId, t.submissionKey),
  index("announcements_by_audience").on(t.audience, t.withdrawnAt, t.publishedAt),
]);
