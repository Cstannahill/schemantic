import { ConsumerApiClient, serializeApiUserDto, deserializeApiUserDto } from './generated/index.js';
const user = { userId: '1', displayName: 'Ada' };
const client = new ConsumerApiClient({ baseUrl: 'https://example.test', headers: new Headers() });
void client.getUser(user.userId);
void client.saveUser(user);
serializeApiUserDto(user);
deserializeApiUserDto({ user_id: '1', display_name: 'Ada' });
// @ts-expect-error wire keys are not the default application shape
const wrong = { user_id: '1', display_name: 'Ada' };
void wrong;
