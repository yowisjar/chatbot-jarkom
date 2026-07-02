const pool = require('../config/database');

const saveRpsDocument = async (data) => {
  const query = `
    INSERT INTO rps_documents (
      original_name, 
      file_name, 
      file_path, 
      file_size, 
      mime_type, 
      extracted_text,
      uploaded_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  
  const values = [
    data.original_name,
    data.file_name,
    data.file_path,
    data.file_size,
    data.mime_type,
    data.extracted_text,
    data.uploaded_by
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getLatestRpsDocument = async () => {
  const query = `
    SELECT * 
    FROM rps_documents 
    ORDER BY created_at DESC 
    LIMIT 1;
  `;
  const result = await pool.query(query);
  return result.rows[0] || null;
};

module.exports = {
  saveRpsDocument,
  getLatestRpsDocument
};
