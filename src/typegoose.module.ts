import { DynamicModule, Module } from '@nestjs/common';
import { TypegooseCoreModule } from './typegoose-core.module';

import { convertToTypegooseClassWithOptions, createTypegooseProviders } from './typegoose.providers';
import { TypegooseModel } from './typegoose-class.interface';
import { TypegooseConnectionOptions, TypegooseModuleAsyncOptions } from './typegoose-options.interface';

@Module({})
export class TypegooseModule {
  static forRoot(
    uri: string,
    options: TypegooseConnectionOptions = {},
  ): DynamicModule {
    return {
      module: TypegooseModule,
      imports: [TypegooseCoreModule.forRoot(uri, options)],
    };
  }

  static forRootAsync(options: TypegooseModuleAsyncOptions): DynamicModule {
    return {
      module: TypegooseModule,
      imports: [TypegooseCoreModule.forRootAsync(options)],
    };
  }

  static forFeature(models: TypegooseModel[], connectionName?: string): DynamicModule {
    const convertedModels = models.map(model => convertToTypegooseClassWithOptions(model));
    const providers = createTypegooseProviders(connectionName, convertedModels);
    return {
      module: TypegooseModule,
      providers,
      exports: providers
    };
  }
}
