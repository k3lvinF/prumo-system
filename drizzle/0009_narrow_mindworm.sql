CREATE TABLE `account_identities` (
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`account_id` text NOT NULL,
	PRIMARY KEY(`kind`, `value`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_identities_account` ON `account_identities` (`account_id`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `equipment_owner` ON `equipment` (`owner`,`archived`,`updated`);--> statement-breakpoint
CREATE TABLE `production_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`production_id` text NOT NULL,
	`owner` text NOT NULL,
	`at` text NOT NULL,
	`account` text NOT NULL,
	`operator` text NOT NULL,
	`action` text NOT NULL,
	`reason` text,
	`changes` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `production_audit_prod` ON `production_audit` (`production_id`,`at`);--> statement-breakpoint
CREATE TABLE `production_entries` (
	`id` text NOT NULL,
	`production_id` text NOT NULL,
	`owner` text NOT NULL,
	`prep_id` text,
	`work_id` text,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`cancelled` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`production_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `production_entries_prod` ON `production_entries` (`production_id`,`id`);--> statement-breakpoint
CREATE TABLE `technical_sheet_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`sheet_id` text NOT NULL,
	`owner` text NOT NULL,
	`revision` integer NOT NULL,
	`data` text NOT NULL,
	`at` text NOT NULL,
	`account` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `technical_sheet_revisions_sheet_revision` ON `technical_sheet_revisions` (`sheet_id`,`revision`);--> statement-breakpoint
CREATE INDEX `technical_sheet_revisions_owner` ON `technical_sheet_revisions` (`owner`,`sheet_id`,`revision`);--> statement-breakpoint
CREATE TABLE `technical_sheets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'Preparo' NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `technical_sheets_owner` ON `technical_sheets` (`owner`,`archived`,`updated`);--> statement-breakpoint
ALTER TABLE `productions` ADD `operator` text;--> statement-breakpoint
ALTER TABLE `productions` ADD `started_at` text;--> statement-breakpoint
ALTER TABLE `productions` ADD `finished_at` text;--> statement-breakpoint
ALTER TABLE `productions` ADD `complete` integer;--> statement-breakpoint
ALTER TABLE `productions` ADD `item_count` integer;--> statement-breakpoint
ALTER TABLE `productions` ADD `summary_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `productions` ADD `storage` integer DEFAULT 1 NOT NULL;