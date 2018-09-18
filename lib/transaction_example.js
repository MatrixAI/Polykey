import vfs from 'virtualfs'
import * as git from 'isomorphic-git';


// set fs globally
git.plugins.set('fs', vfs);

const events = [];
const filename =  'example.txt';
const data = 'write operation';

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

	callback(fs);


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

	var { object: blob } = await git.readObject({
		dir: '.',
		oid: sha,
		filepath: filename,
		encoding: 'utf8'
	})
	console.log(blob)
}



transaction( async (fs) => {

	console.log('Writing file in vfs');
	fs.writeFile(filename, data, 'utf8');

	
	//fs.addFile();
	// fs.removeFile();
});

