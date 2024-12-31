export type MaybePromise<T> = Promise<T> | T
export type Merge<Left, Right> = Omit<Left, keyof Right> & Right
