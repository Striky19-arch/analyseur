CREATE TABLE `rate_limit_hits` (
	`key` text NOT NULL,
	`hit_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_hits_key_hit_at_idx` ON `rate_limit_hits` (`key`,`hit_at`);