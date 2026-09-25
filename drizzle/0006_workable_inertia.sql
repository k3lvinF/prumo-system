CREATE TABLE `hour_goals` (
	`owner` text NOT NULL,
	`month` text NOT NULL,
	`cents` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hour_goals_owner_month` ON `hour_goals` (`owner`,`month`);--> statement-breakpoint
ALTER TABLE `hour_manual` ADD `pause` integer;--> statement-breakpoint
ALTER TABLE `hour_manual` ADD `resume` integer;--> statement-breakpoint
ALTER TABLE `hour_manual` ADD `result` text DEFAULT '' NOT NULL;