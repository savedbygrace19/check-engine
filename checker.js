'use strict';

const colors = require('colors');
const exec = require('child_process').exec;
const engines = require('./package.json').engines;
const Promise = require("bluebird");
const validaterRules = require('./validatorRules.js')

// set theme
colors.setTheme({
    success: 'green',
    info: 'grey',
    warn: 'yellow',
    error: 'red'
});

if (!engines) {
    console.log("No engines found in package.json");
    process.exit(-1);
}

let environmentValid = true;
const numberOfValidations = Object.keys(engines).length;
const thingsToCheck = Object.getOwnPropertyNames(engines);
var validators = thingsToCheck.map(validate); // run the function over all items.

Promise.all(validators.map(function(promise) {
    return promise.reflect();
})).each(function(inspection) {
    if (inspection.isFulfilled()) {
        if (!inspection.value()) {
            environmentValid = false;
        }
    } else {
        environmentValid = false;
    }
}).then(() => {
    if (environmentValid) {
        console.log(colors.success(colors.bold(colors.underline("Environment looks good!"))));
    } else {
        console.log(colors.error(colors.bold(colors.underline("Environment is invalid!"))));
    }
});

function validate(name) {

    //find it in the validators
    const validator = validaterRules[name];

    if (validator === undefined) {
        console.log(colors.warn(colors.bold(name) + " was expected, but no validator found!"))
        return Promise.resolve(false);
    }

    //call the validator and pass in the version we expect
    return execAndCheck(validator, engines[name]).then((results) => {
        if (results.result) {
            console.log(colors.success("✔ " + colors.bold(name) + " was validated with " + engines[name]));
        } else {
            console.log(colors.error("✘ " + colors.bold(name) + " version is not correct! Expected: " +
                engines[name] + " but was " + results.reason.trim()));
        }

        return Promise.resolve(results.result);
    })
    .catch((error) => {
        console.log(colors.error("✘ Error validating " + colors.bold(name)) + ": " + error.trim());
        return Promise.reject();
    })
}

function execAndCheck(validator, expectedVersion) {

    let promise = new Promise((resolve, reject) => {

        exec(validator.versionCheck, (error, stdout, stderr) => {

            if (error) {
                reject(stderr);
            }

            resolve({
                result: validator.versionValidate(stdout, expectedVersion),
                reason: stdout
            });

        });
    });

    return promise;

};
