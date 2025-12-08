import { Store } from 'express-session';
interface EdgeConfigSessionStoreOptions {
    prefix?: string;
    ttl?: number;
}
export declare class EdgeConfigSessionStore extends Store {
    private prefix;
    private ttl;
    constructor(options?: EdgeConfigSessionStoreOptions);
    private key;
    get(sid: string, callback: (err: any, session?: any) => void): Promise<void>;
    set(sid: string, session: any, callback?: (err?: any) => void): Promise<void>;
    destroy(sid: string, callback?: (err?: any) => void): Promise<void>;
}
export {};
//# sourceMappingURL=edgeConfigSessionStore.d.ts.map