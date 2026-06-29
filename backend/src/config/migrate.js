const pool = require('./database');

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Menjalankan migrasi database...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) DEFAULT 'Chat Baru',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'bot')),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Index untuk performa query
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        filename VARCHAR(255),
        file_path VARCHAR(500),
        content TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migrasi kolom untuk instalasi lama
    await client.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS filename VARCHAR(255);`);
    await client.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_path VARCHAR(500);`);
    await client.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS content TEXT;`);
    await client.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS content_tsv TSVECTOR;`);
    await client.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_type VARCHAR(20);`);
    await client.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);
    await client.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE;`);
    await client.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT NOW();`);
    await client.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;`);

    await client.query(`ALTER TABLE material_chunks ADD COLUMN IF NOT EXISTS slide_number INTEGER;`);
    await client.query(`ALTER TABLE material_chunks ADD COLUMN IF NOT EXISTS slide_title VARCHAR(255);`);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_conversation_id ON materials(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials(user_id);
      CREATE INDEX IF NOT EXISTS idx_materials_user_uploaded_at ON materials(user_id, uploaded_at);
    `);

    await client.query(`
      UPDATE materials SET uploaded_at = created_at WHERE uploaded_at IS NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_content_tsv ON materials USING GIN(content_tsv);
    `);

    // Trigger full-text search pada title + content
    await client.query(`
      CREATE OR REPLACE FUNCTION materials_tsv_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.content_tsv := to_tsvector('indonesian',
          COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
        NEW.updated_at := NOW();
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_materials_tsv ON materials;
      CREATE TRIGGER trg_materials_tsv
      BEFORE INSERT OR UPDATE OF title, content ON materials
      FOR EACH ROW EXECUTE FUNCTION materials_tsv_trigger();
    `);

    await client.query(`
      UPDATE materials
      SET content_tsv = to_tsvector('indonesian', COALESCE(title, '') || ' ' || COALESCE(content, ''))
      WHERE content IS NOT NULL AND content_tsv IS NULL;
    `);

    // Tabel material_chunks untuk RAG
    await client.query(`
      CREATE TABLE IF NOT EXISTS material_chunks (
        id SERIAL PRIMARY KEY,
        material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        content_tsv TSVECTOR,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(material_id, chunk_index)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_material_chunks_material_id ON material_chunks(material_id);
      CREATE INDEX IF NOT EXISTS idx_material_chunks_content_tsv ON material_chunks USING GIN(content_tsv);
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION material_chunks_tsv_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.content_tsv := to_tsvector('indonesian', COALESCE(NEW.content, ''));
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_material_chunks_tsv ON material_chunks;
      CREATE TRIGGER trg_material_chunks_tsv
      BEFORE INSERT OR UPDATE OF content ON material_chunks
      FOR EACH ROW EXECUTE FUNCTION material_chunks_tsv_trigger();
    `);

    await client.query(`
      UPDATE material_chunks
      SET content_tsv = to_tsvector('indonesian', COALESCE(content, ''))
      WHERE content_tsv IS NULL;
    `);

    // Backfill: gabungkan chunk lama ke kolom content jika materials.content masih kosong
    await client.query(`
      UPDATE materials m
      SET content = sub.content_agg
      FROM (
        SELECT material_id,
               string_agg(content, E'\\n\\n' ORDER BY chunk_index) AS content_agg
        FROM material_chunks
        GROUP BY material_id
      ) sub
      WHERE m.id = sub.material_id
        AND (m.content IS NULL OR TRIM(m.content) = '');
    `);

    // Rechunk otomatis untuk materi lama yang belum punya chunk
    const { splitTextIntoChunks } = require('../services/chunkService');
    const materialsNeedChunk = await client.query(`
      SELECT id, content FROM materials
      WHERE content IS NOT NULL AND TRIM(content) != ''
        AND NOT EXISTS (
          SELECT 1 FROM material_chunks mc WHERE mc.material_id = materials.id
        )
    `);

    for (const row of materialsNeedChunk.rows) {
      const chunks = splitTextIntoChunks(row.content);
      for (let i = 0; i < chunks.length; i++) {
        await client.query(
          `INSERT INTO material_chunks (material_id, chunk_index, content)
           VALUES ($1, $2, $3)`,
          [row.id, i, chunks[i]]
        );
      }
    }

    if (materialsNeedChunk.rows.length > 0) {
      console.log(`  ↳ Rechunk ${materialsNeedChunk.rows.length} materi lama`);
    }

    console.log('✅ Migrasi database selesai!');
  } catch (err) {
    console.error('❌ Migrasi gagal:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

migrate().then(() => process.exit(0)).catch(() => process.exit(1));
