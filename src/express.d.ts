declare global {
    namespace Express {
        interface request {
            user?:{
                role?:"admin" | "teacher" | "student";
            };
        }
    }
}

export {};