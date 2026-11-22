CREATE TABLE `document_artifacts` (
	`request_id` text PRIMARY KEY NOT NULL,
	`prepared_at` text NOT NULL,
	`pdf` blob NOT NULL,
	`signature` blob NOT NULL,
	`pdf_digest` text NOT NULL,
	`signature_digest` text NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action
);
