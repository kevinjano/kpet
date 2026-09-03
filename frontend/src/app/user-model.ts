// Used (unlike its Product/BlogPost/Distributor counterparts) as the type of
// admin.component's and mon-compte.component's `selectedUser`, so the edit
// forms can assign to typed fields directly.
import {User} from "./user";

export class UserModel implements User {
  constructor(
  public id: number,
  public firstName: string,
  public lastName: string,
  public email: string,
  public noTel: string,
  public password: string,
  public role: string,
  ) {}

}
