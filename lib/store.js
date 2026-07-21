const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'tasks.json');
const KV_KEY = 'app-data';

const DEFAULT_TIMELINE = {
    startDate: '2026-07-01',
    endDate: '2026-08-15'
};

const DEFAULT_SETTINGS = {
    passcode: 'porters'
};

// On Vercel the filesystem is read-only/ephemeral, so when KV credentials are present
// (added automatically once a Redis/KV store is connected to the project) we persist
// there instead. Locally, with no KV env vars, we fall back to the JSON file as before.
const useKv = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const kv = useKv ? require('@vercel/kv').kv : null;

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function readFileData() {
    ensureDataDir();
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({
            timeline: DEFAULT_TIMELINE,
            tasks: [],
            holidays: [],
            settings: DEFAULT_SETTINGS
        }, null, 2), 'utf8');
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
}

function writeFileData(data) {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function normalize(parsed) {
    if (!parsed) parsed = {};
    if (Array.isArray(parsed)) {
        return {
            timeline: { ...DEFAULT_TIMELINE },
            tasks: parsed,
            holidays: [],
            settings: { ...DEFAULT_SETTINGS }
        };
    }
    return {
        timeline: {
            startDate: parsed.timeline?.startDate || DEFAULT_TIMELINE.startDate,
            endDate: parsed.timeline?.endDate || DEFAULT_TIMELINE.endDate
        },
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        holidays: Array.isArray(parsed.holidays) ? parsed.holidays : [],
        settings: {
            passcode: parsed.settings?.passcode || DEFAULT_SETTINGS.passcode
        }
    };
}

async function loadData() {
    try {
        const parsed = useKv ? await kv.get(KV_KEY) : readFileData();
        return normalize(parsed);
    } catch (err) {
        console.error('Không thể đọc dữ liệu:', err);
        return normalize(null);
    }
}

// Merges partial updates on top of what is already persisted, so a caller that
// forgets a field (eg. holidays, settings) never silently wipes it out.
async function saveData(partialData) {
    const current = await loadData();
    const output = {
        timeline: {
            startDate: partialData.timeline?.startDate || current.timeline.startDate,
            endDate: partialData.timeline?.endDate || current.timeline.endDate
        },
        tasks: Array.isArray(partialData.tasks) ? partialData.tasks : current.tasks,
        holidays: Array.isArray(partialData.holidays) ? partialData.holidays : current.holidays,
        settings: {
            passcode: partialData.settings?.passcode || current.settings.passcode
        }
    };

    if (useKv) {
        await kv.set(KV_KEY, output);
    } else {
        writeFileData(output);
    }

    return output;
}

module.exports = { loadData, saveData, useKv };
