import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../database/init';
import { UserWithoutPassword } from '../types';

export interface AuthRequest extends Request {
  user?: UserWithoutPassword;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    // Get user from database
    db.get(
      'SELECT id, username, email, role, avatar_url, bio, reputation, created_at, updated_at FROM users WHERE id = ?',
      [decoded.userId],
      (err, user) => {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }
        if (!user) {
          res.status(404).json({ error: 'User not found' });
          return;
        }
        
        req.user = user as UserWithoutPassword;
        next();
      }
    );
  });
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next(); // Continue without user
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
    if (err) {
      next(); // Continue without user
      return;
    }

    // Get user from database
    db.get(
      'SELECT id, username, email, role, avatar_url, bio, reputation, created_at, updated_at FROM users WHERE id = ?',
      [decoded.userId],
      (err, user) => {
        if (err || !user) {
          next(); // Continue without user
          return;
        }
        
        req.user = user as UserWithoutPassword;
        next();
      }
    );
  });
}; 