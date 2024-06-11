import { writeFileSync, existsSync, readFileSync } from 'fs';

const LAST_FILE_INODE_PATH = './lfp_data/lastFileInode';

export async function saveLastFileInode(inode) {
    try {
        writeFileSync(LAST_FILE_INODE_PATH, inode.toString());
    } catch (err) {
        console.error('Error saving last file inode:', err);
    }
}

export async function lastFileInode() {
    try {
        if (existsSync(LAST_FILE_INODE_PATH)) {
            const inode = readFileSync(LAST_FILE_INODE_PATH, 'utf-8');
            return parseInt(inode, 10);
        } else {
            writeFileSync(LAST_FILE_INODE_PATH, '0');
            return 0;
        }
    } catch (err) {
        console.error('Error loading last file inode:', err);
    }
}
