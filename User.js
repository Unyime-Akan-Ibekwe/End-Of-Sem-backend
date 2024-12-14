const { Pool } = require("pg"); 


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, 
  },
});


const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin'))
    );
  `;

  try {
    await pool.query(query);
    console.log("Users table created or already exists");
  } catch (err) {
    console.error("Error creating Users table:", err);
  }
};


createTable();


const registerUser = async (name, email, password, role = "user") => {
  const query = `
    INSERT INTO users (name, email, password, role)
    VALUES ($1, $2, $3, $4) RETURNING *;
  `;
  try {
    const result = await pool.query(query, [name, email, password, role]);
    return result.rows[0];
  } catch (err) {
    console.error("Error during registration:", err);
    throw err; 
  }
};


const findUserByEmail = async (email) => {
  const query = `SELECT * FROM users WHERE email = $1;`;
  try {
    const result = await pool.query(query, [email]);
    return result.rows[0]; 
  } catch (err) {
    console.error("Error finding user:", err);
    throw err;
  }
};


const updateUser = async (id, name, email, role) => {
  const query = `
    UPDATE users
    SET name = $1, email = $2, role = $3
    WHERE id = $4 RETURNING *;
  `;
  try {
    const result = await pool.query(query, [name, email, role, id]);
    return result.rows[0]; 
  } catch (err) {
    console.error("Error updating user:", err);
    throw err;
  }
};


const deleteUser = async (id) => {
  const query = `DELETE FROM users WHERE id = $1 RETURNING *;`;
  try {
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (err) {
    console.error("Error deleting user:", err);
    throw err;
  }
};

module.exports = {
  registerUser,
  findUserByEmail,
  updateUser,
  deleteUser,
};
