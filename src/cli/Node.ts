import commander from 'commander'
import { actionRunner } from './polykey';

function makeStartNodeCommand() {
  return new commander.Command('start')
  .description('start the polykey node')
  .action(actionRunner(async (options) => {

  }))
}

function makeStopNodeCommand() {
  return new commander.Command('stop')
  .description('stop the polykey node')
  .action(actionRunner(async (options) => {

  }))
}

function makeNodeCommand() {
  return new commander.Command('node')
  .description('control the current polykey node')
  .addCommand(makeStartNodeCommand())
  .addCommand(makeStopNodeCommand())
}

export default makeNodeCommand
