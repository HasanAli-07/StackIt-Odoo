const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'stackit.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking database contents...');

// Check questions
db.get('SELECT COUNT(*) as count FROM questions', (err, result) => {
  if (err) {
    console.error('Error checking questions:', err);
  } else {
    console.log(`Questions count: ${result.count}`);
  }
});

// Check answers
db.get('SELECT COUNT(*) as count FROM answers', (err, result) => {
  if (err) {
    console.error('Error checking answers:', err);
  } else {
    console.log(`Answers count: ${result.count}`);
  }
});

// Get latest questions
db.all('SELECT id, title, created_at FROM questions ORDER BY created_at DESC LIMIT 5', (err, results) => {
  if (err) {
    console.error('Error getting questions:', err);
  } else {
    console.log('Latest questions:');
    results.forEach(q => console.log(`- ID: ${q.id}, Title: ${q.title}, Created: ${q.created_at}`));
  }
});

// Get latest answers
db.all('SELECT id, question_id, content, created_at FROM answers ORDER BY created_at DESC LIMIT 5', (err, results) => {
  if (err) {
    console.error('Error getting answers:', err);
  } else {
    console.log('Latest answers:');
    results.forEach(a => console.log(`- ID: ${a.id}, Question: ${a.question_id}, Content: ${a.content.substring(0, 50)}..., Created: ${a.created_at}`));
  }
  
  // Close database
  db.close();
}); 