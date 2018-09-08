// @flow

import vfs from 'virtualfs';
import * as git from 'isomorphic-git';

vfs.mkdirSync('/happy');

git.plugins.set('fs', vfs);

async function list() {
	const files = await git.listFiles({dir: '/happy'});
	console.log(files);
}

list();
