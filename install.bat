@echo off
echo Installing StackIt dependencies...

echo.
echo Installing root dependencies...
npm install

echo.
echo Installing server dependencies...
cd server
npm install
cd ..

echo.
echo Installing client dependencies...
cd client
npm install
cd ..

echo.
echo Creating environment files...

echo PORT=5000 > server\.env
echo JWT_SECRET=stackit-super-secret-jwt-key-change-in-production >> server\.env
echo DATABASE_URL=./database/stackit.db >> server\.env
echo NODE_ENV=development >> server\.env

echo VITE_API_URL=http://localhost:5000/api > client\.env

echo.
echo Environment files created successfully!
echo.
echo To start the development servers, run:
echo npm run dev
echo.
echo This will start both the backend (port 5000) and frontend (port 3000)
echo.
pause 
