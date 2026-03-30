CREATE TABLE `card_progress` (
	`user_id` bigint unsigned NOT NULL,
	`card_id` bigint unsigned NOT NULL,
	`status` enum('not_started','learning','learned') NOT NULL DEFAULT 'not_started',
	`step` tinyint unsigned NOT NULL DEFAULT 0,
	`first_shown_at` datetime(3),
	`next_due_at` datetime(3),
	`last_review_at` datetime(3),
	`last_result` enum('know','dont_know'),
	CONSTRAINT `card_progress_user_id_card_id_pk` PRIMARY KEY(`user_id`,`card_id`)
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`deck_id` bigint unsigned NOT NULL,
	`hanzi` varchar(64) NOT NULL,
	`pinyin` varchar(255) NOT NULL,
	`meaning` varchar(1024) NOT NULL,
	`example` varchar(2048) NOT NULL,
	`notes` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decks` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`name` varchar(512) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `decks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `card_progress` ADD CONSTRAINT `card_progress_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `card_progress` ADD CONSTRAINT `card_progress_card_id_cards_id_fk` FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cards` ADD CONSTRAINT `cards_deck_id_decks_id_fk` FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `decks` ADD CONSTRAINT `decks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `card_progress_user_next_due_idx` ON `card_progress` (`user_id`,`next_due_at`);