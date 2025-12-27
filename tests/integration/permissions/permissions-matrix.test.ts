import request from 'supertest';
import app from '../../../app/app';

describe('Permissions matrix endpoint', () => {
  it('returns role permissions for admin', async () => {
    const res = await request(app)
      .get('/api/v1/permissions/matrix')
      .set('Authorization', 'Bearer test-admin-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.permissions.admin).toBeDefined();
    expect(Array.isArray(res.body.data.permissions.admin)).toBe(true);
    expect(res.body.data.roles.ADMIN).toBe('admin');
  });
});
