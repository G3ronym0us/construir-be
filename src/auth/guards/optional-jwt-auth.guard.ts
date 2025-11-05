import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to make authentication optional
  handleRequest(err, user) {
    // If there's an error or no user, just return null instead of throwing
    // This allows the request to continue without authentication
    if (err || !user) {
      return null;
    }
    return user;
  }
}
