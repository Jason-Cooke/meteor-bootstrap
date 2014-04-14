var fs   = Npm.require('fs');
var path = Npm.require('path');

var handler = function (compileStep, isLiterate) {
  if (compileStep.arch != 'browser') {
    return; // only compile for the browser
  }
  
  var basePath = 'packages/bootstrap3-less';
  var moduleConfPath = path.join(basePath, 'modules.json');
  var raw = fs.readFileSync(moduleConfPath, { encoding: 'utf8' });
  var modules = JSON.parse(raw);
  
  var conf = JSON.parse(compileStep.read().toString('utf8'));
  var js = {}; // set of required js files
  var less = {}; // set of required less files
  
  // check which modules to include
  var enabledModules = conf.modules||{};
  for (var module in enabledModules) if (modules.hasOwnProperty(module)) {
    if (enabledModules[module]) {
      var moduleParts = modules[module];
      
      // less files
      if (moduleParts.less != null) {
        var lessFiles = moduleParts.less;
        for (var i = 0; i < lessFiles.length; ++i) {
          less[lessFiles[i]] = true;
        }
      }
      
      // js files
      if (moduleParts.js != null) {
        var jsFiles = moduleParts.js;
        for (var i = 0; i < jsFiles.length; ++i) {
          js[jsFiles[i]] = true;
        }
      }
      
    }
  }
  
  // add javascripts
  for (var jsPath in js) {
    var file = fs.readFileSync(path.join(basePath, jsPath), { encoding: 'utf8' });
    compileStep.addJavaScript({
      path: jsPath,
      data: file,
      sourcePath: jsPath,
      bare: false
    });
  }

  // create the less file with the variables in it  
  var lessImportName = compileStep.inputPath.replace('.json', '.import.less');
  if (! fs.existsSync(lessImportName)) {
    var lessImports = [
      "// Here you have room to modify the the variables of bootstrap",
      "// You can write directly in it, as long as it exists it won't be overwritten",
      "// If you want, you can access all bootstrap variables and mixins within",
      "// your less file by importing this file here, it won't print styles!",
      '@import "/' + basePath + '/lib/less/variables.import.less";',
      '@import "/' + basePath + '/lib/less/mixins.import.less";',
      '@icon-font-path: "/' + basePath + '/lib/fonts/";',
      "",
      "// Now it's your turn:\n\n" // newline for convenience
    ];
    var lessImportContent = lessImports.join('\n');
    fs.writeFileSync(lessImportName, lessImportContent, { encoding: 'utf8' });
  }
  
  // create a less file with the imports
  var lessName = compileStep.inputPath.replace('.json', '.less');
  var lessImports = [
    "// This file is auto generated by the bootstrap3-less package!",
    "// You may need to use 'meteor add less' if the styles are not loaded",
    '@import "/' + lessImportName + '";'
  ];
  for (var lessPath in less) {
    lessImports.push('@import "' + path.join('/', basePath, lessPath) + '";');
  }
  // XXX I cannot trigger the less compiler from here... so i need to create a file
  var lessContent = lessImports.join('\n');
  fs.writeFileSync(lessName, lessContent, { encoding: 'utf8' });
  /*compileStep.addAsset({
    path: path.join(basePath, 'bootstrap.less'),
    data: new Buffer(lessImports.join('\n'))
  });*/
};

Plugin.registerSourceHandler('bootstrap.json', handler);
