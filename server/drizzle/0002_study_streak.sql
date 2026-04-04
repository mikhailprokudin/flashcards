ALTER TABLE `users`
  ADD `study_streak_current` int unsigned NOT NULL DEFAULT 0,
  ADD `study_streak_last_date` date NULL,
  ADD `study_streak_best` int unsigned NOT NULL DEFAULT 0;
