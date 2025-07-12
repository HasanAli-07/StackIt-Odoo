# StackIt - Q&A Platform

A modern Q&A platform built with React, TypeScript, Node.js, and SQLite.

## Features

- User authentication and authorization
- Ask and answer questions
- Vote on questions and answers
- Real-time notifications
- Rich text editor for questions and answers
- Tag system
- Search and filtering
- Responsive design

## Rate Limiting

The application includes rate limiting to prevent abuse:

- **Development**: 1000 requests per 15 minutes per IP
- **Production**: 100 requests per 15 minutes per IP

### Handling 429 Errors

If you encounter a "429 Too Many Requests" error:

1. **Wait**: The rate limit resets after 15 minutes
2. **Restart Server**: In development, restart the server to clear rate limits:
   - Windows: Run `server/restart-server.bat`
   - Unix/Mac: Run `./server/restart-server.sh`
3. **Check Requests**: Look for excessive API calls in your application

### Common Causes of Rate Limiting

- **Cache-busting timestamps**: Removed automatic cache-busting to reduce requests
- **React Query retries**: Configured to not retry on 429 errors
- **Development reloading**: Hot reloading can cause many requests

### Rate Limit Configuration

Rate limits are configured in `server/src/index.ts`:

```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  // ... other options
});
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. Start the development servers:
   ```bash
   # Terminal 1 - Start server
   cd server && npm run dev
   
   # Terminal 2 - Start client
   cd client && npm run dev
   ```

## Environment Variables

Create `.env` files in both `client/` and `server/` directories:

### Client (.env)
```
VITE_API_URL=http://localhost:5000/api
```

### Server (.env)
```
PORT=5000
CLIENT_URL=http://localhost:3000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## API Endpoints

- `GET /api/questions` - Get all questions
- `POST /api/questions` - Create a question
- `GET /api/questions/:id` - Get question by ID
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, React Query
- **Backend**: Node.js, Express, SQLite
- **Real-time**: Socket.io
- **Authentication**: JWT
- **Database**: SQLite with better-sqlite3

## Development

- **Client**: http://localhost:3000
- **Server**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## License

MIT 