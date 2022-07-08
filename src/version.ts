import * as fs from 'fs';
import * as path from 'path';

import * as logger from './logger';

const getErrorMessage = (error: unknown) => {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' || typeof error === 'number') {
    return error.toString();
  }

  return JSON.stringify(error);
};

const version = () => {
  let json: null | { version: string | number };

  try {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../package.json'),
      'utf8'
    );
    json = JSON.parse(content);
  } catch (error) {
    logger.error(getErrorMessage(error));
    return logger.error('Unable to get version', true);
  }

  if (!json?.version) {
    return logger.error('Unable to get version', true);
  }

  logger.log(json.version.toString());
};

export { version };
