import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { db } from '../database/init';
import { AuthRequest } from '../middleware/auth';
import { Notification } from '../types';

const router = Router();

// Get user notifications
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('unread').optional().isBoolean().withMessage('Unread must be a boolean')
], (req: AuthRequest, res: Response): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const unreadOnly = req.query.unread === 'true';

  let whereConditions = ['user_id = ?'];
  let whereParams = [userId];

  if (unreadOnly) {
    whereConditions.push('is_read = 0');
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total FROM notifications ${whereClause}
  `;

  db.get(countQuery, whereParams, (err, countResult: any) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Get notifications
    const notificationsQuery = `
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    db.all(notificationsQuery, [...whereParams, limit, offset], (err, notifications) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      res.json({
        success: true,
        data: notifications as Notification[],
        pagination: { page, limit, total, totalPages }
      });
    });
  });
});

// Mark notification as read
router.put('/:id/read', (req: AuthRequest, res: Response): void => {
  const notificationId = parseInt(req.params.id);
  const userId = req.user!.id;

  if (isNaN(notificationId)) {
    res.status(400).json({ error: 'Invalid notification ID' });
    return;
  }

  db.run(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    }
  );
});

// Mark all notifications as read
router.put('/read-all', (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;

  db.run(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
    [userId],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    }
  );
});

// Get unread notification count
router.get('/unread-count', (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;

  db.get(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId],
    (err, result: any) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      res.json({
        success: true,
        data: { count: result.count }
      });
    }
  );
});

// Delete notification
router.delete('/:id', (req: AuthRequest, res: Response): void => {
  const notificationId = parseInt(req.params.id);
  const userId = req.user!.id;

  if (isNaN(notificationId)) {
    res.status(400).json({ error: 'Invalid notification ID' });
    return;
  }

  db.run(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId],
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    }
  );
});

export default router; 