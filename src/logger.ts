import * as chalk from 'chalk';

const _log = (input: string, color?: 'cyan' | 'red' | 'green' | 'yellow') => {
  // eslint-disable-next-line no-console
  console.error(color ? chalk[color](input) : input);
};

export const log = (input: string) => {
  _log(input);
};

export const info = (input: string) => {
  _log(input, 'cyan');
};

export const success = (input: string) => {
  _log(input, 'green');
};

export const warn = (input: string) => {
  _log(input, 'yellow');
};

export const error = (input: string, exit?: boolean) => {
  _log(input, 'red');

  if (exit) {
    process.exit(1);
  }
};
