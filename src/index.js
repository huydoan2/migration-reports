const report = require('./report');

report()
    .then(() => {
        console.log('Finish generating reports');
    });