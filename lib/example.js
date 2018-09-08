// @flow

import vfs from 'virtualfs';
import * as git from 'isomorphic-git';


// set fs globally
git.plugins.set('fs', vfs);

// create dummy directory
let dir = '/happy';
vfs.mkdirSync(dir);

// async fn for await calls 
async function clone_and_list() {
	let files = await git.listFiles({dir: dir});
	console.log(files);

	await git.clone({
		    vfs,
		    dir,
		    url: 'https://github.com/isomorphic-git/isomorphic-git',
		    ref: 'master',
		    singleBranch: true,
		    depth: 10
	});

	// dir should not be empty now
	files = vfs.readdirSync(dir);
	console.log(files);

}

clone_and_list();

