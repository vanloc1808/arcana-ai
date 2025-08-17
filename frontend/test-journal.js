#!/usr/bin/env node
/**
 * Test runner for Journal feature frontend tests
 * Run this to execute all journal-related frontend tests
 */

const { spawn } = require('child_process');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args, description) {
    return new Promise((resolve) => {
        console.log('\n' + '='.repeat(60));
        log('cyan', `🧪 ${description}`);
        console.log('='.repeat(60));

        const child = spawn(command, args, {
            cwd: __dirname,
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) {
                log('green', `✅ SUCCESS: ${description}`);
                resolve(true);
            } else {
                log('red', `❌ FAILED: ${description}`);
                resolve(false);
            }
        });

        child.on('error', (error) => {
            log('red', `❌ EXCEPTION: ${description}`);
            console.error('Error:', error.message);
            resolve(false);
        });
    });
}

async function main() {
    log('blue', '🚀 Running Journal Feature Frontend Tests');
    console.log('='.repeat(60));

    let testsPasssed = 0;
    let testsFailed = 0;

    const testConfigs = [
        {
            command: 'npm',
            args: ['test', '--', '--testPathPattern=JournalEntry.test.tsx', '--verbose'],
            description: 'Journal Entry Component Tests'
        },
        {
            command: 'npm',
            args: ['test', '--', '--testPathPattern=AnalyticsDashboard.test.tsx', '--verbose'],
            description: 'Analytics Dashboard Component Tests'
        },
        {
            command: 'npm',
            args: ['test', '--', '--testPathPattern=useJournal.test.tsx', '--verbose'],
            description: 'useJournal Hook Tests'
        },
        {
            command: 'npm',
            args: ['test', '--', '--testPathPattern=journal', '--coverage', '--watchAll=false'],
            description: 'All Journal Tests with Coverage'
        },
        {
            command: 'npm',
            args: ['test', '--', '--testPathPattern=journal', '--watchAll=false', '--updateSnapshot'],
            description: 'Update Journal Test Snapshots'
        }
    ];

    // Run each test configuration
    for (const config of testConfigs) {
        const success = await runCommand(config.command, config.args, config.description);
        if (success) {
            testsPasssed++;
        } else {
            testsFailed++;
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    log('magenta', '📊 TEST SUMMARY');
    console.log('='.repeat(60));
    log('green', `✅ Passed: ${testsPasssed}`);
    log('red', `❌ Failed: ${testsFailed}`);
    log('blue', `📈 Total: ${testsPasssed + testsFailed}`);

    if (testsFailed === 0) {
        log('green', '\n🎉 All journal frontend tests passed!');
        process.exit(0);
    } else {
        log('yellow', `\n⚠️  ${testsFailed} test group(s) failed. Check output above.`);
        process.exit(1);
    }
}

// Additional test commands for development
if (process.argv.includes('--watch')) {
    log('yellow', '👀 Running tests in watch mode...');
    runCommand('npm', ['test', '--', '--testPathPattern=journal', '--watch'], 'Journal Tests (Watch Mode)');
} else if (process.argv.includes('--debug')) {
    log('yellow', '🐛 Running tests in debug mode...');
    runCommand('npm', ['test', '--', '--testPathPattern=journal', '--watchAll=false', '--verbose', '--no-coverage'], 'Journal Tests (Debug Mode)');
} else {
    main().catch(console.error);
}
