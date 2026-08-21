import { Test, TestingModule } from '@nestjs/testing';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('AdminApiKeyGuard', () => {
  let guard: AdminApiKeyGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminApiKeyGuard],
    }).compile();

    guard = module.get<AdminApiKeyGuard>(AdminApiKeyGuard);
  });

  afterEach(() => {
    delete process.env.ADMIN_API_KEY;
  });

  const mockContext = (headers: any) => ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
      }),
    }),
  } as unknown as ExecutionContext);

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException if ADMIN_API_KEY is not configured', () => {
    expect(() => guard.canActivate(mockContext({}))).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if Authorization header is missing', () => {
    process.env.ADMIN_API_KEY = 'secret123';
    expect(() => guard.canActivate(mockContext({}))).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token is invalid', () => {
    process.env.ADMIN_API_KEY = 'secret123';
    expect(() => guard.canActivate(mockContext({ authorization: 'Bearer wrong' }))).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if type is not Bearer', () => {
    process.env.ADMIN_API_KEY = 'secret123';
    expect(() => guard.canActivate(mockContext({ authorization: 'Basic secret123' }))).toThrow(UnauthorizedException);
  });

  it('should return true if token is valid', () => {
    process.env.ADMIN_API_KEY = 'secret123';
    expect(guard.canActivate(mockContext({ authorization: 'Bearer secret123' }))).toBe(true);
  });
});
