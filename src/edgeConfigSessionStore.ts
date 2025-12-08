import { Store } from 'express-session';
import { get, set, del } from '@vercel/edge-config';

interface EdgeConfigSessionStoreOptions {
  prefix?: string;
  ttl?: number; // in seconds
}

export class EdgeConfigSessionStore extends Store {
  private prefix: string;
  private ttl: number;

  constructor(options: EdgeConfigSessionStoreOptions = {}) {
    super();
    this.prefix = options.prefix || 'sess:';
    this.ttl = options.ttl || 7 * 24 * 60 * 60; // default 7 days
  }

  private key(sid: string) {
    return `${this.prefix}${sid}`;
  }

  async get(sid: string, callback: (err: any, session?: any) => void) {
    try {
      const data = await get(this.key(sid));
      if (!data) return callback(null, undefined);
      callback(null, JSON.parse(data));
    } catch (err) {
      callback(err);
    }
  }

  async set(sid: string, session: any, callback?: (err?: any) => void) {
    try {
      await set(this.key(sid), JSON.stringify(session), { expiration: this.ttl });
      callback && callback();
    } catch (err) {
      callback && callback(err);
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void) {
    try {
      await del(this.key(sid));
      callback && callback();
    } catch (err) {
      callback && callback(err);
    }
  }
}
