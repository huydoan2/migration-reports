const expect = require('chai').expect;
const { Client } = require('pg');
const fs = require('fs');
const report = require('../src/report');
const config = require('../config.json');

describe('Test solution', function () {
    this.timeout(0);
    const reportPromise = report();

    it('Test output files', async function () {
        try {

            await reportPromise;

            const fileList = [
                './corrupted-during-migration.json',
                './missing-during-migration.json',
                './new-entries-after-migration.json'
            ];

            fileList.forEach(path => {
                const fileExist = fs.existsSync(path);
                console.log(`${path}: ${fileExist}`);
                expect(fileExist).to.equal(true);
            });

            console.log('Finish testing output files.');

        } catch (error) {
            console.log('Error testing output files');
            throw error;
        }
    });

    it('Test old database preservation', async function () {
        const oldClient = new Client(config.oldDb);
        try {
            await reportPromise;

            await oldClient.connect();
            const query = `
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public';
            `;

            const result = await oldClient.query(query);
            expect(parseInt(result.rows[0].count, 10)).to.equal(1);

        } catch (error) {
            console.log('Error testing output files');
            throw error;
        } finally {
            await oldClient.end()
        }
    })
})
