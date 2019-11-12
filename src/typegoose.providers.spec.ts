import * as typegoose from '@typegoose/typegoose';
import { prop, Ref } from '@typegoose/typegoose';
import { createTypegooseProviders } from './typegoose.providers';
import * as mongoose from 'mongoose';
import { Connection } from 'mongoose';
import { Mockgoose } from 'mockgoose';
import { DEFAULT_DB_CONNECTION_NAME } from './typegoose.constants';
import any = jasmine.any;
import { convertToTypegooseClassWithOptions } from './typegoose.utils';

const mockgoose: Mockgoose = new Mockgoose(mongoose);

class MockUser {
  @prop()
  name: string;
}

class MockSpecialUser extends MockUser {
  @prop()
  special: boolean;
}

class MockExtraSpecialUser extends MockSpecialUser {
  @prop()
  otherUser: Ref<MockUser>;
}

class MockTask {
  @prop()
  description: string;
}

describe('createTypegooseProviders', () => {
  let connection: Connection;

  beforeAll(async () => {
    jest.setTimeout(120000);
    await mockgoose.prepareStorage();

    connection = await mongoose.createConnection('mongodb://foobar/baz');
    setTimeout(() => {
      connection.close(err => {
        if (err) return console.log(err);
        console.log('disconnected');
      });
    }, 60000);

  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('setModelForClass', () => {
    let mockSetModel, MockTypegooseClass, mockConnection, schemaOptions, provider;
    beforeEach(() => {
      mockSetModel = jest.spyOn(typegoose, 'getModelForClass').mockImplementation(() => jest.fn());
      MockTypegooseClass = jest.fn();
      mockConnection = jest.fn() as any;

      schemaOptions = {
        collection: 'newCollectionName'
      };

      const models = [
        {
          typegooseClass: MockTypegooseClass,
          schemaOptions
        }
      ];

      ([ provider ] = createTypegooseProviders(DEFAULT_DB_CONNECTION_NAME, models));
      provider.useFactory(mockConnection);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should setup the database model', () => {
      expect(mockSetModel).toHaveBeenCalled();
    });

    it('should use existing connection from DbConnectionToken', () => {
      expect(mockSetModel.mock.calls[0][1]).toEqual(expect.objectContaining({
        existingConnection: mockConnection
      }));
    });

    it('should forward schema options to typegoose', () => {
      expect(mockSetModel.mock.calls[0][1]).toEqual(expect.objectContaining({
        schemaOptions
      }));
    });
  });

  it('should create typegoose providers from models', () => {

    jest.setTimeout(30000);

    const models = [
      {
        typegooseClass: MockUser
      },
      {
        typegooseClass: MockTask
      }
    ];

    const providers = createTypegooseProviders(DEFAULT_DB_CONNECTION_NAME, models);

    expect(providers).toEqual([
                                {
                                  provide: 'MockUserModel',
                                  useFactory: any(Function),
                                  inject: [DEFAULT_DB_CONNECTION_NAME]
                                },
                                {
                                  provide: 'MockTaskModel',
                                  useFactory: any(Function),
                                  inject: [DEFAULT_DB_CONNECTION_NAME]
                                }
                              ]);

    const userProvider = providers[0];

    const model = userProvider.useFactory(connection);

    expect(model.prototype.model).toBeTruthy();
  }, 15000);

  it('should create typegoose providers from models with discriminators', () => {

    jest.setTimeout(30000);

    const customDiscriminatorId = 'extra';
    const models = [
      {
        typegooseClass: MockUser,
        discriminators: [
          {
            typegooseClass: MockSpecialUser,
          },
          {
            typegooseClass: MockExtraSpecialUser,
            discriminatorId: customDiscriminatorId
          }
        ]
      },
      {
        typegooseClass: MockTask
      }
    ];

    const providers = createTypegooseProviders(DEFAULT_DB_CONNECTION_NAME, models);

    expect(providers).toEqual([
      {
        provide: 'MockUserModel',
        useFactory: any(Function),
        inject: [DEFAULT_DB_CONNECTION_NAME]
      },
      {
        provide: 'MockSpecialUserModel',
        useFactory: any(Function),
        inject: [DEFAULT_DB_CONNECTION_NAME]
      },
      {
        provide: 'MockExtraSpecialUserModel',
        useFactory: any(Function),
        inject: [DEFAULT_DB_CONNECTION_NAME]
      },
      {
        provide: 'MockTaskModel',
        useFactory: any(Function),
        inject: [DEFAULT_DB_CONNECTION_NAME]
      },
    ]);

    const specialProvider = providers[1];
    const specialModel = specialProvider.useFactory(connection);

    expect(specialModel.prototype.model).toBeTruthy();
    expect(specialModel).toHaveProperty('schema.discriminatorMapping.value', MockSpecialUser.name);

    const extraProvider = providers[2];
    const extraModel = extraProvider.useFactory(connection);

    expect(extraModel.prototype.model).toBeTruthy();
    expect(extraModel).toHaveProperty('schema.discriminatorMapping.value', customDiscriminatorId);

    const userProvider = providers[0];
    const userModel = userProvider.useFactory(connection);

    expect(userModel.prototype.model).toBeTruthy();
    expect(userModel.discriminators).toHaveProperty(MockSpecialUser.name, specialModel);
    expect(userModel.discriminators).toHaveProperty(MockExtraSpecialUser.name, extraModel);
  }, 15000);

  it('should create no providers if no models are given', () => {
    const providers = createTypegooseProviders(DEFAULT_DB_CONNECTION_NAME);

    expect(providers).toEqual([]);
  });

  afterAll(() => {
    connection.close();
  });
});

describe('convertToTypegooseClassWithOptions', () => {
  class MockTypegooseClass {}
  class MockDiscriminator {}

  it('returns model as typegooseClass if it is just a class', () => {
    expect(convertToTypegooseClassWithOptions(MockTypegooseClass)).toEqual({
      typegooseClass: MockTypegooseClass
    });
  });
  it('returns model and schemaOptions if it is a TypegooseClassWithOptions', () => {
    const options = {
      collection: 'differentName'
    };

    const expected = {
      typegooseClass: MockTypegooseClass,
      schemaOptions: options
    };

    expect(convertToTypegooseClassWithOptions(expected)).toEqual(expected);
  });
  it('throws error is not a class or not a TypegooseClassWithOptions', () => {
    const handler = () => {
      expect(convertToTypegooseClassWithOptions({
                                                  something: 'different'
                                                } as any));
    };

    expect(handler).toThrowErrorMatchingSnapshot();
  });

  it('returns discriminator as typegooseClass if it is just a class', () => {
    const options = {
      typegooseClass: MockTypegooseClass,
      discriminators: [MockDiscriminator]
    };
    const expected = {
      typegooseClass: MockTypegooseClass,
      discriminators: [{
        typegooseClass: MockDiscriminator
      }]
    };
    expect(convertToTypegooseClassWithOptions(options)).toEqual(expected);
  });
  it('returns discriminator with options if it is a TypegooseDiscriminator', () => {
    const expected = {
      typegooseClass: MockTypegooseClass,
      discriminators: [{
        typegooseClass: MockDiscriminator,
        discriminatorId: 'test'
      }]
    };
    expect(convertToTypegooseClassWithOptions(expected)).toEqual(expected);
  });
  it('throws error if discriminator is not a class or TypegooseDiscriminator', () => {
    const handler = () => {
      expect(convertToTypegooseClassWithOptions({
                                                  typegooseClass: MockTypegooseClass,
                                                  discriminators: [{
                                                    something: 'different'
                                                  }]
                                                } as any));
    };

    expect(handler).toThrowErrorMatchingSnapshot();
  });
});
