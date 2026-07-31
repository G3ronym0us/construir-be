import { Module } from '@nestjs/common';
import { StoreInfoV1Controller } from './store-info.controller';

@Module({
  controllers: [StoreInfoV1Controller],
})
export class StoreInfoV1Module {}
