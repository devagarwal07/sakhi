const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'sakhi-driver', 'src');
const customAlertPath = path.join(srcDir, 'utils', 'CustomAlert.js');

function getRelativePath(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile);
  if (!rel.startsWith('.')) rel = './' + rel;
  // remove .js extension
  return rel.replace(/\.js$/, '');
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('Alert.alert(') || content.includes('Alert.alert (')) {
        // Calculate relative import
        const relPath = getRelativePath(fullPath, customAlertPath);
        
        // Add import CustomAlert if not present
        if (!content.includes('import CustomAlert')) {
          // find last import and insert after
          const importMatches = [...content.matchAll(/^import .* from '.*';/gm)];
          const lastImportIndex = importMatches.length > 0 
            ? importMatches[importMatches.length - 1].index + importMatches[importMatches.length - 1][0].length
            : 0;
            
          content = content.slice(0, lastImportIndex) + `\nimport CustomAlert from '${relPath}';` + content.slice(lastImportIndex);
        }
        
        // Replace Alert.alert( with CustomAlert.alert(
        content = content.replace(/Alert\.alert\s*\(/g, 'CustomAlert.alert(');
        
        // Remove Alert from react-native imports if it's there
        // This is a bit tricky, e.g. import { View, Alert, Text } from 'react-native';
        content = content.replace(/(import\s+{[^}]*?)\bAlert\b,?([^}]*?}\s+from\s+['"]react-native['"];?)/g, (match, p1, p2) => {
          let newImport = (p1 + p2).replace(/,\s*,/g, ',').replace(/{\s*,/, '{').replace(/,\s*}/, '}');
          return newImport;
        });

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

processDirectory(srcDir);
