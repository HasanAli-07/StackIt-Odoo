import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { db } from '../database/init';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { UserWithoutPassword, RegisterRequest, LoginRequest } from '../types';

const router = Router();

// Register user
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], (req: Request, res: Response): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { username, email, password }: RegisterRequest = req.body;

  // Check if user already exists
  db.get(
    'SELECT id FROM users WHERE email = ? OR username = ?',
    [email, username],
    (err, existingUser: any) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (existingUser) {
        res.status(400).json({ error: 'User with this email or username already exists' });
        return;
      }

      // Hash password and create user
      bcrypt.hash(password, 12).then(passwordHash => {
        db.run(
          'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
          [username, email, passwordHash],
          function(err) {
            if (err) {
              res.status(500).json({ error: 'Failed to create user' });
              return;
            }

            // Get the created user
            db.get(
              'SELECT id, username, email, role, avatar_url, bio, reputation, created_at, updated_at FROM users WHERE id = ?',
              [this.lastID],
              (err, user: any) => {
                if (err) {
                  res.status(500).json({ error: 'Database error' });
                  return;
                }

                // Generate JWT token
                const token = jwt.sign(
                  { userId: user.id, email: user.email },
                  process.env.JWT_SECRET!,
                  { expiresIn: '7d' }
                );

                res.status(201).json({
                  success: true,
                  data: {
                    user: user as UserWithoutPassword,
                    token
                  }
                });
              }
            );
          }
        );
      }).catch(error => {
        res.status(500).json({ error: 'Server error' });
      });
    }
  );
});

// Login user
router.post('/login', [
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('password').notEmpty().withMessage('Password is required')
], (req: Request, res: Response): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password }: LoginRequest = req.body;

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, user: any) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Check password
      bcrypt.compare(password, user.password_hash).then(isValidPassword => {
        if (!isValidPassword) {
          res.status(401).json({ error: 'Invalid email or password' });
          return;
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET!,
          { expiresIn: '7d' }
        );

        // Remove password from response
        const { password_hash, ...userWithoutPassword } = user;

        res.json({
          success: true,
          data: {
            user: userWithoutPassword as UserWithoutPassword,
            token
          }
        });
      }).catch(error => {
        res.status(500).json({ error: 'Server error' });
      });
    }
  );
});

// Get current user
router.get('/me', authenticateToken, (req: AuthRequest, res: Response): void => {
  res.json({
    success: true,
    data: req.user
  });
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters')
], (req: AuthRequest, res: Response): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { username, email, bio, avatar_url } = req.body;
  const userId = req.user!.id;

  // Check if username or email already exists (if being updated)
  if (username || email) {
    const checkQuery = 'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?';
    const checkParams = [username || req.user!.username, email || req.user!.email, userId];

    db.get(checkQuery, checkParams, (err, existingUser: any) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (existingUser) {
        res.status(400).json({ error: 'Username or email already taken' });
        return;
      }

      updateUser();
    });
  } else {
    updateUser();
  }

  function updateUser(): void {
    const updateFields = [];
    const updateValues = [];

    if (username) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (bio !== undefined) {
      updateFields.push('bio = ?');
      updateValues.push(bio);
    }
    if (avatar_url !== undefined) {
      updateFields.push('avatar_url = ?');
      updateValues.push(avatar_url);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(userId);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

    db.run(query, updateValues, function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to update profile' });
        return;
      }

      // Get updated user
      db.get(
        'SELECT id, username, email, role, avatar_url, bio, reputation, created_at, updated_at FROM users WHERE id = ?',
        [userId],
        (err, user: any) => {
          if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
          }

          res.json({
            success: true,
            data: user as UserWithoutPassword
          });
        }
      );
    });
  }
});

// Change password
router.put('/password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
], (req: AuthRequest, res: Response): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.id;

  // Get current user with password
  db.get(
    'SELECT password_hash FROM users WHERE id = ?',
    [userId],
    (err, user: any) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      // Verify current password
      bcrypt.compare(currentPassword, user.password_hash).then(isValidPassword => {
        if (!isValidPassword) {
          res.status(400).json({ error: 'Current password is incorrect' });
          return;
        }

        // Hash new password
        bcrypt.hash(newPassword, 12).then(newPasswordHash => {
          // Update password
          db.run(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newPasswordHash, userId],
            function(err) {
              if (err) {
                res.status(500).json({ error: 'Failed to update password' });
                return;
              }

              res.json({
                success: true,
                message: 'Password updated successfully'
              });
            }
          );
        }).catch(error => {
          res.status(500).json({ error: 'Server error' });
        });
      }).catch(error => {
        res.status(500).json({ error: 'Server error' });
      });
    }
  );
});

export default router; 