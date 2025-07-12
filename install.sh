#!/bin/bash

echo "Installing StackIt dependencies..."

echo
echo "Installing root dependencies..."
npm install

echo
echo "Installing server dependencies..."
cd server
npm install
cd ..

echo
echo "Installing client dependencies..."
cd client
npm install
cd ..

echo
echo "Creating environment files..."

cat > server/.env << EOF
PORT=5000
JWT_SECRET=stackit-super-secret-jwt-key-change-in-production
DATABASE_URL=./database/stackit.db
NODE_ENV=development
EOF

cat > client/.env << EOF
VITE_API_URL=http://localhost:5000/api
EOF

echo
echo "Environment files created successfully!"
echo
echo "To start the development servers, run:"
echo "npm run dev"
echo
echo "This will start both the backend (port 5000) and frontend (port 3000)"
echo 