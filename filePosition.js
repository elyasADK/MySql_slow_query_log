import { writeFileSync, existsSync, readFileSync } from 'fs';

const LAST_FILE_POSITION_PATH = './lfp_data/lastFilePosition';

export function saveLastFilePosition(position) {
    try {
        writeFileSync(LAST_FILE_POSITION_PATH, position.toString());
    } catch (err) {
        console.error('Error saving last file position:', err);
    }
}

export function loadLastFilePosition() {
    try {
        if (existsSync(LAST_FILE_POSITION_PATH)) {
            const position = readFileSync(LAST_FILE_POSITION_PATH, 'utf-8');
            return parseInt(position, 10);
        } else {
            writeFileSync(LAST_FILE_POSITION_PATH, '0');
            return 0;
        }
    } catch (err) {
        console.error('Error loading last file position:', err);
    }
}
