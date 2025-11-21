import type { BuilderConfig, StorageConfig } from '@afilmory/builder'
import { describe, expect, it } from 'vitest'

import { PhotoBuilderService } from './photo-builder.service'

describe('PhotoBuilderService', () => {
  describe('applyStorageConfig', () => {
    it('should update builder internal config and switch provider', () => {
      // Arrange
      const service = new PhotoBuilderService()
      const initialConfig: StorageConfig = {
        provider: 's3',
        bucket: 'test-bucket',
        prefix: 'photos/',
        accessKeyId: 'test-key-id',
        secretAccessKey: 'test-secret',
      }
      const overrideConfig: StorageConfig = {
        provider: 's3',
        bucket: 'test-bucket',
        prefix: 'photos2/',
        accessKeyId: 'test-key-id',
        secretAccessKey: 'test-secret',
      }

      const builderConfig: BuilderConfig = {
        plugins: [],
        system: {
          processing: {
            defaultConcurrency: 1,
            workerPoolSize: 1,
          },
          manifestFilename: 'photos-manifest.json',
          thumbnailCacheDirectory: '.afilmory/cache',
        },
        user: {
          storage: initialConfig,
        },
      }

      const builder = service.createBuilder(builderConfig)

      // Verify initial state
      expect(builder.getStorageConfig()).toEqual(initialConfig)

      // Act
      service.applyStorageConfig(builder, overrideConfig)

      // Assert - the builder's internal config should be updated
      expect(builder.getStorageConfig()).toEqual(overrideConfig)
      expect(builder.getStorageConfig().prefix).toBe('photos2/')
    })

    it('should allow thumbnail plugin to read correct storage config after override', async () => {
      // Arrange
      const service = new PhotoBuilderService()
      const initialConfig: StorageConfig = {
        provider: 's3',
        bucket: 'test-bucket',
        prefix: 'photos/',
        accessKeyId: 'test-key-id',
        secretAccessKey: 'test-secret',
      }
      const overrideConfig: StorageConfig = {
        provider: 's3',
        bucket: 'test-bucket',
        prefix: 'photos2/',
        accessKeyId: 'test-key-id',
        secretAccessKey: 'test-secret',
      }

      const builderConfig: BuilderConfig = {
        plugins: [],
        system: {
          processing: {
            defaultConcurrency: 1,
            workerPoolSize: 1,
          },
          manifestFilename: 'photos-manifest.json',
          thumbnailCacheDirectory: '.afilmory/cache',
        },
        user: {
          storage: initialConfig,
        },
      }

      const builder = service.createBuilder(builderConfig)

      // Apply storage config override BEFORE ensurePluginsReady
      service.applyStorageConfig(builder, overrideConfig)

      // This simulates what happens in prepareSyncContext
      await builder.ensurePluginsReady()

      // The thumbnail plugin should have read the override config,
      // so getStorageConfig should return the overridden config
      expect(builder.getStorageConfig()).toEqual(overrideConfig)
    })
  })
})
