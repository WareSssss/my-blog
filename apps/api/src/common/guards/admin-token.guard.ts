import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, unknown> }>();
    const expected = process.env.ADMIN_TOKEN;
    const token = req.headers['x-admin-token'];

    if (!expected) {
      throw new UnauthorizedException('ADMIN_TOKEN is not configured');
    }

    if (token !== expected) {
      throw new UnauthorizedException('Invalid admin token');
    }

    return true;
  }
}
