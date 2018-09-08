// @flow

import vfs from 'virtualfs';
import git from 'isomorphic-git';

console.log("hellow rold");

console.log(git);
git.plugins.set('fs', vfs)

async function list() {
	const files = await git.listFiles({dir: '/'});
	console.log(files);
}



