import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    carrierProfile: { create: jest.Mock };
  };
  let jwt: JwtService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      carrierProfile: { create: jest.fn() },
    };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as JwtService;
    service = new AuthService(prisma as unknown as PrismaService, jwt);
  });

  it('rejects sign up when the email is already registered', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@express.com' });
    await expect(service.signUp('a@express.com', 'password123', 'Amaka', false)).rejects.toThrow(
      ConflictException,
    );
  });

  it('creates a new user with a hashed password on sign up', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 'u1', ...data }));

    const result = await service.signUp('a@express.com', 'password123', 'Amaka', false);

    expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    const createdData = prisma.user.create.mock.calls[0][0].data;
    expect(createdData.passwordHash).not.toBe('password123');
    expect(await bcrypt.compare('password123', createdData.passwordHash)).toBe(true);
  });

  it('creates a carrier profile when signing up as a carrier', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1', email: 'deji@express.com' });

    await service.signUp('deji@express.com', 'password123', 'Deji', true);

    expect(prisma.carrierProfile.create).toHaveBeenCalledWith({ data: { userId: 'u1' } });
  });

  it('does not create a carrier profile for a non-carrier sign up', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1', email: 'amaka@express.com' });

    await service.signUp('amaka@express.com', 'password123', 'Amaka', false);

    expect(prisma.carrierProfile.create).not.toHaveBeenCalled();
  });

  it('rejects sign in with a wrong password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 12);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@express.com', passwordHash });

    await expect(service.signIn('a@express.com', 'wrong-password')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('issues a token on sign in with the correct password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 12);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@express.com', passwordHash });

    const result = await service.signIn('a@express.com', 'correct-password');
    expect(result).toEqual({ accessToken: 'signed.jwt.token' });
  });
});
