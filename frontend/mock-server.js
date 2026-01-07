// DEPRECATED: mock-server.js
// This file is intentionally disabled. Authentication and API calls should go
// to the real Django backend at http://127.0.0.1:8000 (e.g., /api/auth/login/).
// Keeping this file (disabled) prevents accidental use. To remove completely,
// delete this file from the repo once you're confident the frontend points to
// the real backend.

console.error('mock-server.js is DEPRECATED. Use the Django backend at http://127.0.0.1:8000/api/auth/');
process.exit(0);

// --- Mock Data ---

// --- Mock Data ---

let USERS = [
    { id: 1, username: 'lecturer_a', role: 'lecturer', name: 'Dr. Alice', courseIds: [1] },
    { id: 2, username: 'lecturer_b', role: 'lecturer', name: 'Prof. Bob', courseIds: [2] },
    { id: 3, username: 'head', role: 'head', name: 'Dept. Head', courseIds: [1, 2] },
];

const COURSES = [
    { id: 1, name: 'Introduction to CS' },
    { id: 2, name: 'Data Structures' },
];

// Initial Nodes
let NODES = [
    // Course 1 Nodes
    { id: 1, name: 'Variables', type: 'course_content', courseId: 1 },
    { id: 2, name: 'Loops', type: 'course_content', courseId: 1 },
    { id: 3, name: 'Understand Basic Logic', type: 'course_outcome', courseId: 1 },

    // Course 2 Nodes
    { id: 4, name: 'Arrays', type: 'course_content', courseId: 2 },
    { id: 5, name: 'Linked Lists', type: 'course_content', courseId: 2 },
    { id: 6, name: 'Analyze Complexity', type: 'course_outcome', courseId: 2 },

    // Program Outcomes (Global)
    { id: 101, name: 'PO1: Critical Thinking', type: 'program_outcome', courseId: null },
    { id: 102, name: 'PO2: Problem Solving', type: 'program_outcome', courseId: null },
];

let RELATIONS = [
    { id: 1, node1_id: 1, node2_id: 3, weight: 5 }, // Variables -> Logic
    { id: 2, node1_id: 3, node2_id: 101, weight: 3 }, // Logic -> PO1
];

let nextNodeId = 200;
let nextRelationId = 100;

// --- Auth Middleware (Mock) ---
// In a real app, we'd verify tokens. Here we just trust the header for simplicity in testing
// or we can just simulate a session. For this mock, let's use a simple token map.
const sessions = new Map(); // token -> user

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        // For simplicity, if no header, assume guest or handle in endpoint
        req.user = null;
        return next();
    }
    const token = authHeader.split(' ')[1];
    if (sessions.has(token)) {
        req.user = sessions.get(token);
    } else {
        req.user = null;
    }
    next();
};

app.use(authenticate);

// --- API Endpoints ---

// 1. Auth
app.post('/api/auth/login', (req, res) => {
    const { username } = req.body;
    const user = USERS.find(u => u.username === username);
    if (user) {
        const token = `mock-token-${user.id}`;
        sessions.set(token, user);
        res.json({ token, user });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        sessions.delete(token);
    }
    res.json({ message: 'Logged out' });
});

app.get('/api/auth/user-info', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    res.json(req.user);
});

// 2. Giraph (Graph Operations)

app.get('/api/giraph/get_nodes', (req, res) => {
    // Filter by courseId if provided, but always include POs
    const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;

    let relevantNodes = NODES;
    if (courseId) {
        relevantNodes = NODES.filter(n => n.type === 'program_outcome' || n.courseId === courseId);
    }

    const nodeIds = new Set(relevantNodes.map(n => n.id));

    // Helper to format node
    const formatNode = (n) => {
        // Find relations where this node is involved
        const nodeRelations = RELATIONS.filter(r =>
            (r.node1_id === n.id && nodeIds.has(r.node2_id)) ||
            (r.node2_id === n.id && nodeIds.has(r.node1_id))
        ).map(r => ({
            relation_id: r.id,
            node1_id: r.node1_id,
            node2_id: r.node2_id,
            weight: r.weight
        }));

        return {
            id: n.id,
            name: n.name,
            relations: nodeRelations
        };
    };

    const response = {
        course_contents: relevantNodes.filter(n => n.type === 'course_content').map(formatNode),
        course_outcomes: relevantNodes.filter(n => n.type === 'course_outcome').map(formatNode),
        program_outcomes: relevantNodes.filter(n => n.type === 'program_outcome').map(formatNode),
    };

    res.json(response);
});

app.post('/api/giraph/new_relation', (req, res) => {
    const { node1_id, node2_id, weight } = req.body;
    const id = nextRelationId++;
    RELATIONS.push({ id, node1_id, node2_id, weight });
    res.json({ message: 'Relation created', relation_id: id });
});

app.post('/api/giraph/update_relation', (req, res) => {
    const { relation_id, weight } = req.body;
    const rel = RELATIONS.find(r => r.id === relation_id);
    if (rel) {
        rel.weight = weight;
        res.json({ message: 'Relation updated' });
    } else {
        res.status(404).json({ error: 'Relation not found' });
    }
});

app.delete('/api/giraph/delete_relation', (req, res) => {
    const { relation_id } = req.body;
    RELATIONS = RELATIONS.filter(r => r.id !== relation_id);
    res.json({ message: 'Relation deleted' });
});

app.post('/api/giraph/new_node', (req, res) => {
    const { layer, name, courseId } = req.body; // courseId optional if inferred or passed
    // For simplicity, if courseId not passed, assume 1 or handle logic
    // In real app, we'd use the current course context.
    // For this mock, let's assume the frontend sends courseId if it's course-specific.

    // NOTE: The user prompt didn't specify courseId in new_node, but we need it.
    // We'll assume the frontend will be updated to send it, or we default to 1 for now.

    // Actually, let's look at the existing code. createNode in apiClient doesn't send courseId.
    // We might need to update that. For now, let's default to 1 if not PO.

    let cid = req.body.courseId;
    if (!cid && layer !== 'program_outcome') cid = 1;

    const id = nextNodeId++;
    NODES.push({ id, name, type: layer, courseId: cid });
    res.json({ message: 'Node created', id });
});

app.post('/api/giraph/update_node', (req, res) => {
    const { node_id, name } = req.body;
    const node = NODES.find(n => n.id === node_id);
    if (node) {
        node.name = name;
        res.json({ message: 'Node updated' });
    } else {
        res.status(404).json({ error: 'Node not found' });
    }
});

app.delete('/api/giraph/delete_node', (req, res) => {
    const { node_id } = req.body;
    NODES = NODES.filter(n => n.id !== node_id);
    RELATIONS = RELATIONS.filter(r => r.node1_id !== node_id && r.node2_id !== node_id);
    res.json({ message: 'Node deleted' });
});

// 3. Program Management (Head only)

app.get('/api/program/program-info', (req, res) => {
    // Return list of lecturers
    const lecturers = USERS.filter(u => u.role === 'lecturer');
    res.json({ lecturers });
});

app.delete('/api/program/delete_lecturer', (req, res) => {
    const { id } = req.body;
    const initialLength = USERS.length;
    USERS = USERS.filter(u => u.id !== id);
    if (USERS.length < initialLength) {
        res.json({ message: 'Lecturer deleted' });
    } else {
        res.status(404).json({ error: 'Lecturer not found' });
    }
});

app.put('/api/program/update_lecturer', (req, res) => {
    const { id, name } = req.body;
    const user = USERS.find(u => u.id === id);
    if (user) {
        user.name = name;
        res.json({ message: 'Lecturer updated' });
    } else {
        res.status(404).json({ error: 'Lecturer not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Mock server running on http://localhost:${PORT}`);
});
