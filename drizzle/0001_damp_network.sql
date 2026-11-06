CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`service` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `requests` ADD `topic` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `requests` ADD `message` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `requests` ADD `department` text DEFAULT '' NOT NULL;