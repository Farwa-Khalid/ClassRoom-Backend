import express from "express";
import {and,desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";
import {departments, subjects} from "../db/schema";
import {db} from "../db";

const router = express.Router();

//get all subjects with optional search,filtering and pagination
router.get('/', async (req, res) => {
    try {

        const {search, department, page = 1, limit = 10} = req.query;
        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);

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
            filterConditions.push(
                ilike(departments.name, `%${search}%`),
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

        const subjectsList = db.select({
            ...getTableColumns(subjects),
            department: {...getTableColumns(departments)}
        }).from(subjects).leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)
            .orderBy(desc(subjects.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: subjectsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCounts,
                totalPages: Math.ceil(totalCounts / limitPerPage),
            },
        })
        }
    catch (error) {
        console.error(`Get /subject ${error}`);
        res.status(500).json({error: 'Failed to get subject'});
    }
})

export  default router;