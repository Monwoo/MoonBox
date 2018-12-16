// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

// setTimeout(function() {
// console.log('World!');
// }, 2000);
// console.log('Hello');

const ts = require('typescript');
const fs = require('fs');
const util = require('util');
const random = require('random-key-generator');

function isNodeExported(node) {
  return (node.flags & ts.NodeFlags.Export) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
}

// https://stackoverflow.com/questions/39329831/typescript-source-parsing-get-class-decorator-names
const visit = node => {
  // console.log("\n\n--------\n")
  // console.log(util.inspect(node, {showHidden: false, depth: 2}));

  // Only consider exported nodes
  // if (!isNodeExported(node)) {
  //   return;
  // }
  if (
    node.kind === ts.SyntaxKind.VariableStatement ||
    node.kind === ts.SyntaxKind.ObjectLiteralExpression ||
    node.kind === ts.SyntaxKind.VariableDeclaration ||
    node.kind === ts.SyntaxKind.VariableDeclarationList ||
    node.kind === ts.SyntaxKind.LetKeyword
  ) {
    ts.forEachChild(node, visit);
  } else if (node.kind === ts.SyntaxKind.PropertyAssignment) {
    // Will transform env with generated values :
    if ('clientSecret' === node.name.escapedText) {
      node.initializer.text = random(15);
    }
  }
};

/////////////////////
// DEV ENV GENERATION
let filename = 'src/environments/environment.ts';
let sourceCode = fs.readFileSync(filename, 'utf8');
// Parse the code.
let tsSourceFile = ts.createSourceFile(__filename, sourceCode, ts.ScriptTarget.Latest);
// Print the parsed Abstract Syntax Tree (AST).
// console.log(util.inspect(tsSourceFile.statements, {showHidden: false, depth: null}))
ts.forEachChild(tsSourceFile, visit);
fs.writeFileSync(filename, ts.createPrinter().printFile(tsSourceFile), 'utf8');

/////////////////////
// PROD ENV GENERATION
filename = 'src/environments/environment.prod.ts';
sourceCode = fs.readFileSync(filename, 'utf8');
tsSourceFile = ts.createSourceFile(__filename, sourceCode, ts.ScriptTarget.Latest);
ts.forEachChild(tsSourceFile, visit);
fs.writeFileSync(filename, ts.createPrinter().printFile(tsSourceFile), 'utf8');
