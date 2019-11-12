import { FactoryProvider } from '@nestjs/common/interfaces';
import { getDiscriminatorModelForClass, getModelForClass } from '@typegoose/typegoose';
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
