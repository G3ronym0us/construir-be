import { plainToInstance } from 'class-transformer';
import { CreateCategoryDto } from './create-category.dto';

describe('CreateCategoryDto', () => {
  describe('name trimming', () => {
    it('should trim leading and trailing whitespace from name', () => {
      const dto = plainToInstance(CreateCategoryDto, {
        name: '  CABILLAS ESTRIADAS  ',
        slug: 'cabillas-estriadas',
      });
      expect(dto.name).toBe('CABILLAS ESTRIADAS');
    });

    it('should trim only trailing whitespace from name', () => {
      const dto = plainToInstance(CreateCategoryDto, {
        name: 'CABILLAS ESTRIADAS            ',
        slug: 'cabillas-estriadas',
      });
      expect(dto.name).toBe('CABILLAS ESTRIADAS');
    });

    it('should not alter whitespace between words in name', () => {
      const dto = plainToInstance(CreateCategoryDto, {
        name: '  CABILLAS  ESTRIADAS  ',
        slug: 'cabillas-estriadas',
      });
      expect(dto.name).toBe('CABILLAS  ESTRIADAS');
    });

    it('should leave name unchanged when no extra whitespace', () => {
      const dto = plainToInstance(CreateCategoryDto, {
        name: 'CABILLAS ESTRIADAS',
        slug: 'cabillas-estriadas',
      });
      expect(dto.name).toBe('CABILLAS ESTRIADAS');
    });
  });

  describe('externalCode trimming', () => {
    it('should trim trailing whitespace from externalCode', () => {
      const dto = plainToInstance(CreateCategoryDto, {
        name: 'CABILLAS ESTRIADAS',
        slug: 'cabillas-estriadas',
        externalCode: '10011     ',
      });
      expect(dto.externalCode).toBe('10011');
    });

    it('should trim leading and trailing whitespace from externalCode', () => {
      const dto = plainToInstance(CreateCategoryDto, {
        name: 'CABILLAS ESTRIADAS',
        slug: 'cabillas-estriadas',
        externalCode: '   10011   ',
      });
      expect(dto.externalCode).toBe('10011');
    });

    it('should leave externalCode unchanged when no extra whitespace', () => {
      const dto = plainToInstance(CreateCategoryDto, {
        name: 'CABILLAS ESTRIADAS',
        slug: 'cabillas-estriadas',
        externalCode: '10011',
      });
      expect(dto.externalCode).toBe('10011');
    });

    it('should return undefined when externalCode is not provided', () => {
      const dto = plainToInstance(CreateCategoryDto, {
        name: 'CABILLAS ESTRIADAS',
        slug: 'cabillas-estriadas',
      });
      expect(dto.externalCode).toBeUndefined();
    });
  });
});
