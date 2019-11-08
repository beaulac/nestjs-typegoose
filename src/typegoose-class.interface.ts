import { SchemaOptions } from 'mongoose';

export interface TypegooseClass {
  new (...args: any[]);
}

export interface TypegooseClassWithOptions {
  typegooseClass: TypegooseClass;
  schemaOptions?: SchemaOptions;
  discriminators?: (TypegooseClass | TypegooseDiscriminator)[];
}

export type TypegooseModel = TypegooseClass | TypegooseClassWithOptions;

export interface TypegooseDiscriminator {
  typegooseClass: TypegooseClass;
  discriminatorId?: string;
}
