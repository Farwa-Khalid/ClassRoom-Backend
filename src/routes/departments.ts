// routes/departments.js
import express from "express";
import { db } from "../db/index.js";
import { departments } from "../db/schema/index.js";
import { sql } from "drizzle-orm";

const router = express.Router();

/**
 * GET /api/departments
 * Returns all departments with optional pagination
 */
router.get("/", async (req, res) => {
    try {
        // Ensure page and limit are numbers
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 100;

        const currentPage = Math.max(1, page);
        const limitPerPage = Math.min(Math.max(1, limit), 100);
        const offset = (currentPage - 1) * limitPerPage;

        // Total count
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(departments);

        const totalCounts = countResult[0]?.count ?? 0;

        // Paginated departments
        const departmentList = await db
            .select()
            .from(departments)
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: departmentList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCounts,
                totalPages: Math.ceil(totalCounts / limitPerPage),
            },
        });
    } catch (error) {
        console.error("Error fetching departments:", error);
        res.status(500).json({ error: "Failed to fetch departments" });
    }
});

export default router;
