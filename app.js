import { statSync } from 'fs';
import { setInterval } from 'timers';
import dotenv from 'dotenv';

import { saveLastFilePosition, loadLastFilePosition } from './filePosition.js';
import { saveLastFileInode, loadLastFileInode } from './fileInode.js';
import { parseSlowQueryLog } from './pushMetrics.js'

const SLOW_QUERY_LOG = process.env.LOG_PATH || '/var/log/mysql/mysql-slow.log';

dotenv.config();

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

    const currentInode = fileStat.ino;

    if (lastFileInodeCheck === null) {
        await parseSlowQueryLog();
        lastFileInodeCheck = currentInode;
        saveLastFileInode(lastFileInodeCheck);
    }

    else if (lastFileInodeCheck !== currentInode) {
        console.log('log files inode checked. New Logs are here.')

        if (lastFilePosition > statSync(SLOW_QUERY_LOG).size) { // it means the log file is maybe by logrotate recreatet
            lastFilePosition = 0;
            saveLastFilePosition(lastFilePosition);
            await parseSlowQueryLog();
        }

        lastFileInodeCheck = currentInode;
        saveLastFileInode(lastFileInodeCheck);
        console.log('sending metrics to Pushgateway...')
        await parseSlowQueryLog();
        
    } else {
        console.log('log file was not changed. No any metrics to push.');
    }
}

setInterval(checkInode, 5000);
