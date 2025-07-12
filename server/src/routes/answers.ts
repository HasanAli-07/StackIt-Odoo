import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../database/init';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CreateAnswerRequest, VoteRequest } from '../types';
import sanitizeHtml from 'sanitize-html';

const router = Router({ mergeParams: true });

// Middleware to extract questionId from URL
const extractQuestionId = (req: Request, res: Response, next: NextFunction) => {
  const questionId = parseInt(req.params.questionId || req.baseUrl.split('/').pop() || '0');
  if (isNaN(questionId)) {
    res.status(400).json({ error: 'Invalid question ID' });
    return;
  }
  (req as any).questionId = questionId;
  next();
};

// Create answer
router.post('/', extractQuestionId, authenticateToken, [
  body('content')
    .isLength({ min: 20 })
    .withMessage('Answer must be at least 20 characters long')
], (req: AuthRequest, res: Response): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const questionId = (req as any).questionId;
  const userId = req.user!.id;
  const { content }: CreateAnswerRequest = req.body;

  // Check if question exists
  db.get('SELECT id FROM questions WHERE id = ?', [questionId], (err, question: any) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'ol', 'ul', 'li', 'a', 'img', 'pre', 'code'],
      allowedAttributes: {
        'a': ['href'],
        'img': ['src', 'alt', 'width', 'height']
      }
    });

    // Create answer
    db.run(
      'INSERT INTO answers (content, question_id, user_id) VALUES (?, ?, ?)',
      [sanitizedContent, questionId, userId],
      function(err) {
        if (err) {
          res.status(500).json({ error: 'Failed to create answer' });
          return;
        }

        const answerId = this.lastID;

        // Get the created answer with user info
        const answerQuery = `
          SELECT 
            a.*,
            u.username as user_username,
            u.avatar_url as user_avatar_url,
            u.reputation as user_reputation
          FROM answers a
          LEFT JOIN users u ON a.user_id = u.id
          WHERE a.id = ?
        `;

        db.get(answerQuery, [answerId], (err, answer: any) => {
          if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
          }

          // Create notification for question owner
          db.get('SELECT user_id FROM questions WHERE id = ?', [questionId], (err, questionOwner: any) => {
            if (!err && questionOwner && questionOwner.user_id !== userId) {
              db.run(
                'INSERT INTO notifications (user_id, type, title, message, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)',
                [
                  questionOwner.user_id,
                  'answer',
                  'New answer to your question',
                  `${req.user!.username} answered your question`,
                  answerId,
                  'answer'
                ]
              );
            }
          });

          res.status(201).json({
            success: true,
            data: answer
          });
        });
      }
    );
  });
});

// Update answer
router.put('/:id', authenticateToken, [
  body('content')
    .isLength({ min: 20 })
    .withMessage('Answer must be at least 20 characters long')
], (req: AuthRequest, res: Response): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const answerId = parseInt(req.params.id);
  const userId = req.user!.id;
  const { content } = req.body;

  if (isNaN(answerId)) {
    res.status(400).json({ error: 'Invalid answer ID' });
    return;
  }

  // Check if user owns the answer or is admin
  db.get('SELECT user_id FROM answers WHERE id = ?', [answerId], (err, answer: any) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!answer) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    if (answer.user_id !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to edit this answer' });
      return;
    }

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'ol', 'ul', 'li', 'a', 'img', 'pre', 'code'],
      allowedAttributes: {
        'a': ['href'],
        'img': ['src', 'alt', 'width', 'height']
      }
    });

    // Update answer
    db.run(
      'UPDATE answers SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sanitizedContent, answerId],
      function(err) {
        if (err) {
          res.status(500).json({ error: 'Failed to update answer' });
          return;
        }

        res.json({
          success: true,
          message: 'Answer updated successfully'
        });
      }
    );
  });
});

// Delete answer
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  const answerId = parseInt(req.params.id);
  const userId = req.user!.id;

  if (isNaN(answerId)) {
    res.status(400).json({ error: 'Invalid answer ID' });
    return;
  }

  // Check if user owns the answer or is admin
  db.get('SELECT user_id FROM answers WHERE id = ?', [answerId], (err, answer: any) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!answer) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    if (answer.user_id !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to delete this answer' });
      return;
    }

    db.run('DELETE FROM answers WHERE id = ?', [answerId], function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to delete answer' });
        return;
      }

      res.json({
        success: true,
        message: 'Answer deleted successfully'
      });
    });
  });
});

// Vote on answer
router.post('/:id/vote', authenticateToken, [
  body('vote_type').isInt({ min: -1, max: 1 }).withMessage('Vote type must be -1 or 1')
], (req: AuthRequest, res: Response): void => {
  console.log('Answer vote request body:', req.body);
  console.log('Answer vote request params:', req.params);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Answer validation errors:', errors.array());
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const answerId = parseInt(req.params.id);
  const userId = req.user!.id;
  const { vote_type }: VoteRequest = req.body;

  if (isNaN(answerId)) {
    res.status(400).json({ error: 'Invalid answer ID' });
    return;
  }

  // Check if user is voting on their own answer
  db.get('SELECT user_id FROM answers WHERE id = ?', [answerId], (err, answer: any) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!answer) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    if (answer.user_id === userId) {
      res.status(400).json({ error: 'Cannot vote on your own answer' });
      return;
    }

    // Check if user already voted
    db.get('SELECT vote_type FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [userId, 'answer', answerId], (err, existingVote: any) => {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }

        if (existingVote) {
          if (existingVote.vote_type === vote_type) {
            // Remove vote
            db.run('DELETE FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?',
              [userId, 'answer', answerId], (err) => {
                if (err) {
                  res.status(500).json({ error: 'Failed to remove vote' });
                  return;
                }

                // Update answer vote count
                const voteChange = -existingVote.vote_type;
                db.run('UPDATE answers SET votes = votes + ? WHERE id = ?',
                  [voteChange, answerId], (err) => {
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
              [vote_type, userId, 'answer', answerId], (err) => {
                if (err) {
                  res.status(500).json({ error: 'Failed to update vote' });
                  return;
                }

                // Update answer vote count
                const voteChange = vote_type - existingVote.vote_type;
                db.run('UPDATE answers SET votes = votes + ? WHERE id = ?',
                  [voteChange, answerId], (err) => {
                    if (err) {
                      res.status(500).json({ error: 'Failed to update vote count' });
                      return;
                    }

                    // Create notification for answer author (if not voting on own answer)
                    if (answer.user_id !== userId) {
                      const voteText = vote_type === 1 ? 'upvoted' : 'downvoted';
                      db.run(
                        'INSERT INTO notifications (user_id, type, title, message, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)',
                        [
                          answer.user_id,
                          'vote',
                          'Someone voted on your answer',
                          `${req.user!.username} ${voteText} your answer`,
                          answerId,
                          'answer'
                        ]
                      );
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
            [userId, 'answer', answerId, vote_type], (err) => {
              if (err) {
                res.status(500).json({ error: 'Failed to add vote' });
                return;
              }

              // Update answer vote count
              db.run('UPDATE answers SET votes = votes + ? WHERE id = ?',
                [vote_type, answerId], (err) => {
                  if (err) {
                    res.status(500).json({ error: 'Failed to update vote count' });
                    return;
                  }

                  // Create notification for answer author (if not voting on own answer)
                  if (answer.user_id !== userId) {
                    const voteText = vote_type === 1 ? 'upvoted' : 'downvoted';
                    db.run(
                      'INSERT INTO notifications (user_id, type, title, message, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)',
                      [
                        answer.user_id,
                        'vote',
                        'Someone voted on your answer',
                        `${req.user!.username} ${voteText} your answer`,
                        answerId,
                        'answer'
                      ]
                    );
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

// Accept answer
router.post('/:id/accept', authenticateToken, (req: AuthRequest, res: Response): void => {
  const answerId = parseInt(req.params.id);
  const userId = req.user!.id;

  if (isNaN(answerId)) {
    res.status(400).json({ error: 'Invalid answer ID' });
    return;
  }

  // Get answer with question info
  db.get(`
    SELECT a.*, q.user_id as question_user_id, q.title as question_title
    FROM answers a
    JOIN questions q ON a.question_id = q.id
    WHERE a.id = ?
  `, [answerId], (err, answer: any) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!answer) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    // Check if user owns the question or is admin
    if (answer.question_user_id !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the question owner or admin can accept answers' });
      return;
    }

    // Check if answer is already accepted
    if (answer.is_accepted) {
      res.status(400).json({ error: 'Answer is already accepted' });
      return;
    }

    // Unaccept any previously accepted answers for this question
    db.run('UPDATE answers SET is_accepted = 0 WHERE question_id = ?', [answer.question_id], (err) => {
      if (err) {
        res.status(500).json({ error: 'Failed to unaccept previous answers' });
        return;
      }

      // Accept this answer
      db.run('UPDATE answers SET is_accepted = 1 WHERE id = ?', [answerId], (err) => {
        if (err) {
          res.status(500).json({ error: 'Failed to accept answer' });
          return;
        }

        // Create notification for answer author
        if (answer.user_id !== userId) {
          db.run(
            'INSERT INTO notifications (user_id, type, title, message, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)',
            [
              answer.user_id,
              'answer',
              'Your answer was accepted',
              `Your answer to "${answer.question_title}" was accepted`,
              answerId,
              'answer'
            ]
          );
        }

        res.json({
          success: true,
          message: 'Answer accepted successfully'
        });
      });
    });
  });
});

// Unaccept answer
router.post('/:id/unaccept', authenticateToken, (req: AuthRequest, res: Response): void => {
  const answerId = parseInt(req.params.id);
  const userId = req.user!.id;

  if (isNaN(answerId)) {
    res.status(400).json({ error: 'Invalid answer ID' });
    return;
  }

  // Get answer with question info
  db.get(`
    SELECT a.*, q.user_id as question_user_id
    FROM answers a
    JOIN questions q ON a.question_id = q.id
    WHERE a.id = ?
  `, [answerId], (err, answer: any) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!answer) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    // Check if user owns the question or is admin
    if (answer.question_user_id !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the question owner or admin can unaccept answers' });
      return;
    }

    // Check if answer is accepted
    if (!answer.is_accepted) {
      res.status(400).json({ error: 'Answer is not accepted' });
      return;
    }

    // Unaccept the answer
    db.run('UPDATE answers SET is_accepted = 0 WHERE id = ?', [answerId], (err) => {
      if (err) {
        res.status(500).json({ error: 'Failed to unaccept answer' });
        return;
      }

      res.json({
        success: true,
        message: 'Answer unaccepted successfully'
      });
    });
  });
});

export default router; 