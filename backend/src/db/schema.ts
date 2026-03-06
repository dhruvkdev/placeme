import { boolean, integer, numeric, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

export const studentStateEnum = pgEnum("student_state", [
    "REGISTERED",
    "PROFILE_COMPLETED",
    "PENDING_VERIFICATION",
    "VERIFIED",
    "REJECTED",
    "PLACED"
]);

export const jobStateEnum = pgEnum("job_state", [
    "DRAFT",
    "SUBMITTED",
    "APPROVED",
    "PUBLISHED",
    "CLOSED",
    "ARCHIVED"
]);

export const applicationStateEnum = pgEnum("application_state", [
    "APPLIED",
    "SHORTLISTED",
    "INTERVIEW_SCHEDULED",
    "INTERVIEWED",
    "HR_ROUND",
    "OFFERED",
    "ACCEPTED",
    "REJECTED"
]);

export const userRoleEnum = pgEnum("user_role", [
    "STUDENT",
    "RECRUITER",
    "TNP",
    "ADMIN"
]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
});

export const colleges = pgTable("colleges", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow()
});

export const collegeDomains = pgTable("college_domains", {
    id: uuid("id").defaultRandom().primaryKey(),
    collegeId: uuid("college_id")
        .references(() => colleges.id, { onDelete: 'cascade' })
        .notNull(),
    domain: text("domain").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow()
});

export const students = pgTable("students", {
    id: uuid("id")
        .primaryKey()
        .references(() => users.id),

    collegeId: uuid("college_id")
        .references(() => colleges.id)
        .notNull(),

    cgpa: numeric("cgpa", { precision: 3, scale: 2 }),
    branch: text("branch"),
    graduationYear: integer("graduation_year"),

    state: studentStateEnum("state")
        .default("REGISTERED")
        .notNull(),

    verifiedBy: uuid("verified_by"),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow()
});

export const tnpProfiles = pgTable("tnp_profiles", {
    id: uuid("id")
        .primaryKey()
        .references(() => users.id),

    collegeId: uuid("college_id")
        .references(() => colleges.id),

    createdAt: timestamp("created_at").defaultNow()
});

export const invitations = pgTable("invitations", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    role: userRoleEnum("role").notNull(), // To invite either TNP or RECRUITER
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    isUsed: boolean("is_used").default(false).notNull(),
    invitedBy: uuid("invited_by").references(() => users.id), // The Admin who sent it
    createdAt: timestamp("created_at").defaultNow()
});

export const companies = pgTable("companies", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    website: text("website"),
    createdAt: timestamp("created_at").defaultNow()
});

export const companyDomains = pgTable("company_domains", {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
        .references(() => companies.id, { onDelete: 'cascade' })
        .notNull(),
    domain: text("domain").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow()
});

export const recruiters = pgTable("recruiters", {
    id: uuid("id")
        .primaryKey()
        .references(() => users.id),

    companyId: uuid("company_id")
        .references(() => companies.id)
        .notNull(),

    verified: boolean("verified").default(false),
    createdAt: timestamp("created_at").defaultNow()
});

export const jobs = pgTable("jobs", {
    id: uuid("id").defaultRandom().primaryKey(),

    recruiterId: uuid("recruiter_id")
        .references(() => recruiters.id),

    title: text("title").notNull(),
    description: text("description").notNull(),

    minCgpa: numeric("min_cgpa", { precision: 3, scale: 2 }),
    location: text("location"),

    state: jobStateEnum("state")
        .default("DRAFT")
        .notNull(),

    createdAt: timestamp("created_at").defaultNow()
});

export const applications = pgTable("applications", {
    id: uuid("id").defaultRandom().primaryKey(),

    jobId: uuid("job_id")
        .references(() => jobs.id)
        .notNull(),

    studentId: uuid("student_id")
        .references(() => students.id)
        .notNull(),

    state: applicationStateEnum("state")
        .default("APPLIED")
        .notNull(),

    appliedAt: timestamp("applied_at").defaultNow()
}, (table) => [
    unique("unique_application").on(table.jobId, table.studentId)
]);

export const interviews = pgTable("interviews", {
    id: uuid("id").defaultRandom().primaryKey(),

    applicationId: uuid("application_id")
        .references(() => applications.id)
        .notNull(),

    scheduledAt: timestamp("scheduled_at").notNull(),
    mode: text("mode"), // online/offline
    meetingLink: text("meeting_link"),

    createdAt: timestamp("created_at").defaultNow()
});

export const studentStateLogs = pgTable("student_state_logs", {
    id: uuid("id").defaultRandom().primaryKey(),

    studentId: uuid("student_id")
        .references(() => students.id)
        .notNull(),

    oldState: studentStateEnum("old_state").notNull(),
    newState: studentStateEnum("new_state").notNull(),

    changedBy: uuid("changed_by")
        .references(() => users.id)
        .notNull(),

    changedAt: timestamp("changed_at").defaultNow()
});

export const applicationStateLogs = pgTable("application_state_logs", {
    id: uuid("id").defaultRandom().primaryKey(),

    applicationId: uuid("application_id")
        .references(() => applications.id)
        .notNull(),

    oldState: applicationStateEnum("old_state").notNull(),
    newState: applicationStateEnum("new_state").notNull(),

    changedBy: uuid("changed_by")
        .references(() => users.id)
        .notNull(),

    changedAt: timestamp("changed_at").defaultNow()
});

export const notifications = pgTable("notifications", {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),

    type: text("type").notNull(),
    message: text("message").notNull(),

    read: boolean("read").default(false),
    createdAt: timestamp("created_at").defaultNow()
});

export const emailOtps = pgTable("email_otps", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    otp: text("otp").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    isUsed: boolean("is_used").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow()
});