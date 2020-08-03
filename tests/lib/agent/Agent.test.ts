import os from 'os';
import fs from 'fs';
import path from 'path';
import { randomString } from '../../../src/lib/utils';
import { PolykeyAgent, PolykeyClient } from '../../../src/lib/Polykey';

// TODO add tests as part of testing PR
describe('Agent class', () => {
  let agent: PolykeyAgent
  let client: PolykeyClient
  let tempDir: string

  beforeEach(async () => {
    // // Start the agent running
    // fs.mkdirSync(`/run/user/${process.getuid()}/polykey`)
    // // This has issues in the gitlab ci/cd pipeline since there is
    // // no /run/user/<uid>/polykey directory
    // agent = new PolykeyAgent()
    // PolykeyAgent.startAgent()
    // client = PolykeyAgent.connectToAgent()
    // tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
  })

  afterEach(() => {
    // agent.stop()
    // fs.rmdirSync(tempDir, { recursive: true })
  })

  test('can add new node', async () => {
    // const nodePath = path.join(tempDir, 'SomePolykey')
    // const response = await client.newNode(nodePath, 'Robert Cronin', 'robert.cronin@email.com', 'very password', 1024)
    // expect(response).toEqual(true)
  })

  test('can list nodes', async () => {
    // const nodePath = path.join(tempDir, 'SomePolykey')
    // const newNodeResponse = await client.newNode(nodePath, 'Robert Cronin', 'robert.cronin@email.com', 'very password', 1024)
    // expect(newNodeResponse).toEqual(true)
    // // Listed nodes should contain our newly created node
    // const listNodesResponse = await client.listNodes()
    // expect(listNodesResponse).toEqual([nodePath])
  })
})
