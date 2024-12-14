const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false 
  }
});


const createTicket = async (ticketData) => {
  const { userid, eventid, name, email, eventname, eventdate, eventtime, ticketprice, qr, count } = ticketData;

  const query = `
    INSERT INTO tickets (userid, eventid, name, email, eventname, eventdate, eventtime, ticketprice, qr, count)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const values = [userid, eventid, name, email, eventname, eventdate, eventtime, ticketprice, qr, count];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error creating ticket:', err);
    throw new Error('Failed to create ticket');
  }
};


const getAllTickets = async () => {
  const query = 'SELECT * FROM tickets;';

  try {
    const result = await pool.query(query);
    return result.rows; 
  } catch (err) {
    console.error('Error fetching tickets:', err);
    throw new Error('Failed to fetch tickets');
  }
};


const getTicketById = async (id) => {
  const query = 'SELECT * FROM tickets WHERE id = $1;';
  const values = [id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error fetching ticket:', err);
    throw new Error('Failed to fetch ticket');
  }
};


const updateTicket = async (id, ticketData) => {
  const { name, email, eventname, eventdate, eventtime, ticketprice, qr, count } = ticketData;

  const query = `
    UPDATE tickets
    SET name = $1, email = $2, eventname = $3, eventdate = $4, eventtime = $5, ticketprice = $6, qr = $7, count = $8
    WHERE id = $9
    RETURNING *;
  `;
  
  const values = [name, email, eventname, eventdate, eventtime, ticketprice, qr, count, id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error updating ticket:', err);
    throw new Error('Failed to update ticket');
  }
};


const deleteTicket = async (id) => {
  const query = 'DELETE FROM tickets WHERE id = $1 RETURNING *;';
  const values = [id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error deleting ticket:', err);
    throw new Error('Failed to delete ticket');
  }
};

module.exports = {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
};
