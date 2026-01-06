import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ClassModel from '../../../model/Academic/Class';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import Staff from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import User from '../../../model/Auth/User';
import { hashPassword } from '../../../utils/helpers';

const instructorId = '0000000000000000000000b1';
const adminId = '0000000000000000000000a1';
const instructorToken = 'test-instructor-token';
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

const makePackage = (title: string) => ({
  packageId: new mongoose.Types.ObjectId().toString(),
  title,
  description: `${title} desc`,
  version: 'scorm_1.2',
  fileName: `${title}.zip`,
  fileSize: 1000,
  filePath: `${title}.zip`,
  entryPoint: 'index.html',
  launchUrl: 'index.html',
  manifestData: {
    identifier: title,
    version: 'scorm_1.2',
    organizations: [],
    resources: [],
  },
  createdBy: new mongoose.Types.ObjectId(instructorId),
  uploadedBy: new mongoose.Types.ObjectId(instructorId),
  uploadedByModel: 'Staff' as const,
  isPublished: true,
  status: 'published',
});

describe('Instructor Phase 5: Assignment Listing', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }

    await Staff.deleteMany({ _id: instructorId });
    await Admin.deleteMany({ _id: adminId });
    await User.deleteMany({ _id: { $in: [instructorId, adminId] } });

    // Create User FIRST (required by personValidation middleware)
    await User.create({
      _id: new mongoose.Types.ObjectId(instructorId),
      email: 'instructor1@example.com',
      passwordHash: await hashPassword('Password123!'),
      roles: ['staff'],
      primaryRole: 'staff',
      status: 'active',
    });
    // THEN create Staff with same _id
    await Staff.create({
      _id: new mongoose.Types.ObjectId(instructorId),
      name: { first: 'Staff', last: 'One' },
      email: 'instructor1@example.com',
    });

    // Create User FIRST (required by personValidation middleware)
    await User.create({
      _id: new mongoose.Types.ObjectId(adminId),
      email: 'admin@example.com',
      passwordHash: await hashPassword('Password123!'),
      roles: ['global-admin'],
      primaryRole: 'global-admin',
      status: 'active',
    });
    // THEN create Admin with same _id
    await Admin.create({
      _id: new mongoose.Types.ObjectId(adminId),
      name: { first: 'Admin', last: 'User' },
      email: 'admin@example.com',
    });
  });

  afterAll(async () => {
    await ClassModel.deleteMany({});
    await ProgramLevel.deleteMany({});
    await Program.deleteMany({});
    await ScormPackage.deleteMany({});
    await Staff.deleteMany({ _id: instructorId });
    await Admin.deleteMany({ _id: adminId });
    await User.deleteMany({ _id: { $in: [instructorId, adminId] } });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ClassModel.deleteMany({});
    await ProgramLevel.deleteMany({});
    await Program.deleteMany({});
    await ScormPackage.deleteMany({});
  });

  it('lists assignments for instructor-owned classes and supports classId filter', async () => {
    const program = await Program.create({
      name: 'Program Alpha',
      description: 'Program Alpha',
      duration: '4 months',
      createdBy: new mongoose.Types.ObjectId(adminId),
      department: masterDepartmentId,
    });
    const programLevel = await ProgramLevel.create({
      program: program._id,
      name: 'Level 1',
      order: 1,
      createdBy: new mongoose.Types.ObjectId(adminId),
      department: masterDepartmentId,
    });
    const klass = await ClassModel.create({
      name: 'Class 1',
      program: program._id,
      programLevel: programLevel._id,
      department: masterDepartmentId,
      createdBy: new mongoose.Types.ObjectId(adminId),
      instructors: [new mongoose.Types.ObjectId(instructorId)],
    });

    const pkg = await ScormPackage.create(makePackage('Pkg1'));
    pkg.assignedTo = { ...pkg.assignedTo, classes: [klass._id] } as any;
    (pkg as any).dueDate = new Date('2024-01-01T00:00:00Z');
    await pkg.save();

    const res = await request(app)
      .get(`/api/v1/staff/assignments?classId=${klass._id.toString()}`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].packageTitle).toBe('Pkg1');
    expect(res.body.data.items[0].classIds).toContain(klass._id.toString());
    expect(res.body.data.items[0].classNames).toContain('Class 1');
  });

  it('rejects listing for a class not owned by the instructor', async () => {
    const program = await Program.create({
      name: 'Program Alpha',
      description: 'Program Alpha',
      duration: '4 months',
      createdBy: new mongoose.Types.ObjectId(adminId),
      department: masterDepartmentId,
    });
    const programLevel = await ProgramLevel.create({
      program: program._id,
      name: 'Level 1',
      order: 1,
      createdBy: new mongoose.Types.ObjectId(adminId),
      department: masterDepartmentId,
    });
    const otherClass = await ClassModel.create({
      name: 'Other Class',
      program: program._id,
      programLevel: programLevel._id,
      department: masterDepartmentId,
      createdBy: new mongoose.Types.ObjectId(adminId),
      instructors: [new mongoose.Types.ObjectId(adminId)],
    });

    const res = await request(app)
      .get(`/api/v1/staff/assignments?classId=${otherClass._id.toString()}`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(404);
  });
});
