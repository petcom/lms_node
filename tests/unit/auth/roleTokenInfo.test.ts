import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import generateToken from '../../../utils/generateToken';
import { getTokenInfo } from '../../../controller/auth/authCtrl';

describe('Auth role propagation', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(64);
    process.env.JWT_EXPIRY = '1h';
  });

  it('embeds role in generated token payload', () => {
    const token = generateToken('user-123', 'admin');
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    expect(decoded).toMatchObject({ id: 'user-123', role: 'admin' });
  });

  it('returns role from token-info endpoint', async () => {
    const token = generateToken('user-456', 'teacher');

    const req = {
      token,
      userAuth: { role: 'teacher' },
    } as unknown as Request;

    const json = jest.fn();
    const status = jest.fn().mockReturnThis();
    const res = { status, json } as unknown as Response;

    await getTokenInfo(req, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({ role: 'teacher', userId: 'user-456' }),
      })
    );
  });
});
