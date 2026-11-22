CREATE TABLE `request_evidence` (
	`request_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`media_type` text NOT NULL,
	`content` blob NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action
);
