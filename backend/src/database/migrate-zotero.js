const db = require('./database');

async function migrateZotero() {
  console.log('🔄 Migration Zotero...');

  try {
    // Initialiser la connexion
    await db.connect();
    console.log('✅ Connecté à la base de données');

    // Vérifier si les colonnes existent déjà
    const tableInfo = await db.all("PRAGMA table_info(papers)");
    const hasZoteroKey = tableInfo.some(col => col.name === 'zotero_key');
    const hasFavorite = tableInfo.some(col => col.name === 'is_favorite');

    // Ajouter zotero_key si elle n'existe pas
    if (!hasZoteroKey) {
      console.log('  ✅ Ajout de la colonne zotero_key');
      await db.run('ALTER TABLE papers ADD COLUMN zotero_key TEXT');
      await db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_zotero_key ON papers(zotero_key) WHERE zotero_key IS NOT NULL');
    } else {
      console.log('  ⏭️  Colonne zotero_key déjà présente');
    }

    // Ajouter is_favorite si elle n'existe pas
    if (!hasFavorite) {
      console.log('  ✅ Ajout de la colonne is_favorite');
      await db.run('ALTER TABLE papers ADD COLUMN is_favorite INTEGER DEFAULT 0');
    } else {
      console.log('  ⏭️  Colonne is_favorite déjà présente');
    }

    // Créer la table zotero_config si elle n'existe pas
    console.log('  ✅ Création de la table zotero_config');
    await db.run(`
      CREATE TABLE IF NOT EXISTS zotero_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        api_key TEXT,
        library_type TEXT DEFAULT 'user' CHECK (library_type IN ('user', 'group')),
        last_sync DATETIME,
        last_version INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Migration Zotero terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  migrateZotero()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateZotero;
