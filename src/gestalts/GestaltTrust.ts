import type { GestaltKey, Gestalt } from './types';

class GestaltTrust {
  protected db: Set<GestaltKey> = new Set();

  public trustGestalt(gestalt: Gestalt): void {
    for (const nodeKey of Object.keys(gestalt.nodes)) {
      this.db.add(nodeKey);
    }
    for (const identityKey of Object.keys(gestalt.identities)) {
      this.db.add(identityKey);
    }
  }

  public untrustGestalt(gestalt: Gestalt): void {
    for (const nodeKey of Object.keys(gestalt.nodes)) {
      this.db.delete(nodeKey);
    }
    for (const identityKey of Object.keys(gestalt.identities)) {
      this.db.delete(identityKey);
    }
  }

  public trusted(key: GestaltKey): boolean {
    return this.db.has(key);
  }

  public addTrust(key: GestaltKey) {
    this.db.add(key);
  }

  public unaddTrust(key: GestaltKey) {
    this.db.delete(key);
  }
}

export default GestaltTrust;
