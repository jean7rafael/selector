import { describe, expect, it } from 'vitest';
import { displayNameFromEmail, isValidPhone } from './user-profile';

/* Mantém nome derivado e máscara de telefone independentes da tela. */
describe('perfil de usuário', () => {
  it('usa a parte anterior ao @ como nome em letras minúsculas', () => {
    expect(displayNameFromEmail(' Jean7Rafael@GMAIL.COM ')).toBe('jean7rafael');
  });

  it('aceita somente o telefone no formato definido pelo produto', () => {
    expect(isValidPhone('(41) 999 888 777')).toBe(true);
    expect(isValidPhone('(41) 99999-8888')).toBe(false);
    expect(isValidPhone('41999888777')).toBe(false);
  });
});
