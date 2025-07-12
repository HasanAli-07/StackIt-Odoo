import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_URL || './database/stackit.db';

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath);

export async function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
          avatar_url TEXT,
          bio TEXT,
          reputation INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tags table
      db.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          color TEXT DEFAULT '#3B82F6',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Questions table
      db.run(`
        CREATE TABLE IF NOT EXISTS questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          views INTEGER DEFAULT 0,
          votes INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Question tags junction table
      db.run(`
        CREATE TABLE IF NOT EXISTS question_tags (
          question_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          PRIMARY KEY (question_id, tag_id),
          FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
        )
      `);

      // Answers table
      db.run(`
        CREATE TABLE IF NOT EXISTS answers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          question_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          votes INTEGER DEFAULT 0,
          is_accepted BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Votes table
      db.run(`
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          target_type TEXT NOT NULL CHECK (target_type IN ('question', 'answer')),
          target_id INTEGER NOT NULL,
          vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, target_type, target_id),
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Notifications table
      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('answer', 'comment', 'mention', 'vote')),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          related_id INTEGER,
          related_type TEXT,
          is_read BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Comments table
      db.run(`
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          target_type TEXT NOT NULL CHECK (target_type IN ('question', 'answer')),
          target_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at)');
      db.run('CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_type, target_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)');

      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database tables created successfully');
          resolve();
        }
      });
    });
  });
}

export function closeDatabase(): void {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
  });
} 