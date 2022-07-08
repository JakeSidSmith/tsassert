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

export const abc = {} as ABC | null; // @tsassert: ABC

export const result = removeNull(abc); // @tsassert: ABC | null

removeNull(abc); // @tsassert: ABC | null

export const c = abc?.a?.b.c; // @tsassert string | number

export const d = abc?.d; // @tsassert ['a', 'b', 'c'] | undefined

class MyClass<T> {
  public input: T;

  public constructor(input: T) {
    this.input = input;
  }
}

new MyClass(abc); // @tsassert: MyClass<CBA | null>

// @tsassert: ABC
removeNull(abc); // @tsassert: ABC
