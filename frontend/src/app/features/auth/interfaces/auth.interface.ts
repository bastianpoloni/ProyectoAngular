import { User } from '../../ajustes/interfaces/user';

export interface AuthResponse {
  token: string;
  usuario: User;
}

export interface Credentials {
  email?: string | null;
  password?: string | null;
}
