// @flow

const fs = require('fs');

async function f1() {
  	console.log(dir);
  	await pfs.mkdir(dir);

    // Now it should not be empty...
    await pfs.readdir(dir);

	await git.clone({
	  	dir,
	  	corsProxy: 'https://cors.isomorphic-git.org',
	  	url: 'https://github.com/isomorphic-git/isomorphic-git',
	  	ref: 'master',
	  	singleBranch: true,
	  	depth: 10
	});

	//console.log("dir is" + dir);
	// Now it should not be empty...
	//await pfs.readdir(dir);
}

f1();