const core = require('@actions/core');
const github = require('@actions/github');
const { spawn } = require('child_process');
const { createInterface }  = require('readline');
const path = require('path');
const picomatch = require('picomatch');
const { existsSync } = require('fs');

async function run() {
    try {
        const matches = picomatch('**.json');

        console.log(JSON.stringify(github.context.payload, undefined, 2));

        const diffProcess = spawn('git',
            [
                '--no-pager',
                'diff-tree',
                '--no-commit-id',
                '--name-status',
                '--diff-filter=d',
                '-r',
                `${github.context.payload.pull_request.base.sha}..`
            ],
            {
                windowsHide: true,
                timeout: 10000,
            }
        );

        const lines = createInterface({
            input: diffProcess.stdout,
        });

        const affectedFiles = {
            added: [],
            modified: [],
        };

        const matchersPath = path.join(__dirname, '.', '.github');

        console.log(
            `##[add-matcher]${path.join(matchersPath, 'jsonsniffer-matcher.json')}`
        );

        for await (const line of lines) {
            const parsed = /^(?<status>[ACMR])[\s\t]+(?<file>\S+)$/.exec(line);
            if (parsed.groups) {
                const { status, file } = parsed.groups;
                if (matches(file) && existsSync(file)) {
                    switch (status) {
                        case 'A':
                        case 'C':
                        case 'R':
                            affectedFiles.added.push(file);
                            break;
                        case 'M':
                            affectedFiles.modified.push(file);
                    }
                }
            }
        }

        if (affectedFiles.added.length === 0 && affectedFiles.modified.length === 0) {
            core.warning('Empty list of files, nothing to process!');

            return;
        }

        if (affectedFiles.added.length > 0) {
            for (const file of affectedFiles.added) {
                console.log('Checking file: ' + file);

                const validationProcess = spawn('jq',
                    [
                        '.',
                        file
                    ],
                    {
                        windowsHide: true,
                        timeout: 10000,
                    }
                ).on('exit', async (code) => {
                    console.log(`${path.relative(process.cwd(), file)}`);
                    console.log(
                        '  %s  %s',
                        'error',
                        'There was a problem parsing this JSON file',
                    );

                    if (code != 0) {
                        core.setFailed('There was a problem parsing JSON file: ' + file);
                    }
                });

            }
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();