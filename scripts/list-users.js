#!/usr/bin/env node
/**
 * List all admins, teachers, and students.
 * Usage: node scripts/list-users.js [env-file]
 */

const mongoose = require('mongoose');
const path = require('path');

const envFile = process.argv[2] || '.env';
const envPath = path.resolve(__dirname, '..', envFile);

console.log(`\n🔍 Loading environment from: ${envFile}`);

try {
  require('dotenv-safe').config({ path: envPath, allowEmptyValues: true });
} catch (err) {
  console.error(`❌ Failed to load environment file: ${err.message}`);
  process.exit(1);
}

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('❌ MONGO_URL not found in environment variables');
  process.exit(1);
}

const Admin = mongoose.model(
  'Admin',
  new mongoose.Schema({}, { strict: false })
);
const Teacher = mongoose.model(
  'Teacher',
  new mongoose.Schema({}, { strict: false })
);
const Student = mongoose.model(
  'Student',
  new mongoose.Schema({}, { strict: false })
);

const simplify = (doc, kind) => {
  const base = {
    id: doc._id?.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    createdAt: doc.createdAt,
  };

  if (kind === 'teacher') {
    return { ...base, teacherId: doc.teacherId, applicationStatus: doc.applicationStatus };
  }

  if (kind === 'student') {
    return { ...base, studentId: doc.studentId, currentClassLevel: doc.currentClassLevel };
  }

  return base;
};

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    const [admins, teachers, students] = await Promise.all([
      Admin.find({}).lean(),
      Teacher.find({}).lean(),
      Student.find({}).lean(),
    ]);

    console.log(`\nAdmins (${admins.length})`);
    admins.map((doc) => simplify(doc, 'admin')).forEach((doc) => console.log(doc));

    console.log(`\nTeachers (${teachers.length})`);
    teachers.map((doc) => simplify(doc, 'teacher')).forEach((doc) => console.log(doc));

    console.log(`\nStudents (${students.length})`);
    students.map((doc) => simplify(doc, 'student')).forEach((doc) => console.log(doc));
  })
  .then(() => mongoose.connection.close())
  .catch((err) => {
    console.error('\n❌ Failed to list users');
    console.error('  Message:', err.message);
    process.exit(1);
  });
