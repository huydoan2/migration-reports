/***
 * Assummptions:
 * 1. All data fits in memory
 * 2. Database provider allows big JOIN
 *   
***/

const { Pool, Client } = require('pg');
const fs = require('fs');
const keyBy = require('lodash/keyBy');
const config = require('./config.json');

const oldClient = new Client(config.oldDb);
const newClient = new Client(config.newDb);

async function init() {
  await oldClient
    .connect()
    .then(() => console.log('connected to Old DB'))
    .catch(err => console.error('Cannot connect to Old DB', err.stack));

  await newClient
    .connect()
    .then(() => console.log('connected to New DB'))
    .catch(err => console.error('Cannot connect to New DB', err.stack));
}

async function cleanUp(dropTable) {
  if (dropTable) {
    await oldClient.query(`DROP TABLE ${dropTable}`);
  }

  await oldClient
    .end()
    .then(() => console.log('Disconnected to Old DB'))
    .catch(err => console.error('Error disconnecting to Old DB', err.stack));


  await newClient
    .end()
    .then(() => console.log('Disconnected to New DB'))
    .catch(err => console.error('Error disconnecting to New DB', err.stack));
}

async function main() {
  const newTableName = `accounts_new_${Date.now()}`;

  try {
    await init();

    let temp;
    let query;

    // Clone New DB data to the old database instance
    await oldClient.query(`CREATE TABLE ${newTableName}
    (
      id text COLLATE pg_catalog."default" NOT NULL,
      name text COLLATE pg_catalog."default" NOT NULL,
      email text COLLATE pg_catalog."default" NOT NULL,
      CONSTRAINT ${newTableName}_pkey PRIMARY KEY (id),
      CONSTRAINT ${newTableName}_email_key UNIQUE (email)
      )`);


    // Get New DB data
    temp = await newClient.query('SELECT * FROM accounts');
    const { rows: newData } = temp;
    query = `INSERT INTO ${newTableName} (id, name, email) VALUES ${newData.map(v => `('${v.id}', '${v.name}', '${v.email}')`).join(',')}`

    await oldClient.query(query);


    // Look for missing entries in new data
    query = `
    SELECT  old.*
    FROM    accounts old
    WHERE   NOT EXISTS
            (
            SELECT  NULL
            FROM    ${newTableName} new
            WHERE   new.id = old.id
            )
    `
    temp = await oldClient.query(query)
    fs.writeFile('missing-during-migration.json', JSON.stringify(temp.rows, null, 2), (err) => console.log(err));


    // Look for new entries in new data
    query = `
    SELECT  new.*
    FROM    ${newTableName} new
    WHERE   NOT EXISTS
            (
            SELECT  NULL
            FROM    accounts old
            WHERE   old.id = new.id
            )
    `
    temp = await oldClient.query(query)
    fs.writeFile('new-entries-after-migration.json', JSON.stringify(temp.rows, null, 2), (err) => console.log(err));

    // Look for corrupted data during migration
    query = `
    SELECT old.id, old.name as OldName, old.email as OldEmail, new.name as NewName, new.email as NewEmail
    FROM accounts old JOIN ${newTableName} new
    ON old.id = new.id
    WHERE old.name != new.name OR old.email != new.email
    `

    temp = await oldClient.query(query)
    fs.writeFile('corrupted-during-migration.json', JSON.stringify(temp.rows, null, 2), (err) => console.log(err));
  } catch (error) {
    console.log('Encountered error during execution', error);
  } finally {
    await cleanUp(newTableName);
  }

}

// invoke main function
main();