import { createReadStream, statSync } from 'fs';
import readline from 'readline';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

import { Counter, Registry, collectDefaultMetrics } from 'prom-client';

import { loadLastFilePosition, saveLastFilePosition } from './filePosition.js';

dotenv.config();

const SLOW_QUERY_LOG = process.env.LOG_PATH || '/var/log/mysql/mysql-slow.log';
const PUSHGATEWAY_URL = process.env.PUSHGATEWAY_URL;
const SERVER_INSTANCE = process.env.SERVER_INSTANCE || 'dev';

const QUERY_INFO = new Counter({
    name: 'mysql_slow_query_info',
    help: 'Info about slow queries',
    labelNames: ['query_time', 'query', 'database', 'server_instance']
});

const register = new Registry();
register.registerMetric(QUERY_INFO);

collectDefaultMetrics({ register });

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function pushMetrics() {
    try {
        const metrics = await register.metrics();

        const response = await fetch(`${PUSHGATEWAY_URL}/metrics/job/slow_query`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: metrics,
        });

        if (!response.ok) {
            console.error(`Failed to push metrics: ${response.statusText}`);
        } else {
            console.log('Metrics pushed successfully');
        }
    } catch (err) {
        console.log('Error in pushMetrics', err);
    }
}

export async function parseSlowQueryLog() {
    try {
        const now = new Date();
        const tenMinAgo = new Date(now - 10 * 60 * 1000).getTime() / 1000;

        const queryRegex = /^(SELECT|DELETE|ALTER|INSERT|UPDATE|CREATE|DROP|TRUNCATE|RENAME|GRANT|REVOKE)\s/i;

        let lastFilePosition = loadLastFilePosition();
        let fileStream;
        try {
            fileStream = createReadStream(SLOW_QUERY_LOG, { start: lastFilePosition });
        } catch (err) {
            console.error('Error opening file:', err);
            return;
        }

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let queryTime = '';
        let currentDatabase = '';

        fileStream.on('data', (chunk) => {
            lastFilePosition += chunk.length;
            saveLastFilePosition(lastFilePosition);
        });

        for await (const line of rl) {
            if (line.startsWith('#') && !line.includes('Query_time:') || !line.trim()) {
                continue;

            } else if (line.startsWith('use ')) {
                currentDatabase = line.split(' ')[1].replace(';', '');

            } else if (line.includes('timestamp=')) {
                const timestamp = parseInt(line.split('=')[1].replace(';', ''), 10);

                if (timestamp < tenMinAgo) {
                    queryTime = '';
                }

            } else if (line.includes('Query_time:')) {
                const match = line.match(/Query_time:\s*([\d.]+)/);

                if (match) {
                    queryTime = match[1];
                }

            } else if (queryTime !== '') {
                if (queryRegex.test(line)) {
                    QUERY_INFO.labels(queryTime, line, currentDatabase, SERVER_INSTANCE).inc(parseFloat(queryTime));
                    if (currentDatabase) {
                        currentDatabase = '';
                    }
                    await pushMetrics();
                    await delay(15000);
                    QUERY_INFO.reset();
                    await pushMetrics();
                }
            }
        }
    } catch (err) {
        console.log('Error in parseSlowQueryLog:', err);
        return;
    }
}
