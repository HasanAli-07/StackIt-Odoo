import bcrypt from 'bcryptjs';
import { db } from './init';

async function seed() {
  try {
    console.log('Starting database seeding...');

    // Sample users
    const sampleUsers = [
      {
        username: 'admin',
        email: 'admin@stackit.com',
        password: 'admin123',
        role: 'admin',
        bio: 'System administrator'
      },
      {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user',
        bio: 'Software developer passionate about web technologies'
      },
      {
        username: 'jane_smith',
        email: 'jane@example.com',
        password: 'password123',
        role: 'user',
        bio: 'Full-stack developer and open source contributor'
      },
      {
        username: 'tech_guru',
        email: 'tech@example.com',
        password: 'password123',
        role: 'user',
        bio: 'Technology enthusiast and problem solver'
      }
    ];

    // Hash passwords and insert users
    for (const user of sampleUsers) {
      const passwordHash = await bcrypt.hash(user.password, 12);
      
      db.run(
        'INSERT OR IGNORE INTO users (username, email, password_hash, role, bio) VALUES (?, ?, ?, ?, ?)',
        [user.username, user.email, passwordHash, user.role, user.bio],
        function(err) {
          if (err) {
            console.error(`Error inserting user ${user.username}:`, err);
          } else {
            console.log(`✅ User ${user.username} seeded successfully`);
          }
        }
      );
    }

    // Sample tags
    const sampleTags = [
      { name: 'javascript', description: 'JavaScript programming language', color: '#F7DF1E' },
      { name: 'react', description: 'React.js framework', color: '#61DAFB' },
      { name: 'nodejs', description: 'Node.js runtime', color: '#339933' },
      { name: 'typescript', description: 'TypeScript programming language', color: '#3178C6' },
      { name: 'python', description: 'Python programming language', color: '#3776AB' },
      { name: 'database', description: 'Database related questions', color: '#336791' },
      { name: 'api', description: 'API development and integration', color: '#FF6B6B' },
      { name: 'frontend', description: 'Frontend development', color: '#4ECDC4' },
      { name: 'backend', description: 'Backend development', color: '#45B7D1' },
      { name: 'devops', description: 'DevOps and deployment', color: '#FFA500' }
    ];

    // Insert tags
    for (const tag of sampleTags) {
      db.run(
        'INSERT OR IGNORE INTO tags (name, description, color) VALUES (?, ?, ?)',
        [tag.name, tag.description, tag.color],
        function(err) {
          if (err) {
            console.error(`Error inserting tag ${tag.name}:`, err);
          } else {
            console.log(`✅ Tag ${tag.name} seeded successfully`);
          }
        }
      );
    }

    // Sample questions
    const sampleQuestions = [
      {
        title: 'How to implement authentication in React with JWT?',
        description: 'I\'m building a React application and need to implement user authentication using JWT tokens. What\'s the best approach for handling login, token storage, and protected routes?',
        user_id: 2,
        tags: ['react', 'javascript', 'api']
      },
      {
        title: 'Best practices for Node.js error handling',
        description: 'What are the recommended patterns for handling errors in a Node.js Express application? I want to ensure proper error logging and user-friendly error responses.',
        user_id: 3,
        tags: ['nodejs', 'backend', 'javascript']
      },
      {
        title: 'TypeScript vs JavaScript: When to use which?',
        description: 'I\'m starting a new project and wondering whether to use TypeScript or stick with JavaScript. What are the pros and cons of each approach?',
        user_id: 4,
        tags: ['typescript', 'javascript', 'frontend']
      },
      {
        title: 'Database design for a Q&A platform',
        description: 'I\'m designing the database schema for a Q&A platform similar to Stack Overflow. What tables and relationships should I consider for questions, answers, users, and voting?',
        user_id: 2,
        tags: ['database', 'backend', 'api']
      }
    ];

    // Insert questions
    for (const question of sampleQuestions) {
      db.run(
        'INSERT INTO questions (title, description, user_id) VALUES (?, ?, ?)',
        [question.title, question.description, question.user_id],
        function(err) {
          if (err) {
            console.error(`Error inserting question:`, err);
          } else {
            const questionId = this.lastID;
            console.log(`✅ Question "${question.title}" seeded successfully`);
            
            // Link tags to question
            for (const tagName of question.tags) {
              db.get('SELECT id FROM tags WHERE name = ?', [tagName], (err, tag: any) => {
                if (tag) {
                  db.run('INSERT OR IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)', 
                    [questionId, tag.id], (err) => {
                      if (err) {
                        console.error(`Error linking tag ${tagName} to question:`, err);
                      }
                    });
                }
              });
            }
          }
        }
      );
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Sample Users:');
    console.log('- admin@stackit.com / admin123 (Admin)');
    console.log('- john@example.com / password123 (User)');
    console.log('- jane@example.com / password123 (User)');
    console.log('- tech@example.com / password123 (User)');
    
    setTimeout(() => {
      process.exit(0);
    }, 1000);

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

seed(); 