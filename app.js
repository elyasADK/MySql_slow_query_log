import fs from 'fs';
import readline from 'readline';
import fetch from 'node-fetch';
import { setInterval } from 'timers';
import dotenv from 'dotenv';

import { collectDefaultMetrics } from 'prom-client';
import { Counter, Registry } from 'prom-client';

dotenv.config();

const SLOW_QUERY_LOG = process.env.LOG_PATH || '/var/log/mysql/mysql-slow.log';
const PUSHGATEWAY_URL = process.env.PUSHGATEWAY_URL;
const SERVER_INSTANCE = process.env.SERVER_INSTANCE || 'dev';
const LAST_FILE_POSITION_PATH = './lfp_data/lastFilePosition';

const QUERY_INFO = new Counter({
    name: 'mysql_slow_query_info',
    help: 'Info about slow queries',
    labelNames: ['query_time', 'query', 'server_instance']
});

const register = new Registry();
register.registerMetric(QUERY_INFO);

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function saveLastFilePosition(position) {
    try {
        fs.writeFileSync(LAST_FILE_POSITION_PATH, position.toString());
    } catch (err) {
        console.error('Error saving last file position:', err);
    }
}

function loadLastFilePosition() {
    try {
        if (fs.existsSync(LAST_FILE_POSITION_PATH)) {
            const position = fs.readFileSync(LAST_FILE_POSITION_PATH, 'utf-8');
            return parseInt(position, 10);
        } else {
            fs.writeFileSync(LAST_FILE_POSITION_PATH, '0');
            return 0;
        }
    } catch (err) {
        console.error('Error loading last file position:', err);
    }
}

let lastFilePosition = loadLastFilePosition();

async function pushMetrics() {
    try {
        const metrics = await register.metrics();

        const response = await fetch(`${PUSHGATEWAY_URL}/metrics/job/slow_query_elyas`, {
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

async function parseSlowQueryLog() {
    try {
        const now = new Date();
        const tenMinAgo = new Date(now - 10000000 * 60 * 1000).getTime() / 1000;

        const queryRegex = /^(SELECT|DELETE|ALTER|INSERT|UPDATE)\s/i;

        let fileStream;
        try {
            fileStream = fs.createReadStream(SLOW_QUERY_LOG, { start: lastFilePosition });
        } catch (err) {
            console.error('Error opening file:', err);
            return;
        }

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let queryTime = '';

        fileStream.on('data', (chunk) => {
            lastFilePosition += chunk.length;
            saveLastFilePosition(lastFilePosition)
        });

        for await (const line of rl) {
            if (line.startsWith('#') && !line.includes('Query_time:') || !line.trim()) {
                continue;

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
                    QUERY_INFO.labels(queryTime, line, SERVER_INSTANCE).inc(parseFloat(queryTime));
                    await pushMetrics();
                    console.log(line);
                    await delay(1000);
                    QUERY_INFO.reset(queryTime, line, SERVER_INSTANCE);
                    await pushMetrics();
                }
            }
        }
    } catch (err) {
        console.log('Error in parseSlowQueryLog:', err);
        setTimeout(parseSlowQueryLog, 5000);
    }
}

collectDefaultMetrics({ register });

setInterval(parseSlowQueryLog, 5000);
