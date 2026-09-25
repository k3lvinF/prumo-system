CREATE TABLE `hour_manual` (
	`period` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`period`) REFERENCES `hour_periods`(`id`) ON UPDATE no action ON DELETE no action
);
