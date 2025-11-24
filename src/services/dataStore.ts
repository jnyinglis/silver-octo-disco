import type { MiniDatabase } from '@/types/dashboard';
import { createLookups } from '@/utils/linqHelpers';

type DataLoader = () => Promise<MiniDatabase> | MiniDatabase;
type Subscriber = (data: MiniDatabase) => void;

export default class DataStore {
  private snapshot: MiniDatabase | null = null;
  private loader: DataLoader;
  private listeners = new Set<Subscriber>();
  private cacheVersion = 0;

  constructor(loader: DataLoader) {
    this.loader = loader;
  }

  async initialize(): Promise<MiniDatabase> {
    return this.reload();
  }

  get version(): number {
    return this.cacheVersion;
  }

  get current(): MiniDatabase {
    if (!this.snapshot) {
      throw new Error('DataStore has not been initialized. Call initialize() first.');
    }
    return this.snapshot;
  }

  get lookups() {
    return createLookups(this.current);
  }

  subscribe(subscriber: Subscriber): () => void {
    this.listeners.add(subscriber);
    if (this.snapshot) {
      subscriber(this.snapshot);
    }
    return () => this.listeners.delete(subscriber);
  }

  async reload(loaderOverride?: DataLoader): Promise<MiniDatabase> {
    const activeLoader = loaderOverride ?? this.loader;
    const next = await activeLoader();
    this.snapshot = structuredClone(next);
    this.cacheVersion += 1;
    this.listeners.forEach((listener) => listener(this.snapshot!));
    return this.snapshot;
  }
}
