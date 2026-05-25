const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'sakhi-customer');
const customAlertPath = path.join(baseDir, 'src', 'utils', 'CustomAlert.js');

function getRelativePath(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.replace(/\.js$/, '');
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('Alert.alert(') || content.includes('Alert.alert (')) {
        const relPath = getRelativePath(fullPath, customAlertPath);
        
        if (!content.includes('import CustomAlert')) {
          const importMatches = [...content.matchAll(/^import .* from '.*';/gm)];
          const lastImportIndex = importMatches.length > 0 
            ? importMatches[importMatches.length - 1].index + importMatches[importMatches.length - 1][0].length
            : 0;
            
          content = content.slice(0, lastImportIndex) + `\nimport CustomAlert from '${relPath}';` + content.slice(lastImportIndex);
        }
        
        content = content.replace(/Alert\.alert\s*\(/g, 'CustomAlert.alert(');
        
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

processDirectory(path.join(baseDir, 'src'));
processDirectory(path.join(baseDir, 'app'));
