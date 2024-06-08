import { getCurrentUser } from '../boot/firebase.js';


export async function hasAuthenticatedUser() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
  } finally {
    return user !== null;
  }
}


type Role = 'admin' | 'director' | 'normal'
export async function hasMinimumRole(role: Role) {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {} 

  if (!user) return false;

  // TODO: check for properties in an existing user to determine its role

}
