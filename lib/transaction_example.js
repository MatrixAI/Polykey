import vfs from 'virtualfs'
import * as git from 'isomorphic-git';


// set fs globally
git.plugins.set('fs', vfs);


const events = [];
const filename =  'example.txt';
const data = 'write operation';
const dir = '.';

const fs = {
	writeFile: async (filename, data, encoding) => {
		vfs.writeFileSync(filename, data, encoding);
		events.push('added file: ' + filename);

		// git add the new file
		await git.add({ dir: '.', filepath: filename })
	},

	removeFile: () => {
		events.push('remove file');
	}

};

async function transaction(callback) {
	console.log('Initialising git in virtual dir');
	await git.init({ dir: '.' });

	await callback(fs);


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

