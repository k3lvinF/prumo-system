CREATE TABLE `hour_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`period` text NOT NULL,
	`old_end` integer NOT NULL,
	`new_end` integer NOT NULL,
	`reason` text NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`period`) REFERENCES `hour_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `hour_revisions_owner_period` ON `hour_revisions` (`owner`,`period`);