import express from "express";
import {and,desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";
import {departments, subjects} from "../db/schema/index.js";
import {db} from "../db/index.js";

const router = express.Router();

//get all subjects with optional search,filtering and pagination
router.get('/', async (req, res) => {
    try {

        const {search, department, page = 1, limit = 10} = req.query;
        const currentPage = Math.max(1,parseInt(String(page),10) ||1 );
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit),10) ||10) ,100);

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        //if search query exist filter by name or subject code
        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`),
                )
            );
        }
        //department filter
        if (department) {
            // escape % and _ to avoid wildcard injection
            const deptPattern = `%${String(department).replace(/[%_]/g, "\\$&")}%`;

            filterConditions.push(
                ilike(departments.name, deptPattern)
            );
        }

        //combine all filters
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({count: sql<number>`count(*)`})
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause);

        const totalCounts = countResult[0]?.count ?? 0;

        const subjectsList = await  db.select({
            ...getTableColumns(subjects),
            department: {...getTableColumns(departments)}
        }).from(subjects).leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)
            .orderBy(desc(subjects.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        // res.status(200).json({
        //     data: subjectsList,
        //     pagination: {
        //         page: currentPage,
        //         limit: limitPerPage,
        //         total: totalCounts,
        //         totalPages: Math.ceil(totalCounts / limitPerPage),
        //     },
        // })
        res.status(200).json({
            data: subjectsList,
            total: Number(totalCounts),
        });

    }
    catch (error) {
        console.error(`Get /subject ${error}`);
        res.status(500).json({error: 'Failed to get subject'});
    }
})

// ---------- POST /api/subjects ----------
router.post("/", async (req, res) => {
    try {
        // Extract fields from request body
        const { name, code, departmentId, description } = req.body;

        // Validate
        if (!name || !code || !departmentId || !description) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Make sure departmentId exists in the database
        const dept = await db.select().from(departments).where(eq(departments.id, departmentId)).limit(1);
        if (!dept[0]) {
            return res.status(400).json({ error: "Invalid department" });
        }

        // Insert subject
        const inserted = await db.insert(subjects).values({
            name,
            code,
            departmentId,
            description,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        // Return inserted subject
        res.status(201).json({ data: inserted[0] });
    } catch (error) {
        console.error("POST /subjects error:", error);
        res.status(500).json({ error: "Failed to create subject" });
    }
});


export  default router;