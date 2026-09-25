CREATE TABLE `hour_active` (
	`owner` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	FOREIGN KEY (`period`) REFERENCES `hour_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hour_archives` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`month` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`at` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hour_archives_owner_month` ON `hour_archives` (`owner`,`month`);--> statement-breakpoint
CREATE TABLE `hour_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`period` text NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`hash` text NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`period`) REFERENCES `hour_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `hour_evidence_owner_period` ON `hour_evidence` (`owner`,`period`);--> statement-breakpoint
CREATE TABLE `hour_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`activity` text NOT NULL,
	`production` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer,
	`rate` integer NOT NULL,
	`reviewed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hour_periods_owner_start` ON `hour_periods` (`owner`,`start`);--> statement-breakpoint
CREATE TABLE `hour_settings` (
	`owner` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
