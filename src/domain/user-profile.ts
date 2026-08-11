/* ===========================================================
   DADOS DO PERFIL

   Estas funções puras mantêm as mesmas regras de preenchimento
   na interface, nos testes e nos documentos gravados no Firebase.
=========================================================== */

export const phoneMask = '(##) ### ### ###';
export const phonePattern = /^\(\d{2}\) \d{3} \d{3} \d{3}$/;

/* O identificador visível é sempre a parte anterior ao @. */
export function displayNameFromEmail(email: string): string {
  return email.trim().toLowerCase().split('@')[0] ?? '';
}

/* Aceita somente o formato solicitado, já incluindo espaços e parênteses. */
export function isValidPhone(phone: string): boolean {
  return phonePattern.test(phone);
}
