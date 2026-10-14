const express = require('express'); 
const { Pool } = require('pg');
const mongoose = require('mongoose'); 

const app = express(); 
const port = 3000;

app.use(express.json());

const pgConfig = {
    user: 'postgres',
    host: 'localhost', 
    database: 'postgres',
    password: '1', 
    port: 5432,
};
const pool = new Pool(pgConfig);

const mongoURI = 'mongodb://localhost:27017/test';
mongoose.connect(mongoURI);

const courseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    start_on: { type: Date, required: true },
    end_on: { type: Date, required: true },
    course_leader: {
        id: { type: Number, required: true },
        username: { type: String, required: true },
        reg_date: { type: Date, required: true },
        last_login_time: { type: Date, required: true }
    }
});

const CourseMongo = mongoose.model('Course', courseSchema, 'coursesdetails');

app.post('/post10000Courses', async (req, res) => {
    const { start_on, end_on, course_leader_id, course_leader_username, course_leader_reg_date, course_leader_last_login_time } = req.body; 
    const mongoCourses = [];
    
    const startTimePG = Date.now();
    for (let i = 1; i <= 10000; i++) {
        const courseName = `name${i}`;
        const pgResult = await pool.query(
            `WITH new_course AS (
                INSERT INTO "coursesdetails" (name, course_leader_id, start_on, end_on)
                VALUES ($1, $2, $3, $4)
                RETURNING id AS course_id, name, course_leader_id, start_on, end_on
            ) 
            SELECT nc.course_id, nc.name, nc.start_on, nc.end_on, 
                ui.id AS course_leader_id, ui.username, ui.reg_date, ui.last_login_time 
            FROM new_course nc
            JOIN "usersinfo" ui ON nc.course_leader_id = ui.id`,
            [courseName, course_leader_id, start_on, end_on]
        );
        
        const leader = pgResult.rows[0];
        mongoCourses.push({
            name: courseName,
            start_on,
            end_on,
            course_leader: {
                id: leader.course_leader_id,
                username: course_leader_username,
                reg_date: course_leader_reg_date,
                last_login_time: course_leader_last_login_time
            }
        });
    }
    const endTimePG = Date.now();
    
    const startTimeMongo = Date.now();
    await CourseMongo.insertMany(mongoCourses);
    const endTimeMongo = Date.now();

    const response = {
        pgTime: endTimePG - startTimePG,
        mongoTime: endTimeMongo - startTimeMongo,
        totalCoursesAdded: 10000,
    };
    
    console.log(`PostgreSQL execution time for adding 10,000 courses: ${endTimePG - startTimePG} ms`);
    console.log(`MongoDB execution time for adding 10,000 courses: ${endTimeMongo - startTimeMongo} ms`);
    
    res.json(response);
});

app.get('/getFirst10000Courses', async (req, res) => { 
    const startTimePG = Date.now();
    const pgResult = await pool.query(`
        SELECT cd.id AS course_id, cd.name, cd.start_on, cd.end_on,
               ui.id AS course_leader_id, ui.username AS course_leader_username, 
               ui.reg_date AS course_leader_reg_date, ui.last_login_time AS course_leader_last_login_time
        FROM "coursesdetails" AS cd
        JOIN "usersinfo" AS ui ON cd.course_leader_id = ui.id
        LIMIT 10000
    `);
    const endTimePG = Date.now();

    const startTimeMongo = Date.now();
    const mongoResult = await CourseMongo.find().limit(10000); 
    const endTimeMongo = Date.now();

    const response = {
        pgTime: endTimePG - startTimePG, 
        mongoTime: endTimeMongo - startTimeMongo, 
        pgResult: pgResult.rows,
        mongoResult: mongoResult,
    };

    console.log(`PostgreSQL execution time for fetching first 10,000 courses: ${endTimePG - startTimePG} ms`);
    console.log(`MongoDB execution time for fetching first 10,000 courses: ${endTimeMongo - startTimeMongo} ms`);

    res.json(response);
});

app.put('/putAllCourses', async (req, res) => {
    try {
        // PostgreSQL: обробка всіх курсів
        const startTimePG = Date.now();
        const pgResult = await pool.query(`
            UPDATE "coursesdetails"
            SET name = name || ' upd'
            RETURNING id, name
        `);
        const endTimePG = Date.now();
        
        const startTimeMongo = Date.now();
        const mongoResult = await CourseMongo.updateMany(
            {},
            [{ $set: { name: { $concat: ["$name", " upd"] } } }]
        );
        const endTimeMongo = Date.now();
        
        const response = {
            pgTime: endTimePG - startTimePG,
            mongoTime: endTimeMongo - startTimeMongo,
            pgModifiedCount: pgResult.rowCount,
            mongoModifiedCount: mongoResult.modifiedCount
        };

        console.log(`PostgreSQL execution time for updating all courses: ${endTimePG - startTimePG} ms`);
        console.log(`MongoDB execution time for updating all courses: ${endTimeMongo - startTimeMongo} ms`);

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating courses', error });
    }
});
        
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
