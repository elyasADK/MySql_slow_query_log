import { statSync } from 'fs';
import { setInterval } from 'timers';
import dotenv from 'dotenv';

import { saveLastFilePosition, loadLastFilePosition } from './filePosition.js';
import { saveLastFileInode, loadLastFileInode } from './fileInode.js';
import { parseSlowQueryLog } from './pushMetrics.js'

const SLOW_QUERY_LOG = process.env.LOG_PATH || '/var/log/mysql/mysql-slow.log';

dotenv.config();

async function checkInode() {
    let lastFileInodeCheck = loadLastFileInode();
    let lastFilePosition = loadLastFilePosition();

    let fileStat;
    try {
        fileStat = statSync(SLOW_QUERY_LOG);
    } catch (err) {
        console.error('Error getting file stats:', err);
        return;
    }

    const currentInode = fileStat.ino;

    if (lastFileInodeCheck === 0 && lastFileInodeCheck !== currentInode) {
        console.log('Run app for the first time or logfile recreated. Set lastFileposition to null.');
        lastFilePosition = 0;
        saveLastFilePosition(lastFilePosition);
        lastFileInodeCheck = currentInode;
        saveLastFileInode(lastFileInodeCheck);
        parseSlowQueryLog();
    } else {
        console.log('try to push new metrics if available.')
        parseSlowQueryLog();
    }
}

setInterval(checkInode, 5000);
