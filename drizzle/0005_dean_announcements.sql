CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`submission_key` text NOT NULL,
	`audience` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`published_at` text NOT NULL,
	`withdrawn_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `announcements_author_key` ON `announcements` (`author_id`,`submission_key`);--> statement-breakpoint
CREATE INDEX `announcements_by_audience` ON `announcements` (`audience`,`withdrawn_at`,`published_at`);