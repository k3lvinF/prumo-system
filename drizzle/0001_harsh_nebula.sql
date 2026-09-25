CREATE TABLE `request_limits` (
	`owner` text NOT NULL,
	`bucket` integer NOT NULL,
	`hits` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `request_limits_owner_bucket` ON `request_limits` (`owner`,`bucket`);--> statement-breakpoint
CREATE TABLE `system_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event` text NOT NULL,
	`affected` integer NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO system_events(id,event,affected,at) SELECT 'reset-before-real-data-2026-09-11','User-authorized reset of all test productions',COUNT(*),strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM productions;
--> statement-breakpoint
DELETE FROM productions;
