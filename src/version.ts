import * as fs from 'fs';
import * as path from 'path';

import * as logger from './logger';

const version = () => {
  let json: any;

  try {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../package.json'),
      'utf8'
    );
    json = JSON.parse(content);
  } catch (error) {
    logger.error(error?.toString() || error);
    return logger.error('Unable to get version', true);
  }

  if (!json?.version) {
    return logger.error('Unable to get version', true);
  }

  logger.log(json.version);
};

export { version };
