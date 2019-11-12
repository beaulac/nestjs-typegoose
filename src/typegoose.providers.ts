import { FactoryProvider } from '@nestjs/common/interfaces';
import { getDiscriminatorModelForClass, getModelForClass } from '@typegoose/typegoose';
import * as isClass from 'is-class';
import { Connection } from 'mongoose';
import { TypegooseClass, TypegooseClassWithOptions, TypegooseDiscriminator } from './typegoose-class.interface';
import { getConnectionToken, getModelToken } from './typegoose.utils';

type ModelFactory = (c: Connection) => any;

export function createTypegooseProviders(connectionName: string,
                                         models: TypegooseClassWithOptions[] = []): FactoryProvider[] {

  const connectionToken = getConnectionToken(connectionName);

  const buildProvider = ({ name }: TypegooseClass, modelFactory: ModelFactory) => ({
    provide: getModelToken(name),
    useFactory: modelFactory,
    inject: [connectionToken],
  });

  const createDiscriminatorFactoryFrom = (parentFactory: ModelFactory) =>
    ({ typegooseClass, discriminatorId }: TypegooseDiscriminator) => buildProvider(
      typegooseClass,
      (connection: Connection) => getDiscriminatorModelForClass(
        parentFactory(connection),
        typegooseClass,
        discriminatorId,
      ),
    );

  return models.reduce(
    (providers, { typegooseClass, schemaOptions = {}, discriminators = [] }) => {

      const modelFactory = (connection: Connection) => getModelForClass(
        typegooseClass,
        { existingConnection: connection, schemaOptions },
      );

      const modelProvider = buildProvider(typegooseClass, modelFactory);

      const discriminatorProviders = discriminators.map(createDiscriminatorFactoryFrom(modelFactory));

      return [...providers, modelProvider, ...discriminatorProviders];
    },
    [],
  );
}

const isTypegooseClass = (item): item is TypegooseClass => isClass(item);
const isTypegooseClassWithOptions = (item): item is TypegooseClassWithOptions =>
  isTypegooseClass(item.typegooseClass);

export function convertToTypegooseClassWithOptions(item: TypegooseClass | TypegooseClassWithOptions): TypegooseClassWithOptions {
  const classWithOptions: TypegooseClassWithOptions = convertToOptions(item);
  return convertDiscriminators(classWithOptions) || invalidObject('model');
}

type ClassOrDiscriminator = TypegooseClassWithOptions | TypegooseDiscriminator;

function convertToOptions(item: TypegooseClass | ClassOrDiscriminator): ClassOrDiscriminator | undefined {
  if (isTypegooseClass(item)) {
    return { typegooseClass: item };
  } else if (isTypegooseClassWithOptions(item)) {
    return item;
  }
}

function convertDiscriminators(item: TypegooseClassWithOptions) {
  if (item.discriminators) {
    item.discriminators = (item.discriminators || []).map(convertToDiscriminatorWithOptions);
  }
  return item;
}

function convertToDiscriminatorWithOptions(item): TypegooseDiscriminator {
  return (convertToOptions(item) as TypegooseDiscriminator) || invalidObject('discriminator');
}

function invalidObject(type: string): never {
  throw new Error(`Invalid ${type} object`);
}
