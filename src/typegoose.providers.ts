import { getConnectionToken, getModelToken, isTypegooseClass, isTypegooseClassWithOptions } from './typegoose.utils';
import {
  TypegooseClass,
  TypegooseClassWithOptions,
  TypegooseDiscriminator,
  TypegooseModel,
} from './typegoose-class.interface';
import { Connection } from 'mongoose';
import { getDiscriminatorModelForClass, getModelForClass } from '@typegoose/typegoose';
import { FactoryProvider } from '@nestjs/common/interfaces';

type ModelFactory = (c: Connection) => any;

const convertToDiscriminatorWithOptions = (item: TypegooseClass | TypegooseDiscriminator): TypegooseDiscriminator => {
  if (isTypegooseClass(item)) {
    return {
      typegooseClass: item
    };
  } else if (isTypegooseClassWithOptions(item)) {
    return item;
  }
  throw new Error('Invalid discriminator object');
};

export const convertToTypegooseClassWithOptions = (item: TypegooseModel): TypegooseClassWithOptions => {
  if (isTypegooseClass(item)) {
    return {
      typegooseClass: item
    };
  } else if (isTypegooseClassWithOptions(item)) {
    item.discriminators = (item.discriminators || []).map(convertToDiscriminatorWithOptions);
    return item;
  }
  throw new Error('Invalid model object');
};

export function createTypegooseProviders(connectionName: string,
                                         models: TypegooseClassWithOptions[] = []): FactoryProvider[] {
  const connectionToken = getConnectionToken(connectionName);

  const buildProvider = ({ name }: TypegooseClass, modelFactory: ModelFactory) => ({
    provide: getModelToken(name),
    useFactory: modelFactory,
    inject: [connectionToken]
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
