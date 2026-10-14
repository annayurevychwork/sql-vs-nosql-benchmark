const express = require('express'); 
const { Pool } = require('pg');
const mongoose = require('mongoose'); 
require('dotenv').config();

const app = express(); 
const port = 3000;

app.use(express.json());

const pgConfig = {
    user: 'ftdcumrh',
    host: 'snuffleupagus.db.elephantsql.com', 
    database: 'ftdcumrh',
    password: 'WkD_C6dtopfVcz7yiTxKaMC01rNpx5ub', 
    port: 5432,
};
const pool = new Pool(pgConfig);

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({ 
    username: String,
    password: String, 
    email: String,
    registration_date: Date,
    last_login: { type: Date, default: Date.now },
});

const UserMongo = mongoose.model('User', userSchema);

app.get('/compare/', async (req, res) => { 
    const startTimePG = Date.now();
    const pgResult = await pool.query('SELECT * FROM "usersinfo"'); 
    const endTimePG = Date.now();

    const startTimeMongo = Date.now();
    const mongoResult = await UserMongo.find(); 
    const endTimeMongo = Date.now();

    const response = {
        pgTime: endTimePG - startTimePG, 
        mongoTime: endTimeMongo - startTimeMongo, 
        pgResult: pgResult.rows,
        mongoResult: mongoResult,
    };

    console.log(`PostgreSQL execution time: ${endTimePG - startTimePG} ms`);
    console.log(`MongoDB execution time: ${endTimeMongo - startTimeMongo} ms`);

    res.json(response);
});

app.post('/compare/', async (req, res) => {
    const { username, password, email } = req.body; 
    const registration_date = new Date();

    const startTimePG = Date.now();
    const pgResult = await pool.query(
        'INSERT INTO "users" (username, password, email, registration_date) VALUES ($1, $2, $3, $4) RETURNING *',
        [username, password, email, registration_date]
    );
    const endTimePG = Date.now();
    const startTimeMongo = Date.now(); 
    const newUserMongo = new UserMongo({
        username, 
        password, 
        email,
        registration_date,
    });
    const savedUserMongo = await newUserMongo.save(); 
    const endTimeMongo = Date.now();
    
    const response = {
        pgTime: endTimePG - startTimePG, 
        mongoTime: endTimeMongo - startTimeMongo, 
        pgResult: pgResult.rows[0],
        mongoResult: savedUserMongo,
    };
    
    console.log(`PostgreSQL execution time for POST: ${endTimePG - startTimePG} ms`);
    console.log(`MongoDB execution time for POST: ${endTimeMongo - startTimeMongo} ms`);
    
    res.json(response);
});
    
    
app.get('/compare/:username', async (req, res) => { 
    const requestedUsername = req.params.username;
    
    const startTimePG = Date.now();
    const pgResult = await pool.query('SELECT * FROM "users" WHERE username = $1', [requestedUsername]);
    const endTimePG = Date.now();
    
    const startTimeMongo = Date.now();
    const mongoResult = await UserMongo.findOne({ username: requestedUsername }); 
    const endTimeMongo = Date.now();
    
    const response = {
        pgTime: endTimePG - startTimePG, 
        mongoTime: endTimeMongo - startTimeMongo, 
        pgResult: pgResult.rows,
        mongoResult: mongoResult,
    };
    
    console.log(`PostgreSQL execution time for finding user by username: ${endTimePG - startTimePG} ms`);
    console.log(`MongoDB execution time for finding user by username: ${endTimeMongo - startTimeMongo} ms`);
        
    res.json(response);
});
        
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
            