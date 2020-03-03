import * as globule from 'globule';
import { Tree } from 'jargs';
import * as path from 'path';
import * as ts from 'typescript';

import * as logger from './logger';
import { indent, isTruthyString } from './utils';
import { version } from './version';

const MATCHES_GLOB = /(?:}|\)|\*+\/?|\.[t]sx?)$/;
const MATCHES_TRAILING_COMMENT = /\/\/\s?@type(?::|\s)\s*(.+)\s*?$/;

const assert = (tree: Tree) => {
  if (tree.flags.version) {
    return version();
  }

  logger.log('Checking type assertion comments', 'green');

  const cwd = process.cwd();

  let project: string;

  if (tree.kwargs.project && typeof tree.kwargs.project === 'string') {
    project = path.resolve(cwd, tree.kwargs.project);
  } else {
    project = path.resolve(cwd, 'tsconfig.json');
  }

  let globs: string[] = [];

  if (tree.args.glob?.length) {
    if (Array.isArray(tree.args.glob)) {
      globs = globs.concat(tree.args.glob.filter(isTruthyString));
    } else {
      globs = [tree.args.glob];
    }
  }

  const json = ts.readConfigFile(project, ts.sys.readFile);

  if (json.error) {
    return logger.error(`Error reading tsconfig at path ${project}`);
  }

  const extensions = json.config?.allowJS
    ? '**/*.{ts,tsx,js,jsx}'
    : '**/*.{ts,tsx}';

  const includes = json.config?.include?.length
    ? json.config?.include?.map((include: string) =>
        MATCHES_GLOB.test(include) ? include : path.join(include, extensions)
      )
    : globs?.length
    ? globs
    : '*';

  const excludes = json.config?.exclude?.length
    ? json.config?.exclude?.map((include: string) => `!${include}`)
    : [];

  if (tree.flags.verbose) {
    logger.log('Finding files matching:');
    logger.log(indent(includes.join('\n'), '  '));
    logger.log('Excluding:');
    logger.log(indent(excludes.join('\n'), '  '));
  }

  const sourceFileNames = globule.find([...globs, ...includes, ...excludes]);

  if (!sourceFileNames.length) {
    logger.error('Could not find any source files matching:');
    logger.error(indent(includes.join('\n'), '  '));
    logger.error('Excluding:');
    return logger.error(indent(excludes.join('\n'), '  '), true);
  }

  if (tree.flags.verbose) {
    logger.log('Found files:');
    logger.log(indent(sourceFileNames.join('\n'), '  '));

    if (globs.length) {
      logger.log('Only checking files matching:');
      logger.log(indent(globs.join('\n'), '  '));
    }
  }

  const compilerOptions = ts.parseJsonConfigFileContent(
    json.config,
    ts.sys,
    cwd
  ).options;

  const program = ts.createProgram(sourceFileNames, compilerOptions);
  const sourceFiles = program.getSourceFiles();
  const checker = program.getTypeChecker();

  const errors: string[] = [];

  const checkTypes = (file: ts.SourceFile) => {
    if (
      (!globs.length || globule.isMatch(globs, file.fileName)) &&
      (!excludes.length || globule.isMatch(excludes, file.fileName))
    ) {
      const lines = file.getFullText().split('\n');

      const traverse = (node: ts.Node) => {
        const { line: lineIndex } = file.getLineAndCharacterOfPosition(
          node.getStart()
        );
        const line = lines[lineIndex];

        const result = MATCHES_TRAILING_COMMENT.exec(line);

        if (result && ts.isVariableDeclaration(node)) {
          const comment = result[1];
          const lineNumber = lineIndex + 1;
          const symbol = checker.getSymbolAtLocation(node.name);

          if (symbol) {
            const typeNode = checker.getTypeOfSymbolAtLocation(symbol, node);
            const type = checker.typeToString(typeNode);

            if (type !== comment) {
              errors.push(
                `${file.fileName}:${lineNumber}: Type ${type} did not match type comment ${comment}`
              );
            }
          }
        }

        node.forEachChild(traverse);
      };

      traverse(file);
    }

    return errors;
  };

  sourceFiles.forEach(checkTypes);

  if (errors.length) {
    errors.forEach(error => {
      logger.error(error);
    });

    return logger.error('Some files failed tsassert checks', true);
  } else {
    logger.log('All files passed tsassert checks', 'green');
  }
};

export { assert };
