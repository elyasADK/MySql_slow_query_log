import { statSync } from 'fs';
import { setInterval } from 'timers';
import dotenv from 'dotenv';

import { saveLastFilePosition, loadLastFilePosition } from './filePosition.js';
import { saveLastFileInode, lastFileInode } from './fileInode.js';
import { parseSlowQueryLog } from './pushMetrics.js'

const SLOW_QUERY_LOG = process.env.LOG_PATH || '/var/log/mysql/mysql-slow.log';

dotenv.config();

let lastFileInodeCheck = lastFileInode();
let lastFilePosition = loadLastFilePosition();

async function checkInode() {
    let fileStat;
    try {
        fileStat = statSync(SLOW_QUERY_LOG);
    } catch (err) {
        console.error('Error getting file stats:', err);
        return;
    }

    const currentInode = fileStat.ino;
    if (lastFileInodeCheck !== null && lastFileInodeCheck !== currentInode) {
        console.log('Log file has been recreated. maybe because of logrotate. Resetting file position to null.');
        lastFilePosition = 0;
        saveLastFilePosition(lastFilePosition);
        parseSlowQueryLog();
    }
    lastFileInodeCheck = currentInode;
    saveLastFileInode(lastFileInodeCheck);
}

setInterval(checkInode, 5000);
