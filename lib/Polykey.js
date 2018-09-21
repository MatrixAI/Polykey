import vfs from 'virtualfs'
import * as git from 'isomorphic-git';


// set fs globally
git.plugins.set('fs', vfs);


const events = [];
const filename =  'example.txt';
const data = 'write operation';
const dir = '.';
let hotFiles = new Set();
let commitMsg = "";

const fs = {
	// TODO: should this be in terms of secrets or files?
	writeFile: async (filename, data, encoding) => {
		vfs.writeFileSync(filename, data, encoding);


		// git add the new file
		await git.add({ dir: '.', filepath: filename });

		hotFiles.add(filename);
	},

	makeLink: async (path, newPath) => {
		// TODO: error handling
		vfs.linkSync(path, newPath);	

		await git.add({ dir: '.', filepath: newPath});

		hotFiles.add(newPath);
	},

	removeFile: async (path) => {
		vfs.unlink(path);

		await git.remove({ dir: '.', filepath: path});

		hotFiles.add(path);

	}

};

async function makeCommitMsg(filepath) {
		hotFiles.for (var i = Things.length - 1; i >= 0; i--) {
			console.log(Things[i]);
		};
		// TODO: join dir + filename
		let status = await git.status({ dir: '.', filepath: filepath });

		commitMsg.concat(status + ' ' + filepath + '\n');
		// events.push('remove file');
//		events.push('added file: ' + filename);

}

async function initRepository() {
	console.log('Initialising git in virtual dir');
	await git.init({ dir: '.' });

	// TODO: identity
	// make an empty/dummy commit so we can have a valid master ref
	// and so we an can use git status to formulate commit messages
	var msg = 'repo init commit';
	let sha = await git.commit({
		dir: '.',
		author: {
			name: 'Mr. Test',
			email: 'mrtest@example.com'
		},
		message: msg 
	});
	console.log('SHA of commit:\n' + sha + '\n');

}
async function transaction(callback) {


	// TODO: check if git repo, init otherwise
	await initRepository();

	// do vfs operations
	await callback(fs);

	// check what's changes
	await hotFiles.forEach(await makeCommitMsg);

	console.log(commitMsg);


/*	let status = await git.status({ dir: '.', filepath: 'example.txt'});
	console.log(status);
*/
	//---------------------


	console.log('Making commit' + '\n');
	var commit_msg = events.join('\n');
	let sha = await git.commit({
		dir: '.',
		author: {
			name: 'Mr. Test',
			email: 'mrtest@example.com'
		},
		message: commit_msg 
	})
	console.log('SHA of commit:\n' + sha + '\n')

	console.log('git log:')
	let commits = await git.log({ dir: '.', depth: 5, ref: 'master' })
	console.log(commits)

	sha = await git.resolveRef({ dir: '.', ref: 'master' })
	console.log(sha)
	var { object: blob } = await git.readObject({
		dir: '.',
		oid: sha,
		filepath: filename,
		encoding: 'utf8'
	})
	console.log(blob)
}



transaction( async (fs) => {
	console.log('files in dir');
	let files = await vfs.readdirSync(dir);
	console.log(files);

	console.log('Writing file in vfs');
	await fs.writeFile(filename, data, 'utf8');

	console.log('files in dir');
	files = vfs.readdirSync(dir);
	console.log(files);
	
	//fs.addFile();
	// fs.removeFile();
});

