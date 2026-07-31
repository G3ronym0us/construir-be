import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateOrderExternalDto } from './update-order-external.dto';

const validateDto = async (payload: Record<string, unknown>) =>
  validate(plainToInstance(UpdateOrderExternalDto, payload));

describe('UpdateOrderExternalDto', () => {
  // OrbisNet documenta `canceled` con una sola L. No sabemos si es un typo del
  // documento, así que se aceptan ambas antes que romper la anulación.
  it.each(['canceled', 'cancelled'])('acepta status "%s"', async (status) => {
    const errors = await validateDto({
      status,
      date_completed: '2026-07-31T02:00:00.000Z',
    });

    expect(errors).toHaveLength(0);
  });

  it.each(['pending', 'completed'])('acepta status "%s"', async (status) => {
    const errors = await validateDto({
      status,
      order_key: 'OC-001',
      date_completed: '2026-07-31T02:00:00.000Z',
    });

    expect(errors).toHaveLength(0);
  });

  it('rechaza un status desconocido', async () => {
    const errors = await validateDto({ status: 'refunded' });

    expect(errors.length).toBeGreaterThan(0);
  });
});
