import express from "express";
import { and, desc, eq, ilike, getTableColumns, sql ,or} from "drizzle-orm";
import { students, departments } from "../db/schema/index.js";
import { db } from "../db/index.js";

const router = express.Router();

// ---------- GET /api/students ----------
// List all students with optional search, filtering, pagination
router.get("/", async (req, res) => {
    try {
        const { search, department, page = 1, limit = 10 } = req.query;

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // Search by name or email
        if (search) {
            filterConditions.push(
                or(
                    ilike(students.name, `%${search}%`),
                    ilike(students.email, `%${search}%`)
                )
            );
        }

        // Filter by department name
        if (department) {
            const deptPattern = `%${String(department).replace(/[%_]/g, "\\$&")}%`;
            filterConditions.push(ilike(departments.name, deptPattern));
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        // Total count for pagination
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(students)
            .leftJoin(departments, eq(students.departmentId, departments.id))
            .where(whereClause);

        const totalCounts = countResult[0]?.count ?? 0;

        // Fetch students with department info
        const studentsList = await db
            .select({
                ...getTableColumns(students),
                department: { ...getTableColumns(departments) },
            })
            .from(students)
            .leftJoin(departments, eq(students.departmentId, departments.id))
            .where(whereClause)
            .orderBy(desc(students.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: studentsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: Number(totalCounts),
                totalPages: Math.ceil(totalCounts / limitPerPage),
            },
        });
    } catch (error) {
        console.error("GET /students error:", error);
        res.status(500).json({ error: "Failed to get students" });
    }
});

// ---------- POST /api/students ----------
// Create a new student
router.post("/", async (req, res) => {
    try {
        const { name, email, departmentId } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({ error: "Name and email are required" });
        }

        // Optional: verify departmentId exists
        if (departmentId) {
            const dept = await db.select().from(departments).where(eq(departments.id, departmentId)).limit(1);
            if (!dept[0]) {
                return res.status(400).json({ error: "Invalid department" });
            }
        }

        // Insert student
        const inserted = await db.insert(students).values({
            name,
            email,
            departmentId: departmentId || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        res.status(201).json({ data: inserted[0] });
    } catch (error) {
        console.error("POST /students error:", error);
        res.status(500).json({ error: "Failed to create student" });
    }
});

// ------------------- DELETE /api/students/:id -------------------
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Make sure the student exists
        const student = await db.select().from(students).where(eq(students.id, Number(id))).limit(1);
        if (!student[0]) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Delete student
        await db.delete(students).where(eq(students.id, Number(id)));

        res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
        console.error("DELETE /students/:id error:", error);
        res.status(500).json({ error: "Failed to delete student" });
    }
});
export default router;
