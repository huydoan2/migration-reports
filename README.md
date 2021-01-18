# Migration Report

## Scenario:
Imagine that your team recently performed a data migration from one database
to another. One week after the migration it was discovered that there was a bug
in the migration process and some records were unintentionally missed or altered!
We want you to write a program that will identify the missing, corrupted, and
new records (since the migration) in the migrated data set.

## Input
Pre-migration and post-migration Postgres databases are provided in two docker containers.

`config.json` contains necessary information for the databases. They should have been kept as secrets but are still placed in the file for simplicity.

## Output
1. `corrupted-during-migration.json`: contains entries that are corrupted during the migration.
2. `missing-during-migration`: contains entries that exist in the pre-migration database but don't exist in the post-migration one.
3. `new-entries-after-migration.json`:  contains entries that exist in the post-migration database but don't exist in the pre-migration one.
