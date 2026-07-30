import { instanceToPlain } from 'class-transformer';
import { ApiKey, ApiKeyPermission } from './api-key.entity';

/**
 * El hash del secreto de una API key no debe salir nunca en una respuesta.
 *
 * `ApiKeysService` lo enmascara a mano en los tres métodos que devuelven la
 * entidad, pero ese enmascarado no cubre las rutas que la exponen por relación:
 * `GET /admin/api-logs/:uuid` carga `relations: ['apiKey']` y devolvía el hash
 * en claro. La garantía tiene que vivir en la entidad, no en cada llamador.
 *
 * Se prueba sobre `instanceToPlain`, que es lo que hace el
 * `ClassSerializerInterceptor` global de `main.ts`, y no sobre un objeto armado
 * a mano: un test que inspeccione un literal no verifica el decorador.
 */
describe('ApiKey — serialización', () => {
  const HASH =
    '078e73cf86dce8020aab72a71ab1431f7762499b224d577c850070feb77d8b4a';

  const build = (): ApiKey => {
    const apiKey = new ApiKey();
    apiKey.id = 1;
    apiKey.uuid = 'api-key-uuid-1';
    apiKey.consumerKey = 'ck_abc123';
    apiKey.consumerSecret = HASH;
    apiKey.description = 'Integración de prueba';
    apiKey.permissions = ApiKeyPermission.READ;
    apiKey.active = true;
    return apiKey;
  };

  it('no incluye el hash del secreto', () => {
    const plano = instanceToPlain(build());

    expect(plano).not.toHaveProperty('consumerSecret');
    expect(JSON.stringify(plano)).not.toContain(HASH);
  });

  it('no incluye el id interno, pero sí lo que el consumidor necesita', () => {
    const plano = instanceToPlain(build());

    expect(plano).not.toHaveProperty('id');
    expect(plano).toMatchObject({
      uuid: 'api-key-uuid-1',
      consumerKey: 'ck_abc123',
      active: true,
    });
  });

  it('deja la propiedad legible en memoria, para poder validar credenciales', () => {
    // `validateCredentials()` compara el secreto recibido contra este campo con
    // bcrypt. `@Exclude()` sólo actúa sobre la serialización, así que la lectura
    // de la propiedad tiene que seguir funcionando.
    expect(build().consumerSecret).toBe(HASH);
  });
});
