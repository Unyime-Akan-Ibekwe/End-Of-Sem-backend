const { Pool } = require('pg'); 
const sequelize = require('../index'); 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: {
    rejectUnauthorized: false, 
  },
});

const createEventTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        location VARCHAR(255) NOT NULL,
        image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
    console.log("Events table created or already exists.");
  } catch (error) {
    console.error("Error creating events table:", error);
  }
};

createEventTable();


const createEvent = async (title, description, date, time, location, image) => {
  try {
    const query = `
      INSERT INTO events (title, description, date, time, location, image)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
    `;
    const values = [title, description, date, time, location, image];
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};


const getAllEvents = async () => {
  try {
    const query = "SELECT * FROM events";
    const result = await pool.query(query);
    return result.rows; 
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};


const getEventById = async (id) => {
  try {
    const query = "SELECT * FROM events WHERE id = $1";
    const values = [id];
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error fetching event:", error);
    throw error;
  }
};


module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
};
