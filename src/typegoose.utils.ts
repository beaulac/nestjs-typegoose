import * as isClass from 'is-class';
import { DEFAULT_DB_CONNECTION_NAME } from './typegoose.constants';
import { TypegooseClass, TypegooseClassWithOptions } from './typegoose-class.interface';

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
