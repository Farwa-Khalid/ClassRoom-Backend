import AgentAPI from "apminsight";
AgentAPI.config();

import express from 'express';
import subjectsRouter from './routes/subject.js';
import usersRouter from './routes/user.js';
import classesRouter from './routes/classes.js';
import departmentsRouter from './routes/departments.js';
import studentsRouter from './routes/students.js';
import cors from "cors" ;
import securityMiddleware from "./middleware/security.js";
import {auth} from "./lib/auth.js";
import {toNodeHandler} from "better-auth/node";

const app = express();
const PORT = 8000;

if(!process.env.FRONTEND_URL) {
    throw new Error("Missing FRONTEND_URL");
}

app.use(cors({
    origin: "https://class-room-frontend-two.vercel.app",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());
app.use(securityMiddleware);

app.get('/', (req, res) => {
    res.send('Hello, welcome to the Classroom API!');
});

app.use('/api/subjects',subjectsRouter);
app.use('/api/users',usersRouter);
app.use('/api/classes', classesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/students',studentsRouter);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
