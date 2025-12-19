# School Management System
## Description

This Node.js application provides a comprehensive solution for managing school administrative tasks and student examination processes. It has distinct modules for teachers/administrators and students, facilitating various actions such as exam management, student promotion, and staff administration.

## Features

### Teachers/Admin
Staff Registration: Admin can register new staff members.
Staff Login: Secure login functionality for staff members.
Admin Withdrawing Staff: Admin has the ability to remove staff members.
Admin Suspending Staff: Admin can suspend staff accounts.
Creating Exams: Staff can create exams for students.
Promoting Student: Admin can manage student promotions to the next grade or level.
Staff Withdrawal: Staff can deregister themselves from the system.
Publish/Unpublish Results: Admin can control the publication of exam results.

### Students
Writing Exams: Students can complete their exams online.
Checking Exam Results: Students can check their exam results.
Student Can Attempt Exam Twice: The system allows students a second attempt at an exam.
Exams Remark: Functionality to request remarking of an exam.

## Academic Module Setup (Admin Section)
### Overview
The Academic module is the core of the school management system, where the administrator can configure and manage the academic structure of the institution. The following are the key components of the Academic module:

### Components
Subjects: Admin can manage the list of subjects that are taught in the institution. This includes adding new subjects, editing existing ones, and assigning them to specific year groups or programs.

#### Programs: The admin can create and manage various academic programs offered by the institution. Programs may consist of a set of subjects and are usually associated with a particular level of study or department.

#### Student Admission: The administration of student admissions falls here, where the admin can oversee the entire admission process from application to enrollment.

#### Staff Employment: This component deals with the hiring and management of teaching and non-teaching staff, including their roles, permissions, and personal information management.

#### Academic Year: Administrators define the start and end dates of an academic year, and it's often the top-level time frame for planning the academic calendar.

#### Academic Term: This refers to the division of the academic year into terms or semesters. Admins set up term dates and associate them with the corresponding academic activities.

#### Year Group: The admin can set up and manage year groups or classes, assign students to them, and track their progress throughout the academic year.

### Functionality

- Set up and manage academic years, terms, and specific dates for each.
- Create and modify the structure of year groups and programs.
- Manage admissions, including setting up admission criteria, application forms, and tracking applicant status.
- Oversee staff employment processes, from recruitment to assigning roles within the school structure.
- Define subjects, along with the curricula, and associate them with the appropriate year groups and programs.

## Packages

This project uses the following main dependencies:

- `dotenv`: For managing environment variables.
- `express`: Fast, unopinionated, minimalist web framework for Node.js.
- `mongoose`: MongoDB object modeling tool designed to work in an asynchronous environment.

And the following development dependencies:

- `morgan`: HTTP request logger middleware for Node.js.
- `nodemon`: A utility that will monitor for any changes in your source and automatically restart your server.

## Installation

Before installing, make sure you have Node.js and npm (Node Package Manager) installed on your system. You can download them from [Node.js official website](https://nodejs.org/).

1. Clone the repository to your local machine.

2. Install the dependencies:
```bash
npm install
```

3. **Environment Configuration**

Create a `.env` file in the root directory by copying the example file:
```bash
cp .env.example .env
```

Edit the `.env` file and configure the following **required** environment variables:

```bash
# Database Configuration (REQUIRED)
MONGO_URL=your_mongodb_connection_string

# JWT Configuration (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRY=5d

# Server Configuration (REQUIRED)
PORT=8082
NODE_ENV=development
```

**Important Security Notes:**
- Never commit the `.env` file to version control
- Generate a strong JWT secret using: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- The JWT_SECRET must be at least 32 characters long
- Keep your MongoDB credentials secure

4. **Removing .env from Git History (if previously committed)**

If you've accidentally committed the `.env` file to git history, remove it using:
```bash
# Remove from current commit
git rm --cached .env

# To remove from entire git history (CAUTION: This rewrites history)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team first!)
git push origin --force --all
```

**Alternative using BFG Repo-Cleaner (Recommended):**
```bash
# Install BFG
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Remove .env from history
bfg --delete-files .env

# Clean up
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

## Running the Application
To start the application, you can use the following npm scripts defined in the package.json:

- To start the server with node:
```bash
npm start
```

- To start the server with nodemon for development (auto-restarts the server on file changes):
```bash
npm run server
```

## Setting up Postman
The API is built using Express.js and serves a RESTful JSON API. You can interact with it through a tool like Postman. I will provide the public API for my postman collection for this project if you would like to pull it.

## Setting up MongoDB
You can use either a local MongoDB installation or MongoDB Atlas cloud service.

### Local MongoDB Installation (Recommended for Development)

#### macOS (using Homebrew)
```bash
# Install MongoDB Community Edition
brew install mongodb-community@8.0

# Start MongoDB service
brew services start mongodb/brew/mongodb-community@8.0

# Verify MongoDB is running
brew services list | grep mongodb

# Test connection
mongosh --eval "db.version()"
```

#### Linux (Ubuntu/Debian)
```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-8.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Windows
1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. MongoDB will run as a Windows service automatically

#### Configuration for Local Development
Create a `.env.local` file for local development:
```bash
cp .env.example .env.local
```

Update `MONGO_URL` in `.env.local`:
```env
MONGO_URL=mongodb://localhost:27017/lms_db
```

#### Testing Local Connection
```bash
# Use the provided test script
node scripts/test-db-connection.js .env.local
```

### Using MongoDB Atlas (Cloud)
1. Create an account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create a database user with password
4. Add your IP address to the IP Access List (or use 0.0.0.0/0 for development)
5. Get your connection string from the "Connect" button
6. Update `.env` with your Atlas connection string:
```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/lms_db?retryWrites=true&w=majority
```

### Managing Multiple Environments
- `.env` - Production/Atlas credentials (DO NOT commit)
- `.env.local` - Local MongoDB for development (DO NOT commit)
- `.env.example` - Template with all required variables (safe to commit)

Switch between environments by using different env files or updating `MONGO_URL` in your active `.env` file.

### Configuring the Application

**Environment variables are now managed through the `.env` file created during installation.**

All required environment variables are validated on startup. If any required variable is missing, the application will fail to start with a clear error message indicating which variables need to be configured.

Refer to the `.env.example` file for a complete list of available configuration options.

## Author
Adam Lopez

## License
This project is licensed under the ISC License.

This README section provides a comprehensive guide for potential contributors or users of your LMS System, including how to set it up, run it, and connect it with a MongoDB database. Adjustments can be made based on your specific repository URL or any additional steps you may require.