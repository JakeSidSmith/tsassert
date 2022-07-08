export const isTruthyString = <T>(input: T | undefined): input is T =>
  Boolean(input && typeof input !== 'undefined');

export const indent = (input: string, chars: string): string => {
  return input
    .split('\n')
    .map((line) => `${chars}${line}`)
    .join('\n');
};
