const express = require('express');
const path = require('path');
const { loadData, saveData } = require('./lib/store');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Served via an explicit, statically-traceable route (instead of express.static)
// so Vercel's build tracer bundles index.html into the serverless function.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/tasks', async (req, res) => {
    const data = await loadData();
    const { settings, ...safeData } = data;
    res.json(safeData);
});

app.post('/api/auth/verify', async (req, res) => {
    const data = await loadData();
    const passcode = (req.body && typeof req.body.passcode === 'string') ? req.body.passcode : '';
    const isValid = passcode === data.settings.passcode;
    res.json({ ok: isValid });
});

app.get('/api/holidays', async (req, res) => {
    const data = await loadData();
    res.json(data.holidays);
});

app.put('/api/holidays', async (req, res) => {
    const data = await loadData();
    const holidays = Array.isArray(req.body.holidays) ? req.body.holidays : [];
    const updated = await saveData({ timeline: data.timeline, tasks: data.tasks, holidays, settings: data.settings });
    res.json(updated.holidays);
});

app.post('/api/tasks', async (req, res) => {
    const data = await loadData();
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const payload = req.body || {};
    const nextId = String(tasks.length > 0 ? Math.max(...tasks.map(t => Number(t.id) || 0)) + 1 : 1);
    const newTask = {
        id: nextId,
        group: payload.group || 'Chưa phân nhóm',
        title: payload.title || 'Không có tiêu đề',
        assigned: payload.assigned || 'Unassigned',
        priority: payload.priority || 'Medium',
        startDate: payload.startDate || '',
        endDate: payload.endDate || '',
        plannedHours: Number(payload.plannedHours) || 0,
        actualHours: Number(payload.actualHours) || 0,
        percentComplete: Number(payload.percentComplete) || 0,
        status: payload.status || (payload.percentComplete === 100 ? 'Done' : (payload.percentComplete > 0 ? 'In Progress' : 'Todo')),
        notes: payload.notes || ''
    };

    tasks.push(newTask);
    await saveData({ timeline: data.timeline, tasks, holidays: data.holidays, settings: data.settings });
    res.status(201).json(newTask);
});

app.post('/api/tasks/import', async (req, res) => {
    const data = await loadData();
    const incoming = Array.isArray(req.body.tasks) ? req.body.tasks : [];

    const tasks = incoming.map((payload, idx) => ({
        id: String(idx + 1),
        group: payload.group || 'Chưa phân nhóm',
        title: payload.title || 'Không có tiêu đề',
        assigned: payload.assigned || 'Unassigned',
        priority: payload.priority || 'Medium',
        startDate: payload.startDate || '',
        endDate: payload.endDate || '',
        plannedHours: Number(payload.plannedHours) || 0,
        actualHours: Number(payload.actualHours) || 0,
        percentComplete: Number(payload.percentComplete) || 0,
        status: payload.status || (payload.percentComplete === 100 ? 'Done' : (payload.percentComplete > 0 ? 'In Progress' : 'Todo')),
        notes: payload.notes || ''
    }));

    const updated = await saveData({ timeline: data.timeline, tasks, holidays: data.holidays, settings: data.settings });
    res.status(201).json({ tasks: updated.tasks });
});

app.put('/api/tasks/:id', async (req, res) => {
    const data = await loadData();
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const taskId = String(req.params.id);
    const index = tasks.findIndex(t => String(t.id) === taskId);

    if (index === -1) {
        return res.status(404).json({ error: 'Task không tồn tại' });
    }

    const payload = req.body || {};
    tasks[index] = {
        ...tasks[index],
        group: payload.group || tasks[index].group,
        title: payload.title || tasks[index].title,
        assigned: payload.assigned || tasks[index].assigned,
        priority: payload.priority || tasks[index].priority,
        startDate: payload.startDate || tasks[index].startDate,
        endDate: payload.endDate || tasks[index].endDate,
        plannedHours: Number(payload.plannedHours) || 0,
        actualHours: Number(payload.actualHours) || 0,
        percentComplete: Number(payload.percentComplete) || 0,
        status: payload.status || tasks[index].status,
        notes: payload.notes || tasks[index].notes
    };

    await saveData({ timeline: data.timeline, tasks, holidays: data.holidays, settings: data.settings });
    res.json(tasks[index]);
});

app.delete('/api/tasks/:id', async (req, res) => {
    const data = await loadData();
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const taskId = String(req.params.id);
    const filtered = tasks.filter(t => String(t.id) !== taskId);
    if (filtered.length === tasks.length) {
        return res.status(404).json({ error: 'Task không tồn tại' });
    }
    await saveData({ timeline: data.timeline, tasks: filtered, holidays: data.holidays, settings: data.settings });
    res.json({ success: true });
});

app.put('/api/timeline', async (req, res) => {
    const data = await loadData();
    const payload = req.body || {};
    const timeline = {
        startDate: payload.startDate || data.timeline.startDate,
        endDate: payload.endDate || data.timeline.endDate
    };
    const updated = await saveData({ timeline, tasks: data.tasks, holidays: data.holidays, settings: data.settings });
    res.json(updated.timeline);
});

module.exports = app;

if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`Server đang chạy trên http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            const fallbackPort = PORT + 1;
            console.warn(`Port ${PORT} đang được sử dụng. Thử sang port ${fallbackPort}...`);
            app.listen(fallbackPort, () => {
                console.log(`Server đang chạy trên http://localhost:${fallbackPort}`);
            });
        } else {
            console.error(err);
            process.exit(1);
        }
    });
}
