CREATE TABLE `data_fix_log` (
	`id` text PRIMARY KEY NOT NULL,
	`fix` text NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`field` text NOT NULL,
	`before` text,
	`after` text,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `data_fix_log_fix` ON `data_fix_log` (`fix`,`row_id`);