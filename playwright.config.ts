import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Manual .env loading from variables.env to avoid potential native/package issues
try {
    const envPath = path.resolve(__dirname, 'variables.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach((line: string) => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    }
} catch (e) {
    console.error('Error loading variables.env manually:', e);
}

// Remove environment variables that cause SyntaxError in regex-based secret masking
delete process.env.JAVA_HOME;
delete process.env.NO_PROXY;

export default defineConfig({
    testDir: './',
    timeout: 60 * 1000,
    expect: {
        timeout: 10000
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [
        ['list'],
        ['html'],
        ['allure-playwright', { outputFolder: 'allure-results' }]
    ],
    use: {
        actionTimeout: 0,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'CEC-BI',
            testDir: './CEC_BI/tests',
            use: { 
                ...devices['Desktop Chrome'],
                channel: 'chrome'
            },
        },
        {
            name: 'MOJITO-BI',
            testDir: './MOJITO_BI/tests',
            use: { 
                ...devices['Desktop Chrome'],
                channel: 'chrome'
            },
        },
    ],
});
