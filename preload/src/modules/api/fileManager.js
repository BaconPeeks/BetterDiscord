import {ipcRenderer as IPC} from "electron";
import * as IPCEvents from "common/constants/ipcevents";
import * as fs from "fs";
import cloneObject from "common/clone";

export function readFile(path, options = "utf8") {
    return IPC.sendSync(IPCEvents.READ_FILE, path, options);
}

export function writeFile(path, content, options) {
    return IPC.send(IPCEvents.WRITE_FILE, path, content, options);
}

export function readDirectory(path, options) {
    return IPC.sendSync(IPCEvents.READ_DIR, path, options);
}

export function createDirectory(path, options) {
    return IPC.sendSync(IPCEvents.CREATE_DIR, path, options);
}

export function deleteDirectory(path, options) {
    IPC.invoke(IPCEvents.DELETE_DIR, path, options);
}

export function exists(path) {
    if (!IPC) return false; // I have no fucking idea how this can be null.
    return IPC.sendSync(IPCEvents.EXISTS_FILE, path);
}

export function getRealPath(path, options) {
    return IPC.sendSync(IPCEvents.GET_REAL_PATH, path, options);
}

export function rename(oldPath, newPath) {
    return IPC.sendSync(IPCEvents.RENAME, oldPath, newPath);
}

export function createWriteStream(path, options) {
    return cloneObject(fs.createWriteStream(path, options));
}

export function watch(path, options, callback) {
    const id = Math.random().toString("36").slice(2).repeat(10);
    const watcherId = IPCEvents.WATCH_DIR + "-" + id;

    const handleCallback = (_, ...args) => {
        callback(...args);
    };

    IPC.on(watcherId, handleCallback);
    IPC.send(IPCEvents.WATCH_DIR, path, options, id);

    return {
        close: () => {
            IPC.off(watcherId, handleCallback);
            IPC.send(watcherId + "-close");
        }
    };
}

const FileStatProperties = {
    DEFAULT: 61440,
    DIRECTORY: 16384,
    FILE: 32768
};

export function getStats(path, options) {
    const result = IPC.sendSync(IPCEvents.GET_STATS, path, options);
    const stats = result.value;
    
    function _checkModeProperty(property) {
        return (BigInt(stats.mode) & BigInt(FileStatProperties.DEFAULT)) === BigInt(property);
    }
    
    return {
        error: result.error,
        value: {
            ...stats,
            _checkModeProperty,
            isDirectory() {
                if (!stats || result.error) return false;
                return _checkModeProperty(FileStatProperties.DIRECTORY);
            },
            isFile() {
                if (!stats || result.error) return false;
                return _checkModeProperty(FileStatProperties.FILE);
            }
        }
    };
}