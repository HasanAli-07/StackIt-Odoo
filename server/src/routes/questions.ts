import { Router, Request, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../database/init';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { CreateQuestionRequest, Question, Tag } from '../types';
import sanitizeHtml from 'sanitize-html';

const router = Router();

// Get all questions with pagination and filtering
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('tag').optional().isString().withMessage('Tag must be a string'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('sort').optional().isIn(['newest', 'votes', 'views', 'unanswered']).withMessage('Invalid sort option')
], (req: AuthRequest, res: Response): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  const tag = req.query.tag as string;
  const search = req.query.search as string;
  const sort = req.query.sort as string || 'newest';

  let whereConditions = [];
  let whereParams = [];

  if (tag) {
    whereConditions.push('EXISTS (SELECT 1 FROM question_tags qt JOIN tags t ON qt.tag_id = t.id WHERE qt.question_id = q.id AND t.name = ?)');
    whereParams.push(tag);
  }

  if (search) {
    whereConditions.push('(q.title LIKE ? OR q.description LIKE ?)');
    whereParams.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  let orderClause = 'ORDER BY ';
  switch (sort) {
    case 'votes':
      orderClause += 'q.votes DESC';
      break;
    case 'views':
      orderClause += 'q.views DESC';
      break;
    case 'unanswered':
      orderClause += '(SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) ASC, q.created_at DESC';
      break;
    default:
      orderClause += 'q.created_at DESC';
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total FROM questions q ${whereClause}
  `;

  db.get(countQuery, whereParams, (err, countResult: any) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Get questions
    const questionsQuery = `
      SELECT 
        q.*,
        u.username as user_username,
        u.avatar_url as user_avatar_url,
        u.reputation as user_reputation,
        (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) as answer_count
      FROM questions q
      LEFT JOIN users u ON q.user_id = u.id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    db.all(questionsQuery, [...whereParams, limit, offset], (err, questions: any[]) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      // Get tags for each question
      const questionIds = questions.map(q => q.id);
      if (questionIds.length === 0) {
        res.json({
          success: true,
          data: [],
          pagination: { page, limit, total, totalPages }
        });
        return;
      }

      const tagsQuery = `
        SELECT qt.question_id, t.*
        FROM question_tags qt
        JOIN tags t ON qt.tag_id = t.id
        WHERE qt.question_id IN (${questionIds.map(() => '?').join(',')})
      `;

      db.all(tagsQuery, questionIds, (err, tags: any[]) => {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }

        // Group tags by question
        const tagsByQuestion = tags.reduce((acc: Record<number, Tag[]>, tag: any) => {
          if (!acc[tag.question_id]) {
            acc[tag.question_id] = [];
          }
          acc[tag.question_id].push({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            description: tag.description,
            created_at: tag.created_at
          });
          return acc;
        }, {} as Record<number, Tag[]>);

        // Add tags to questions and format user data
        const questionsWithTags = questions.map((q: any) => ({
          ...q,
          tags: tagsByQuestion[q.id] || [],
          user: q.user_username ? {
            id: q.user_id,
            username: q.user_username,
            avatar_url: q.user_avatar_url,
            reputation: q.user_reputation,
            role: 'user', // Default role
            email: '', // Not included in questions list for privacy
            bio: '',
            created_at: '',
            updated_at: ''
          } : undefined
        }));

        res.json({
          success: true,
          data: questionsWithTags,
          pagination: { page, limit, total, totalPages }
        });
      });
    });
  });
});

// Get question by ID
router.get('/:id', optionalAuth, (req: AuthRequest, res: Response): void => {
  const questionId = parseInt(req.params.id);
  const userId = req.user?.id;

  if (isNaN(questionId)) {
    res.status(400).json({ error: 'Invalid question ID' });
    return;
  }

  // Increment view count if user is not the author
  if (userId) {
    db.get('SELECT user_id FROM questions WHERE id = ?', [questionId], (err, question: any) => {
      if (!err && question && question.user_id !== userId) {
        db.run('UPDATE questions SET views = views + 1 WHERE id = ?', [questionId]);
      }
    });
  }

  // Get question with user info
  const questionQuery = `
    SELECT 
      q.*,
      u.username as user_username,
      u.avatar_url as user_avatar_url,
      u.reputation as user_reputation,
      u.bio as user_bio
    FROM questions q
    LEFT JOIN users u ON q.user_id = u.id
    WHERE q.id = ?
  `;

  db.get(questionQuery, [questionId], (err, question: any) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // Get tags
    const tagsQuery = `
      SELECT t.*
      FROM question_tags qt
      JOIN tags t ON qt.tag_id = t.id
      WHERE qt.question_id = ?
    `;

    db.all(tagsQuery, [questionId], (err, tags: any[]) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      // Get answers
      const answersQuery = `
        SELECT 
          a.*,
          u.username as user_username,
          u.avatar_url as user_avatar_url,
          u.reputation as user_reputation
        FROM answers a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.question_id = ?
        ORDER BY a.is_accepted DESC, a.votes DESC, a.created_at ASC
      `;

      db.all(answersQuery, [questionId], (err, answers: any[]) => {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }

        res.json({
          success: true,
          data: {
            ...question,
            tags,
            answers,
            user: question.user_username ? {
              id: question.user_id,
              username: question.user_username,
              avatar_url: question.user_avatar_url,
              reputation: question.user_reputation,
              bio: question.user_bio,
              role: 'user', // Default role
              email: '', // Not included for privacy
              created_at: '',
              updated_at: ''
            } : undefined
          }
        });
      });
    });
  });
});

// Create new question
router.post('/', authenticateToken, [
  body('title')
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
  body('description')
    .isLength({ min: 20 })
    .withMessage('Description must be at least 20 characters long'),
  body('tags')
    .isArray({ min: 1, max: 5 })
    .withMessage('Must include 1-5 tags'),
  body('tags.*')
    .isLength({ min: 1, max: 20 })
    .withMessage('Each tag must be between 1 and 20 characters')
], (req: AuthRequest, res: Response): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { title, description, tags }: CreateQuestionRequest = req.body;
  const userId = req.user!.id;

  // Sanitize HTML content
  const sanitizedDescription = sanitizeHtml(description, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'ol', 'ul', 'li', 'a', 'img'],
    allowedAttributes: {
      'a': ['href'],
      'img': ['src', 'alt', 'width', 'height']
    }
  });

  db.run(
    'INSERT INTO questions (title, description, user_id) VALUES (?, ?, ?)',
    [title, sanitizedDescription, userId],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to create question' });
        return;
      }

      const questionId = this.lastID;

      // Handle tags
      const tagPromises = tags.map((tagName: string) => {
        return new Promise<void>((resolve, reject) => {
          // First, try to find existing tag
          db.get('SELECT id FROM tags WHERE name = ?', [tagName], (err, existingTag: any) => {
            if (err) {
              reject(err);
              return;
            }

            if (existingTag) {
              // Tag exists, link it to question
              db.run('INSERT INTO question_tags (question_id, tag_id) VALUES (?, ?)', 
                [questionId, existingTag.id], (err) => {
                  if (err) reject(err);
                  else resolve();
                });
            } else {
              // Create new tag
              db.run('INSERT INTO tags (name) VALUES (?)', [tagName], function(err) {
                if (err) {
                  reject(err);
                  return;
                }

                // Link new tag to question
                db.run('INSERT INTO question_tags (question_id, tag_id) VALUES (?, ?)', 
                  [questionId, this.lastID], (err) => {
                    if (err) reject(err);
                    else resolve();
                  });
              });
            }
          });
        });
      });

      Promise.all(tagPromises)
        .then(() => {
          // Get the created question with tags
          const questionQuery = `
            SELECT 
              q.*,
              u.username as user_username,
              u.avatar_url as user_avatar_url,
              u.reputation as user_reputation
            FROM questions q
            LEFT JOIN users u ON q.user_id = u.id
            WHERE q.id = ?
          `;

          db.get(questionQuery, [questionId], (err, question: any) => {
            if (err) {
              res.status(500).json({ error: 'Database error' });
              return;
            }

            // Get tags
            const tagsQuery = `
              SELECT t.*
              FROM question_tags qt
              JOIN tags t ON qt.tag_id = t.id
              WHERE qt.question_id = ?
            `;

            db.all(tagsQuery, [questionId], (err, tags: any[]) => {
              if (err) {
                res.status(500).json({ error: 'Database error' });
                return;
              }

              res.status(201).json({
                success: true,
                data: {
                  ...question,
                  tags
                }
              });
            });
          });
        })
        .catch(err => {
          res.status(500).json({ error: 'Failed to process tags' });
        });
    }
  );
});

// Update question
router.put('/:id', authenticateToken, [
  body('title')
    .optional()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
  body('description')
    .optional()
    .isLength({ min: 20 })
    .withMessage('Description must be at least 20 characters long'),
  body('tags')
    .optional()
    .isArray({ min: 1, max: 5 })
    .withMessage('Must include 1-5 tags')
], (req: AuthRequest, res: Response): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const questionId = parseInt(req.params.id);
  const userId = req.user!.id;
  const { title, description, tags } = req.body;

  if (isNaN(questionId)) {
    res.status(400).json({ error: 'Invalid question ID' });
    return;
  }

  // Check if user owns the question or is admin
  db.get('SELECT user_id, role FROM questions q JOIN users u ON q.user_id = u.id WHERE q.id = ?', 
    [questionId], (err, question: any) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      if (question.user_id !== userId && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Not authorized to edit this question' });
        return;
      }

      // Update question
      const updateFields = [];
      const updateValues = [];

      if (title) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }

      if (description) {
        const sanitizedDescription = sanitizeHtml(description, {
          allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'ol', 'ul', 'li', 'a', 'img'],
          allowedAttributes: {
            'a': ['href'],
            'img': ['src', 'alt', 'width', 'height']
          }
        });
        updateFields.push('description = ?');
        updateValues.push(sanitizedDescription);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(questionId);

      const updateQuery = `UPDATE questions SET ${updateFields.join(', ')} WHERE id = ?`;

      db.run(updateQuery, updateValues, function(err) {
        if (err) {
          res.status(500).json({ error: 'Failed to update question' });
          return;
        }

        // Update tags if provided
        if (tags) {
          // Remove existing tags
          db.run('DELETE FROM question_tags WHERE question_id = ?', [questionId], (err) => {
            if (err) {
              res.status(500).json({ error: 'Failed to update tags' });
              return;
            }

            // Add new tags
            const tagPromises = tags.map((tagName: string) => {
              return new Promise<void>((resolve, reject) => {
                db.get('SELECT id FROM tags WHERE name = ?', [tagName], (err, existingTag: any) => {
                  if (err) {
                    reject(err);
                    return;
                  }

                  if (existingTag) {
                    db.run('INSERT INTO question_tags (question_id, tag_id) VALUES (?, ?)', 
                      [questionId, existingTag.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                      });
                  } else {
                    db.run('INSERT INTO tags (name) VALUES (?)', [tagName], function(err) {
                      if (err) {
                        reject(err);
                        return;
                      }

                      db.run('INSERT INTO question_tags (question_id, tag_id) VALUES (?, ?)', 
                        [questionId, this.lastID], (err) => {
                          if (err) reject(err);
                          else resolve();
                        });
                    });
                  }
                });
              });
            });

            Promise.all(tagPromises)
              .then(() => {
                res.json({
                  success: true,
                  message: 'Question updated successfully'
                });
              })
              .catch(err => {
                res.status(500).json({ error: 'Failed to update tags' });
              });
          });
        } else {
          res.json({
            success: true,
            message: 'Question updated successfully'
          });
        }
      });
    });
});

// Delete question
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  const questionId = parseInt(req.params.id);
  const userId = req.user!.id;

  if (isNaN(questionId)) {
    res.status(400).json({ error: 'Invalid question ID' });
    return;
  }

  // Check if user owns the question or is admin
  db.get('SELECT user_id FROM questions WHERE id = ?', [questionId], (err, question: any) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    if (question.user_id !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to delete this question' });
      return;
    }

    db.run('DELETE FROM questions WHERE id = ?', [questionId], function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to delete question' });
        return;
      }

      res.json({
        success: true,
        message: 'Question deleted successfully'
      });
    });
  });
});

// Vote on question
router.post('/:id/vote', authenticateToken, [
  body('vote_type').isInt({ min: -1, max: 1 }).withMessage('Vote type must be -1 or 1')
], (req: AuthRequest, res: Response): void => {
  console.log('Vote request body:', req.body);
  console.log('Vote request params:', req.params);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const questionId = parseInt(req.params.id);
  const userId = req.user!.id;
  const { vote_type } = req.body;

  if (isNaN(questionId)) {
    res.status(400).json({ error: 'Invalid question ID' });
    return;
  }

  // Check if user is voting on their own question
  db.get('SELECT user_id FROM questions WHERE id = ?', [questionId], (err, question: any) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    if (question.user_id === userId) {
      res.status(400).json({ error: 'Cannot vote on your own question' });
      return;
    }

    // Check if user already voted
    db.get('SELECT vote_type FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [userId, 'question', questionId], (err, existingVote: any) => {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }

        if (existingVote) {
          if (existingVote.vote_type === vote_type) {
            // Remove vote
            db.run('DELETE FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?',
              [userId, 'question', questionId], (err) => {
                if (err) {
                  res.status(500).json({ error: 'Failed to remove vote' });
                  return;
                }

                // Update question vote count
                const voteChange = -existingVote.vote_type;
                db.run('UPDATE questions SET votes = votes + ? WHERE id = ?',
                  [voteChange, questionId], (err) => {
                    if (err) {
                      res.status(500).json({ error: 'Failed to update vote count' });
                      return;
                    }

                    res.json({
                      success: true,
                      message: 'Vote removed',
                      vote_type: 0
                    });
                  });
              });
          } else {
            // Change vote
            db.run('UPDATE votes SET vote_type = ? WHERE user_id = ? AND target_type = ? AND target_id = ?',
              [vote_type, userId, 'question', questionId], (err) => {
                if (err) {
                  res.status(500).json({ error: 'Failed to update vote' });
                  return;
                }

                // Update question vote count
                const voteChange = vote_type - existingVote.vote_type;
                db.run('UPDATE questions SET votes = votes + ? WHERE id = ?',
                  [voteChange, questionId], (err) => {
                    if (err) {
                      res.status(500).json({ error: 'Failed to update vote count' });
                      return;
                    }

                    res.json({
                      success: true,
                      message: 'Vote updated',
                      vote_type
                    });
                  });
              });
          }
        } else {
          // Add new vote
          db.run('INSERT INTO votes (user_id, target_type, target_id, vote_type) VALUES (?, ?, ?, ?)',
            [userId, 'question', questionId, vote_type], (err) => {
              if (err) {
                res.status(500).json({ error: 'Failed to add vote' });
                return;
              }

              // Update question vote count
              db.run('UPDATE questions SET votes = votes + ? WHERE id = ?',
                [vote_type, questionId], (err) => {
                  if (err) {
                    res.status(500).json({ error: 'Failed to update vote count' });
                    return;
                  }

                  res.json({
                    success: true,
                    message: 'Vote added',
                    vote_type
                  });
                });
            });
        }
      });
  });
});

// Import answers routes
import answerRoutes from './answers';

// Mount answers routes under questions
router.use('/:questionId/answers', answerRoutes);

export default router; 