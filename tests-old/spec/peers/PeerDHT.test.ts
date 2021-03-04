import { nodeDHTModel, createMockNodeDHT } from './NodeDHT.model';

describe('NodeDHT spec testing', () => {
  const testPlans = nodeDHTModel.getSimplePathPlans();

  testPlans.forEach((plan) => {
    describe(plan.description, () => {
      plan.paths.forEach((path) => {
        test(path.description, async () => {
          const nodeDHT = await createMockNodeDHT()
          await path.test(nodeDHT);
        });
      });
    });
  });

  test('should have full coverage', () => {
    return nodeDHTModel.testCoverage();
  });
});
