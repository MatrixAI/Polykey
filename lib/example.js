// @flow

import vfs from 'virtualfs';
import * as git from 'isomorphic-git';


// set fs globally
git.plugins.set('fs', vfs);

// create dummy directory
let dir = '/happy';
vfs.mkdirSync(dir);

async function fetch() {
	console.log('Fetching from repository...');
	await git.fetch({
	  dir: dir,
	  corsProxy: 'https://cors.isomorphic-git.org',
	  url: 'https://github.com/isomorphic-git/isomorphic-git',
	  ref: 'master',
	  depth: 1,
	  singleBranch: true,
	  tags: false
	});
	console.log('Fetching Finished');

}

async function listBranches() {
	let branches = await git.listBranches({ dir: dir });
	console.log('local branches: ' + branches);
	let remoteBranches = await git.listBranches({ dir: dir, remote: 'origin' });
	console.log('remote branches: ' + remoteBranches);

}

async function readObject() {
	console.log('Reading README file from last commit object');
	// Get the contents of 'README.md' in the master branch.
	let sha = await git.resolveRef({ dir: dir, ref: 'master' });
	console.log(sha);
	let { object: blob } = await git.readObject({
	  dir: dir,
	  oid: sha,
	  filepath: 'README.md',
	  encoding: 'utf8'
	});
	console.log(blob);
	console.log('README output finishedj');

}
// async fn for await calls 
async function clone_and_list() {
	console.log('files in dir');
	let files = await git.listFiles({dir: dir});
	console.log(files);

	console.log('Cloning repo...');
	await git.clone({
		    vfs,
		    dir,
		    url: 'https://github.com/isomorphic-git/isomorphic-git',
		    ref: 'master',
		    singleBranch: true,
		    depth: 10
	});
	console.log('Repo cloned');

	// dir should not be empty now
	files = vfs.readdirSync(dir);
	console.log(files);
}

async function getStatus() {
	let status = await git.status({ dir: dir, filepath: 'README.md' })
	console.log(status)
}

async function main() {
	await clone_and_list();
	await fetch();
	await listBranches();
	await readObject();
	await getStatus();
}

main();
