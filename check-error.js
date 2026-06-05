
const fs = require('fs');
const path = require('path');
const { transform } = require('esbuild');

const filePath = path.join(__dirname, 'src', 'pages', 'user', 'Profile.jsx');
const content = fs.readFileSync(filePath, 'utf8');

console.log('Reading file...');
console.log('File length:', content.length);
console.log('First 500 chars:', content.slice(0, 500));
console.log('\nLast 500 chars:', content.slice(-500));

transform(content, {
  loader: 'jsx',
  sourcefile: 'Profile.jsx'
}).then(result => {
  console.log('Success!');
}).catch(err => {
  console.error('Error:', err);
});
