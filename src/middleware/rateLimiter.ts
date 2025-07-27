import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class InMemoryRateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      const entry = this.store[key];
      if (entry && entry.resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    // Use IP address as the key, but could be enhanced with user ID for authenticated requests
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.connection.remoteAddress;
    return `rate_limit:${ip}`;
  }

  public isAllowed(req: Request): { allowed: boolean; resetTime: number; remaining: number } {
    const key = this.getKey(req);
    const now = Date.now();
    
    if (!this.store[key] || this.store[key].resetTime < now) {
      // First request or window expired
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      
      return {
        allowed: true,
        resetTime: this.store[key].resetTime,
        remaining: this.maxRequests - 1,
      };
    }

    // Increment count
    this.store[key].count++;

    const remaining = Math.max(0, this.maxRequests - this.store[key].count);
    const allowed = this.store[key].count <= this.maxRequests;

    return {
      allowed,
      resetTime: this.store[key].resetTime,
      remaining,
    };
  }
}

// Create rate limiter instance
const rateLimiter = new InMemoryRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100') // 100 requests
);

export const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const { allowed, resetTime, remaining } = rateLimiter.isAllowed(req);

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '100',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(resetTime).toISOString(),
  });

  if (!allowed) {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
    return;
  }

  next();
};

export { rateLimiterMiddleware as rateLimiter };
