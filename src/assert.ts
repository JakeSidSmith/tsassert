import * as chalk from 'chalk';
import * as diff from 'diff';
import * as globule from 'globule';
import { Tree } from 'jargs';
import * as path from 'path';
import * as ts from 'typescript';

import * as logger from './logger';
import { indent, isTruthyString } from './utils';
import { version } from './version';

const MATCHES_GLOB = /(?:}|\)|\*+\/?|\.[t]sx?)$/;
const MATCHES_LONELY_COMMENT = /^\s*?\/\/\s?@tsassert(?::|\s)\s*(.+?)\s*?$/;
const MATCHES_TRAILING_COMMENT = /\/\/\s?@tsassert(?::|\s)\s*(.+?)\s*?$/;
const MATCHES_NODE_MODULES = /^node_modules/;

interface AssertionError {
  message: string;
  expected: string;
  received: string;
}

const assert = (tree: Tree) => {
  if (tree.flags.version) {
    return version();
  }

  logger.log('\nChecking type assertion comments...\n');

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
    } else if (tree.args.glob) {
      globs = [tree.args.glob];
    }
  }

  globs = globs.map(glob => path.relative(process.cwd(), glob));

  const json = ts.readConfigFile(project, ts.sys.readFile);

  if (json.error) {
    return logger.error(`Error reading tsconfig at path ${project}`);
  }

  const extensions = json.config?.allowJS
    ? '**/*.{ts,tsx,js,jsx}'
    : '**/*.{ts,tsx}';

  const includes = json.config?.include?.length
    ? json.config?.include?.map((pattern: string) =>
        path.relative(
          process.cwd(),
          MATCHES_GLOB.test(pattern) ? pattern : path.join(pattern, extensions)
        )
      )
    : [];

  const excludes = json.config?.exclude?.length
    ? json.config?.exclude?.map(
        (pattern: string) => `!${path.relative(process.cwd(), pattern)}`
      )
    : [];

  if (tree.flags.verbose) {
    logger.info('Finding files matching:');
    logger.log(indent(includes.join('\n'), '  ').concat('\n'));
    logger.info('Excluding:');
    logger.log(indent(excludes.join('\n'), '  ').concat('\n'));
  }

  const patternsToFind = [...globs, ...includes, ...excludes];

  const sourceFileNames = globule.find(
    patternsToFind.length ? patternsToFind : '*'
  );

  if (!sourceFileNames.length) {
    logger.error('Could not find any source files matching:');
    logger.error(indent(includes.join('\n'), '  ').concat('\n'));
    logger.error('Excluding:');
    return logger.error(indent(excludes.join('\n'), '  ').concat('\n'), true);
  }

  if (tree.flags.verbose) {
    logger.info('Found files:');
    logger.log(indent(sourceFileNames.join('\n'), '  ').concat('\n'));

    if (globs.length) {
      logger.info('Only checking files matching:');
      logger.log(indent(globs.join('\n'), '  ').concat('\n'));
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

  let filesChecked = 0;
  let commentsChecked = 0;
  const errors: Array<AssertionError | string> = [];

  const checkTypes = (file: ts.SourceFile) => {
    const relativeFileName = path.relative(process.cwd(), file.fileName);

    if (
      !MATCHES_NODE_MODULES.test(relativeFileName) &&
      (!globs.length || globule.isMatch(globs, relativeFileName))
    ) {
      filesChecked += 1;

      if (tree.flags.verbose) {
        logger.log(indent(relativeFileName, '  '));
      }

      const lines = file.getFullText().split('\n');

      const traverse = (node: ts.Node) => {
        const { line: lineIndex } = file.getLineAndCharacterOfPosition(
          node.getStart()
        );
        const line = lines[lineIndex];
        let result = MATCHES_TRAILING_COMMENT.exec(line);

        const lineNumber = lineIndex + 1;
        const fileLine = `${relativeFileName}:${lineNumber}: `;

        if (lineIndex > 0) {
          const previousLine = lines[lineIndex - 1];
          const lonelyResult = MATCHES_LONELY_COMMENT.exec(previousLine);

          if (lonelyResult) {
            if (result) {
              errors.push(`${fileLine}Found 2 type comments for the same line`);
              return;
            } else {
              result = lonelyResult;
            }
          }
        }

        if (result) {
          commentsChecked += 1;

          const comment = result[1];

          if (ts.isVariableDeclaration(node)) {
            const symbol = checker.getSymbolAtLocation(node.name);
            const variableName = node.name.getText();

            if (symbol) {
              const typeNode = checker.getTypeOfSymbolAtLocation(symbol, node);
              const type = checker.typeToString(typeNode);

              if (type !== comment) {
                const message = `${fileLine}Type of "${variableName}" did not match type comment:`;

                errors.push({
                  message,
                  expected: comment,
                  received: type,
                });
              }
            }

            return;
          } else if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
            const signature = checker.getResolvedSignature(node);
            const functionName = node.expression.getText();

            if (signature) {
              const type = checker.typeToString(
                checker.getReturnTypeOfSignature(signature)
              );

              if (type !== comment) {
                const message = `${fileLine}Return type of "${functionName}" did not match type comment:`;

                errors.push({
                  message,
                  expected: comment,
                  received: type,
                });
              }
            }

            return;
          }
        }

        node.forEachChild(traverse);
      };

      traverse(file);
    }

    return errors;
  };

  if (tree.flags.verbose) {
    logger.info('Checking files:');
  }

  sourceFiles.forEach(checkTypes);

  logger.log('');

  if (errors.length) {
    errors.forEach(error => {
      if (typeof error === 'string') {
        logger.error(error);
      } else {
        logger.error(error.message);
        logger.log(indent(`Expected: ${error.expected}`, '  '));
        logger.log(indent(`Received: ${error.received}`, '  '));

        const diffString = diff
          .diffWordsWithSpace(error.expected, error.received)
          .map(part => {
            if (part.added) {
              return chalk.bgGreenBright(chalk.black(part.value));
            }

            if (part.removed) {
              return chalk.bgRedBright(chalk.black(part.value));
            }

            return part.value;
          })
          .join('');

        logger.log(indent(`Variance: ${diffString}\n`, '  '));
      }
    });

    return logger.error('\nSome files failed tsassert checks.\n', true);
  } else {
    if (!filesChecked) {
      logger.warn(
        '\nCould not find any matching files to check.\nRun with --verbose to see patterns that were checked.\n'
      );
    } else if (!commentsChecked) {
      logger.warn(
        '\nCould not find any type assertions in matched files.\nRun with --verbose to see patterns that were checked.\n'
      );
    } else {
      logger.success('\nAll files passed tsassert checks.\n');
    }
  }
};

export { assert };
