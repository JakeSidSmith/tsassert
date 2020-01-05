import * as chalk from 'chalk';

export const log = (input: string, color?: 'red' | 'green') => {
  // tslint:disable-next-line:no-console
  console.error(color ? chalk[color](input) : input);
};

export const error = (input: string, exit?: boolean) => {
  log(input, 'red');

  if (exit) {
    process.exit(1);
  }
};
