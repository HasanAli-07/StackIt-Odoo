# Admin Features

This document outlines the admin functionality that has been implemented in the StackIt Q&A platform.

## Admin User

An admin user has been created with the following credentials:
- **Email**: `admin@stackit.com`
- **Password**: `admin123`

## Admin Capabilities

### 1. Answer Acceptance
- **Regular Users**: Can only accept answers to their own questions
- **Admin Users**: Can accept answers to any question, regardless of who asked it
- **Visual Indicator**: Admin users see "Accept (Admin)" or "Unaccept (Admin)" buttons

### 2. Answer Unacceptance
- **Regular Users**: Can only unaccept answers to their own questions
- **Admin Users**: Can unaccept answers to any question
- **Visual Indicator**: Admin users see "Unaccept (Admin)" button for accepted answers

### 3. Admin Identification
- **Header Badge**: Admin users have a red "Admin" badge next to their username in the header
- **Profile Menu**: Admin users see an "Admin" badge in their profile dropdown menu

## Technical Implementation

### Server-Side Changes
1. **Authentication Middleware**: Updated to check for admin role
2. **Answer Routes**: Modified accept/unaccept endpoints to allow admin access
3. **Role-Based Authorization**: Added `requireRole` middleware for future admin features

### Client-Side Changes
1. **AuthContext**: Added `isAdmin` property for easy role checking
2. **QuestionDetail Component**: Updated to show admin-specific buttons
3. **Layout Component**: Added admin badges and indicators
4. **Type Definitions**: Updated to include admin role in User interface

### Database
- Admin user seeded with role: `'admin'`
- Role field in users table supports: `'user'` | `'admin'`

## Usage

1. **Login as Admin**: Use the admin credentials to log in
2. **Navigate to Questions**: Go to any question page
3. **Accept/Unaccept Answers**: Admin users will see special buttons for all answers
4. **Visual Feedback**: Admin actions are clearly marked with "(Admin)" suffix

## Future Admin Features

The system is designed to easily add more admin features:

- **Content Moderation**: Delete/edit inappropriate questions/answers
- **User Management**: Ban/unban users, change user roles
- **Tag Management**: Create/edit/delete tags
- **Analytics**: View platform statistics
- **System Settings**: Configure platform-wide settings

## Security Notes

- Admin role is checked on both client and server side
- Server-side validation is the primary security measure
- Client-side checks are for UX only
- All admin actions are logged and can be audited 