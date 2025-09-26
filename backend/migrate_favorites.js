#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'formpaper.db');

console.log('🔄 Migration: Ajout de la colonne is_favorite...');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erreur de connexion à la base de données:', err);
    process.exit(1);
  }
  console.log('✅ Connecté à la base de données SQLite');
});

// Ajouter la colonne is_favorite
db.run(`ALTER TABLE papers ADD COLUMN is_favorite INTEGER DEFAULT 0`, (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('ℹ️ La colonne is_favorite existe déjà');
    } else {
      console.error('❌ Erreur lors de l\'ajout de la colonne is_favorite:', err);
      db.close();
      process.exit(1);
    }
  } else {
    console.log('✅ Colonne is_favorite ajoutée avec succès');
  }

  // Migrer les données existantes (reading_status = 'favorite' -> is_favorite = 1)
  db.run(`UPDATE papers SET is_favorite = 1, reading_status = 'read' WHERE reading_status = 'favorite'`, (err) => {
    if (err) {
      console.error('❌ Erreur lors de la migration des favoris:', err);
    } else {
      console.log('✅ Migration des favoris existants terminée');
    }

    // Ajouter les nouvelles colonnes year et month si elles n'existent pas
    db.run(`ALTER TABLE papers ADD COLUMN year INTEGER`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Erreur lors de l\'ajout de la colonne year:', err);
      } else if (!err) {
        console.log('✅ Colonne year ajoutée');
      }

      db.run(`ALTER TABLE papers ADD COLUMN month INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Erreur lors de l\'ajout de la colonne month:', err);
        } else if (!err) {
          console.log('✅ Colonne month ajoutée');
        }

        // Ajouter la colonne abstract
        db.run(`ALTER TABLE papers ADD COLUMN abstract TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('❌ Erreur lors de l\'ajout de la colonne abstract:', err);
          } else if (!err) {
            console.log('✅ Colonne abstract ajoutée');
          }

          // Fermer la connexion
          db.close((err) => {
            if (err) {
              console.error('❌ Erreur lors de la fermeture:', err);
            } else {
              console.log('🎉 Migration terminée avec succès!');
            }
          });
        });
      });
    });
  });
});