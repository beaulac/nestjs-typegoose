import * as isClass from 'is-class';
import { DEFAULT_DB_CONNECTION_NAME } from './typegoose.constants';
import {
  TypegooseClass,
  TypegooseClassWithOptions,
  TypegooseClassWrapper,
  TypegooseDiscriminator,
} from './typegoose-class.interface';

export function getModelToken(model: string) {
  return `${model}Model`;
}

export function getConnectionToken(name?: string) {
  if (typeof name === 'string' && name !== DEFAULT_DB_CONNECTION_NAME) {
    return `${name}Connection`;
  }
  return DEFAULT_DB_CONNECTION_NAME;
}

export const isTypegooseClass = (item): item is TypegooseClass => isClass(item);
export const isTypegooseClassWithOptions = (item): item is TypegooseClassWithOptions =>
  isTypegooseClass(item.typegooseClass);

type MaybeUnwrapped<T extends TypegooseClassWrapper> = TypegooseClass | WithMaybeUnwrappedArray<T>;
type WithMaybeUnwrappedArray<T> = {
  [K in keyof T]: T[K] extends Array<infer U>
    ? U extends TypegooseClassWrapper ? Array<MaybeUnwrapped<U>> : T[K]
    : T[K];
};

type WithOptions<T> = T extends MaybeUnwrapped<infer R> ? R : never;

export const convertToTypegooseClassWithOptions = (item: MaybeUnwrapped<TypegooseClassWithOptions>): TypegooseClassWithOptions => {
  const converted: TypegooseClassWithOptions = convertToOptions(item);
  if (converted) {

    if (converted.discriminators) {
      converted.discriminators = converted.discriminators.map(
        (d) => convertToOptions(d) || invalidObject('discriminator'));
    }
    return converted;
  }

  return invalidObject('model');
};

function convertToOptions(item: MaybeUnwrapped<TypegooseClassWithOptions | TypegooseDiscriminator>): WithOptions<typeof item> | undefined {
  if (isTypegooseClass(item)) {
    return { typegooseClass: item };
  } else if (isTypegooseClassWithOptions(item)) {
    return item;
  }
}

function invalidObject(type: string): never {
  throw new Error(`Invalid ${type} object`);
}
