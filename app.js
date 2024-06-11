import { statSync } from 'fs';
import { setInterval } from 'timers';
import dotenv from 'dotenv';

import { saveLastFilePosition, loadLastFilePosition } from './filePosition.js';
import { saveLastFileInode, loadLastFileInode } from './fileInode.js';
import { saveLastFileCreationTime, loadLastFileCreationTime } from './ifRecreateFileLog.js';
import { parseSlowQueryLog } from './pushMetrics.js'

const SLOW_QUERY_LOG = process.env.LOG_PATH || '/var/log/mysql/mysql-slow.log';

dotenv.config();

let lastFileCreationTime = loadLastFileCreationTime();
let lastFileInodeCheck = loadLastFileInode();
let lastFilePosition = loadLastFilePosition();

async function checkInode() {
    let fileStat;
    try {
        fileStat = statSync(SLOW_QUERY_LOG);
    } catch (err) {
        console.error('Error getting file stats:', err);
        return;
    }

    const currentFileCreationTime = fileStat.birthtime.getTime();
    const currentInode = fileStat.ino;

    if (lastFileCreationTime !== null && lastFileCreationTime !== currentFileCreationTime) {
        console.log('You run the app for the first time or log file has been recreated, maybe because of logrotate. Resetting file position to null.');
        lastFilePosition = 0;
        saveLastFilePosition(lastFilePosition);
        saveLastFileCreationTime(currentFileCreationTime)
        console.log('sending metrics to Pushgateway...')
        await parseSlowQueryLog();

    } else if (lastFileInodeCheck !== null && lastFileInodeCheck !== currentInode) {
        console.log('log files inode checked. New Logs are here.')
        lastFileInodeCheck = currentInode;
        saveLastFileInode(lastFileInodeCheck);
        console.log(' sending metrics to Pushgateway...')
        await parseSlowQueryLog();

    } else {
        console.log('log file was not changed. No any metrics to push.');
    }
}

setInterval(checkInode, 5000);
