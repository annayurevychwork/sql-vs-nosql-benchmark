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

const mongoURI = 'mongodb://localhost:27017/school';
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

const CourseMongo = mongoose.model('Course', courseSchema, 'courses');

const transferData = async () => {
    try {
        const startTime = Date.now();

        const result = await pool.query(`
            SELECT cd.id AS course_id, cd.name, cd.start_on, cd.end_on,
                   ui.id AS user_id, ui.username, ui.reg_date, ui.last_login_time
            FROM "coursesdetails" cd
            JOIN "usersinfo" ui ON cd.course_leader_id = ui.id;
        `);

        const courses = result.rows.map(row => ({
            name: row.name,
            start_on: row.start_on,
            end_on: row.end_on,
            course_leader: {
                id: row.user_id,
                username: row.username,
                reg_date: row.reg_date,
                last_login_time: row.last_login_time,
            },
        }));

        await CourseMongo.insertMany(courses);

        const endTime = Date.now();
        console.log(`Data transfer was sucessfully completed`);
    } catch (error) {
        console.error('Error during data transfer:', error);
    } finally {
        await mongoose.disconnect();
        await pool.end();
    }
};

transferData();
