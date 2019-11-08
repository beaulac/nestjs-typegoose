import { getModelToken, getConnectionToken } from './typegoose.utils';
import { TypegooseClass } from './typegoose-class.interface';
import { Connection, Model, SchemaOptions } from 'mongoose';
import { getDiscriminatorModelForClass, getModelForClass } from '@typegoose/typegoose';
import * as isClass from 'is-class';

export interface TypegooseClassWithOptions {
  typegooseClass: TypegooseClass;
  extendsClass?: TypegooseClass;
  schemaOptions?: SchemaOptions;
}

export const isTypegooseClassWithOptions = (item): item is TypegooseClassWithOptions =>
  isClass(item.typegooseClass);

export const convertToTypegooseClassWithOptions = (item: TypegooseClass | TypegooseClassWithOptions): TypegooseClassWithOptions => {
  if (isClass(item)) {
    return {
      typegooseClass: item as TypegooseClass,
    };
  } else if (isTypegooseClassWithOptions(item)) {
    return item;
  }

  throw new Error('Invalid model object');
};

export function createTypegooseProviders(connectionName: string, models: TypegooseClassWithOptions[] = []) {

  const sortByInheritance = (): TypegooseClassWithOptions[] => {
    const sorted = new Set<TypegooseClassWithOptions>();
    const addedClasses = new Set<TypegooseClass>();

    const insertSelfOrParent = (tco: TypegooseClassWithOptions) => {
      const parent = tco.extendsClass;

      if (parent) {
        if (!addedClasses.has(parent)) {
          const parentDeclaration = models.find(
            ({ typegooseClass }) => typegooseClass === parent,
          );

          if (!parentDeclaration) {
            throw new Error('Extending an un-declared model');
          }

          // Insert parent before
          insertSelfOrParent(parentDeclaration);
        }
      }

      addedClasses.add(tco.typegooseClass);
      sorted.add(tco);
    };

    models.forEach(insertSelfOrParent);

    return [...sorted];
  };

  const modelMap = new Map<TypegooseClass, Model<any>>();

  return sortByInheritance().map(({ typegooseClass, extendsClass, schemaOptions = {} as SchemaOptions }) => ({
    provide: getModelToken(typegooseClass.name),
    useFactory: (connection: Connection) => {
      let modelForClass: Model<any>;

      if (extendsClass) {

        const parentModel = modelMap.get(extendsClass);
        if (!parentModel) {
          throw new Error('Parent model was not created first');
        }

        if (schemaOptions.discriminatorKey) {
          modelForClass = getDiscriminatorModelForClass(
            parentModel,
            typegooseClass,
            schemaOptions.discriminatorKey,
          );
        } else {
          modelForClass = getDiscriminatorModelForClass(
            parentModel,
            typegooseClass,
          );
        }

      } else {
        modelForClass = getModelForClass(typegooseClass, {
          existingConnection: connection,
          schemaOptions,
        });
      }

      modelMap.set(typegooseClass, modelForClass);
      return modelForClass;
    },
    inject: [getConnectionToken(connectionName)],
  }));
}
