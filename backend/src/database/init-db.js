const db = require('./database');

const createTablesSQL = `
-- Table des articles scientifiques
CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  publication_date TEXT,
  conference TEXT,
  conference_short TEXT,
  reading_status TEXT DEFAULT 'unread' CHECK (reading_status IN ('unread', 'reading', 'read', 'favorite')),
  image TEXT,
  doi TEXT UNIQUE,
  url TEXT,
  folder_path TEXT,
  zotero_key TEXT UNIQUE,
  is_favorite INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des collections
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison Many-to-Many entre papers et collections
CREATE TABLE IF NOT EXISTS paper_collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER NOT NULL,
  collection_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES papers (id) ON DELETE CASCADE,
  FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE,
  UNIQUE(paper_id, collection_id)
);

-- Table des tags
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison Many-to-Many entre papers et tags
CREATE TABLE IF NOT EXISTS paper_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES papers (id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
  UNIQUE(paper_id, tag_id)
);

-- Table des descriptions et notes
CREATE TABLE IF NOT EXISTS descriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER NOT NULL,
  texte TEXT,
  images TEXT, -- JSON array of image paths
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES papers (id) ON DELETE CASCADE
);

-- Table de configuration Zotero
CREATE TABLE IF NOT EXISTS zotero_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  api_key TEXT,
  library_type TEXT DEFAULT 'user' CHECK (library_type IN ('user', 'group')),
  last_sync DATETIME,
  last_version INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_papers_status ON papers(reading_status);
CREATE INDEX IF NOT EXISTS idx_papers_created_at ON papers(created_at);
CREATE INDEX IF NOT EXISTS idx_papers_doi ON papers(doi);
CREATE INDEX IF NOT EXISTS idx_papers_zotero_key ON papers(zotero_key);
CREATE INDEX IF NOT EXISTS idx_paper_collections_paper_id ON paper_collections(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_collections_collection_id ON paper_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_paper_tags_paper_id ON paper_tags(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_tags_tag_id ON paper_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_descriptions_paper_id ON descriptions(paper_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER IF NOT EXISTS update_papers_timestamp
AFTER UPDATE ON papers
BEGIN
  UPDATE papers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_descriptions_timestamp
AFTER UPDATE ON descriptions
BEGIN
  UPDATE descriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
`;

const insertSampleData = `

-- Insertion de tags par défaut
INSERT OR IGNORE INTO tags (name, color) VALUES
  ('Deep Learning', '#EF4444'),
  ('Neural Networks', '#F97316'),
  ('Transformers', '#F59E0B'),
  ('Computer Vision', '#84CC16'),
  ('NLP', '#10B981'),
  ('Reinforcement Learning', '#06B6D4'),
  ('Attention Mechanism', '#3B82F6'),
  ('Pre-training', '#8B5CF6'),
  ('Fine-tuning', '#EC4899'),
  ('Benchmark', '#6B7280');

-- Insertion d'articles d'exemple
INSERT OR IGNORE INTO papers (title, authors, publication_date, conference, reading_status, doi) VALUES
  ('Attention Is All You Need', 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit', '2017-06-12', 'NIPS 2017', 'read', '10.48550/arXiv.1706.03762'),
  ('BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding', 'Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova', '2018-10-11', 'NAACL 2019', 'favorite', '10.48550/arXiv.1810.04805'),
  ('ResNet: Deep Residual Learning for Image Recognition', 'Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun', '2015-12-10', 'CVPR 2016', 'read', '10.48550/arXiv.1512.03385');
`;

function parseSQLStatements(sql) {
  const statements = [];
  let current = '';
  let inTrigger = false;
  let triggerDepth = 0;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Ignorer les commentaires et lignes vides
    if (trimmedLine.startsWith('--') || trimmedLine === '') {
      continue;
    }

    // Détecter le début d'un trigger
    if (trimmedLine.toUpperCase().includes('CREATE TRIGGER')) {
      inTrigger = true;
      triggerDepth = 0;
    }

    current += line + '\n';

    if (inTrigger) {
      if (trimmedLine.toUpperCase() === 'BEGIN') {
        triggerDepth++;
      } else if (trimmedLine.toUpperCase() === 'END;') {
        triggerDepth--;
        if (triggerDepth === 0) {
          inTrigger = false;
          statements.push(current.trim());
          current = '';
        }
      }
    } else {
      // Pour les autres statements, split sur ';'
      if (trimmedLine.endsWith(';')) {
        statements.push(current.trim());
        current = '';
      }
    }
  }

  // Ajouter le dernier statement s'il y en a un
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(stmt => stmt.length > 0);
}

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing FormPaper3001 database...');

    await db.connect();

    console.log('📋 Creating tables...');
    // Parser plus intelligent pour gérer les triggers
    const statements = parseSQLStatements(createTablesSQL);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await db.run(statement.trim());
      }
    }

    console.log('📊 Inserting sample data...');
    const sampleStatements = insertSampleData.split(';').filter(stmt => stmt.trim());

    for (const statement of sampleStatements) {
      if (statement.trim()) {
        await db.run(statement.trim());
      }
    }

    console.log('✅ Database initialized successfully!');
    console.log('📁 Database file: formpaper.db');

    const papersCount = await db.get('SELECT COUNT(*) as count FROM papers');
    const categoriesCount = await db.get('SELECT COUNT(*) as count FROM categories');

    console.log(`📄 Papers: ${papersCount.count}`);
    console.log(`🏷️  Categories: ${categoriesCount.count}`);

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };