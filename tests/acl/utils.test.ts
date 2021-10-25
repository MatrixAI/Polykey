import * as aclUtils from '@/acl/utils';

describe('utils', () => {
  test('merging permissions', async () => {
    const perm1 = {
      gestalt: {
        notify: null,
      },
      vaults: {
        v1: {
          pull: null,
        },
      },
    };
    const perm2 = {
      gestalt: {
        scan: null,
      },
      vaults: {
        v1: {
          clone: null,
        },
        v2: {
          clone: null,
        },
      },
    };
    const permMerged = aclUtils.permUnion(perm1, perm2);
    expect(permMerged).toEqual({
      gestalt: {
        notify: null,
        scan: null,
      },
      vaults: {
        v1: {
          pull: null,
          clone: null,
        },
        v2: {
          clone: null,
        },
      },
    });
  });
});
