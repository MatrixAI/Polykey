// @flow

/*const git = require('isomorphic-git');
const fs = require('fs');
git.plugins.set('fs', fs);

console.log(Object.keys(git));
console.log(Object.keys(fs));
async function f1() { 
	let x = await git.clone({
	  dir: '~',
	  corsProxy: 'https://cors.isomorphic-git.org',
	  url: 'https://github.com/isomorphic-git/isomorphic-git',
	  singleBranch: true,
	  depth: 1
	});
	console.log(x);
	console.log('done');
}

console.log('trying to clone repo');	
f1();*/

/*const fs = require('fs');
const os = require('os');
const path = require('path');

// for some reason, runkit isn't detecting this dependency
// correctly so I'm manually requiring it here.
require('ignore');
require('wcwidth');

const git = require("isomorphic-git");

// Make temporary directory
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
console.log(dir);
// Behold - it is empty!
fs.readdirSync(dir);

git.clone({
    fs,
    dir,
    url: 'https://github.com/isomorphic-git/isomorphic-git',
    ref: 'master',
    singleBranch: true,
    depth: 10
});



// Now it should not be empty...
fs.readdirSync(dir);*/

console.log("Hello World");