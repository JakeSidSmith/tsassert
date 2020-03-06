const removeNull = <T>(input: T): Exclude<T, null> => {
  return input as Exclude<T, null>;
};

interface ABC {
  a?: {
    b: {
      c: string | number;
    };
  };
  d: ['a', 'b', 'c'];
}

export const abc = {} as ABC | null; // @type: ABC

export const result = removeNull(abc); // @type: ABC | null

removeNull(abc); // @type: ABC | null

export const c = abc?.a?.b.c; // @type string | number

export const d = abc?.d; // @type ['a', 'b', 'c'] | undefined
