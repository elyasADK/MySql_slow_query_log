import { writeFileSync, existsSync, readFileSync } from 'fs';

const LAST_FILE_CREATION_TIME_PATH = './lfp_data/lastFileCreationTime';

export function saveLastFileCreationTime(creationTime) {
    try {
        writeFileSync(LAST_FILE_CREATION_TIME_PATH, creationTime.toString());
    } catch (err) {
        console.error('Error saving last file creation time:', err);
    }
}

export function loadLastFileCreationTime() {
    try {
        if (existsSync(LAST_FILE_CREATION_TIME_PATH)) {
            const creationTime = readFileSync(LAST_FILE_CREATION_TIME_PATH, 'utf-8');
            return parseInt(creationTime, 10);
        } else {
            writeFileSync(LAST_FILE_CREATION_TIME_PATH, '0');
            return 0;
        }
    } catch (err) {
        console.error('Error loading last file creation time:', err);
    }
}
